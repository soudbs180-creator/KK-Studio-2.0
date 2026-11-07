import { mountPluginSandbox } from "../../src/features/plugins/pluginSandbox.ts";
import {
  createPluginPermissionPort,
  createRestrictedPluginContext,
} from "../../src/features/plugins/pluginPermissions.ts";
import type {
  CapabilityPermission,
  PluginManifest,
} from "../../packages/creation-contracts/index.ts";
import type { PluginNodeContext } from "../../src/features/plugins/pluginTypes.ts";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createPluginLoader } from "../../src/features/plugins/pluginLoader.ts";
import { createPluginStore } from "../../src/features/plugins/pluginStore.ts";

export function start(source: string, grants: CapabilityPermission[]) {
  let active = true;
  const calls: string[] = [];
  const frame = document.createElement("iframe");
  frame.setAttribute("data-testid", "plugin-security-frame");
  document.body.append(frame);
  const host: PluginNodeContext = {
    node: {} as PluginNodeContext["node"],
    theme: {} as PluginNodeContext["theme"],
    scale: 1,
    isSelected: false,
    updateMetadata() {},
    updateNode() {
      calls.push("write");
    },
    getNode: () => null,
    getNodes: () => {
      calls.push("read");
      return [{ id: "fixture-node" }] as PluginNodeContext["node"][];
    },
    getConnections: () => [],
    getUpstream: () => [],
    getDownstream: () => [],
    applyOps() {},
    emit() {},
    on: () => () => {},
    openPanel() {},
    closePanel() {},
    ai: {
      generateImage: async () => ({ images: [] }),
      generateText: async () => {
        calls.push("generate");
        return { text: "fixture" };
      },
      generateVideo: async () => ({ url: "", mimeType: "" }),
    },
    storage: {
      async get<T>() {
        return null as T | null;
      },
      async set() {},
      async remove() {},
    },
  };
  const manifest = {
    id: "com.fixture.sandbox",
    permissions: ["canvas:read", "canvas:write", "ai:generate"],
  } as PluginManifest;
  const permissions = createPluginPermissionPort(
    manifest,
    grants,
    () => active,
  );
  const dispose = mountPluginSandbox(
    frame,
    source,
    () => createRestrictedPluginContext(host, manifest.id, permissions),
    () => active,
  );
  return {
    calls,
    stop() {
      active = false;
      dispose();
      frame.remove();
    },
  };
}

export async function startInstalled(source: string) {
  const host = document.createElement("div");
  host.setAttribute("data-testid", "plugin-package-host");
  document.body.append(host);
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)),
    ),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  const manifest = {
    id: "com.fixture.installed",
    name: "Installed fixture",
    version: "1.0.0",
    apiVersion: "1",
    engines: { kk: ">=2.1.49 <3" },
    platforms: ["web"],
    trust: "third-party",
    runtime: "iframe",
    entry: "main.js",
    contributes: {
      nodes: [{ type: "com.fixture.installed:note", title: "Fixture" }],
    },
    permissions: ["canvas:read"],
    integrity: { algorithm: "sha256", files: { "main.js": hash } },
  };
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
  const loader = createPluginLoader({
    store,
    enableSandboxPackages: true,
    fetcher: (async (url) =>
      new Response(
        String(url).endsWith("kk-plugin.json")
          ? JSON.stringify(manifest)
          : source,
      )) as typeof fetch,
  });
  const plugin = await loader.installFromUrl(
    "https://fixture.invalid/pkg/kk-plugin.json",
    { grantedPermissions: ["canvas:read"] },
  );
  const Content = plugin.nodes[0].Content!;
  const root = createRoot(host);
  function render(id: string) {
    const node = {
      id,
      type: "com.fixture.installed:note",
      title: "Fixture",
      position: { x: 0, y: 0 },
      width: 320,
      height: 240,
    };
    const ctx: PluginNodeContext = {
      node,
      theme: {} as PluginNodeContext["theme"],
      scale: 1,
      isSelected: false,
      getNodes: () => [node],
      getNode: () => null,
      getConnections: () => [],
      getUpstream: () => [],
      getDownstream: () => [],
      updateNode() {},
      updateMetadata() {},
      applyOps() {},
      emit() {},
      on: () => () => {},
      openPanel() {},
      closePanel() {},
      ai: {
        generateImage: async () => ({ images: [] }),
        generateText: async () => ({ text: "" }),
        generateVideo: async () => ({ url: "", mimeType: "" }),
      },
      storage: {
        async get<T>() {
          return null as T | null;
        },
        async set() {},
        async remove() {},
      },
    };
    root.render(createElement(Content, { ctx }));
  }
  render("initial");
  return {
    update() {
      render("updated");
    },
    async stop() {
      await loader.setPluginEnabled(store.getState().plugins[0], false);
      root.unmount();
      host.remove();
    },
  };
}
