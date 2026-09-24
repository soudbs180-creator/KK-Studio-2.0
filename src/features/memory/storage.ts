/**
 * 记忆存储层：共享文件 + 平台适配。
 *
 * 共享语义（TASK-MEMORY-002）：
 * - 所有产品（Codex 桌面/Web、豆包 Agent、WorkBuddy）读写同一份共享文件
 *   `~/.kk-memory/memory.json`，本机默认共享，绝不上云；
 * - Desktop：Tauri 命令 memory_read/memory_write/memory_reset_identity
 *   （Rust 侧指向共享路径，原子写、损坏拒绝覆盖）；
 * - Web：优先 File System Access（用户授权一次共享目录后持久读写）；
 *   浏览器不支持/未授权时降级为 IndexedDB 私有存储（不参与共享，UI 明示）；
 * - localStorage 只允许存设置开关（kk.memory.settings），记忆内容绝不进 localStorage。
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { MEMORY_STORE_VERSION, type MemoryStoreFile } from "./types.ts";

const DB_NAME = "kk-studio-next";
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
  /** shared=读写共享文件；isolated=降级到本应用私有存储（Web 未授权时）。 */
  readonly mode: "shared" | "isolated";
  /** Web 端：请求用户授权共享目录；Desktop 恒为 true。 */
  authorizeSharedDirectory(): Promise<boolean>;
  /** Web 端：共享授权状态描述（供 UI 展示）。 */
  statusText(): Promise<string>;
}

function emptyStore(): MemoryStoreFile {
  return { version: MEMORY_STORE_VERSION, namespace: "", records: [] };
}

/** 校验并规整存储值：版本不匹配拒绝读取（保留原件），记录数组必须合法。 */
export function normalizeStore(
  value: Partial<MemoryStoreFile> | null | undefined,
): MemoryStoreFile {
  if (!value || value.version !== MEMORY_STORE_VERSION) {
    throw new Error("本地记忆版本不支持，已保留原数据");
  }
  const records = Array.isArray(value.records) ? value.records : [];
  return {
    version: MEMORY_STORE_VERSION,
    namespace: "",
    records,
  };
}

// ========== 降级通道：IndexedDB 私有存储（Web 未授权共享时） ==========

function openIndexedDb(storeName: string, version = 1): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("无法打开本地记忆数据库"));
  });
}

async function idbGet(storeName: string, key: string): Promise<unknown> {
  const db = await openIndexedDb(storeName);
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
  const db = await openIndexedDb(storeName);
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
  if (!value) {
    return emptyStore();
  }
  return normalizeStore(value as Partial<MemoryStoreFile>);
}

async function idbWrite(store: MemoryStoreFile): Promise<MemoryStoreFile> {
  await idbPut(DB_STORE, DB_KEY, store);
  return store;
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

async function readFsaStore(
  handle: FileSystemDirectoryHandleLoose,
): Promise<MemoryStoreFile> {
  const fileHandle = await handle.getFileHandle(KK_MEMORY_FILE_NAME, {
    create: true,
  });
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    return emptyStore();
  }
  const text = await file.text();
  return normalizeStore(JSON.parse(text) as Partial<MemoryStoreFile>);
}

async function writeFsaStore(
  handle: FileSystemDirectoryHandleLoose,
  store: MemoryStoreFile,
): Promise<MemoryStoreFile> {
  const fileHandle = await handle.getFileHandle(KK_MEMORY_FILE_NAME, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(JSON.stringify(store, null, 2));
  } finally {
    await writable.close();
  }
  return store;
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
  mode: "shared",
  read: () => invoke<MemoryStoreFile>("memory_read"),
  write: (store) => invoke<MemoryStoreFile>("memory_write", { store }),
  resetIdentity: () => invoke<MemoryStoreFile>("memory_reset_identity"),
  authorizeSharedDirectory: async () => true,
  statusText: async () => KK_MEMORY_DIR_NAME,
};

function createWebStorage(): MemoryStorage {
  const isolated: MemoryStorage = {
    mode: "isolated",
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
    mode: "shared",
    read: async () => {
      const handle = await usableSharedHandle();
      if (!handle) {
        return isolated.read();
      }
      return readFsaStore(handle);
    },
    write: async (store) => {
      const handle = await usableSharedHandle();
      if (!handle) {
        return isolated.write(store);
      }
      return writeFsaStore(handle, store);
    },
    resetIdentity: async () => {
      const fresh = emptyStore();
      const handle = await usableSharedHandle();
      if (handle) {
        await writeFsaStore(handle, fresh);
        return fresh;
      }
      return isolated.resetIdentity();
    },
    authorizeSharedDirectory: async () => {
      const handle = await showDirectoryPicker();
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
  return shared;
}

export function createMemoryStorage(): MemoryStorage {
  if (isTauri()) {
    return desktopStorage;
  }
  return createWebStorage();
}
