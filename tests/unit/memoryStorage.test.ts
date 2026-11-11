import assert from "node:assert/strict";
import test from "node:test";
import {
  createMemoryStorage,
  normalizeStore,
  readFsaStore,
  readFsaScopedStore,
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
  assert.equal(typeof storage.leaveSharedDirectory, "function");
  assert.equal(typeof storage.statusText, "function");
  assert.equal(typeof storage.mode, "function");
});

test("shared V2 files project safely to legacy management without changing records", async () => {
  const timestamp = "2026-11-04T00:00:00Z";
  const value = {
    version: 2,
    namespace: "global",
    records: [],
    updatedAt: timestamp,
    metadata: {
      scope: "global",
      recordCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
  const handle = {
    getFileHandle: async () => ({
      getFile: async () => new File([JSON.stringify(value)], "memory.json"),
    }),
  };
  assert.deepEqual(await readFsaStore(handle), {
    version: 1,
    namespace: "",
    records: [],
  });
  value.metadata.recordCount = 1;
  await assert.rejects(() => readFsaStore(handle), /元数据无效/);
});

test("shared scoped reads use Desktop SHA256 filenames and propagate permission errors", async () => {
  const { createHash } = await import("node:crypto");
  const timestamp = "2026-11-04T00:00:00Z";
  const raw = JSON.stringify({
    version: 2,
    namespace: "project:项目/../p1",
    records: [],
    updatedAt: timestamp,
    metadata: {
      scope: "project",
      scopeId: "项目/../p1",
      recordCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });
  let directory = "",
    file = "";
  const handle = {
    name: ".kk-memory",
    getFileHandle: async () => {
      throw new Error("unexpected global read");
    },
    getDirectoryHandle: async (name: string) => {
      directory = name;
      return {
        name,
        getFileHandle: async (filename: string) => {
          file = filename;
          return { getFile: async () => new File([raw], filename) };
        },
      };
    },
  };
  assert.equal(await readFsaScopedStore(handle, "project:项目/../p1"), raw);
  assert.equal(directory, "projects");
  assert.equal(
    file,
    createHash("sha256").update("项目/../p1").digest("hex") + ".json",
  );
  handle.getDirectoryHandle = async () => {
    throw new DOMException("denied", "NotAllowedError");
  };
  await assert.rejects(
    () => readFsaScopedStore(handle, "project:p1"),
    /denied/,
  );
});
