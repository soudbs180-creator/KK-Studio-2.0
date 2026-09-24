import assert from "node:assert/strict";
import test from "node:test";
import {
  createMemoryStorage,
  normalizeStore,
} from "../../src/features/memory/storage.ts";
import { MEMORY_STORE_VERSION } from "../../src/features/memory/types.ts";

test("normalizeStore rejects null/undefined without fallback", () => {
  // 首次无数据时由 storage.read() 返回空 store；直接传 null 视为损坏数据拒绝。
  assert.throws(() => normalizeStore(null), /版本不支持/);
  assert.throws(() => normalizeStore(undefined), /版本不支持/);
});

test("normalizeStore rejects unsupported version without fallback", () => {
  assert.throws(
    () => normalizeStore({ version: 99, namespace: "ns", records: [] }),
    /版本不支持/,
  );
});

test("normalizeStore preserves valid records and coerces malformed fields", () => {
  const store = normalizeStore({
    version: MEMORY_STORE_VERSION,
    namespace: "ns-test",
    records: [{ id: "a", content: "x" }] as never,
  });
  assert.equal(store.namespace, "ns-test");
  assert.equal(store.records.length, 1);
  const coerced = normalizeStore({
    version: MEMORY_STORE_VERSION,
    namespace: 42 as never,
    records: "bad" as never,
  });
  assert.equal(coerced.namespace, "");
  assert.deepEqual(coerced.records, []);
});

test("createMemoryStorage exposes the storage contract", () => {
  const storage = createMemoryStorage();
  assert.equal(typeof storage.read, "function");
  assert.equal(typeof storage.write, "function");
  assert.equal(typeof storage.resetIdentity, "function");
});
