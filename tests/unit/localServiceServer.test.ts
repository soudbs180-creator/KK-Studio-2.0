import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import { CompanionStore } from "../../src/features/local-service/store.ts";
import { createCompanionServer } from "../../src/features/local-service/server.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { sha256Json } from "../../src/features/local-service/manifest.ts";
import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

async function jsonResponse<T = Record<string, unknown>>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
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
    assert.deepEqual(
      JSON.parse(
        Buffer.from(
          get.headers.get("x-kk-asset-metadata")!,
          "base64url",
        ).toString(),
      ),
      metadata,
    );
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

test("migration preflight stages assets before publishing one checked snapshot", async () => {
  const app = await runningServer();
  try {
    const cookie = await pair(app.base);
    const snapshot = emptySnapshot();
    const bytes = new Uint8Array([4, 5, 6]);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const metadata = {
      assetId: `asset-${digest.slice(0, 24)}`,
      sha256: digest,
      mime: "image/png",
      size: bytes.byteLength,
      tags: ["迁移"],
    };
    snapshot.homeDraft.attachments = [
      {
        id: "migration-attachment",
        assetId: metadata.assetId,
        name: "migrated.png",
        mime: metadata.mime,
        size: bytes.byteLength,
        dataUrl: `kk-asset:${metadata.assetId}`,
      },
    ];
    const manifestSha256 = sha256Json({
      snapshot: decodeSnapshot(snapshot),
      assets: [metadata],
    });
    const preflight = await fetch(`${app.base}/v1/migration/preflight`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ snapshot, assets: [metadata], manifestSha256 }),
    });
    assert.equal(preflight.status, 200);
    const receipt = await jsonResponse(preflight);
    assert.equal(receipt.status, "ready");
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
    const imported = await fetch(`${app.base}/v1/migration/import`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportId: receipt.reportId,
        manifestSha256,
        expectedRevision: null,
        snapshot,
      }),
    });
    assert.equal(imported.status, 200);
    const loaded = await fetch(`${app.base}/v1/snapshot`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    const loadedBody = await jsonResponse<{
      status: string;
      snapshot: { homeDraft: { attachments: Array<{ assetId: string }> } };
    }>(loaded);
    assert.equal(loadedBody.status, "loaded");
    assert.equal(
      loadedBody.snapshot.homeDraft.attachments[0].assetId,
      metadata.assetId,
    );
  } finally {
    await app.close();
  }
});

test("backup export, listing, and restore keep the service snapshot recoverable", async () => {
  const app = await runningServer();
  try {
    const cookie = await pair(app.base);
    const initial = emptySnapshot();
    const write = (snapshot: typeof initial, expectedRevision: number | null) =>
      fetch(`${app.base}/v1/snapshot`, {
        method: "PUT",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ snapshot, expectedRevision }),
      });
    assert.equal((await write(initial, null)).status, 200);
    const exported = await fetch(`${app.base}/v1/backups/export`, {
      method: "POST",
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(exported.status, 200);
    const backup = await jsonResponse<{ status: string; backupId: string }>(
      exported,
    );
    assert.equal(backup.status, "created");
    const listed = await fetch(`${app.base}/v1/backups`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    const listedBody = await jsonResponse<{ backups: unknown[] }>(listed);
    assert.equal(listedBody.backups.length, 1);
    const next = { ...initial, revision: 1 };
    assert.equal((await write(next, 0)).status, 200);
    const restored = await fetch(`${app.base}/v1/backups/restore`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ backupId: backup.backupId }),
    });
    assert.equal(restored.status, 200);
    assert.equal((await jsonResponse(restored)).revision, 0);
    const loaded = await fetch(`${app.base}/v1/snapshot`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal((await jsonResponse(loaded)).revision, 0);
  } finally {
    await app.close();
  }
});
