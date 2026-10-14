import assert from "node:assert/strict";
import test from "node:test";
import { createPluginLoader } from "../../src/features/plugins/pluginLoader.ts";
import { createPluginStore } from "../../src/features/plugins/pluginStore.ts";
import {
  getPluginNodeDefinition,
  hasPluginNodeType,
} from "../../src/features/plugins/nodeRegistry.ts";
import type {
  CanvasPlugin,
  InstalledPlugin,
} from "../../src/features/plugins/pluginTypes.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
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

function samplePlugin(setup: () => void, title = "Startup card"): CanvasPlugin {
  return {
    id: "sample",
    name: "Fixture",
    version: "1.0.0",
    nodes: [
      {
        type: "sample:card",
        title,
        icon: "fixture",
        defaultSize: { width: 200, height: 120 },
        Content: () => null,
      },
    ],
    setup,
  };
}

function installedRecord(local = false): InstalledPlugin {
  return {
    id: "sample",
    name: "Fixture",
    version: "1.0.0",
    url: local ? "/plugins/sample.js" : "https://example.test/sample.js",
    source: "startup source",
    enabled: true,
    ...(local ? { local: true } : {}),
  };
}

for (const action of ["disable", "uninstall"] as const) {
  test(`startup import cannot reactivate a plugin after ${action}`, async () => {
    const storage = memoryStorage();
    const store = createPluginStore(storage);
    const started = deferred<void>();
    const pending = deferred<{ default: CanvasPlugin }>();
    let setups = 0;
    const plugin = samplePlugin(() => {
      setups += 1;
    });
    const loader = createPluginLoader({
      store,
      runtime,
      fetcher: (async () => Response.json([])) as typeof fetch,
      importModule: () => {
        started.resolve();
        return pending.promise;
      },
    });
    store.upsert(installedRecord());
    const loading = loader.ensurePluginsLoaded();
    try {
      await started.promise;
      if (action === "disable")
        await loader.setPluginEnabled(store.getState().plugins[0], false);
      else loader.uninstallPlugin("sample");
      pending.resolve({ default: plugin });
      await loading;
      assert.equal(setups, 0);
      assert.equal(loader.isLoaded("sample"), false);
      assert.equal(hasPluginNodeType("sample:card"), false);
      assert.deepEqual(
        store.getState().plugins.map(({ enabled }) => enabled),
        action === "disable" ? [false] : [],
      );
      assert.deepEqual(
        JSON.parse(storage.getItem("canvas-plugins") ?? "[]").map(
          (record: InstalledPlugin) => record.enabled,
        ),
        action === "disable" ? [false] : [],
      );
    } finally {
      pending.resolve({ default: plugin });
      await loading;
      loader.deactivatePlugin("sample");
    }
  });
}

for (const action of ["update", "reinstall"] as const) {
  test(`startup import cannot replace the current plugin after ${action}`, async () => {
    const store = createPluginStore(memoryStorage());
    const started = deferred<void>();
    const pending = deferred<{ default: CanvasPlugin }>();
    let imports = 0;
    let oldSetups = 0;
    let currentSetups = 0;
    const oldPlugin = samplePlugin(() => {
      oldSetups += 1;
    });
    const currentPlugin = samplePlugin(() => {
      currentSetups += 1;
    }, "Current card");
    const loader = createPluginLoader({
      store,
      runtime,
      fetcher: (async (input) =>
        String(input).endsWith("index.json")
          ? Response.json([])
          : new Response(
              action === "update" ? "current source" : "startup source",
            )) as typeof fetch,
      importModule: () => {
        imports += 1;
        if (imports > 1) return Promise.resolve({ default: currentPlugin });
        started.resolve();
        return pending.promise;
      },
    });
    store.upsert(installedRecord());
    const loading = loader.ensurePluginsLoaded();
    try {
      await started.promise;
      const record = store.getState().plugins[0];
      if (action === "update") await loader.updatePlugin(record);
      else {
        loader.uninstallPlugin(record.id);
        await loader.installFromUrl(record.url);
      }
      const currentRecord = store.getState().plugins[0];
      pending.resolve({ default: oldPlugin });
      await loading;
      assert.equal(oldSetups, 0);
      assert.equal(currentSetups, 1);
      assert.equal(loader.isLoaded("sample"), true);
      assert.equal(
        getPluginNodeDefinition("sample:card")?.title,
        "Current card",
      );
      assert.equal(store.getState().plugins[0], currentRecord);
    } finally {
      pending.resolve({ default: oldPlugin });
      await loading;
      loader.deactivatePlugin("sample");
    }
  });
}

for (const action of ["disable", "uninstall", "replace"] as const) {
  test(`local discovery cannot overwrite a record changed by ${action}`, async () => {
    const store = createPluginStore(memoryStorage());
    const started = deferred<void>();
    const pending = deferred<{ default: CanvasPlugin }>();
    let imports = 0;
    let setups = 0;
    const plugin = samplePlugin(() => {
      setups += 1;
    });
    const loader = createPluginLoader({
      store,
      runtime,
      fetcher: (async (input) =>
        String(input).endsWith("index.json")
          ? Response.json(["/plugins/sample.js"])
          : new Response("discovered source")) as typeof fetch,
      importModule: () => {
        imports += 1;
        if (imports > 1) return Promise.resolve({ default: plugin });
        started.resolve();
        return pending.promise;
      },
    });
    store.upsert(installedRecord(true));
    const loading = loader.ensurePluginsLoaded();
    try {
      await started.promise;
      if (action === "disable")
        await loader.setPluginEnabled(store.getState().plugins[0], false);
      else if (action === "uninstall") loader.uninstallPlugin("sample");
      else
        store.upsert({
          ...installedRecord(),
          source: "replacement source",
          enabled: false,
        });
      const currentRecords = store.getState().plugins;
      pending.resolve({ default: plugin });
      await loading;
      assert.deepEqual(store.getState().plugins, currentRecords);
      assert.equal(setups, 0);
      assert.equal(loader.isLoaded("sample"), false);
      assert.equal(hasPluginNodeType("sample:card"), false);
    } finally {
      pending.resolve({ default: plugin });
      await loading;
      loader.deactivatePlugin("sample");
    }
  });
}

test("startup rejects a module whose identity differs from its installed record", async () => {
  const store = createPluginStore(memoryStorage());
  let setups = 0;
  const plugin = {
    ...samplePlugin(() => {
      setups += 1;
    }),
    id: "unexpected",
  };
  const loader = createPluginLoader({
    store,
    runtime,
    fetcher: (async () => Response.json([])) as typeof fetch,
    importModule: async () => ({ default: plugin }),
  });
  store.upsert(installedRecord());
  try {
    await loader.ensurePluginsLoaded();
    assert.equal(setups, 0);
    assert.equal(loader.isLoaded("unexpected"), false);
    assert.equal(hasPluginNodeType("sample:card"), false);
    assert.deepEqual(store.getState().plugins, [installedRecord()]);
  } finally {
    loader.deactivatePlugin("unexpected");
  }
});
