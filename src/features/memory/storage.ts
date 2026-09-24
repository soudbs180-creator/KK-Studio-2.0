/**
 * 记忆存储层：共享文件 + 平台适配。
 *
 * 共享语义（TASK-MEMORY-002）：
 * - 所有产品（Codex 桌面/Web、豆包 Agent、WorkBuddy）读写同一份共享文件
 *   `~/.kk-memory/memory.json`，本机共享文件不参与云端同步；
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
const DB_STORE = "memory";
const DB_KEY = "default";
const FS_HANDLE_DB_STORE = "memory-fs-handle";
const FS_HANDLE_KEY = "shared-dir";

/** 共享目录名与文件名（各产品约定）。 */
export const KK_MEMORY_DIR_NAME = ".kk-memory";
export const KK_MEMORY_FILE_NAME = "memory.json";

export interface MemoryStorage {
  read(): Promise<MemoryStoreFile>;
  write(store: MemoryStoreFile): Promise<MemoryStoreFile>;
  resetIdentity(): Promise<MemoryStoreFile>;
  /** locked=共享目录曾授权但权限已失效，暂停读写以免分叉。 */
  mode(): Promise<"shared" | "isolated" | "locked">;
  /** Web 端：请求用户授权共享目录；Desktop 恒为 true。 */
  authorizeSharedDirectory(): Promise<boolean>;
  /** Web 端：共享授权状态描述（供 UI 展示）。 */
  statusText(): Promise<string>;
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
    return emptyStore();
  }
  return normalizeStore(value as Partial<MemoryStoreFile>);
}

async function idbWrite(store: MemoryStoreFile): Promise<MemoryStoreFile> {
  await idbRead();
  const valid = normalizeStore(store);
  await idbPut(DB_STORE, DB_KEY, valid);
  return valid;
}

// ========== Web 共享通道：File System Access（用户授权目录） ==========

interface FileSystemWritableFileStreamLoose {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLoose {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStreamLoose>;
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
): Promise<MemoryStoreFile> {
  await readFsaStore(handle);
  const valid = normalizeStore(store);
  const fileHandle = await handle.getFileHandle(KK_MEMORY_FILE_NAME, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(JSON.stringify(valid, null, 2));
  } finally {
    await writable.close();
  }
  return valid;
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
  write: (store) => invoke<MemoryStoreFile>("memory_write", { store }),
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
      await idbWrite(fresh);
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
    write: async (store) => {
      const handle = await storedDirHandle();
      if (!handle) {
        return isolated.write(store);
      }
      if (!(await hasPermission(handle))) {
        throw new Error("共享目录授权已失效，请重新授权后写入记忆");
      }
      return writeFsaStore(handle, store);
    },
    resetIdentity: async () => {
      const fresh = emptyStore();
      const handle = await storedDirHandle();
      if (handle) {
        if (!(await hasPermission(handle))) {
          throw new Error("共享目录授权已失效，请重新授权后重置记忆");
        }
        await writeFsaStore(handle, fresh);
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
