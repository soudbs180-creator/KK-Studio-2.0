import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  pluginManifestSchema,
  pluginManifestJsonSchema,
  type PluginManifest,
} from "../../packages/creation-contracts/index.ts";
import {
  createPluginPermissionPort,
  createRestrictedPluginContext,
} from "../../src/features/plugins/pluginPermissions.ts";
import {
  verifyPluginPackage,
  fetchPluginPackage,
} from "../../src/features/plugins/pluginPackage.ts";
import { createPluginRpc } from "../../src/features/plugins/pluginRpc.ts";
import { createPluginLoader } from "../../src/features/plugins/pluginLoader.ts";
import { createPluginStore } from "../../src/features/plugins/pluginStore.ts";
import type { PluginNodeContext } from "../../src/features/plugins/pluginTypes.ts";

const source = "document.body.textContent = 'isolated';";
function manifest(): PluginManifest {
  return pluginManifestSchema.parse({
    id: "com.fixture.note",
    name: "Fixture",
    version: "1.0.0",
    apiVersion: "1",
    engines: { kk: ">=2.1.49 <3" },
    platforms: ["web"],
    trust: "third-party",
    runtime: "iframe",
    entry: "dist/main.js",
    contributes: { nodes: [{ type: "com.fixture.note:note", title: "Note" }] },
    permissions: ["canvas:read", "canvas:write", "ai:generate", "storage:own"],
    integrity: {
      algorithm: "sha256",
      files: {
        "dist/main.js": createHash("sha256").update(source).digest("hex"),
      },
    },
  });
}
function context() {
  const calls: string[] = [];
  const host: PluginNodeContext = {
    node: {
      id: "own",
      type: "com.fixture.note:note",
      title: "Own",
      position: { x: 0, y: 0 },
      width: 320,
      height: 240,
    },
    theme: {} as PluginNodeContext["theme"],
    scale: 1,
    isSelected: false,
    updateMetadata: () => {
      calls.push("metadata");
    },
    updateNode: () => {
      calls.push("write");
    },
    getNode: () => {
      calls.push("read");
      return null;
    },
    getNodes: () => {
      calls.push("read");
      return [];
    },
    getConnections: () => [],
    getUpstream: () => [],
    getDownstream: () => [],
    applyOps: () => {
      calls.push("ops");
    },
    emit: (event) => {
      calls.push(event);
    },
    on: () => () => {},
    ai: {
      generateImage: async () => {
        calls.push("image");
        return { images: [] };
      },
      generateText: async () => {
        calls.push("text");
        return { text: "fixture" };
      },
      generateVideo: async () => ({ url: "", mimeType: "video/mp4" }),
    },
    openPanel: () => {},
    closePanel: () => {},
    storage: {
      async get<T>() {
        return null as T | null;
      },
      async set() {
        calls.push("store");
      },
      async remove() {},
    },
  };
  return { host, calls };
}

test("standard plugin schema rejects traversal, identity conflicts, secrets and missing hashes", () => {
  const raw = manifest();
  assert.equal(
    pluginManifestSchema.safeParse({ ...raw, entry: "../escape.js" }).success,
    false,
  );
  assert.equal(
    pluginManifestSchema.safeParse({ ...raw, entry: "%2e%2e/escape.js" })
      .success,
    false,
  );
  assert.equal(
    pluginManifestSchema.safeParse({ ...raw, apiVersion: "9" }).success,
    false,
  );
  assert.equal(
    pluginManifestSchema.safeParse({ ...raw, permissions: ["network:*"] })
      .success,
    false,
  );
  assert.equal(
    pluginManifestSchema.safeParse({ ...raw, name: "api_key=private" }).success,
    false,
  );
  assert.equal(
    pluginManifestSchema.safeParse({
      ...raw,
      integrity: { algorithm: "sha256", files: {} },
    }).success,
    false,
  );
  assert.equal(
    pluginManifestSchema.safeParse({
      ...raw,
      contributes: { nodes: [{ type: "other:note", title: "Bad" }] },
    }).success,
    false,
  );
  assert.ok(pluginManifestJsonSchema().properties);
  assert.equal(
    pluginManifestJsonSchema().required?.includes("permissions"),
    false,
  );
  assert.deepEqual(
    JSON.parse(
      readFileSync(
        new URL(
          "../../packages/creation-contracts/plugin-manifest.schema.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
    pluginManifestJsonSchema(),
  );
});

test("package verification checks actual bytes, platform, trust and every declared file", async () => {
  const host = { version: "2.1.50", platform: "web" as const };
  await verifyPluginPackage(manifest(), { "dist/main.js": source }, host);
  await assert.rejects(
    verifyPluginPackage(
      manifest(),
      { "dist/main.js": source + "tampered" },
      host,
    ),
    /完整性/,
  );
  await assert.rejects(
    verifyPluginPackage(
      manifest(),
      { "dist/main.js": source, "extra.js": "" },
      host,
    ),
    /清单不一致/,
  );
  await assert.rejects(
    verifyPluginPackage(
      manifest(),
      { "dist/main.js": source },
      { ...host, platform: "desktop" },
    ),
    /不兼容/,
  );
  await assert.rejects(
    verifyPluginPackage(
      { ...manifest(), trust: "builtin" },
      { "dist/main.js": source },
      host,
    ),
    /自称/,
  );
});

test("permissions require matching identity, declaration, grant and a live session", () => {
  const m = manifest();
  let active = true;
  const { host, calls } = context();
  const port = createPluginPermissionPort(m, ["canvas:read"], () => active);
  const ctx = createRestrictedPluginContext(host, m.id, port);
  assert.deepEqual(ctx.getNodes(), []);
  assert.throws(() => ctx.updateNode({ title: "denied" }), /未获授权/);
  assert.throws(() => ctx.ai.generateImage("denied"), /未获授权/);
  assert.throws(() => ctx.storage.set("key", "denied"), /未获授权/);
  assert.equal(
    port.check({ subjectId: "spoofed", permission: "canvas:read" }).allowed,
    false,
  );
  const undeclared = createPluginPermissionPort(
    { ...m, permissions: [] },
    ["canvas:read"],
    () => true,
  );
  assert.equal(
    undeclared.check({ subjectId: m.id, permission: "canvas:read" }).allowed,
    false,
  );
  active = false;
  assert.throws(() => ctx.getNodes(), /停用/);
  assert.deepEqual(calls, ["read"]);
});

test("RPC enforces its allowlist, permission errors, replay and response bounds", async () => {
  const { host, calls } = context(),
    m = manifest();
  const ctx = createRestrictedPluginContext(
    host,
    m.id,
    createPluginPermissionPort(m, ["canvas:read"], () => true),
  );
  const rpc = createPluginRpc(
    () => ctx,
    () => true,
  );
  const read = JSON.stringify({ id: "one", method: "canvas.read", params: {} });
  assert.deepEqual(JSON.parse(await rpc.dispatch(read)).result, []);
  assert.equal(JSON.parse(await rpc.dispatch(read)).error.code, "DUPLICATE");
  assert.equal(
    JSON.parse(
      await rpc.dispatch(
        JSON.stringify({
          id: "two",
          method: "ai.text",
          params: { prompt: "Denied" },
        }),
      ),
    ).error.code,
    "PERMISSION_DENIED",
  );
  assert.equal(
    JSON.parse(
      await rpc.dispatch(
        JSON.stringify({ id: "three", method: "eval", params: {} }),
      ),
    ).error.code,
    "INVALID_REQUEST",
  );
  assert.equal(
    JSON.parse(await rpc.dispatch("x".repeat(65537))).error.code,
    "INVALID_REQUEST",
  );
  assert.deepEqual(calls, ["read"]);
  rpc.close();
  assert.equal(JSON.parse(await rpc.dispatch(read)).error.code, "DISABLED");
});

test("closing before the RPC microtask prevents submission; timeout aborts an active call", async () => {
  const { host, calls } = context();
  const raw = JSON.stringify({
    id: "one",
    method: "ai.text",
    params: { prompt: "fixture" },
  });
  const rpc = createPluginRpc(
    () => host,
    () => true,
  );
  const pending = rpc.dispatch(raw);
  rpc.close();
  await pending;
  assert.deepEqual(calls, []);
  let signal: AbortSignal | undefined;
  host.ai.generateText = async (_prompt, options) => {
    signal = options?.signal;
    return new Promise(() => {});
  };
  const timed = createPluginRpc(
    () => host,
    () => true,
    20,
  );
  assert.equal(JSON.parse(await timed.dispatch(raw)).error.code, "STOPPED");
  assert.equal(signal?.aborted, true);
});

test("package fetch omits credentials and redirects, and production never evaluates new code", async () => {
  let imports = 0;
  const storage = new Map<string, string>();
  const store = createPluginStore({
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  });
  const fetcher = (async (url, options) => {
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.redirect, "error");
    return new Response(
      String(url).endsWith("kk-plugin.json")
        ? JSON.stringify(manifest())
        : source,
    );
  }) as typeof fetch;
  await fetchPluginPackage(
    "https://fixture.invalid/pkg/kk-plugin.json",
    fetcher,
    new AbortController().signal,
  );
  const loader = createPluginLoader({
    store,
    fetcher,
    importModule: async () => {
      imports++;
      throw new Error("Must not evaluate");
    },
  });
  await assert.rejects(
    loader.installFromUrl("https://fixture.invalid/pkg/kk-plugin.json"),
    /沙箱仍在验证/,
  );
  assert.equal(imports, 0);
  assert.equal(store.getState().plugins.length, 0);
  assert.equal(storage.size, 0);
});

test("experimental package update rolls back on invalid integrity and rejects changed identities", async () => {
  const storage = new Map<string, string>();
  const store = createPluginStore({
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  });
  let code = source;
  let currentManifest = manifest();
  storage.set("user-project", "original");
  const loader = createPluginLoader({
    store,
    enableSandboxPackages: true,
    fetcher: (async (url) =>
      new Response(
        String(url).endsWith("kk-plugin.json")
          ? JSON.stringify(currentManifest)
          : code,
      )) as typeof fetch,
  });
  await loader.installFromUrl("https://fixture.invalid/pkg/kk-plugin.json");
  const original = store.getState().plugins[0];
  assert.deepEqual(original.grantedPermissions, []);
  await assert.rejects(loader.installFromUrl(original.url), /ID已安装/);
  code += "tampered";
  await assert.rejects(loader.updatePlugin(original), /完整性/);
  assert.equal(store.getState().plugins[0], original);
  assert.equal(loader.isLoaded(original.id), true);
  code = source;
  currentManifest = {
    ...manifest(),
    id: "com.fixture.other",
    contributes: {
      ...manifest().contributes,
      nodes: [
        { ...manifest().contributes.nodes[0], type: "com.fixture.other:note" },
      ],
    },
  };
  await assert.rejects(loader.updatePlugin(original), /身份不一致/);
  loader.uninstallPlugin(original.id);
  assert.equal(store.getState().plugins.length, 0);
  assert.equal(storage.get("user-project"), "original");
});

test("package persistence failure restores the prior active plugin and installed record", async () => {
  const storage = new Map<string, string>();
  let failWrites = false;
  const store = createPluginStore({
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      if (failWrites) throw new Error("quota");
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  });
  let current = manifest();
  const loader = createPluginLoader({
    store,
    enableSandboxPackages: true,
    fetcher: (async (url) =>
      new Response(
        String(url).endsWith("kk-plugin.json")
          ? JSON.stringify(current)
          : source,
      )) as typeof fetch,
  });
  await loader.installFromUrl("https://fixture.invalid/pkg/kk-plugin.json");
  const original = store.getState().plugins[0];
  current = { ...current, version: "1.1.0" };
  failWrites = true;
  await assert.rejects(loader.updatePlugin(original), /quota|保存/);
  assert.equal(store.getState().plugins[0], original);
  assert.equal(loader.isLoaded(original.id), true);
  loader.deactivatePlugin(original.id);
});
