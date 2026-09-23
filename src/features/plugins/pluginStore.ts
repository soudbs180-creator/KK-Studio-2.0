/**
 * 插件安装状态 store（外部 store，配合 useSyncExternalStore 使用）。
 * 持久化到 localStorage（键 canvas-plugins）；测试可注入内存 storage。
 */

import type { InstalledPlugin } from "./pluginTypes.ts";

export interface PluginStoreState {
  plugins: InstalledPlugin[];
  /** 正在安装/更新的插件 id。 */
  busy: string[];
  error: string | null;
}

export type PluginStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const STORAGE_KEY = "canvas-plugins";

const memoryStorage: PluginStorage = {
  getItem(key: string) {
    return globalThis.__pluginMemoryStorage?.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    (globalThis.__pluginMemoryStorage ??= new Map()).set(key, value);
  },
  removeItem(key: string) {
    globalThis.__pluginMemoryStorage?.delete(key);
  },
};

declare global {
  var __pluginMemoryStorage: Map<string, string> | undefined;
}

export const pluginSafeStorage: PluginStorage =
  typeof localStorage !== "undefined" ? localStorage : memoryStorage;

export function createPluginStore(storage: PluginStorage = pluginSafeStorage) {
  let state: PluginStoreState = { plugins: [], busy: [], error: null };
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((listener) => listener());
  }
  function patch(patch: Partial<PluginStoreState>) {
    state = { ...state, ...patch };
    emit();
  }
  function persist() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state.plugins));
    } catch {
      // 持久化失败不影响运行态。
    }
  }

  function rehydrate(): PluginStoreState["plugins"] {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      state = { ...state, plugins: parsed as InstalledPlugin[] };
      emit();
      return state.plugins;
    } catch {
      return [];
    }
  }

  function upsert(record: InstalledPlugin): void {
    const existing = state.plugins.find((item) => item.id === record.id);
    state = {
      ...state,
      plugins: existing
        ? state.plugins.map((item) =>
            item.id === record.id ? { ...item, ...record } : item,
          )
        : [...state.plugins, record],
    };
    persist();
    emit();
  }

  function setEnabled(id: string, enabled: boolean): void {
    state = {
      ...state,
      plugins: state.plugins.map((item) =>
        item.id === id ? { ...item, enabled } : item,
      ),
    };
    persist();
    emit();
  }

  function remove(id: string): void {
    state = {
      ...state,
      plugins: state.plugins.filter((item) => item.id !== id),
    };
    persist();
    emit();
  }

  function setBusy(id: string, active: boolean): void {
    state = {
      ...state,
      busy: active
        ? [...new Set([...state.busy, id])]
        : state.busy.filter((item) => item !== id),
    };
    emit();
  }

  function setError(message: string | null): void {
    patch({ error: message });
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    rehydrate,
    upsert,
    setEnabled,
    remove,
    setBusy,
    setError,
  };
}

export type PluginStore = ReturnType<typeof createPluginStore>;

/** 应用级单例。 */
export const pluginStore = createPluginStore();
