import assert from "node:assert/strict";
import test from "node:test";
import { createPluginLoader } from "../../src/features/plugins/pluginLoader.ts";
import { createPluginStore } from "../../src/features/plugins/pluginStore.ts";
import {
  getPluginNodeDefinition,
  hasPluginNodeType,
} from "../../src/features/plugins/nodeRegistry.ts";
import {
  clearLog,
  configureLogSink,
  getLogEntries,
} from "../../src/runtime/logger.ts";
import type { CanvasPlugin } from "../../src/features/plugins/pluginTypes.ts";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const runtime = {
  React: {} as never,
  jsx: (() => {}) as never,
  Fragment: {} as never,
  version: "2.1.0",
  emit: () => undefined,
  on: () => () => undefined,
  injectCSS: () => () => undefined,
};

function samplePlugin(): CanvasPlugin {
  return {
    id: "sample",
    name: "示例插件",
    version: "1.0.0",
    description: "测试用",
    css: ".sample { color: red; }",
    nodes: [
      {
        type: "sample:card",
        title: "示例卡片",
        icon: "🧪",
        defaultSize: { width: 200, height: 120 },
        Content: () => null,
      },
    ],
    setup: () => () => undefined,
  };
}

function loaderHarness() {
  const store = createPluginStore(memoryStorage());
  const calls: string[] = [];
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("index.json"))
        return jsonResponse(["/plugins/sample.js"]);
      if (url.includes("sample.js")) return jsonResponse({ ok: true });
      return jsonResponse({ error: "not found" }, 404);
    }) as typeof fetch,
    importModule: async (_source) => {
      // 工厂形式：source 无关，直接返回插件的工厂结果。
      const plugin = samplePlugin();
      return { default: () => plugin };
    },
  });
  return { store, loader, calls };
}

test("installFromUrl：求值工厂、登记节点、写 store 并激活", async () => {
  const { store, loader } = loaderHarness();
  const plugin = await loader.installFromUrl("https://cdn.example/sample.js");
  assert.equal(plugin.id, "sample");
  assert.equal(getPluginNodeDefinition("sample:card")?.title, "示例卡片");
  assert.ok(hasPluginNodeType("sample:card"));
  const record = store.getState().plugins.find((item) => item.id === "sample");
  assert.ok(record);
  assert.equal(record?.enabled, true);
  assert.equal(record?.url, "https://cdn.example/sample.js");
  assert.ok(loader.isLoaded("sample"));
});

test("setPluginEnabled：禁用卸载节点与样式，重新启用恢复", async () => {
  const { store, loader } = loaderHarness();
  await loader.installFromUrl("https://cdn.example/sample.js");
  const record = store.getState().plugins[0];
  await loader.setPluginEnabled(record, false);
  assert.equal(store.getState().plugins[0].enabled, false);
  assert.equal(hasPluginNodeType("sample:card"), false);
  assert.equal(loader.isLoaded("sample"), false);

  await loader.setPluginEnabled(record, true);
  assert.equal(hasPluginNodeType("sample:card"), true);
  assert.ok(loader.isLoaded("sample"));
});

test("uninstall：清 store 并卸载节点", async () => {
  const { store, loader } = loaderHarness();
  await loader.installFromUrl("https://cdn.example/sample.js");
  loader.uninstallPlugin("sample");
  assert.equal(store.getState().plugins.length, 0);
  assert.equal(hasPluginNodeType("sample:card"), false);
  assert.equal(loader.isLoaded("sample"), false);
});

test("ensurePluginsLoaded：rehydrate → 发现本地插件 → 只激活启用项", async () => {
  const { store, loader, calls } = loaderHarness();
  // 预置一个启用、一个禁用（跳过本地清单的默认禁用）。
  store.upsert({
    id: "sample",
    name: "示例插件",
    version: "1.0.0",
    url: "/plugins/sample.js",
    source: "// source",
    enabled: true,
    local: true,
  });
  await loader.ensurePluginsLoaded();
  assert.ok(calls.some((url) => url.includes("index.json")));
  assert.ok(hasPluginNodeType("sample:card"));
  // 本地清单发现的插件：已有记录沿用启停状态，否则默认启用。
  const discovered = store
    .getState()
    .plugins.find((item) => item.id === "sample");
  assert.equal(discovered?.local, true);
  assert.equal(discovered?.enabled, true);
  assert.ok(calls.some((url) => url.includes("t=")));
});

test("随包插件从同源模块 URL 直接导入，不生成 blob 模块", async () => {
  const store = createPluginStore(memoryStorage());
  const moduleUrls: string[] = [];
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("index.json"))
        return jsonResponse(["/plugins/sample.js"]);
      return new Response("export default {}", { status: 200 });
    }) as typeof fetch,
    importUrl: async (url) => {
      moduleUrls.push(url);
      return { default: () => samplePlugin() };
    },
  });

  await loader.ensurePluginsLoaded();
  assert.ok(moduleUrls.length >= 2, "发现与激活都应走同源模块导入");
  assert.ok(moduleUrls.every((url) => url.startsWith("/plugins/sample.js?t=")));
  assert.ok(moduleUrls.every((url) => !url.startsWith("blob:")));
  assert.ok(loader.isLoaded("sample"));
  loader.uninstallPlugin("sample");
});

test("update：带缓存戳重新拉取并替换版本", async () => {
  const { store, loader, calls } = loaderHarness();
  await loader.installFromUrl("https://cdn.example/sample.js");
  const record = store.getState().plugins[0];
  await loader.updatePlugin(record);
  assert.ok(calls.some((url) => url.includes("t=")));
  assert.equal(store.getState().plugins[0].version, "1.0.0");
});

test("无效导出被拒绝", async () => {
  const store = createPluginStore(memoryStorage());
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async () => jsonResponse({})) as typeof fetch,
    importModule: async () => ({ default: { id: "missing-nodes" } }),
  });
  await assert.rejects(
    () => loader.installFromUrl("https://cdn.example/bad.js"),
    /缺少 id 或 nodes/,
  );
});

test("远程插件拒绝明文、凭据和片段地址，且不发起下载", async () => {
  const { loader, calls } = loaderHarness();
  for (const url of [
    "http://cdn.example/sample.js",
    "https://user:pass@cdn.example/sample.js",
    "https://cdn.example/sample.js#hidden",
  ]) {
    await assert.rejects(() => loader.installFromUrl(url), /HTTPS 插件地址/);
  }
  assert.deepEqual(calls, []);
});

test("远程插件拒绝从 HTTPS 重定向到明文响应", async () => {
  let imports = 0;
  const loader = createPluginLoader({
    store: createPluginStore(memoryStorage()),
    runtime,
    fetcher: (async () => ({
      ok: true,
      url: "http://cdn.example/plugin.js",
      text: async () => "// plugin",
    })) as typeof fetch,
    importModule: async () => {
      imports += 1;
      return { default: samplePlugin() };
    },
  });
  await assert.rejects(
    () => loader.installFromUrl("https://cdn.example/plugin.js"),
    /HTTPS 插件地址/,
  );
  assert.equal(imports, 0);
});

test("远程插件禁止自动重定向，避免中途经过明文地址", async () => {
  let imports = 0;
  let redirectMode: RequestRedirect | undefined;
  const loader = createPluginLoader({
    store: createPluginStore(memoryStorage()),
    runtime,
    fetcher: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      redirectMode = init?.redirect;
      if (init?.redirect === "error") throw new TypeError("redirect blocked");
      return {
        ok: true,
        url: "https://cdn.example/plugin.js",
        text: async () => "// source after an insecure intermediate hop",
      };
    }) as typeof fetch,
    importModule: async () => {
      imports += 1;
      return { default: samplePlugin() };
    },
  });
  await assert.rejects(
    () => loader.installFromUrl("https://cdn.example/plugin.js"),
    /redirect blocked/,
  );
  assert.equal(redirectMode, "error");
  assert.equal(imports, 0);
});

test("旧版明文插件缓存不会在启动或重新启用时执行", async () => {
  const store = createPluginStore(memoryStorage());
  store.upsert({
    id: "legacy-http",
    name: "旧版明文插件",
    version: "1.0.0",
    url: "http://cdn.example/plugin.js",
    source: "// cached code",
    enabled: true,
  });
  let imports = 0;
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async () => jsonResponse([])) as typeof fetch,
    importModule: async () => {
      imports += 1;
      return { default: samplePlugin() };
    },
  });
  await loader.ensurePluginsLoaded();
  assert.equal(imports, 0);
  assert.equal(store.getState().plugins[0].enabled, false);
  await assert.rejects(
    () => loader.setPluginEnabled(store.getState().plugins[0], true),
    /HTTPS 插件地址/,
  );
  assert.equal(store.getState().plugins[0].enabled, false);
  assert.equal(imports, 0);
});

test("deactivate 执行 setup/css 清理", async () => {
  loaderHarness();
  let setupRan = false;
  let cleanupRan = false;
  const store = createPluginStore(memoryStorage());
  const custom = createPluginLoader({
    store,
    runtime,
    fetcher: (async () => jsonResponse({})) as typeof fetch,
    importModule: async () => ({
      default: {
        id: "cleanup",
        name: "清理测试",
        version: "1.0.0",
        css: ".x{}",
        nodes: [
          {
            type: "cleanup:node",
            title: "N",
            icon: "x",
            defaultSize: { width: 1, height: 1 },
            Content: () => null,
          },
        ],
        setup: () => {
          setupRan = true;
          return () => {
            cleanupRan = true;
          };
        },
      },
    }),
  });
  const plugin = (await custom.installFromUrl(
    "https://cdn.example/x.js",
  )) as CanvasPlugin;
  assert.equal(setupRan, true);
  custom.deactivatePlugin(plugin.id);
  assert.equal(cleanupRan, true);
  assert.equal(hasPluginNodeType("cleanup:node"), false);
});

test("事件总线隔离同步异常和异步拒绝，且继续通知其他订阅者", async () => {
  clearLog();
  const received: unknown[] = [];
  configureLogSink((entry) => received.push(entry));
  try {
    const loader = createPluginLoader();
    const calls: string[] = [];
    loader.getBus().on("ready", async () => {
      calls.push("async");
      throw new Error("api_key=should-not-leak");
    });
    loader.getBus().on("ready", () => {
      calls.push("sync");
      throw new Proxy(
        {},
        {
          ownKeys() {
            throw new Error("hostile proxy");
          },
        },
      );
    });
    loader.getBus().on("ready", () => calls.push("after"));

    loader.getBus().emit("ready");
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(calls, ["async", "sync", "after"]);
    assert.equal(received.length, 2);
    const diagnostics = JSON.stringify(getLogEntries());
    assert.doesNotMatch(diagnostics, /should-not-leak/);
    assert.doesNotMatch(diagnostics, /hostile proxy/);
  } finally {
    configureLogSink(null);
  }
});

test("updating a disabled plugin keeps it disabled and does not run setup", async () => {
  const store = createPluginStore(memoryStorage());
  let setups = 0;
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async () => new Response("fixture")) as typeof fetch,
    importModule: async () => ({
      default: {
        ...samplePlugin(),
        setup: () => {
          setups += 1;
        },
      },
    }),
  });
  store.upsert({
    id: "sample",
    name: "Fixture",
    version: "0",
    url: "https://example.test/sample.js",
    source: "old",
    enabled: false,
  });
  await loader.updatePlugin(store.getState().plugins[0]);
  assert.equal(store.getState().plugins[0].enabled, false);
  assert.equal(loader.isLoaded("sample"), false);
  assert.equal(setups, 0);
});

test("failed plugin activation preserves the disabled record and releases setup listeners", async () => {
  const store = createPluginStore(memoryStorage());
  let listenerCalls = 0;
  const loader = createPluginLoader({
    store,
    runtime,
    importModule: async () => ({
      default: {
        ...samplePlugin(),
        setup: (
          app: import("../../src/features/plugins/pluginTypes.ts").PluginApp,
        ) => {
          app.on("activation-fixture", () => {
            listenerCalls += 1;
          });
          throw new Error("fixture setup failure");
        },
      },
    }),
  });
  const record = {
    id: "sample",
    name: "Fixture",
    version: "0",
    url: "https://example.test/sample.js",
    source: "fixture",
    enabled: false,
  };
  store.upsert(record);
  await assert.rejects(
    loader.setPluginEnabled(record, true),
    /fixture setup failure/,
  );
  assert.equal(store.getState().plugins[0].enabled, false);
  assert.equal(loader.isLoaded("sample"), false);
  assert.equal(hasPluginNodeType("sample:card"), false);
  // A stale listener must not run after activation failed.
  loader.getBus().emit("activation-fixture");
  assert.equal(listenerCalls, 0);
});

test("a late enable cannot activate a plugin removed while its module was loading", async () => {
  const store = createPluginStore(memoryStorage());
  let release!: (module: { default: CanvasPlugin }) => void;
  const loader = createPluginLoader({
    store,
    runtime,
    importModule: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const record = {
    id: "sample",
    name: "Fixture",
    version: "0",
    url: "https://example.test/sample.js",
    source: "fixture",
    enabled: false,
  };
  store.upsert(record);
  const enabling = loader.setPluginEnabled(record, true);
  loader.uninstallPlugin(record.id);
  release({ default: samplePlugin() });
  await assert.rejects(enabling, /插件已卸载/);
  assert.equal(store.getState().plugins.length, 0);
  assert.equal(loader.isLoaded("sample"), false);
  assert.equal(hasPluginNodeType("sample:card"), false);
});

test("failed replacement activation restores the prior active plugin and saved version", async () => {
  const store = createPluginStore(memoryStorage());
  let replacement = false;
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async () => new Response("fixture")) as typeof fetch,
    importModule: async () => ({
      default: replacement
        ? {
            ...samplePlugin(),
            version: "2",
            setup: () => {
              throw new Error("fixture replacement failure");
            },
          }
        : samplePlugin(),
    }),
  });
  await loader.installFromUrl("https://example.test/sample.js");
  const record = store.getState().plugins[0];
  replacement = true;
  await assert.rejects(
    loader.updatePlugin(record),
    /fixture replacement failure/,
  );
  assert.equal(store.getState().plugins[0].version, record.version);
  assert.equal(loader.isLoaded("sample"), true);
  assert.equal(hasPluginNodeType("sample:card"), true);
  loader.uninstallPlugin(record.id);
});

test("module timeout releases the operation and cannot activate a late plugin", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const store = createPluginStore(memoryStorage());
  let release!: (value: { default: CanvasPlugin }) => void;
  const loader = createPluginLoader({
    store,
    runtime,
    importModule: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const record = {
    id: "sample",
    name: "Fixture",
    version: "0",
    url: "https://example.test/sample.js",
    source: "fixture",
    enabled: false,
  };
  store.upsert(record);
  let failure: unknown;
  const operation = loader.setPluginEnabled(record, true).catch((error) => {
    failure = error;
  });
  try {
    await new Promise(setImmediate);
    t.mock.timers.tick(15_000);
    await new Promise(setImmediate);
    assert.match(failure instanceof Error ? failure.message : "", /加载超时/);
    release({ default: samplePlugin() });
    await operation;
    assert.equal(store.getState().plugins[0].enabled, false);
    assert.equal(loader.isLoaded(record.id), false);
    assert.equal(hasPluginNodeType("sample:card"), false);
  } finally {
    release({ default: samplePlugin() });
    await operation;
    loader.uninstallPlugin(record.id);
  }
});

test("plugin download timeout covers the response body and aborts without replacing records", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const store = createPluginStore(memoryStorage());
  let release!: (value: string) => void;
  let signal: AbortSignal | undefined;
  let evaluated = 0;
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async (_input, init) => {
      signal = init?.signal ?? undefined;
      const response = new Response("fixture");
      response.text = () =>
        new Promise((resolve) => {
          release = resolve;
        });
      return response;
    }) as typeof fetch,
    importModule: async () => {
      evaluated += 1;
      return { default: samplePlugin() };
    },
  });
  let failure: unknown;
  const operation = loader
    .installFromUrl("https://example.test/sample.js")
    .catch((error) => {
      failure = error;
    });
  try {
    await new Promise(setImmediate);
    t.mock.timers.tick(15_000);
    await new Promise(setImmediate);
    assert.match(failure instanceof Error ? failure.message : "", /加载超时/);
    assert.equal(signal?.aborted, true);
    release("fixture");
    await operation;
    assert.equal(evaluated, 0);
    assert.equal(store.getState().plugins.length, 0);
  } finally {
    release("fixture");
    await operation;
    if (store.getState().plugins.length) loader.uninstallPlugin("sample");
  }
});

test("cancelling deferred plugin evaluation stops waiting and refuses late factory and activation", async () => {
  const store = createPluginStore(memoryStorage());
  const controller = new AbortController();
  let release!: (module: { default: () => CanvasPlugin }) => void;
  let factories = 0;
  const loader = createPluginLoader({
    store,
    runtime,
    importModule: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const record = {
    id: "sample",
    name: "Fixture",
    version: "0",
    url: "https://example.test/sample.js",
    source: "fixture",
    enabled: false,
  };
  const lateModule = {
    default: () => {
      factories += 1;
      return samplePlugin();
    },
  };
  store.upsert(record);
  let settled = false;
  let failure: unknown;
  const operation = loader
    .setPluginEnabled(record, true, controller.signal)
    .then(
      () => {
        settled = true;
      },
      (error) => {
        settled = true;
        failure = error;
      },
    );
  try {
    await new Promise(setImmediate);
    controller.abort("user");
    await new Promise(setImmediate);
    assert.equal(
      settled,
      true,
      "cancel must settle before the module completes",
    );
    assert.match(failure instanceof Error ? failure.message : "", /已停止等待/);
    assert.equal(store.getState().plugins[0].enabled, false);
    release(lateModule);
    await new Promise(setImmediate);
    assert.equal(factories, 0);
    assert.equal(loader.isLoaded(record.id), false);
    assert.equal(hasPluginNodeType("sample:card"), false);
    assert.deepEqual(store.getState().plugins, [record]);
  } finally {
    release(lateModule);
    await operation;
    loader.uninstallPlugin(record.id);
  }
});
