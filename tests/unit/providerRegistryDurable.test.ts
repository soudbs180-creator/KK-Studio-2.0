import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../src/domain/modelProvider.ts";
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
    assert.equal(window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY), null);
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

test("桌面重启：恢复选中账号的新模型和配置，重复读取不写原生存储", async () => {
  await withTauriStorage(async () => {
    const oldProfile = {
      version: 1,
      name: "旧名称",
      baseUrl: "https://old.example/v1",
      model: "old-model",
      connectionId: CONNECTION.id,
    };
    window.localStorage.setItem(
      MODEL_PROVIDER_STORAGE_KEY,
      JSON.stringify(oldProfile),
    );
    invokeCalls.length = 0;
    invokeImpl = async (command) => {
      assert.equal(command, "read_provider_config");
      return { status: "loaded", revision: 8, connections: [CONNECTION] };
    };
    for (let restart = 0; restart < 2; restart++) {
      await loadProviderConnectionsDurable();
      assert.deepEqual(
        JSON.parse(window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)!),
        {
          version: 1,
          name: CONNECTION.provider,
          baseUrl: CONNECTION.baseUrl,
          model: CONNECTION.model,
          connectionId: CONNECTION.id,
        },
      );
      assert.equal(readProviderConnections()[0]?.credentialRef, "cred-1");
    }
    assert.deepEqual(
      invokeCalls.map((call) => call.command),
      ["read_provider_config", "read_provider_config"],
    );
  });
});

test("桌面恢复：唯一旧账号可恢复，缺失、损坏、歧义或已移除的选择保持原样", async () => {
  await withTauriStorage(async () => {
    const legacy = {
      version: 1,
      name: CONNECTION.provider,
      baseUrl: CONNECTION.baseUrl,
      model: "old-model",
    };
    invokeImpl = async () => ({
      status: "loaded",
      revision: 8,
      connections: [CONNECTION],
    });
    window.localStorage.setItem(
      MODEL_PROVIDER_STORAGE_KEY,
      JSON.stringify(legacy),
    );
    await loadProviderConnectionsDurable();
    assert.equal(
      JSON.parse(window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY)!)
        .connectionId,
      CONNECTION.id,
    );
    for (const raw of [
      "",
      "{broken",
      JSON.stringify({ ...legacy, connectionId: "removed-account" }),
      JSON.stringify(legacy),
    ]) {
      invokeImpl = async () => ({
        status: "loaded",
        revision: 8,
        connections: [
          CONNECTION,
          { ...CONNECTION, id: "another-account", credentialRef: "cred-2" },
        ],
      });
      window.localStorage.setItem(MODEL_PROVIDER_STORAGE_KEY, raw);
      await loadProviderConnectionsDurable();
      assert.equal(
        window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
        raw,
      );
    }
  });
});

test("桌面恢复：重复身份或不完整条目不覆盖已有选择", async () => {
  await withTauriStorage(async () => {
    const selected = JSON.stringify({
      version: 1,
      name: CONNECTION.provider,
      baseUrl: CONNECTION.baseUrl,
      model: "old-model",
      connectionId: CONNECTION.id,
    });
    for (const connections of [
      [CONNECTION, { ...CONNECTION, credentialRef: "duplicate-ref" }],
      [{ ...CONNECTION, model: undefined }],
      [{ ...CONNECTION, baseUrl: undefined }],
    ]) {
      invokeImpl = async () => ({ status: "loaded", revision: 8, connections });
      window.localStorage.setItem(MODEL_PROVIDER_STORAGE_KEY, selected);
      await loadProviderConnectionsDurable();
      assert.equal(
        window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
        selected,
      );
    }
  });
});

test("桌面恢复：不发布缓存时保留旧选择，缓存写入失败不写配置或凭据", async () => {
  await withTauriStorage(async () => {
    const raw = JSON.stringify({
      version: 1,
      name: CONNECTION.provider,
      baseUrl: CONNECTION.baseUrl,
      model: "old-model",
      connectionId: CONNECTION.id,
    });
    window.localStorage.setItem(MODEL_PROVIDER_STORAGE_KEY, raw);
    invokeCalls.length = 0;
    invokeImpl = async (command) => {
      assert.equal(command, "read_provider_config");
      return { status: "loaded", revision: 8, connections: [CONNECTION] };
    };
    await loadProviderConnectionsDurable({ publishCache: false });
    assert.equal(window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY), raw);
    assert.equal(readProviderConnections().length, 0);
    const write = window.localStorage.setItem;
    window.localStorage.setItem = (key, value) => {
      if (key === MODEL_PROVIDER_STORAGE_KEY) throw new Error("cache full");
      write(key, value);
    };
    await assert.rejects(loadProviderConnectionsDurable(), /无法刷新页面缓存/);
    assert.equal(window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY), raw);
    assert.equal(readProviderConnections()[0]?.credentialRef, "cred-1");
    assert.equal(invokeCalls.length, 2);
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
