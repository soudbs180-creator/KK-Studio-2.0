import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import { CompanionStore } from "../../src/features/local-service/store.ts";
import { createCompanionServer } from "../../src/features/local-service/server.ts";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";

const origin = "http://127.0.0.1:1421";
const bytes = new Uint8Array([1, 2, 3]);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const metadata = {
  assetId: `asset-${sha256.slice(0, 24)}`,
  sha256,
  mime: "image/png",
  size: bytes.byteLength,
  tags: ["AI生成"],
};

async function runningServer(maxBodyBytes = 120 * 1024 * 1024) {
  const root = mkdtempSync(join(tmpdir(), "kk-companion-http-"));
  const server = createCompanionServer({
    store: new CompanionStore(root),
    allowedOrigins: [origin],
    pairingCode: "pair-code-123",
    deviceId: "device-test",
    maxBodyBytes,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  return {
    server,
    base,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
}

async function jsonResponse(response: Response): Promise<any> {
  return response.json();
}

async function pair(base: string): Promise<string> {
  const response = await fetch(`${base}/v1/pair`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ code: "pair-code-123" }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie ?? "", /kk_companion_session=[^;]+; HttpOnly/);
  return cookie!.split(";", 1)[0];
}

test("health honors exact CORS origins and exposes protocol metadata", async () => {
  const app = await runningServer();
  try {
    const ok = await fetch(`${app.base}/health`, {
      headers: { Origin: origin },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("access-control-allow-origin"), origin);
    assert.deepEqual(await jsonResponse(ok), {
      status: "ok",
      service: "kk-local-companion",
      protocolVersion: 1,
      deviceId: "device-test",
    });
    const forbidden = await fetch(`${app.base}/health`, {
      headers: { Origin: "http://evil.test" },
    });
    assert.equal(forbidden.status, 403);
    assert.deepEqual(await jsonResponse(forbidden), {
      error: "ORIGIN_FORBIDDEN",
    });
  } finally {
    await app.close();
  }
});

test("pairing is one-time and authenticated routes require the HttpOnly cookie", async () => {
  const app = await runningServer();
  try {
    const unauthenticated = await fetch(`${app.base}/v1/snapshot`, {
      headers: { Origin: origin },
    });
    assert.equal(unauthenticated.status, 401);
    assert.deepEqual(await jsonResponse(unauthenticated), {
      error: "UNAUTHENTICATED",
    });
    const cookie = await pair(app.base);
    const loaded = await fetch(`${app.base}/v1/snapshot`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(loaded.status, 200);
    assert.deepEqual(await jsonResponse(loaded), {
      status: "missing",
      snapshot: null,
      revision: null,
    });
    const replay = await fetch(`${app.base}/v1/pair`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ code: "pair-code-123" }),
    });
    assert.equal(replay.status, 401);
    assert.deepEqual(await jsonResponse(replay), { error: "PAIRING_USED" });
  } finally {
    await app.close();
  }
});

test("snapshot writes use expected revision and stale clients get 409", async () => {
  const app = await runningServer();
  try {
    const cookie = await pair(app.base);
    const initial = emptySnapshot();
    const first = await fetch(`${app.base}/v1/snapshot`, {
      method: "PUT",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expectedRevision: null, snapshot: initial }),
    });
    assert.equal(first.status, 200);
    assert.deepEqual(await jsonResponse(first), {
      status: "saved",
      revision: 0,
    });
    const stale = await fetch(`${app.base}/v1/snapshot`, {
      method: "PUT",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: null,
        snapshot: { ...initial, revision: 1 },
      }),
    });
    assert.equal(stale.status, 409);
    assert.deepEqual(await jsonResponse(stale), { error: "CONFLICT" });
  } finally {
    await app.close();
  }
});

test("asset PUT and GET keep the content-addressed identity", async () => {
  const app = await runningServer();
  try {
    const cookie = await pair(app.base);
    const put = await fetch(`${app.base}/v1/assets/${metadata.assetId}`, {
      method: "PUT",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/octet-stream",
        "X-KK-Asset-Metadata": Buffer.from(JSON.stringify(metadata)).toString(
          "base64url",
        ),
      },
      body: bytes,
    });
    assert.equal(put.status, 201);
    assert.deepEqual((await jsonResponse(put)).metadata, metadata);
    const get = await fetch(`${app.base}/v1/assets/${metadata.assetId}`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(get.status, 200);
    assert.equal(get.headers.get("content-type"), "image/png");
    assert.deepEqual(new Uint8Array(await get.arrayBuffer()), bytes);
  } finally {
    await app.close();
  }
});

test("body limits reject oversized requests before store mutation", async () => {
  const app = await runningServer(64);
  try {
    const cookie = await pair(app.base);
    const response = await fetch(`${app.base}/v1/snapshot`, {
      method: "PUT",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expectedRevision: null,
        snapshot: emptySnapshot(),
      }),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(await jsonResponse(response), { error: "BODY_TOO_LARGE" });
    const loaded = await fetch(`${app.base}/v1/snapshot`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal((await jsonResponse(loaded)).status, "missing");
  } finally {
    await app.close();
  }
});
