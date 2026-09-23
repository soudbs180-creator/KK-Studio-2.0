/**
 * 插件加载器（上游 plugin-loader 的宿主侧移植）。
 *
 * 流程：fetch bundle → ESM 求值（工厂形式注入宿主运行时）→ 断言 → 登记节点/
 * 注入样式/执行 setup；支持从 URL 安装、更新、卸载、启停；启动时从
 * /plugins/index.json 发现本地插件。
 *
 * 依赖全部可注入，Node 测试无需真实浏览器。
 */

import { getPluginRuntime, injectPluginCss } from "./pluginRuntime.ts";
import { registerPluginNodes, unregisterPluginNodes } from "./nodeRegistry.ts";
import {
  pluginStore,
  type PluginStorage,
  type PluginStore,
} from "./pluginStore.ts";
import type {
  CanvasPlugin,
  InstalledPlugin,
  PluginAi,
  PluginRuntime,
} from "./pluginTypes.ts";
import type { AgentBridge } from "../agent/agentConnection.ts";
import { appVersion } from "../../runtime/appInfo.ts";

export interface PluginEventBus {
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload: unknown) => void): () => void;
}

function createDefaultBus(): PluginEventBus {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  return {
    emit(event, payload) {
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
    on(event, handler) {
      const set = listeners.get(event) ?? new Set();
      set.add(handler);
      listeners.set(event, set);
      return () => set.delete(handler);
    },
  };
}

export interface PluginLoaderOptions {
  fetcher?: typeof fetch;
  /** 测试注入：替代 blob URL import()。 */
  importModule?: (
    source: string,
  ) => Promise<{ default?: unknown; plugin?: unknown }>;
  storage?: PluginStorage;
  store?: PluginStore;
  runtime?: PluginRuntime;
  bus?: PluginEventBus;
}

interface LoadedPluginState {
  record: InstalledPlugin;
  disposers: Array<() => void>;
}

function assertSecureRemotePluginUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("仅支持不含凭据或片段的 HTTPS 插件地址");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("仅支持不含凭据或片段的 HTTPS 插件地址");
}

export function createPluginLoader(options: PluginLoaderOptions = {}) {
  const store = options.store ?? pluginStore;
  const fetcher =
    options.fetcher ??
    ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const runtime = options.runtime ?? null;
  const bus = options.bus ?? createDefaultBus();
  const loadedPlugins = new Map<string, LoadedPluginState>();
  let loaded = false;
  let bridge: AgentBridge | null = null;
  let ai: PluginAi = {
    generateImage: () => Promise.reject(new Error("插件生成能力未接线")),
    generateVideo: () => Promise.reject(new Error("插件生成能力未接线")),
    generateText: () => Promise.reject(new Error("插件生成能力未接线")),
  };

  async function importModule(
    source: string,
  ): Promise<{ default?: unknown; plugin?: unknown }> {
    if (options.importModule) return options.importModule(source);
    const blob = new Blob([source], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      return (await import(/* @vite-ignore */ url)) as {
        default?: unknown;
        plugin?: unknown;
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function assertPlugin(value: unknown): asserts value is CanvasPlugin {
    const candidate = value as Partial<CanvasPlugin> | null;
    if (!candidate || typeof candidate !== "object")
      throw new Error("插件导出无效：缺少插件对象");
    if (
      !candidate.id ||
      !Array.isArray(candidate.nodes) ||
      !candidate.nodes.length
    )
      throw new Error("插件导出无效：缺少 id 或 nodes");
  }

  async function evaluatePluginSource(source: string): Promise<CanvasPlugin> {
    const mod = await importModule(source);
    const exported = mod.default ?? mod.plugin;
    const plugin =
      typeof exported === "function"
        ? exported(runtime ?? getPluginRuntime())
        : exported;
    assertPlugin(plugin);
    return plugin;
  }

  async function fetchPluginSource(
    url: string,
    remote = false,
  ): Promise<string> {
    if (remote) assertSecureRemotePluginUrl(url);
    const response = remote
      ? await fetcher(url, { redirect: "error" })
      : await fetcher(url);
    if (!response.ok)
      throw new Error(`插件下载失败（HTTP ${response.status}）`);
    if (remote && response.url) assertSecureRemotePluginUrl(response.url);
    return response.text();
  }

  function withCacheBust(url: string): string {
    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }

  function activatePlugin(plugin: CanvasPlugin): void {
    const disposers: Array<() => void> = [];
    if (plugin.css) disposers.push(injectPluginCss(plugin.css, plugin.id));
    const cleanup = plugin.setup?.({
      version: appVersion,
      emit: bus.emit,
      on: bus.on,
      injectCSS: injectPluginCss,
    });
    if (typeof cleanup === "function") disposers.push(cleanup);
    registerPluginNodes(plugin.id, plugin.nodes);
    loadedPlugins.set(plugin.id, {
      record: {
        id: plugin.id,
        name: plugin.name || plugin.id,
        version: plugin.version || "0.0.0",
        description: plugin.description,
        url: "",
        source: "",
        enabled: true,
      },
      disposers,
    });
  }

  function deactivatePlugin(pluginId: string): void {
    const entry = loadedPlugins.get(pluginId);
    if (!entry) {
      unregisterPluginNodes(pluginId);
      return;
    }
    entry.disposers.forEach((dispose) => {
      try {
        dispose();
      } catch {
        // 单个清理失败不影响其余清理。
      }
    });
    loadedPlugins.delete(pluginId);
    unregisterPluginNodes(pluginId);
  }

  async function installFromUrl(
    url: string,
    opts?: { official?: boolean; bustCache?: boolean },
  ): Promise<CanvasPlugin> {
    assertSecureRemotePluginUrl(url);
    const source = await fetchPluginSource(
      opts?.bustCache ? withCacheBust(url) : url,
      true,
    );
    const plugin = await evaluatePluginSource(source);
    deactivatePlugin(plugin.id);
    const record: InstalledPlugin = {
      id: plugin.id,
      name: plugin.name || plugin.id,
      version: plugin.version || "0.0.0",
      description: plugin.description,
      url,
      source,
      enabled: true,
      official: opts?.official,
    };
    store.upsert(record);
    activatePlugin(plugin);
    return plugin;
  }

  async function updatePlugin(record: InstalledPlugin): Promise<CanvasPlugin> {
    return installFromUrl(record.url, {
      official: record.official,
      bustCache: true,
    });
  }

  async function setPluginEnabled(
    record: InstalledPlugin,
    enabled: boolean,
  ): Promise<void> {
    if (enabled && !record.local) assertSecureRemotePluginUrl(record.url);
    store.setEnabled(record.id, enabled);
    if (!enabled) {
      deactivatePlugin(record.id);
      return;
    }
    const source = record.local
      ? await fetchPluginSource(withCacheBust(record.url))
      : record.source;
    const plugin = await evaluatePluginSource(source);
    activatePlugin(plugin);
  }

  function uninstallPlugin(id: string): void {
    deactivatePlugin(id);
    store.remove(id);
  }

  async function loadLocalPlugins(): Promise<void> {
    let urls: unknown;
    try {
      const response = await fetcher("/plugins/index.json");
      if (!response.ok) return;
      urls = await response.json();
    } catch {
      return; // 无本地清单（如生产构建未带插件）时静默跳过。
    }
    if (!Array.isArray(urls) || !urls.length) return;
    const records = store.getState().plugins;
    await Promise.all(
      urls.map(async (url: string) => {
        try {
          const source = await fetchPluginSource(withCacheBust(url));
          const plugin = await evaluatePluginSource(source);
          const existing = records.find((item) => item.id === plugin.id);
          store.upsert({
            id: plugin.id,
            name: plugin.name || plugin.id,
            version: plugin.version || "0.0.0",
            description: plugin.description,
            url,
            source,
            enabled: existing?.enabled ?? true,
            local: true,
          });
        } catch (error) {
          console.error(`[plugins] 发现本地插件失败：${url}`, error);
        }
      }),
    );
  }

  /** 启动时调用一次：恢复已装插件 → 发现本地插件 → 激活启用项。 */
  async function ensurePluginsLoaded(): Promise<void> {
    if (loaded) return;
    loaded = true;
    store.rehydrate();
    await loadLocalPlugins();
    const enabled = store.getState().plugins.filter((record) => record.enabled);
    await Promise.all(
      enabled.map(async (record) => {
        if (!record.local) {
          try {
            assertSecureRemotePluginUrl(record.url);
          } catch {
            store.setEnabled(record.id, false);
            store.setError(`已停用不安全的旧版插件：${record.name}`);
            return;
          }
        }
        try {
          const source = record.local
            ? await fetchPluginSource(withCacheBust(record.url))
            : record.source;
          activatePlugin(await evaluatePluginSource(source));
        } catch (error) {
          console.error(`[plugins] 加载失败：${record.id}`, error);
        }
      }),
    );
  }

  function setBridge(next: AgentBridge | null): void {
    bridge = next;
  }
  function getBridge(): AgentBridge | null {
    return bridge;
  }
  function setAi(next: PluginAi): void {
    ai = next;
  }
  function getAi(): PluginAi {
    return ai;
  }
  function getBus(): PluginEventBus {
    return bus;
  }

  return {
    ensurePluginsLoaded,
    installFromUrl,
    updatePlugin,
    setPluginEnabled,
    uninstallPlugin,
    activatePlugin,
    deactivatePlugin,
    evaluatePluginSource,
    setBridge,
    getBridge,
    setAi,
    getAi,
    getBus,
    isLoaded(id: string): boolean {
      return loadedPlugins.has(id);
    },
  };
}

export type PluginLoader = ReturnType<typeof createPluginLoader>;

/** 应用级单例（浏览器环境；App 启动时 setBridge/setAi）。 */
export const pluginLoader = createPluginLoader();
