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
import {
  registerPluginNodes,
  unregisterPluginNodes,
  listPluginNodeDefinitions,
} from "./nodeRegistry.ts";
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
import type { AgentBridge } from "../agent/index.ts";
import { appVersion } from "../../runtime/appInfo.ts";
import { createLogger } from "../../runtime/logger.ts";
import { isTauri } from "@tauri-apps/api/core";
import {
  permissionSchema,
  type CapabilityPermission,
  type PluginManifest,
} from "../../../packages/creation-contracts/index.ts";
import { fetchPluginPackage, verifyPluginPackage } from "./pluginPackage.ts";

// 插件域诊断日志：替代散落的 console 调用，失败可定位、可导出。
const pluginLog = createLogger("plugins");

export interface PluginEventBus {
  emit(event: string, payload?: unknown): void;
  on(
    event: string,
    handler: (payload: unknown) => void | PromiseLike<void>,
  ): () => void;
}

function createDefaultBus(): PluginEventBus {
  const listeners = new Map<
    string,
    Set<(payload: unknown) => void | PromiseLike<void>>
  >();
  return {
    emit(event, payload) {
      listeners.get(event)?.forEach((handler) => {
        try {
          const result = handler(payload);
          if (result && typeof result.then === "function")
            Promise.resolve(result).catch((error) => {
              pluginLog.error("事件处理器执行失败", { event, error });
            });
        } catch (error) {
          // 单个插件处理器崩溃不得影响其他订阅者（上游 canvas-event-bus 同款隔离）。
          pluginLog.error("事件处理器执行失败", { event, error });
        }
      });
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
  /** Test/preview opt-in only; production stays closed until the isolation review passes. */
  enableSandboxPackages?: boolean;
  fetcher?: typeof fetch;
  /** 测试注入：替代源码求值的 blob URL import()。 */
  importModule?: (
    source: string,
  ) => Promise<{ default?: unknown; plugin?: unknown }>;
  /** 测试注入：替代随包同源模块的直接 import()。 */
  importUrl?: (url: string) => Promise<{ default?: unknown; plugin?: unknown }>;
  storage?: PluginStorage;
  store?: PluginStore;
  runtime?: PluginRuntime;
  bus?: PluginEventBus;
}

interface LoadedPluginState {
  plugin: CanvasPlugin;
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

// Imports cannot be aborted; a late module must never continue into activation.
async function waitForPluginLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectWaiting!: (reason: Error) => void;
  const cancel = () => {
    const error = new Error(
      "已停止等待插件加载，原记录保留；模块可能已执行，请检查插件后重试。",
    );
    controller.abort(error);
    rejectWaiting(error);
  };
  try {
    const waiting = new Promise<never>((_resolve, reject) => {
      rejectWaiting = reject;
      timer = setTimeout(() => {
        const error = new Error(
          "插件加载超时，已停止等待；原记录保留，模块可能已执行，请检查网络或插件后重试。",
        );
        controller.abort(error);
        reject(error);
      }, 15_000);
    });
    signal?.addEventListener("abort", cancel, { once: true });
    return await Promise.race([load(controller.signal), waiting]);
  } finally {
    signal?.removeEventListener("abort", cancel);
    if (timer !== undefined) clearTimeout(timer);
  }
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
  async function evaluateInstalled(
    record: InstalledPlugin,
    moduleUrl?: string,
    signal?: AbortSignal,
  ): Promise<CanvasPlugin> {
    if (record.manifest !== undefined || record.packageFiles !== undefined) {
      const pkg = await verifyPluginPackage(
        record.manifest,
        record.packageFiles ?? {},
        {
          version: appVersion,
          platform: isTauri() ? "desktop" : "web",
        },
      );
      signal?.throwIfAborted();
      if (
        pkg.manifest.id !== record.id ||
        pkg.manifest.version !== record.version
      )
        throw new Error("插件包身份与已安装记录不一致。");
      const grants = permissionSchema
        .array()
        .max(64)
        .parse(record.grantedPermissions ?? []);
      if (options.enableSandboxPackages !== true)
        throw new Error("插件沙箱仍在验证中，当前未执行插件代码。");
      const { createPackagePlugin } = await import("./pluginPackageRuntime.ts");
      signal?.throwIfAborted();
      const plugin: CanvasPlugin = createPackagePlugin(pkg, {
        enabled: options.enableSandboxPackages === true,
        platform: isTauri() ? "desktop" : "web",
        grants,
        active: () => loadedPlugins.get(record.id)?.plugin === plugin,
      });
      return plugin;
    }
    return evaluatePluginSource(record.source, moduleUrl, signal);
  }
  let bridge: AgentBridge | null = null;
  let ai: PluginAi = {
    generateImage: () => Promise.reject(new Error("插件生成能力未接线")),
    generateVideo: () => Promise.reject(new Error("插件生成能力未接线")),
    generateText: () => Promise.reject(new Error("插件生成能力未接线")),
  };

  function isBundledPluginUrl(value: string): boolean {
    let url: URL;
    try {
      const base =
        typeof location === "undefined"
          ? "http://kk-studio.local/"
          : location.href;
      url = new URL(value, base);
    } catch {
      return false;
    }
    if (!url.pathname.startsWith("/plugins/")) return false;
    return typeof location === "undefined" || url.origin === location.origin;
  }

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

  async function importBundledModule(
    url: string,
  ): Promise<{ default?: unknown; plugin?: unknown }> {
    // Vite adds an import query to dynamic root-relative paths, which prevents
    // its public middleware from serving these already-built ESM bundles.
    const moduleUrl =
      typeof location === "undefined" ? url : new URL(url, location.href).href;
    if (options.importUrl) return options.importUrl(moduleUrl);
    return (await import(/* @vite-ignore */ moduleUrl)) as {
      default?: unknown;
      plugin?: unknown;
    };
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

  async function evaluatePluginSource(
    source: string,
    moduleUrl?: string,
    signal?: AbortSignal,
  ): Promise<CanvasPlugin> {
    const useBundledModule =
      Boolean(moduleUrl) &&
      isBundledPluginUrl(moduleUrl ?? "") &&
      (Boolean(options.importUrl) || !options.importModule);
    const mod = await waitForPluginLoad(
      () =>
        useBundledModule
          ? importBundledModule(moduleUrl as string)
          : importModule(source),
      signal,
    );
    signal?.throwIfAborted();
    const exported = mod.default ?? mod.plugin;
    const plugin =
      typeof exported === "function"
        ? exported(runtime ?? getPluginRuntime())
        : exported;
    assertPlugin(plugin);
    pluginLog.warn("旧插件按legacy兼容运行，仍具有宿主权限", {
      pluginId: plugin.id,
    });
    return plugin;
  }

  async function fetchPluginSource(
    url: string,
    remote = false,
    signal?: AbortSignal,
  ): Promise<string> {
    if (remote) assertSecureRemotePluginUrl(url);
    return waitForPluginLoad(async (signal) => {
      const response = await fetcher(url, {
        signal,
        ...(remote ? { redirect: "error" } : {}),
      });
      if (!response.ok)
        throw new Error(`插件下载失败（HTTP ${response.status}）`);
      if (remote && response.url) assertSecureRemotePluginUrl(response.url);
      return response.text();
    }, signal);
  }

  function withCacheBust(url: string): string {
    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }

  function activatePlugin(plugin: CanvasPlugin): void {
    const disposers: Array<() => void> = [];
    loadedPlugins.set(plugin.id, {
      plugin,
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
    try {
      if (plugin.css) disposers.push(injectPluginCss(plugin.css, plugin.id));
      const cleanup = plugin.setup?.({
        version: appVersion,
        emit: bus.emit,
        on: (event, handler) => {
          const dispose = bus.on(event, handler);
          disposers.push(dispose);
          return dispose;
        },
        injectCSS: (css, key) => {
          const dispose = injectPluginCss(css, key);
          disposers.push(dispose);
          return dispose;
        },
      });
      if (typeof cleanup === "function") disposers.push(cleanup);
      registerPluginNodes(plugin.id, plugin.nodes);
    } catch (error) {
      deactivatePlugin(plugin.id);
      throw error;
    }
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
    opts?: {
      official?: boolean;
      bustCache?: boolean;
      enabled?: boolean;
      expectedId?: string;
      signal?: AbortSignal;
      grantedPermissions?: readonly CapabilityPermission[];
    },
  ): Promise<CanvasPlugin> {
    assertSecureRemotePluginUrl(url);
    if (new URL(url).pathname.endsWith("/kk-plugin.json"))
      return installPackageFromUrl(url, opts);
    const source = await fetchPluginSource(
      opts?.bustCache ? withCacheBust(url) : url,
      true,
      opts?.signal,
    );
    const plugin = await evaluatePluginSource(source, undefined, opts?.signal);
    opts?.signal?.throwIfAborted();
    if (opts?.expectedId && plugin.id !== opts.expectedId)
      throw new Error("更新包的插件身份不一致，原插件保留。");
    const previous = loadedPlugins.get(plugin.id)?.plugin;
    const record: InstalledPlugin = {
      id: plugin.id,
      name: plugin.name || plugin.id,
      version: plugin.version || "0.0.0",
      description: plugin.description,
      url,
      source,
      enabled: opts?.enabled ?? true,
      official: opts?.official,
    };
    try {
      opts?.signal?.throwIfAborted();
      deactivatePlugin(plugin.id);
      if (record.enabled) activatePlugin(plugin);
      opts?.signal?.throwIfAborted();
      store.upsert(record);
    } catch (error) {
      deactivatePlugin(plugin.id);
      try {
        if (previous) activatePlugin(previous);
      } catch {
        throw new Error(
          "插件操作失败，原记录保留；原插件恢复失败，请重新打开应用。",
        );
      }
      throw error;
    }
    return plugin;
  }

  function existingPackage(
    manifest: PluginManifest,
    expectedId: string | undefined,
    started: InstalledPlugin | undefined,
  ): InstalledPlugin | undefined {
    if (expectedId && expectedId !== manifest.id)
      throw new Error("更新包的插件身份不一致，原插件保留。");
    const existing = store.getState().plugins.find((p) => p.id === manifest.id);
    if (expectedId && existing !== started)
      throw new Error("插件已变更，当前更新已取消。");
    if (existing && !expectedId)
      throw new Error("插件ID已安装，不覆盖既有插件。");
    if (
      listPluginNodeDefinitions().some(
        (entry) =>
          entry.pluginId !== manifest.id &&
          manifest.contributes.nodes.some(
            (node) => node.type === entry.definition.type,
          ),
      )
    )
      throw new Error("插件节点ID冲突，保留原插件。");
    return existing;
  }

  async function installPackageFromUrl(
    url: string,
    opts?: {
      expectedId?: string;
      enabled?: boolean;
      signal?: AbortSignal;
      grantedPermissions?: readonly CapabilityPermission[];
    },
  ): Promise<CanvasPlugin> {
    const started = opts?.expectedId
      ? store.getState().plugins.find((p) => p.id === opts.expectedId)
      : undefined;
    if (opts?.expectedId && !started)
      throw new Error("插件已卸载，当前未更新。");
    const downloaded = await waitForPluginLoad(
      (signal) => fetchPluginPackage(url, fetcher, signal),
      opts?.signal,
    );
    const pkg = await verifyPluginPackage(
      downloaded.manifest,
      downloaded.files,
      {
        version: appVersion,
        platform: isTauri() ? "desktop" : "web",
      },
    );
    opts?.signal?.throwIfAborted();
    const existing = existingPackage(pkg.manifest, opts?.expectedId, started);
    const grants = permissionSchema
      .array()
      .max(64)
      .parse(opts?.grantedPermissions ?? existing?.grantedPermissions ?? []);
    if (
      grants.some(
        (permission) => !pkg.manifest.permissions.includes(permission),
      )
    )
      throw new Error("授权权限未在插件清单声明，请重新确认权限。");
    const backup = existing ? { ...existing } : undefined;
    if (backup) delete backup.previousVersion;
    const record: InstalledPlugin = {
      id: pkg.manifest.id,
      name: pkg.manifest.name,
      version: pkg.manifest.version,
      url,
      source: JSON.stringify(pkg.manifest),
      enabled: opts?.enabled ?? true,
      manifest: pkg.manifest,
      packageFiles: pkg.files,
      grantedPermissions: grants,
      previousVersion: backup,
    };
    const plugin = await evaluateInstalled(record, undefined, opts?.signal);
    opts?.signal?.throwIfAborted();
    if (store.getState().plugins.find((p) => p.id === record.id) !== existing)
      throw new Error("插件状态已变更，当前安装已取消。");
    const previous = loadedPlugins.get(plugin.id)?.plugin;
    try {
      opts?.signal?.throwIfAborted();
      deactivatePlugin(plugin.id);
      if (record.enabled) activatePlugin(plugin);
      store.upsert(record);
    } catch (error) {
      deactivatePlugin(plugin.id);
      if (previous) activatePlugin(previous);
      throw error;
    }
    return plugin;
  }

  async function updatePlugin(
    record: InstalledPlugin,
    signal?: AbortSignal,
  ): Promise<CanvasPlugin> {
    if (record.manifest)
      return installPackageFromUrl(record.url, {
        expectedId: record.id,
        enabled: record.enabled,
        signal,
      });
    return installFromUrl(record.url, {
      official: record.official,
      bustCache: true,
      enabled: record.enabled,
      expectedId: record.id,
      signal,
    });
  }

  async function setPluginEnabled(
    record: InstalledPlugin,
    enabled: boolean,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    if (enabled && !record.local) assertSecureRemotePluginUrl(record.url);
    if (!enabled) {
      store.setEnabled(record.id, false);
      deactivatePlugin(record.id);
      return;
    }
    const moduleUrl = record.local ? withCacheBust(record.url) : undefined;
    const source = moduleUrl
      ? await fetchPluginSource(moduleUrl, false, signal)
      : record.source;
    const plugin = await evaluateInstalled(
      { ...record, source },
      moduleUrl,
      signal,
    );
    signal?.throwIfAborted();
    if (plugin.id !== record.id)
      throw new Error("插件身份不一致，原启停状态保留。");
    if (!store.getState().plugins.some((item) => item.id === record.id))
      throw new Error("插件已卸载，本次启用已取消。");
    activatePlugin(plugin);
    try {
      signal?.throwIfAborted();
      store.setEnabled(record.id, true);
    } catch (error) {
      deactivatePlugin(plugin.id);
      throw error;
    }
  }

  function uninstallPlugin(id: string): void {
    store.remove(id);
    deactivatePlugin(id);
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
          const moduleUrl = withCacheBust(url);
          const source = await fetchPluginSource(moduleUrl);
          const plugin = await evaluatePluginSource(source, moduleUrl);
          const existing = records.find((item) => item.id === plugin.id);
          if (
            store.getState().plugins.find((item) => item.id === plugin.id) !==
            existing
          )
            return;
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
          pluginLog.error("发现本地插件失败", { url, error });
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
            try {
              store.setEnabled(record.id, false);
              store.setError(`已停用不安全的旧版插件：${record.name}`);
            } catch {
              store.setError(
                `不安全的旧版插件未加载，但停用状态未保存：${record.name}。请允许本地存储后重试。`,
              );
            }
            return;
          }
        }
        try {
          const moduleUrl = record.local
            ? withCacheBust(record.url)
            : undefined;
          const source = moduleUrl
            ? await fetchPluginSource(moduleUrl)
            : record.source;
          const plugin = await evaluateInstalled(
            { ...record, source },
            moduleUrl,
          );
          const current = store
            .getState()
            .plugins.find((item) => item.id === record.id);
          if (current !== record || !current.enabled) return;
          if (plugin.id !== record.id)
            throw new Error("插件身份不一致，启动加载已取消。");
          activatePlugin(plugin);
        } catch (error) {
          pluginLog.error("插件加载失败", { pluginId: record.id, error });
          if (record.manifest)
            store.setError(
              "插件包未执行：安全运行时尚未通过验收或包验证失败。",
            );
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
    installPackageFromUrl,
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
