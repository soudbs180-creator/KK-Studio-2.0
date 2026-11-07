import { useSyncExternalStore } from "react";
import type { CatalogModel, ModelKind } from "./modelCatalog.ts";

export interface ModelCatalogEntry extends CatalogModel {
  enabled: boolean;
  isDefault: boolean;
}

export interface ModelPreference {
  enabled?: boolean;
  isDefault?: boolean;
}

export interface ConnectionCatalogPrefs {
  models: Record<string, ModelPreference>;
  customModels: CatalogModel[];
  defaultModelId?: string;
}

const STORAGE_KEY = "kk-studio:model-catalog-prefs:v1";
const CHANGE_EVENT = "kk:model-catalog-prefs-changed";

function canUseStorage(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    );
  } catch {
    return false;
  }
}

let inMemoryStore: Record<string, ConnectionCatalogPrefs> = {};

export function readCatalogPreferences(): Record<
  string,
  ConnectionCatalogPrefs
> {
  if (!canUseStorage()) return inMemoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryStore;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, ConnectionCatalogPrefs>;
    }
  } catch (error) {
    // fallback to in-memory store
    void error;
  }
  return inMemoryStore;
}

export function saveCatalogPreferences(
  prefs: Record<string, ConnectionCatalogPrefs>,
): void {
  inMemoryStore = prefs;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      // ignore storage quota errors
      void error;
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function getConnectionPrefs(
  connectionKey: string,
): ConnectionCatalogPrefs {
  const all = readCatalogPreferences();
  return (
    all[connectionKey] ?? {
      models: {},
      customModels: [],
    }
  );
}

export function setModelEnabled(
  connectionKey: string,
  modelId: string,
  enabled: boolean,
): void {
  const all = { ...readCatalogPreferences() };
  const conn = { ...(all[connectionKey] ?? { models: {}, customModels: [] }) };
  const models = { ...conn.models };
  const current = models[modelId] ?? {};
  models[modelId] = { ...current, enabled };
  conn.models = models;
  all[connectionKey] = conn;
  saveCatalogPreferences(all);
}

export function setDefaultModel(connectionKey: string, modelId: string): void {
  const all = { ...readCatalogPreferences() };
  const conn = { ...(all[connectionKey] ?? { models: {}, customModels: [] }) };
  const models = { ...conn.models };

  // Set this model as default and clear default on others for this connection
  for (const id of Object.keys(models)) {
    models[id] = { ...models[id], isDefault: id === modelId };
  }
  if (!models[modelId]) {
    models[modelId] = { enabled: true, isDefault: true };
  } else {
    models[modelId] = { ...models[modelId], isDefault: true };
  }
  conn.models = models;
  conn.defaultModelId = modelId;
  all[connectionKey] = conn;
  saveCatalogPreferences(all);
}

export function addCustomModel(
  connectionKey: string,
  model: { id: string; kind?: ModelKind; family?: string; variant?: string },
): CatalogModel {
  const trimmedId = model.id.trim();
  if (!trimmedId) {
    throw new Error("模型 ID 不能为空");
  }

  const all = { ...readCatalogPreferences() };
  const conn = { ...(all[connectionKey] ?? { models: {}, customModels: [] }) };
  const existing = conn.customModels.find((m) => m.id === trimmedId);
  if (existing) {
    return existing;
  }

  const newModel: CatalogModel = {
    id: trimmedId,
    kind: model.kind ?? "text",
    source: "manual",
    family: model.family,
    variant: model.variant,
  };

  conn.customModels = [...conn.customModels, newModel];
  conn.models = {
    ...conn.models,
    [trimmedId]: { enabled: true, isDefault: false },
  };
  all[connectionKey] = conn;
  saveCatalogPreferences(all);
  return newModel;
}

export function removeCustomModel(
  connectionKey: string,
  modelId: string,
): void {
  const all = { ...readCatalogPreferences() };
  const conn = { ...(all[connectionKey] ?? { models: {}, customModels: [] }) };
  conn.customModels = conn.customModels.filter((m) => m.id !== modelId);
  const models = { ...conn.models };
  delete models[modelId];
  conn.models = models;
  if (conn.defaultModelId === modelId) {
    conn.defaultModelId = undefined;
  }
  all[connectionKey] = conn;
  saveCatalogPreferences(all);
}

export function mergeCatalogWithPreferences(
  connectionKey: string,
  baseModels: CatalogModel[],
): ModelCatalogEntry[] {
  const prefs = getConnectionPrefs(connectionKey);
  const seen = new Set<string>();
  const result: ModelCatalogEntry[] = [];

  // Add custom manual models first or after base models
  const allModels = [...baseModels, ...prefs.customModels];

  for (const model of allModels) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);

    const modelPref = prefs.models[model.id];
    // Default enabled to true unless explicitly set to false
    const enabled = modelPref?.enabled !== false;
    const isDefault =
      modelPref?.isDefault === true || prefs.defaultModelId === model.id;

    result.push({
      ...model,
      enabled,
      isDefault,
    });
  }

  return result;
}

export function subscribeCatalogPreferences(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

export function useModelCatalogPreferences(connectionKey: string): {
  prefs: ConnectionCatalogPrefs;
  setEnabled: (modelId: string, enabled: boolean) => void;
  setDefault: (modelId: string) => void;
  addCustom: (model: { id: string; kind?: ModelKind }) => CatalogModel;
  removeCustom: (modelId: string) => void;
  merge: (models: CatalogModel[]) => ModelCatalogEntry[];
} {
  useSyncExternalStore(
    subscribeCatalogPreferences,
    () => {
      // Store revision snapshot for re-render
      return JSON.stringify(getConnectionPrefs(connectionKey));
    },
    () => "",
  );

  return {
    prefs: getConnectionPrefs(connectionKey),
    setEnabled: (modelId, enabled) =>
      setModelEnabled(connectionKey, modelId, enabled),
    setDefault: (modelId) => setDefaultModel(connectionKey, modelId),
    addCustom: (model) => addCustomModel(connectionKey, model),
    removeCustom: (modelId) => removeCustomModel(connectionKey, modelId),
    merge: (models) => mergeCatalogWithPreferences(connectionKey, models),
  };
}
