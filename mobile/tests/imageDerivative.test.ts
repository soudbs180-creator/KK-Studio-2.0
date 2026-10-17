import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import { MobileRepository } from "../src/storage/repository.ts";
import type { ImageEditOptions } from "../src/application/imageDerivativeFlow.ts";

function png(width: number, height: number, marker = 1): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[31] = marker;
  return bytes;
}
async function api() {
  const path = "../src/application/imageDerivativeFlow.ts";
  const module = await import(path).catch(() => null);
  assert.ok(module, "Independent image edit flow is not implemented");
  return module as typeof import("../src/application/imageDerivativeFlow.ts");
}
async function fixture() {
  let payload: string | null = null;
  let writeFailure = false;
  const originals = new Map<string, Uint8Array>();
  const repo = new MobileRepository({
    accountId: "realm-v1-test",
    backend: {
      async read() {
        return payload;
      },
      async compareAndSwap(_account, expected, next) {
        if (writeFailure) throw new Error("snapshot disk full");
        if (
          (payload === null ? null : JSON.parse(payload).revision) !== expected
        )
          return false;
        payload = next;
        return true;
      },
    },
    originalStore: {
      async read(_account, id) {
        const bytes = originals.get(id);
        assert.ok(bytes);
        return bytes.slice();
      },
      async write(_account, id, bytes) {
        assert.equal(originals.has(id), false);
        originals.set(id, bytes.slice());
      },
      async remove(_account, id) {
        originals.delete(id);
      },
    },
    hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
    id: randomUUID,
    now: () => 100,
  });
  await repo.initialize();
  const source = await repo.storeOriginal({
    bytes: png(640, 480),
    mime: "image/png",
    name: "source.png",
    provenance: { source: "import" },
  });
  return {
    repo,
    source,
    originals,
    failWrites(value: boolean) {
      writeFailure = value;
    },
  };
}
const options: ImageEditOptions = {
  rotation: 90,
  resizeWidth: 240,
  crop: { originX: 20, originY: 10, width: 400, height: 200 },
};

test("crop then rotation then ratio-preserving resize creates preview without storing", async () => {
  const { prepareImageDerivative } = await api(),
    f = await fixture();
  const preview = await prepareImageDerivative(
    f.repo,
    f.source.id,
    options,
    async (bytes, mime, plan) => {
      assert.deepEqual(bytes, await f.repo.readOriginal(f.source.id));
      assert.equal(mime, "image/png");
      assert.deepEqual(plan.outputSize, { width: 240, height: 480 });
      return { bytes: png(240, 480, 2), width: 240, height: 480 };
    },
    () => true,
  );
  assert.equal(preview.parentAssetId, f.source.id);
  assert.equal((await f.repo.load()).assets.length, 1);
  assert.deepEqual(await f.repo.readOriginal(f.source.id), png(640, 480));
});

test("saving creates an independent immutable original with parent provenance", async () => {
  const { prepareImageDerivative, saveImageDerivative } = await api(),
    f = await fixture();
  const preview = await prepareImageDerivative(
    f.repo,
    f.source.id,
    options,
    async () => ({ bytes: png(240, 480, 2), width: 240, height: 480 }),
    () => true,
  );
  const saved = await saveImageDerivative(f.repo, preview, () => true);
  assert.notEqual(saved.id, f.source.id);
  assert.equal(saved.parentAssetId, f.source.id);
  assert.equal(saved.provenance.source, "derivative");
  assert.equal(
    saved.sha256,
    createHash("sha256").update(preview.bytes).digest("hex"),
  );
  assert.deepEqual(await f.repo.readOriginal(f.source.id), png(640, 480));
});

test("late cancelled or account-switched render cannot be stored", async () => {
  const { prepareImageDerivative } = await api(),
    f = await fixture();
  let valid = true;
  await assert.rejects(
    prepareImageDerivative(
      f.repo,
      f.source.id,
      options,
      async () => {
        valid = false;
        return { bytes: png(240, 480, 2), width: 240, height: 480 };
      },
      () => valid,
    ),
    /取消|会话/,
  );
  assert.equal((await f.repo.load()).assets.length, 1);
});

test("invalid bounds and oversized source are rejected before decode", async () => {
  const { prepareImageDerivative } = await api(),
    f = await fixture();
  let decodes = 0;
  const render = async () => {
    decodes++;
    return { bytes: png(240, 480, 2), width: 240, height: 480 };
  };
  for (const bad of [
    { ...options, crop: { originX: -1, originY: 0, width: 1, height: 1 } },
    { ...options, crop: { originX: 600, originY: 0, width: 100, height: 1 } },
    { ...options, resizeWidth: 4097 },
    { ...options, rotation: 45 },
  ])
    await assert.rejects(
      prepareImageDerivative(f.repo, f.source.id, bad, render, () => true),
    );
  const huge = await f.repo.storeOriginal({
    bytes: png(90000, 90000),
    mime: "image/png",
    name: "huge.png",
    provenance: { source: "import" },
  });
  await assert.rejects(
    prepareImageDerivative(f.repo, huge.id, options, render, () => true),
    /尺寸|像素/,
  );
  assert.equal(decodes, 0);
});

test("render errors, mismatched output and stale save retain original and no derivative", async () => {
  const { prepareImageDerivative, saveImageDerivative } = await api(),
    f = await fixture();
  await assert.rejects(
    prepareImageDerivative(
      f.repo,
      f.source.id,
      options,
      async () => {
        throw new Error("decode failed");
      },
      () => true,
    ),
    /decode failed/,
  );
  await assert.rejects(
    prepareImageDerivative(
      f.repo,
      f.source.id,
      options,
      async () => ({ bytes: png(1, 1), width: 240, height: 480 }),
      () => true,
    ),
    /尺寸/,
  );
  const preview = await prepareImageDerivative(
    f.repo,
    f.source.id,
    options,
    async () => ({ bytes: png(240, 480, 2), width: 240, height: 480 }),
    () => true,
  );
  await assert.rejects(
    saveImageDerivative(f.repo, preview, () => false),
    /取消|会话/,
  );
  assert.equal((await f.repo.load()).assets.length, 1);
});

test("unchanged bytes cannot be presented as a saved independent derivative", async () => {
  const { prepareImageDerivative } = await api(),
    f = await fixture();
  await assert.rejects(
    prepareImageDerivative(
      f.repo,
      f.source.id,
      { rotation: 0 },
      async () => ({ bytes: png(640, 480), width: 640, height: 480 }),
      () => true,
    ),
    /原件相同/,
  );
  assert.equal((await f.repo.load()).assets.length, 1);
});

test("save captures preview bytes before asynchronous storage", async () => {
  const { prepareImageDerivative, saveImageDerivative } = await api(),
    f = await fixture();
  const preview = await prepareImageDerivative(
    f.repo,
    f.source.id,
    options,
    async () => ({ bytes: png(240, 480, 2), width: 240, height: 480 }),
    () => true,
  );
  const originalLoad = f.repo.load.bind(f.repo);
  f.repo.load = async () => {
    preview.bytes[31] = 99;
    return originalLoad();
  };
  const saved = await saveImageDerivative(f.repo, preview, () => true);
  assert.deepEqual(await f.repo.readOriginal(saved.id), png(240, 480, 2));
  assert.deepEqual(await f.repo.readOriginal(f.source.id), png(640, 480));
});

test("a stalled renderer has a finite preview timeout and creates no original", async (context) => {
  const { prepareImageDerivative } = await api(),
    f = await fixture();
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let failure: unknown;
  void prepareImageDerivative(
    f.repo,
    f.source.id,
    options,
    () => new Promise(() => undefined),
    () => true,
  ).catch((error: unknown) => {
    failure = error;
  });
  await setImmediate();
  context.mock.timers.tick(30000);
  await setImmediate();
  assert.ok(
    failure instanceof Error && /超时/.test(failure.message),
    "Preview must stop waiting after thirty seconds",
  );
  assert.equal((await f.repo.load()).assets.length, 1);
});

test("archive failure retains original and preview and can save without rendering again", async () => {
  const { prepareImageDerivative, saveImageDerivative } = await api(),
    f = await fixture();
  let renders = 0;
  const preview = await prepareImageDerivative(
    f.repo,
    f.source.id,
    options,
    async () => {
      renders++;
      return { bytes: png(240, 480, 2), width: 240, height: 480 };
    },
    () => true,
  );
  f.failWrites(true);
  await assert.rejects(
    saveImageDerivative(f.repo, preview, () => true),
    /disk full/,
  );
  assert.deepEqual(f.originals.get(f.source.id), png(640, 480));
  assert.deepEqual(preview.bytes, png(240, 480, 2));
  f.failWrites(false);
  assert.equal((await f.repo.load()).assets.length, 1);
  const saved = await saveImageDerivative(f.repo, preview, () => true);
  assert.equal(saved.parentAssetId, f.source.id);
  assert.equal((await f.repo.load()).assets.length, 2);
  assert.equal(renders, 1);
});

test("preview captures edit parameters before asynchronous source reads", async () => {
  const { prepareImageDerivative } = await api(),
    f = await fixture();
  const edit = { ...options, crop: { ...options.crop! } };
  const load = f.repo.load.bind(f.repo);
  f.repo.load = async () => {
    edit.rotation = 0;
    edit.crop.width = 200;
    return load();
  };
  const preview = await prepareImageDerivative(
    f.repo,
    f.source.id,
    edit,
    async (_bytes, _mime, plan) => {
      assert.equal(plan.rotation, 90);
      assert.equal(plan.crop?.width, 400);
      return { bytes: png(240, 480, 2), width: 240, height: 480 };
    },
    () => true,
  );
  assert.equal(preview.height, 480);
});
