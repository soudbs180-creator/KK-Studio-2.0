import assert from "node:assert/strict";
import test from "node:test";
import { emptySnapshot } from "../../src/features/creation/model.ts";
import {
  CompanionClient,
  CompanionClientError,
} from "../../src/features/local-service/client.ts";
import {
  COMPANION_CONNECTION_STORAGE_KEY,
  normalizeCompanionEndpoint,
  readCompanionConnection,
} from "../../src/features/local-service/connection.ts";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const health = {
  status: "ok",
  service: "kk-local-companion",
  protocolVersion: 1,
  deviceId: "device-a",
};

test("connection endpoints stay loopback-only and metadata contains no session token", () => {
  assert.equal(
    normalizeCompanionEndpoint("http://127.0.0.1:4319/"),
    "http://127.0.0.1:4319",
  );
  assert.throws(() => normalizeCompanionEndpoint("https://example.com"));
  assert.throws(() => normalizeCompanionEndpoint("http://127.0.0.1:4319/?x=1"));
  const storage = new MemoryStorage();
  storage.setItem(
    COMPANION_CONNECTION_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      endpoint: "http://127.0.0.1:4319",
      deviceId: "device-a",
      protocolVersion: 1,
      enabled: true,
      token: "must-not-be-accepted",
    }),
  );
  const connection = readCompanionConnection(storage);
  assert.equal(connection?.enabled, true);
  assert.equal("token" in (connection ?? {}), false);
});

test("pairing uses HttpOnly cookie credentials and stores only non-secret connection metadata", async () => {
  const storage = new MemoryStorage();
  const calls: RequestInit[] = [];
  const client = new CompanionClient({
    storage,
    fetch: async (_input, init) => {
      calls.push(init ?? {});
      return response({ protocolVersion: 1, deviceId: "device-a" });
    },
  });
  const connection = await client.pairCompanion(
    "http://127.0.0.1:4319/",
    "12345678",
  );
  assert.deepEqual(connection, {
    version: 1,
    endpoint: "http://127.0.0.1:4319",
    deviceId: "device-a",
    protocolVersion: 1,
    enabled: true,
  });
  assert.equal(calls[0]?.credentials, "include");
  assert.equal(storage.getItem("kk-studio-next:companion:token"), null);
  assert.deepEqual(
    JSON.parse(storage.getItem(COMPANION_CONNECTION_STORAGE_KEY)!),
    connection,
  );
});

test("service checks distinguish offline, unauthenticated, and protocol incompatibility", async () => {
  const storage = new MemoryStorage();
  const client = new CompanionClient({
    storage,
    fetch: async (input) =>
      String(input).endsWith("/v1/pair")
        ? response({ protocolVersion: 1, deviceId: "device-a" })
        : response(health),
  });
  await client.pairCompanion("http://127.0.0.1:4319", "12345678");
  assert.equal((await client.checkCompanion()).state, "connected");

  const offline = new CompanionClient({
    storage,
    fetch: async () => {
      throw new TypeError("fetch failed");
    },
  });
  const offlineResult = await offline.checkCompanion();
  assert.equal(offlineResult.state, "offline");
  assert.equal(offlineResult.error?.code, "SERVICE_UNAVAILABLE");

  const unauthenticated = new CompanionClient({
    storage,
    fetch: async () => response({ error: "UNAUTHENTICATED" }, 401),
  });
  const unauthenticatedResult = await unauthenticated.checkCompanion();
  assert.equal(unauthenticatedResult.state, "unauthenticated");
  assert.equal(unauthenticatedResult.error?.code, "UNAUTHENTICATED");

  const incompatible = new CompanionClient({
    storage,
    fetch: async () => response({ ...health, protocolVersion: 999 }),
  });
  const incompatibleResult = await incompatible.checkCompanion();
  assert.equal(incompatibleResult.state, "migration-required");
  assert.equal(incompatibleResult.error?.code, "PROTOCOL_UNSUPPORTED");
});

test("snapshot writes only report success after a 2xx and preserve conflict details", async () => {
  const storage = new MemoryStorage();
  const snapshot = emptySnapshot();
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const client = new CompanionClient({
    storage,
    fetch: async (input, init) => {
      requests.push({ url: String(input), init: init ?? {} });
      if (String(input).endsWith("/v1/pair"))
        return response({ protocolVersion: 1, deviceId: "device-a" });
      if (
        String(input).endsWith("/v1/snapshot") &&
        (!init?.method || init.method === "GET")
      )
        return response({ status: "missing", snapshot: null, revision: null });
      return response({ status: "saved", revision: snapshot.revision });
    },
  });
  await client.pairCompanion("http://127.0.0.1:4319", "12345678");
  const loaded = await client.loadCompanionSnapshot();
  assert.equal(loaded.status, "missing");
  const saved = await client.persistCompanionSnapshot(snapshot, null);
  assert.equal(saved.revision, 0);
  assert.equal(requests.at(-1)?.init.credentials, "include");

  const conflict = new CompanionClient({
    storage,
    fetch: async (input) =>
      String(input).endsWith("/v1/pair")
        ? response({ protocolVersion: 1, deviceId: "device-a" })
        : response({ error: "CONFLICT" }, 409),
  });
  await assert.rejects(
    () => conflict.persistCompanionSnapshot({ ...snapshot, revision: 1 }, 0),
    (error: unknown) =>
      error instanceof CompanionClientError &&
      error.code === "CONFLICT" &&
      error.status === 409,
  );
});

test("disconnect revokes the session and clears the connection metadata", async () => {
  const storage = new MemoryStorage();
  const methods: string[] = [];
  const client = new CompanionClient({
    storage,
    fetch: async (input, init) => {
      methods.push(init?.method ?? "GET");
      if (String(input).endsWith("/v1/pair"))
        return response({ protocolVersion: 1, deviceId: "device-a" });
      return new Response(null, {
        status: init?.method === "DELETE" ? 204 : 200,
      });
    },
  });
  await client.pairCompanion("http://127.0.0.1:4319", "12345678");
  await client.disconnectCompanion();
  assert.deepEqual(methods, ["POST", "DELETE"]);
  assert.equal(readCompanionConnection(storage), null);
});

test("disconnect clears local metadata when the service is already offline", async () => {
  const storage = new MemoryStorage();
  const client = new CompanionClient({
    storage,
    fetch: async (input) =>
      String(input).endsWith("/v1/pair")
        ? response({ protocolVersion: 1, deviceId: "device-a" })
        : (() => {
            throw new TypeError("fetch failed");
          })(),
  });
  await client.pairCompanion("http://127.0.0.1:4319", "12345678");
  await assert.rejects(() => client.disconnectCompanion(), /本机服务未运行/);
  assert.equal(readCompanionConnection(storage), null);
});

test("asset adapter sends encoded metadata and verifies the response identity", async () => {
  const storage = new MemoryStorage();
  const bytes = new Uint8Array([1, 2, 3]);
  const sha256 =
    "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81";
  const metadata = {
    assetId: `asset-${sha256.slice(0, 24)}`,
    sha256,
    mime: "image/png",
    size: bytes.byteLength,
    tags: ["迁移"],
  };
  const client = new CompanionClient({
    storage,
    fetch: async (input, init) => {
      if (String(input).endsWith("/v1/pair"))
        return response({ protocolVersion: 1, deviceId: "device-a" });
      if (init?.method === "PUT") {
        const header = String(
          (init.headers as Record<string, string>)["X-KK-Asset-Metadata"],
        );
        assert.deepEqual(
          JSON.parse(
            Buffer.from(
              header.replaceAll("-", "+").replaceAll("_", "/"),
              "base64",
            ).toString(),
          ),
          metadata,
        );
        return response({ metadata }, 201);
      }
      return new Response(bytes, {
        status: 200,
        headers: {
          "X-KK-Asset-Metadata": Buffer.from(JSON.stringify(metadata)).toString(
            "base64url",
          ),
          "Content-Type": "image/png",
        },
      });
    },
  });
  await client.pairCompanion("http://127.0.0.1:4319", "12345678");
  assert.deepEqual(await client.putCompanionAsset(metadata, bytes), metadata);
  const loaded = await client.loadCompanionAsset(metadata.assetId);
  assert.deepEqual(loaded.metadata, metadata);
  assert.deepEqual(loaded.bytes, bytes);
});
