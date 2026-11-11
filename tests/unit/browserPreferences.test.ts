import assert from "node:assert/strict";
import test from "node:test";
import {
  BROWSER_PROVIDER_STORAGE_KEY,
  readBrowserProvider,
  writeBrowserProvider,
} from "../../src/features/browser/browserPreferences.ts";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("defaults browser selection to the internal browser", () => {
  assert.equal(readBrowserProvider(storage()), "internal");
});

test("persists only a known browser provider id", () => {
  const target = storage();
  writeBrowserProvider(target, "ego-lite");
  assert.equal(target.getItem(BROWSER_PROVIDER_STORAGE_KEY), "ego-lite");
  assert.equal(readBrowserProvider(target), "ego-lite");

  target.setItem(BROWSER_PROVIDER_STORAGE_KEY, "unknown");
  assert.equal(readBrowserProvider(target), "internal");
});
