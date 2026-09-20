import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { crc32, deflateSync } from "node:zlib";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";

// Runtime import lets the first red test identify the missing public behavior
// through an assertion, rather than an unrelated module-loading exception.
const module =
  await import("../../src/features/generation-server/assets.ts").catch(
    () => undefined,
  );

function chunk(type: string, payload: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), payload]);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([header, body, checksum]);
}

function png(raw = Buffer.from([0, 255, 0, 0, 255])): Buffer {
  const header = Buffer.from("00000001000000010806000000", "hex");
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const validPng = png();
const connection: ProviderConnection = {
  id: "test-local",
  provider: "ComfyUI",
  kind: "local_comfyui",
  displayName: "Test",
  state: "active",
  concurrencyLimit: 1,
  capabilities: {
    modalities: ["image"],
    operations: ["generate"],
    async: true,
  },
};

function result(bytes = validPng, mime = "image/png") {
  return {
    providerJobId: "job-1",
    index: 0,
    mime,
    b64Json: bytes.toString("base64"),
  };
}

async function fixture(
  t: Parameters<Parameters<typeof test>[1]>[0],
  options = {},
) {
  assert.ok(
    module?.PrivateAssetStore,
    "PrivateAssetStore must archive provider bytes into private objects",
  );
  const root = await mkdtemp(join(tmpdir(), "kk-server-assets-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, store: new module.PrivateAssetStore(root, options) };
}

test("archives valid PNG bytes with full SHA-256 identity and deduplicates concurrent results", async (t) => {
  const { root, store } = await fixture(t);
  const [first, second] = await Promise.all([
    store.archive(result(), connection),
    store.archive(result(), connection),
  ]);
  const digest = createHash("sha256").update(validPng).digest("hex");
  assert.deepEqual(first, {
    assetId: `asset-${digest}`,
    sha256: digest,
    mime: "image/png",
    size: validPng.length,
  });
  assert.deepEqual(second, first);
  assert.deepEqual(await store.read(first), validPng);
  assert.deepEqual(await readdir(root), [first.assetId]);
  assert.deepEqual(await readFile(join(root, first.assetId)), validPng);
});

test("rejects damaged CRC, missing PNG trailer, false MIME, and invalid decoded scanlines", async (t) => {
  const { root, store } = await fixture(t);
  const corrupt = Buffer.from(validPng);
  corrupt[29] ^= 1;
  for (const candidate of [
    result(corrupt),
    result(validPng.subarray(0, -1)),
    result(validPng, "image/jpeg"),
    result(png(Buffer.from([5, 0, 0, 0, 0]))),
    result(png(Buffer.from([0, 0]))),
  ]) {
    await assert.rejects(store.archive(candidate, connection));
  }
  assert.deepEqual(await readdir(root), []);
});

test("rejects malformed base64 and oversized bytes before writing objects", async (t) => {
  const { root, store } = await fixture(t, { maxBytes: validPng.length - 1 });
  await assert.rejects(store.archive(result(), connection), /ASSET_TOO_LARGE/);
  await assert.rejects(
    store.archive({ ...result(), b64Json: "not_base64!" }, connection),
    /ASSET_INVALID/,
  );
  assert.deepEqual(await readdir(root), []);
});

test("read verifies full identity, byte count, and digest after storage damage", async (t) => {
  const { root, store } = await fixture(t);
  const asset = await store.archive(result(), connection);
  await assert.rejects(
    store.read({ ...asset, assetId: "../../private" }),
    /ASSET_INVALID/,
  );
  await assert.rejects(
    store.read({ ...asset, size: asset.size + 1 }),
    /ASSET_INTEGRITY/,
  );
  const damaged = Buffer.from(validPng);
  damaged[20] ^= 1;
  await writeFile(join(root, asset.assetId), damaged);
  await assert.rejects(store.read(asset), /ASSET_INTEGRITY/);
});

async function serverFixture(
  t: Parameters<Parameters<typeof test>[1]>[0],
  handler: Parameters<typeof createServer>[0],
) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  return { origin, local: { ...connection, baseUrl: origin } };
}

test("downloads only registered local ComfyUI /view results without retaining signed URLs", async (t) => {
  const { root, store } = await fixture(t);
  const { origin, local } = await serverFixture(t, (_request, response) => {
    response.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": validPng.length,
    });
    response.end(validPng);
  });
  const asset = await store.archive(
    {
      providerJobId: "local",
      index: 0,
      url: `${origin}/view?filename=secret-canary.png&token=canary`,
    },
    local,
  );
  assert.deepEqual(await store.read(asset), validPng);
  assert.equal(JSON.stringify(asset).includes("canary"), false);
  assert.deepEqual(await readdir(root), [asset.assetId]);
  await assert.rejects(
    store.archive(
      { providerJobId: "local", index: 0, url: `${origin}/history` },
      local,
    ),
    /ASSET_REMOTE_FORBIDDEN/,
  );
  await assert.rejects(
    store.archive(
      { providerJobId: "local", index: 0, url: `${origin}/view` },
      { ...local, baseUrl: "http://127.0.0.1:1" },
    ),
    /ASSET_REMOTE_FORBIDDEN/,
  );
});

test("expired URLs and redirects fail safely without exposing source URLs or error bodies", async (t) => {
  const { root, store } = await fixture(t);
  const { origin, local } = await serverFixture(t, (request, response) => {
    response.writeHead(request.url?.includes("redirect") ? 302 : 403, {
      Location: "http://169.254.169.254/latest/meta-data",
    });
    response.end("secret response body canary");
  });
  for (const suffix of ["expired", "redirect"]) {
    await assert.rejects(
      store.archive(
        {
          providerJobId: "local",
          index: 0,
          url: `${origin}/view?token=canary&${suffix}=1`,
        },
        local,
      ),
      (error: Error) => {
        assert.match(error.message, /ASSET_REMOTE_(?:EXPIRED|REDIRECT)/);
        assert.equal(String(error).includes("canary"), false);
        assert.equal(String(error).includes(origin), false);
        return true;
      },
    );
  }
  assert.deepEqual(await readdir(root), []);
});

test("rejects external loopback, private, metadata, non-HTTPS, and non-allowlisted origins", async (t) => {
  const origins = [
    "https://127.0.0.1",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]",
    "https://10.0.0.1",
    "https://169.254.169.254",
    "https://localhost",
    "http://example.com",
  ];
  const { store } = await fixture(t, { allowedRemoteOrigins: origins });
  for (const origin of [...origins, "https://example.com"]) {
    await assert.rejects(
      store.archive(
        { providerJobId: "remote", index: 0, url: `${origin}/output.png` },
        { ...connection, kind: "user_byok" },
      ),
      /ASSET_REMOTE_FORBIDDEN/,
    );
  }
});

test("enforces streaming byte limit and validates remote MIME and declared length", async (t) => {
  const { root, store } = await fixture(t, { maxBytes: validPng.length });
  const { origin, local } = await serverFixture(t, (request, response) => {
    const mode = request.url?.split("=")[1];
    response.writeHead(200, {
      "Content-Type": mode === "mime" ? "text/html" : "image/png",
      ...(mode === "length" ? { "Content-Length": validPng.length + 10 } : {}),
    });
    response.end(
      mode === "stream" ? Buffer.concat([validPng, validPng]) : validPng,
    );
  });
  for (const mode of ["stream", "mime", "length"]) {
    await assert.rejects(
      store.archive(
        {
          providerJobId: "local",
          index: 0,
          url: `${origin}/view?mode=${mode}`,
        },
        local,
      ),
      /ASSET_(?:TOO_LARGE|INVALID)/,
    );
  }
  assert.deepEqual(await readdir(root), []);
});

test("aborting a download leaves no stored object", async (t) => {
  const { root, store } = await fixture(t);
  const controller = new AbortController();
  const { origin, local } = await serverFixture(t, (_request, response) => {
    response.writeHead(200, { "Content-Type": "image/png" });
    response.write(validPng.subarray(0, 30));
    controller.abort();
  });
  await assert.rejects(
    store.archive(
      { providerJobId: "local", index: 0, url: `${origin}/view` },
      local,
      controller.signal,
    ),
    /ASSET_CANCELLED/,
  );
  assert.deepEqual(await readdir(root), []);
});
