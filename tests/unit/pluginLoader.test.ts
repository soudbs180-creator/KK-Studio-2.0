import assert from "node:assert/strict";
import test from "node:test";
import { createPluginLoader } from "../../src/features/plugins/pluginLoader.ts";
import { createPluginStore } from "../../src/features/plugins/pluginStore.ts";
import {
  getPluginNodeDefinition,
  hasPluginNodeType,
} from "../../src/features/plugins/nodeRegistry.ts";
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
