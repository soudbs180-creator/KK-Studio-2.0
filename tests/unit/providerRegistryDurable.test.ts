import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  loadProviderConnectionsDurable,
  persistProviderConnectionsDurable,
  readProviderConnections,
} from "../../src/features/creation/providerRegistry.ts";

const CONNECTION: ProviderConnection = {
  id: "my-openai",
  provider: "OpenAI 兼容",
  kind: "user_byok",
  displayName: "我的 API",
  baseUrl: "https://api.example.com/v1",
  credentialRef: "cred-1",
  model: "gpt-5.5",
  capabilities: {
    modalities: ["text"],
    operations: ["generate"],
    async: false,
  },
  state: "active",
  concurrencyLimit: 4,
  verificationStatus: "unverified",
};

interface InvokeCall {
  command: string;
  args?: Record<string, unknown>;
}
const invokeCalls: InvokeCall[] = [];
let invokeImpl: (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown> = async () => {
  throw new Error("unexpected invoke");
};

function withTauriStorage(run: () => Promise<void>): Promise<void> {
  const storage = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "tauri:", hostname: "tauri.localhost" },
      navigator: {
        locks: {
          request: (
            _name: string,
            _options: unknown,
            run: () => Promise<unknown>,
          ) => run(),
        },
      },
      __TAURI_INTERNALS__: {
        invoke: (command: string, args?: Record<string, unknown>) => {
          invokeCalls.push({ command, args });
          return invokeImpl(command, args);
        },
      },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  return run().finally(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  });
}

function withWebStorage(run: () => Promise<void>): Promise<void> {
  const storage = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "https:", hostname: "example.com" },
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  return run().finally(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  });
}

test("桌面 load：native loaded 返回连接并刷新浏览器缓存", async () => {
  await withTauriStorage(async () => {
    invokeCalls.length = 0;
    invokeImpl = async () => ({
      status: "loaded",
      revision: 7,
      connections: [CONNECTION],
    });
    const loaded = await loadProviderConnectionsDurable();
    assert.equal(loaded?.length, 1);
    assert.equal(loaded?.[0].id, "my-openai");
    assert.equal(invokeCalls[0]?.command, "read_provider_config");
    assert.equal(readProviderConnections().length, 1);
  });
});

test("桌面 load：missing 返回 null 且不覆盖浏览器缓存", async () => {
  await withTauriStorage(async () => {
    invokeCalls.length = 0;
    invokeImpl = async () => ({
      status: "missing",
      revision: null,
      connections: [],
    });
    const loaded = await loadProviderConnectionsDurable();
    assert.equal(loaded, null);
    assert.equal(readProviderConnections().length, 0);
  });
});

test("桌面 load：recovered 备份被采用并刷新缓存", async () => {
  await withTauriStorage(async () => {
    invokeCalls.length = 0;
    invokeImpl = async () => ({
      status: "recovered",
      revision: 9,
      connections: [CONNECTION],
    });
    const loaded = await loadProviderConnectionsDurable();
    assert.equal(loaded?.length, 1);
    assert.equal(readProviderConnections().length, 1);
  });
});

test("桌面 persist：先 load 后写，携带 expectedRevision，成功后刷新缓存", async () => {
  await withTauriStorage(async () => {
    invokeCalls.length = 0;
    invokeImpl = async (command, _args) => {
      if (command === "read_provider_config")
        return { status: "loaded", revision: 7, connections: [] };
      if (command === "write_provider_config") return 8;
      throw new Error(`unexpected ${command}`);
    };
    await loadProviderConnectionsDurable();
    await persistProviderConnectionsDurable([CONNECTION]);
    const writeCall = invokeCalls.find(
      (call) => call.command === "write_provider_config",
    );
    assert.ok(writeCall, "write_provider_config must be invoked");
    assert.equal(writeCall.args?.expectedRevision, 7);
    const payload = JSON.stringify(writeCall.args?.connections);
    assert.equal(payload.includes("sk-"), false, "secret never serialized");
    assert.equal(readProviderConnections().length, 1);
  });
});

test("桌面 persist：conflict/失败时抛错且浏览器缓存不更新", async () => {
  await withTauriStorage(async () => {
    invokeCalls.length = 0;
    invokeImpl = async (command, _args) => {
      if (command === "read_provider_config")
        return { status: "loaded", revision: 7, connections: [] };
      if (command === "write_provider_config")
        throw new Error("conflict: 供应商配置已在其他窗口修改");
      throw new Error(`unexpected ${command}`);
    };
    await loadProviderConnectionsDurable();
    await assert.rejects(
      persistProviderConnectionsDurable([CONNECTION]),
      /conflict/,
    );
    assert.equal(readProviderConnections().length, 0, "cache stays untouched");
  });
});

test("Web 环境：load 与 persist 均为 no-op，不调用 invoke", async () => {
  await withWebStorage(async () => {
    invokeCalls.length = 0;
    const loaded = await loadProviderConnectionsDurable();
    assert.equal(loaded, null);
    await persistProviderConnectionsDurable([CONNECTION]);
    assert.equal(invokeCalls.length, 0, "no native commands on web");
  });
});
