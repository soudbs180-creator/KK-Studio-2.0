/**
 * 记忆存储层：平台适配（Web IndexedDB / Desktop Tauri IPC）。
 *
 * 隐私约束：
 * - 只使用 IndexedDB（Web）与 memory/memory.json（Desktop），
 *   绝不使用 localStorage（防浏览器同步与扩展读取）；
 * - Desktop 侧读写由 Tauri 命令完成，损坏文件拒绝覆盖并保留原件。
 */
import { invoke, isTauri } from "@tauri-apps/api/core";
import { MEMORY_STORE_VERSION, type MemoryStoreFile } from "./types.ts";

const DB_NAME = "kk-studio-next";
const DB_STORE = "memory";
const DB_KEY = "default";

export interface MemoryStorage {
  read(): Promise<MemoryStoreFile>;
  write(store: MemoryStoreFile): Promise<MemoryStoreFile>;
  resetIdentity(): Promise<MemoryStoreFile>;
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
    namespace: typeof value.namespace === "string" ? value.namespace : "",
    records,
  };
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("无法打开本地记忆数据库"));
  });
}

async function idbRead(): Promise<MemoryStoreFile> {
  const db = await openIndexedDb();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const request = tx.objectStore(DB_STORE).get(DB_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("无法读取本地记忆"));
    });
    if (!value) {
      return emptyStore();
    }
    return normalizeStore(value as Partial<MemoryStoreFile>);
  } finally {
    db.close();
  }
}

async function idbWrite(store: MemoryStoreFile): Promise<MemoryStoreFile> {
  const db = await openIndexedDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(store, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("无法写入本地记忆"));
    });
    return store;
  } finally {
    db.close();
  }
}

const desktopStorage: MemoryStorage = {
  read: () => invoke<MemoryStoreFile>("memory_read"),
  write: (store) => invoke<MemoryStoreFile>("memory_write", { store }),
  resetIdentity: () => invoke<MemoryStoreFile>("memory_reset_identity"),
};

const webStorage: MemoryStorage = {
  read: idbRead,
  write: idbWrite,
  resetIdentity: async () => {
    const fresh = emptyStore();
    await idbWrite(fresh);
    return fresh;
  },
};

export function createMemoryStorage(): MemoryStorage {
  return isTauri() ? desktopStorage : webStorage;
}
