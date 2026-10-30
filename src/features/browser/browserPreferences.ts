import {
  BROWSER_PROVIDER_IDS,
  type BrowserProviderId,
} from "./browserTypes.ts";

export const BROWSER_PROVIDER_STORAGE_KEY = "kk-browser-provider";

export interface BrowserPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();
const fallbackStorage: BrowserPreferenceStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

function defaultStorage(): BrowserPreferenceStorage {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch (error) {
    // Fall back to the session-only store when browser storage is blocked.
    void error;
  }
  return fallbackStorage;
}

export function readBrowserProvider(
  storage: BrowserPreferenceStorage = defaultStorage(),
): BrowserProviderId {
  try {
    const value = storage.getItem(BROWSER_PROVIDER_STORAGE_KEY);
    return BROWSER_PROVIDER_IDS.includes(value as BrowserProviderId)
      ? (value as BrowserProviderId)
      : "internal";
  } catch {
    return "internal";
  }
}

export function writeBrowserProvider(
  storage: BrowserPreferenceStorage | null,
  provider: BrowserProviderId,
): void {
  try {
    (storage ?? defaultStorage()).setItem(
      BROWSER_PROVIDER_STORAGE_KEY,
      provider,
    );
  } catch (error) {
    // Selection remains active for this render even if persistence is blocked.
    void error;
  }
}
