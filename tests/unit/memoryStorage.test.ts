import assert from "node:assert/strict";
import test from "node:test";
import {
  createMemoryStorage,
  normalizeStore,
  readFsaStore,
  KK_MEMORY_DIR_NAME,
  KK_MEMORY_FILE_NAME,
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

test("normalizeStore preserves valid records and drops legacy namespace", () => {
  const store = normalizeStore({
    version: MEMORY_STORE_VERSION,
    namespace: "ns-test",
    records: [
      {
        id: "a",
        content: "用户偏好日系插画风格",
        memoryType: "user_preference",
        confidence: 0.8,
        fingerprint: "fingerprint-a",
        source: "auto_rule",
        createdAt: "2026-09-24T00:00:00.000Z",
        updatedAt: "2026-09-24T00:00:00.000Z",
        active: true,
      },
    ],
  });
  // 共享模式：旧隔离文件的 namespace 字段被忽略。
  assert.equal(store.namespace, "");
  assert.equal(store.records.length, 1);
});

test("normalizeStore rejects corrupt records without turning them into empty memory", () => {
  assert.throws(
    () =>
      normalizeStore({
        version: MEMORY_STORE_VERSION,
        records: "bad" as never,
      }),
    /记忆文件格式无效/,
  );
  assert.throws(
    () =>
      normalizeStore({
        version: MEMORY_STORE_VERSION,
        records: [{ id: "a" }] as never,
      }),
    /记忆文件格式无效/,
  );
});

test("shared file contract uses the cross-product names", () => {
  assert.equal(KK_MEMORY_DIR_NAME, ".kk-memory");
  assert.equal(KK_MEMORY_FILE_NAME, "memory.json");
});

test("an existing empty shared file is corruption, while a missing file is a fresh store", async () => {
  const emptyFile = {
    getFileHandle: async () => ({
      getFile: async () => new File([""], "memory.json"),
    }),
  };
  await assert.rejects(
    () => readFsaStore(emptyFile as never),
    /记忆文件格式无效/,
  );

  const missingFile = {
    getFileHandle: async () => {
      throw new DOMException("not found", "NotFoundError");
    },
  };
  assert.deepEqual(await readFsaStore(missingFile as never), {
    version: MEMORY_STORE_VERSION,
    namespace: "",
    records: [],
  });
});

test("createMemoryStorage exposes the shared storage contract", () => {
  const storage = createMemoryStorage();
  assert.equal(typeof storage.read, "function");
  assert.equal(typeof storage.write, "function");
  assert.equal(typeof storage.resetIdentity, "function");
  assert.equal(typeof storage.authorizeSharedDirectory, "function");
  assert.equal(typeof storage.statusText, "function");
  assert.equal(typeof storage.mode, "function");
});
