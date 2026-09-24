/**
 * 记忆存储层：共享文件 + 平台适配。
 *
 * 共享语义（TASK-MEMORY-002）：
 * - 共享文件契约位于 `~/.kk-memory/memory.json`；当前只由 KK Studio
 *   Codex 通道接入，其他产品仍需单独实现和验证；
 * - Desktop：Tauri 命令 memory_read/memory_write/memory_reset_identity
 *   （Rust 侧指向共享路径，原子写、损坏拒绝覆盖）；
 * - Web：优先 File System Access（用户授权一次共享目录后持久读写）；
 *   浏览器不支持/未授权时降级为 IndexedDB 私有存储（不参与共享，UI 明示）；
 * - localStorage 只允许存设置开关（kk.memory.settings），记忆内容绝不进 localStorage。
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_RECORDS_MAX,
  MEMORY_STORE_VERSION,
  type MemoryRecord,
  type MemoryStoreFile,
} from "./types.ts";

// Creation snapshots use kk-studio-next at schema version 1. Memory needs two
// stores, so it owns a separate database instead of upgrading creation data.
const DB_NAME = "kk-studio-memory";
const LEGACY_DB_NAME = "kk-studio-next";
const DB_STORE = "memory";
const DB_KEY = "default";
const FS_HANDLE_DB_STORE = "memory-fs-handle";
const FS_HANDLE_KEY = "shared-dir";

/** 共享目录名与文件名（各产品约定）。 */
export const KK_MEMORY_DIR_NAME = ".kk-memory";
export const KK_MEMORY_FILE_NAME = "memory.json";

export interface MemoryStorage {
  read(): Promise<MemoryStoreFile>;
  write(
    store: MemoryStoreFile,
    expected: MemoryStoreFile,
  ): Promise<MemoryStoreFile>;
  resetIdentity(): Promise<MemoryStoreFile>;
  /** locked=共享目录曾授权但权限已失效，暂停读写以免分叉。 */
  mode(): Promise<"shared" | "isolated" | "locked">;
  /** Web 端：请求用户授权共享目录；Desktop 恒为 true。 */
  authorizeSharedDirectory(): Promise<boolean>;
  /** Web 端：共享授权状态描述（供 UI 展示）。 */
  statusText(): Promise<string>;
}

export class MemoryConflictError extends Error {
  constructor() {
    super("MEMORY_CONFLICT：共享记忆已被其他窗口修改，请重试");
    this.name = "MemoryConflictError";
  }
}

function sameStore(first: MemoryStoreFile, second: MemoryStoreFile): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function emptyStore(): MemoryStoreFile {
  return { version: MEMORY_STORE_VERSION, namespace: "", records: [] };
}

function validRecord(value: unknown): value is MemoryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<MemoryRecord>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.content === "string" &&
    record.content.trim().length > 0 &&
    record.content.length <= MEMORY_CONTENT_MAX_LENGTH &&
    [
      "user_profile",
      "user_preference",
      "user_habit",
      "user_constraint",
    ].includes(record.memoryType ?? "") &&
    typeof record.confidence === "number" &&
    Number.isFinite(record.confidence) &&
    record.confidence >= 0 &&
    record.confidence <= 1 &&
    typeof record.fingerprint === "string" &&
    record.fingerprint.length > 0 &&
    ["auto_rule", "manual_codex", "manual_user"].includes(
      record.source ?? "",
    ) &&
    (record.sourceThreadId === undefined ||
      typeof record.sourceThreadId === "string") &&
    typeof record.createdAt === "string" &&
    !Number.isNaN(Date.parse(record.createdAt)) &&
    typeof record.updatedAt === "string" &&
    !Number.isNaN(Date.parse(record.updatedAt)) &&
    (record.lastUsedAt === undefined ||
      (typeof record.lastUsedAt === "string" &&
        !Number.isNaN(Date.parse(record.lastUsedAt)))) &&
    typeof record.active === "boolean"
  );
}

/** 校验并规整存储值：版本不匹配拒绝读取（保留原件），记录数组必须合法。 */
export function normalizeStore(
  value: Partial<MemoryStoreFile> | null | undefined,
): MemoryStoreFile {
  if (!value || value.version !== MEMORY_STORE_VERSION) {
    throw new Error("本地记忆版本不支持，已保留原数据");
  }
  if (
    !Array.isArray(value.records) ||
    value.records.length > MEMORY_RECORDS_MAX ||
    !value.records.every(validRecord)
  ) {
    throw new Error("记忆文件格式无效，已保留原数据");
  }
  return {
    version: MEMORY_STORE_VERSION,
    namespace: "",
    records: value.records,
  };
}

// ========== 降级通道：IndexedDB 私有存储（Web 未授权共享时） ==========

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [DB_STORE, FS_HANDLE_DB_STORE]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("无法打开本地记忆数据库"));
  });
}

async function idbGet(storeName: string, key: string): Promise<unknown> {
  const db = await openIndexedDb();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("无法读取本地记忆"));
    });
  } finally {
    db.close();
  }
}

async function idbPut(
  storeName: string,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await openIndexedDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("无法写入本地记忆"));
    });
  } finally {
    db.close();
  }
}

async function idbRead(): Promise<MemoryStoreFile> {
  const value = await idbGet(DB_STORE, DB_KEY);
  if (value === undefined) {
    const legacy = await readLegacyStore();
    if (legacy) {
      try {
        await idbWrite(legacy, emptyStore());
        return legacy;
      } catch (error) {
        if (error instanceof MemoryConflictError) return idbRead();
        throw error;
      }
    }
    return emptyStore();
  }
  return normalizeStore(value as Partial<MemoryStoreFile>);
}

/** Read the earlier candidate DB without creating it or changing creation data. */
async function readLegacyStore(): Promise<MemoryStoreFile | null> {
  if (typeof indexedDB.databases !== "function") return null;
  const databases = await indexedDB.databases();
  if (!databases.some((item) => item.name === LEGACY_DB_NAME)) return null;
  const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      request.error?.name === "AbortError"
        ? resolve(null)
        : reject(new Error("无法读取旧版记忆数据库"));
  });
  if (!db) return null;
  try {
    if (!db.objectStoreNames.contains(DB_STORE)) return null;
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db
        .transaction(DB_STORE, "readonly")
        .objectStore(DB_STORE)
        .get(DB_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("无法读取旧版记忆"));
    });
    return raw === undefined
      ? null
      : normalizeStore(raw as Partial<MemoryStoreFile>);
  } finally {
    db.close();
  }
}

async function idbWrite(
  store: MemoryStoreFile,
  expected: MemoryStoreFile,
): Promise<MemoryStoreFile> {
  const valid = normalizeStore(store);
  const db = await openIndexedDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const objectStore = tx.objectStore(DB_STORE);
      const request = objectStore.get(DB_KEY);
      request.onsuccess = () => {
        try {
          const current =
            request.result === undefined
              ? emptyStore()
              : normalizeStore(request.result as Partial<MemoryStoreFile>);
          if (!sameStore(current, normalizeStore(expected))) {
            throw new MemoryConflictError();
          }
          objectStore.put(valid, DB_KEY);
        } catch (error) {
          reject(error);
          tx.abort();
        }
      };
      request.onerror = () => reject(new Error("无法读取本地记忆"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("无法写入本地记忆"));
    });
  } finally {
    db.close();
  }
  return valid;
}

// ========== Web 共享通道：File System Access（用户授权目录） ==========

interface FileSystemWritableFileStreamLoose {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

interface FileSystemFileHandleLoose {
  getFile(): Promise<File>;
  createWritable(options?: {
    mode: "exclusive";
  }): Promise<FileSystemWritableFileStreamLoose>;
}

interface FileSystemDirectoryHandleLoose {
  readonly name: string;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandleLoose>;
  queryPermission?(options?: { mode: string }): Promise<string>;
  requestPermission?(options?: { mode: string }): Promise<string>;
}

function showDirectoryPicker(): Promise<FileSystemDirectoryHandleLoose> {
  const picker = (
    window as unknown as {
      showDirectoryPicker(): Promise<FileSystemDirectoryHandleLoose>;
    }
  ).showDirectoryPicker;
  if (typeof picker !== "function") {
    return Promise.reject(new Error("当前浏览器不支持共享目录访问"));
  }
  return picker.call(window);
}

export async function readFsaStore(
  handle: FileSystemDirectoryHandleLoose,
): Promise<MemoryStoreFile> {
  let fileHandle: FileSystemFileHandleLoose;
  try {
    fileHandle = await handle.getFileHandle(KK_MEMORY_FILE_NAME);
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return emptyStore();
    }
    throw error;
  }
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    throw new Error("记忆文件格式无效，已保留原数据");
  }
  const text = await file.text();
  return normalizeStore(JSON.parse(text) as Partial<MemoryStoreFile>);
}

async function writeFsaStore(
  handle: FileSystemDirectoryHandleLoose,
  store: MemoryStoreFile,
  expected: MemoryStoreFile,
): Promise<MemoryStoreFile> {
  if (!navigator.locks) {
    throw new Error("浏览器不支持安全的共享记忆写入");
  }
  return navigator.locks.request("kk-studio-memory-file", async () => {
    const current = await readFsaStore(handle);
    if (!sameStore(current, normalizeStore(expected))) {
      throw new MemoryConflictError();
    }
    const valid = normalizeStore(store);
    const fileHandle = await handle.getFileHandle(KK_MEMORY_FILE_NAME, {
      create: true,
    });
    let writable: FileSystemWritableFileStreamLoose;
    try {
      writable = await fileHandle.createWritable({ mode: "exclusive" });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "NoModificationAllowedError"
      ) {
        throw new MemoryConflictError();
      }
      throw error;
    }
    try {
      await writable.write(JSON.stringify(valid, null, 2));
      await writable.close();
    } catch (error) {
      await writable.abort?.().catch(() => undefined);
      throw error;
    }
    return valid;
  });
}

async function storedDirHandle(): Promise<FileSystemDirectoryHandleLoose | null> {
  const raw = await idbGet(FS_HANDLE_DB_STORE, FS_HANDLE_KEY);
  return (raw as FileSystemDirectoryHandleLoose) ?? null;
}

async function persistDirHandle(
  handle: FileSystemDirectoryHandleLoose,
): Promise<void> {
  await idbPut(FS_HANDLE_DB_STORE, FS_HANDLE_KEY, handle);
}

async function hasPermission(
  handle: FileSystemDirectoryHandleLoose,
): Promise<boolean> {
  if (typeof handle.queryPermission !== "function") {
    return false;
  }
  return (await handle.queryPermission({ mode: "readwrite" })) === "granted";
}

async function requestPermission(
  handle: FileSystemDirectoryHandleLoose,
): Promise<boolean> {
  if (typeof handle.requestPermission !== "function") {
    return false;
  }
  return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
}

/** 当前授权共享目录句柄（已持久化 + 有读写权限），否则 null。 */
async function usableSharedHandle(): Promise<FileSystemDirectoryHandleLoose | null> {
  const handle = await storedDirHandle();
  if (!handle) {
    return null;
  }
  if (await hasPermission(handle)) {
    return handle;
  }
  return null;
}

// ========== 组合存储 ==========

const desktopStorage: MemoryStorage = {
  mode: async () => "shared",
  read: () => invoke<MemoryStoreFile>("memory_read"),
  write: async (store, expected) => {
    try {
      return await invoke<MemoryStoreFile>("memory_write", { store, expected });
    } catch (error) {
      if (String(error).includes("MEMORY_CONFLICT")) {
        throw new MemoryConflictError();
      }
      throw error;
    }
  },
  resetIdentity: () => invoke<MemoryStoreFile>("memory_reset_identity"),
  authorizeSharedDirectory: async () => true,
  statusText: async () => KK_MEMORY_DIR_NAME,
};

function createWebStorage(): MemoryStorage {
  const isolated: MemoryStorage = {
    mode: async () => "isolated",
    read: idbRead,
    write: idbWrite,
    resetIdentity: async () => {
      const fresh = emptyStore();
      await idbWrite(fresh, await idbRead());
      return fresh;
    },
    authorizeSharedDirectory: async () => {
      // 用户手势：选择共享目录（.kk-memory/）
      const handle = await showDirectoryPicker();
      if (handle.name !== KK_MEMORY_DIR_NAME) {
        throw new Error(`请选择 ${KK_MEMORY_DIR_NAME} 目录`);
      }
      if (!(await requestPermission(handle))) {
        return false;
      }
      await persistDirHandle(handle);
      return true;
    },
    statusText: async () => {
      const handle = await usableSharedHandle();
      return handle
        ? `已授权共享目录（${KK_MEMORY_DIR_NAME}）`
        : "未授权共享目录，记忆仅存本应用";
    },
  };
  const shared: MemoryStorage = {
    mode: async () => {
      const handle = await storedDirHandle();
      if (!handle) return "isolated";
      return (await hasPermission(handle)) ? "shared" : "locked";
    },
    read: async () => {
      const handle = await storedDirHandle();
      if (!handle) {
        return isolated.read();
      }
      if (!(await hasPermission(handle))) {
        throw new Error("共享目录授权已失效，请重新授权后读取记忆");
      }
      return readFsaStore(handle);
    },
    write: async (store, expected) => {
      const handle = await storedDirHandle();
      if (!handle) {
        return isolated.write(store, expected);
      }
      if (!(await hasPermission(handle))) {
        throw new Error("共享目录授权已失效，请重新授权后写入记忆");
      }
      return writeFsaStore(handle, store, expected);
    },
    resetIdentity: async () => {
      const fresh = emptyStore();
      const handle = await storedDirHandle();
      if (handle) {
        if (!(await hasPermission(handle))) {
          throw new Error("共享目录授权已失效，请重新授权后重置记忆");
        }
        await writeFsaStore(handle, fresh, await readFsaStore(handle));
        return fresh;
      }
      return isolated.resetIdentity();
    },
    authorizeSharedDirectory: async () => {
      const handle = await showDirectoryPicker();
      if (handle.name !== KK_MEMORY_DIR_NAME) {
        throw new Error(`请选择 ${KK_MEMORY_DIR_NAME} 目录`);
      }
      if (!(await requestPermission(handle))) {
        return false;
      }
      const local = await idbRead();
      const remote = await readFsaStore(handle);
      const fingerprints = new Set(
        remote.records.map((record) => record.fingerprint),
      );
      const additions = local.records.filter(
        (record) => !fingerprints.has(record.fingerprint),
      );
      if (additions.length > 0) {
        await writeFsaStore(
          handle,
          normalizeStore({
            ...remote,
            records: [...remote.records, ...additions],
          }),
          remote,
        );
      }
      await persistDirHandle(handle);
      return true;
    },
    statusText: async () => {
      const handle = await usableSharedHandle();
      if (handle) return `已授权共享目录（${KK_MEMORY_DIR_NAME}）`;
      return (await storedDirHandle())
        ? "共享目录授权已失效，记忆读写已暂停，请重新授权"
        : "未授权共享目录，记忆仅存本应用";
    },
  };
  return shared;
}

export function createMemoryStorage(): MemoryStorage {
  if (isTauri()) {
    return desktopStorage;
  }
  return createWebStorage();
}
