import assert from "node:assert/strict";
import test from "node:test";
import {
  listStoredAssets,
  loadStoredAsset,
  storeGeneratedAsset,
} from "../../src/features/creation/assetRepository.ts";
import {
  COMPANION_CONNECTION_STORAGE_KEY,
  type CompanionConnection,
} from "../../src/features/local-service/connection.ts";

const source =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("归档没有可用存储时必须拒绝成功", async () => {
  await assert.rejects(storeGeneratedAsset({ source }), /存储|归档/);
});

test("Desktop 归档发送原件与无预览元数据，错误不会回退到浏览器", async () => {
  const calls: Array<{
    command: string;
    args: {
      dataBase64: string;
      metadata: { sha256: string; [key: string]: unknown };
    };
  }> = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (
          command: string,
          args: {
            dataBase64: string;
            metadata: { sha256: string; [key: string]: unknown };
          },
        ) => {
          calls.push({ command, args });
          throw new Error("synthetic native failure");
        },
      },
    },
  });
  try {
    await assert.rejects(
      storeGeneratedAsset({ source }),
      /synthetic native failure/,
    );
    assert.equal(calls[0].command, "asset_store");
    assert.equal(calls[0].args.dataBase64, source.split(",")[1]);
    assert.equal("preview" in calls[0].args.metadata, false);
    assert.match(calls[0].args.metadata.sha256, /^[a-f0-9]{64}$/);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("Web 连接本机服务后资产读写走服务而不创建浏览器归档", async () => {
  const sourceBytes = Uint8Array.from([1, 2, 3, 4]);
  const source = `data:image/png;base64,${Buffer.from(sourceBytes).toString("base64")}`;
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size;
    },
  } as unknown as Storage;
  const connection: CompanionConnection = {
    version: 1,
    endpoint: "http://127.0.0.1:4319",
    deviceId: "device-test",
    protocolVersion: 1,
    enabled: true,
  };
  localStorage.setItem(
    COMPANION_CONNECTION_STORAGE_KEY,
    JSON.stringify(connection),
  );
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (
        url.endsWith("/v1/assets/asset-9f64a747e1b97f131fabb6b4") &&
        init?.method === "PUT"
      ) {
        const headers = new Headers(init.headers);
        const encoded = headers.get("X-KK-Asset-Metadata");
        assert.ok(encoded);
        return new Response(
          JSON.stringify({
            metadata: JSON.parse(Buffer.from(encoded, "base64url").toString()),
          }),
          { status: 201 },
        );
      }
      if (
        url.includes("/v1/assets?") &&
        (!init?.method || init.method === "GET")
      ) {
        const metadata = {
          assetId: "asset-9f64a747e1b97f131fabb6b4",
          sha256:
            "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
          mime: "image/png",
          size: 4,
          tags: ["AI生成"],
          source: "provider",
          provenance: { generatedAt: new Date().toISOString() },
        };
        return new Response(JSON.stringify({ assets: [metadata] }), {
          status: 200,
        });
      }
      if (url.endsWith("/v1/assets/asset-9f64a747e1b97f131fabb6b4")) {
        const metadata = {
          assetId: "asset-9f64a747e1b97f131fabb6b4",
          sha256:
            "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
          mime: "image/png",
          size: 4,
          tags: ["AI生成"],
          source: "provider",
          provenance: { generatedAt: new Date().toISOString() },
        };
        return new Response(sourceBytes, {
          status: 200,
          headers: {
            "X-KK-Asset-Metadata": Buffer.from(
              JSON.stringify(metadata),
            ).toString("base64url"),
          },
        });
      }
      throw new Error(`unexpected companion request: ${url}`);
    },
  });
  try {
    const stored = await storeGeneratedAsset({ source });
    assert.equal(stored.assetId, "asset-9f64a747e1b97f131fabb6b4");
    assert.equal(
      calls.some(
        ({ url, init }) =>
          url.endsWith("/v1/assets/asset-9f64a747e1b97f131fabb6b4") &&
          init?.method === "PUT",
      ),
      true,
    );
    const loaded = await loadStoredAsset("asset-9f64a747e1b97f131fabb6b4");
    assert.equal(loaded?.preview.startsWith("data:image/png;base64,"), true);
    const listed = await listStoredAssets();
    assert.equal(listed[0]?.assetId, "asset-9f64a747e1b97f131fabb6b4");
  } finally {
    if (originalFetch)
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: originalFetch,
      });
    else Reflect.deleteProperty(globalThis, "fetch");
    Reflect.deleteProperty(globalThis, "window");
  }
});
