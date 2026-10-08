import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  emptySnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import { storageError } from "../../src/features/creation/snapshotCodec.ts";
import { reconcileProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  createNativeCloseHandler,
  flushCreationBeforeClose,
} from "../../src/features/creation/nativeClose.ts";

type StorageHook = ReturnType<
  typeof import("../../src/features/creation/useCreationStorage.ts").useCreationStorage
>;

// Run the actual hook with deterministic React lifecycle/timers and IO boundaries.
// No save-queue, revision, conflict or recovery logic is replaced by this harness.
async function harness(native = false, registration?: Promise<() => void>) {
  const slots: unknown[] = [];
  const effects: (() => void | (() => void))[] = [];
  const cleanup: (() => void)[] = [];
  let cursor = 0;
  const writes: CreationSnapshot[] = [];
  const loaded = { ...emptySnapshot(), revision: 1 };
  let stored = loaded;
  let persist: (snapshot: CreationSnapshot) => Promise<void> = async (
    snapshot,
  ) => {
    stored = snapshot;
  };
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value: unknown) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect: () => void | (() => void)) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = true;
        effects.push(effect);
      }
    },
  };
  const storage = {
    loadCreationSnapshot: async () => ({
      snapshot: stored,
      recovered: false,
      durableRevision: stored.revision,
    }),
    persistCreationSnapshotAsync: async (snapshot: CreationSnapshot) => {
      writes.push(snapshot);
      await persist(snapshot);
    },
    persistCreationSnapshotSync: () => {},
    pendingRecoveryDraft: () => null,
  };
  let nativeClose: ReturnType<typeof createNativeCloseHandler> | undefined;
  let destroyed = 0;
  let released = 0;
  const modules: Record<string, unknown> = {
    react: hooks,
    "@tauri-apps/api/core": { isTauri: () => native },
    "@tauri-apps/api/window": {
      getCurrentWindow: () => {
        assert(native, "Web must not register native window events");
        return {
          onCloseRequested: (handler: typeof nativeClose) => {
            nativeClose = handler;
            return (
              registration ??
              Promise.resolve(() => {
                released++;
              })
            );
          },
          destroy: async () => {
            destroyed++;
          },
        };
      },
    },
    "./nativeClose": { createNativeCloseHandler, flushCreationBeforeClose },
    "./model": { emptySnapshot },
    "./storage": storage,
    "./snapshotCodec": { storageError },
    "../../domain/projectCanvas": { reconcileProjectCanvas },
  };
  const exports: {
    useCreationStorage?: (
      recover: (snapshot: CreationSnapshot) => CreationSnapshot,
    ) => StorageHook;
  } = {};
  const source = await readFile(
    new URL(
      "../../src/features/creation/useCreationStorage.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  runInNewContext(compiled.outputText, {
    exports,
    require: (id: string) => {
      assert(id in modules, `Unexpected hook dependency: ${id}`);
      return modules[id];
    },
    window: {
      setTimeout: () => 1,
      clearTimeout: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
  const render = () => {
    cursor = 0;
    return exports.useCreationStorage!((snapshot) => snapshot);
  };
  render();
  effects.forEach((effect) => {
    const stop = effect();
    if (stop) cleanup.push(stop);
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(render().state, "saved");
  return {
    render,
    writes,
    durable: () => stored,
    setPersist: (next: typeof persist) => {
      persist = next;
    },
    nativeClose: () => {
      assert(nativeClose);
      return nativeClose;
    },
    destroyed: () => destroyed,
    released: () => released,
    dispose: () => cleanup.reverse().forEach((stop) => stop()),
  };
}

test("a queued flush rejects when the preceding native conflict pauses saving and keeps the newer draft", async () => {
  const fixture = await harness();
  let fail!: (reason: unknown) => void;
  fixture.setPersist(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "previous edit" },
  });
  const previous = hook.flush();
  const previousRejected = assert.rejects(previous, /conflict:/);
  await new Promise<void>((resolve) => setImmediate(resolve));
  hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "newer approval draft" },
  });
  const approval = hook.flush();
  const approvalRejected = assert.rejects(approval, /保存.*暂停|尚未.*保存/);
  fail("conflict: native snapshot changed in another window");
  await Promise.all([previousRejected, approvalRejected]);
  hook = fixture.render();
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.durable().revision, 1);
  assert.equal(hook.state, "conflict");
  assert.equal(hook.creation.homeDraft.prompt, "newer approval draft");
  assert.equal(hook.creation.revision, 3);
  hook.retryRead();
  await new Promise<void>((resolve) => setImmediate(resolve));
  hook = fixture.render();
  assert.equal(hook.state, "saved");
  assert.equal(hook.creation.revision, 1);
  assert.equal(hook.recoveryDraft?.homeDraft.prompt, "newer approval draft");
});

test("queued flushes for an acknowledged revision resolve without duplicate writes", async () => {
  const fixture = await harness();
  const hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "one saved revision" },
  });
  await Promise.all([hook.flush(), hook.flush()]);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.durable().revision, 2);
  assert.equal(fixture.render().state, "saved");
});

test("flushing an already durable revision restores saved status without writing again", async () => {
  const fixture = await harness();
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "durable approval" },
  });
  await hook.flush();
  hook = fixture.render();
  assert.equal(hook.state, "saved");
  await hook.flush();
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.render().state, "saved");
});

test("the actual hook drains the latest revision before native destruction", async () => {
  const fixture = await harness(true);
  let finish!: () => void;
  fixture.setPersist((snapshot) =>
    snapshot.revision === 2
      ? new Promise<void>((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(),
  );
  let hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "first" },
  });
  let prevented = 0;
  const closing = fixture.nativeClose()({
    preventDefault: () => {
      prevented++;
    },
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(prevented, 1);
  assert.equal(fixture.destroyed(), 0);
  hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "latest" },
  });
  finish();
  await closing;
  assert.deepEqual(
    fixture.writes.map((s) => s.revision),
    [2, 3],
  );
  assert.equal(fixture.render().creation.homeDraft.prompt, "latest");
  assert.equal(fixture.render().state, "saved");
  assert.equal(fixture.destroyed(), 1);
  fixture.dispose();
  assert.equal(fixture.released(), 1);
});

test("native save failure keeps the hook draft and safe error visible until retry", async () => {
  const fixture = await harness(true);
  const hook = fixture.render();
  hook.commitCreation({
    ...hook.creation,
    homeDraft: { ...hook.creation.homeDraft, prompt: "unsaved" },
  });
  fixture.setPersist(async () => {
    throw new Error("private path should not leak");
  });
  await fixture.nativeClose()({ preventDefault() {} });
  assert.equal(fixture.destroyed(), 0);
  assert.equal(fixture.render().state, "write_error");
  assert.equal(fixture.render().creation.homeDraft.prompt, "unsaved");
  assert.match(fixture.render().message, /窗口保持打开/);
  assert(!fixture.render().message.includes("private path"));
  fixture.setPersist(async () => {});
  await fixture.nativeClose()({ preventDefault() {} });
  assert.equal(fixture.destroyed(), 1);
  assert.equal(fixture.render().state, "saved");
  fixture.dispose();
});

test("a native subscription resolving after unmount is released without a stale close", async () => {
  let register!: (stop: () => void) => void;
  let stopped = 0;
  const fixture = await harness(
    true,
    new Promise((resolve) => {
      register = resolve;
    }),
  );
  fixture.dispose();
  register(() => {
    stopped++;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  await fixture.nativeClose()({ preventDefault() {} });
  assert.equal(stopped, 1);
  assert.equal(fixture.destroyed(), 0);
  assert.equal(fixture.writes.length, 0);
});
