import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  createMemoryStorage,
  MemoryConflictError,
  type MemoryStorage,
} from "./storage.ts";
import { normalizeStoreV2 } from "./kkMemorySchema.ts";

export interface KkMemoryDriver {
  readonly name: string;
  read(namespace: string): Promise<string | null>;
  /** null means absent; the exact snapshot is checked inside the write transaction. */
  write(
    namespace: string,
    data: string,
    expected: string | null,
  ): Promise<void>;
  listNamespaces(): Promise<string[]>;
  /** File-backed drivers preserve the previous raw file before identity reset. */
  resetIdentity?(namespace: string): Promise<void>;
}

/** Explicit test/embedded driver; never selected as a persistence fallback. */
export class InMemoryMemoryDriver implements KkMemoryDriver {
  readonly name = "in-memory";
  private readonly stores = new Map<string, string>();
  async read(namespace: string) {
    return this.stores.get(namespace) ?? null;
  }
  async write(namespace: string, data: string, expected: string | null) {
    if ((this.stores.get(namespace) ?? null) !== expected)
      throw new MemoryConflictError();
    this.stores.set(namespace, data);
  }
  async listNamespaces() {
    return [...this.stores.keys()].sort();
  }
}

export class TauriMemoryDriver implements KkMemoryDriver {
  readonly name = "tauri-desktop";
  read(namespace: string) {
    return invoke<string | null>("memory_read_scoped", { namespace });
  }
  async write(
    namespace: string,
    serializedData: string,
    expectedSerialized: string | null,
  ) {
    try {
      await invoke("memory_write_scoped", {
        namespace,
        serializedData,
        expectedSerialized,
      });
    } catch (error) {
      if (String(error).includes("MEMORY_CONFLICT"))
        throw new MemoryConflictError();
      throw error;
    }
  }
  listNamespaces() {
    return invoke<string[]>("memory_list_namespaces");
  }
  resetIdentity(namespace: string) {
    return invoke<void>("memory_reset_scoped", { namespace });
  }
}

export class IndexedDbMemoryDriver implements KkMemoryDriver {
  readonly name = "indexeddb-scoped";
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("kk-studio-memory-v2", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("namespaces");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("无法打开长期记忆数据库"));
    });
  }
  async read(namespace: string): Promise<string | null> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db
          .transaction("namespaces", "readonly")
          .objectStore("namespaces")
          .get(namespace);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(new Error("读取作用域记忆失败"));
      });
    } finally {
      db.close();
    }
  }
  async write(namespace: string, data: string, expected: string | null) {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("namespaces", "readwrite");
        const store = tx.objectStore("namespaces");
        const request = store.get(namespace);
        let error: Error | undefined;
        request.onsuccess = () => {
          if ((request.result ?? null) !== expected) {
            error = new MemoryConflictError();
            tx.abort();
          } else store.put(data, namespace);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () =>
          reject(error ?? new Error("写入作用域记忆失败"));
      });
    } finally {
      db.close();
    }
  }
  async listNamespaces(): Promise<string[]> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const request = db
          .transaction("namespaces", "readonly")
          .objectStore("namespaces")
          .getAllKeys();
        request.onsuccess = () => resolve(request.result.map(String).sort());
        request.onerror = () => reject(new Error("读取作用域列表失败"));
      });
    } finally {
      db.close();
    }
  }
}

/** Retains the existing Web database, permission handle, and shared read-only policy. */
class BrowserMemoryDriver implements KkMemoryDriver {
  readonly name = "browser";
  private readonly scoped = new IndexedDbMemoryDriver();
  private readonly platform: MemoryStorage;
  constructor(platform: MemoryStorage) {
    this.platform = platform;
  }
  async read(namespace: string) {
    if (namespace === "global")
      return JSON.stringify(await this.platform.read());
    const mode = await this.platform.mode();
    if (mode === "locked") throw new Error("共享目录授权已失效");
    if (mode === "shared-readonly") {
      if (!this.platform.readScoped)
        throw new Error("当前存储不支持作用域读取");
      return this.platform.readScoped(namespace);
    }
    return this.scoped.read(namespace);
  }
  async write(namespace: string, data: string, expected: string | null) {
    const mode = await this.platform.mode();
    if (mode !== "isolated")
      throw new Error("浏览器共享目录只读，请在桌面端修改记忆");
    if (namespace !== "global")
      return this.scoped.write(namespace, data, expected);
    const next = normalizeStoreV2(JSON.parse(data), namespace);
    const previous = expected === null ? null : JSON.parse(expected);
    await this.platform.write(
      { version: 1, namespace: "", records: next.records },
      previous ?? { version: 1, namespace: "", records: [] },
    );
  }
  async listNamespaces() {
    return (await this.platform.mode()) === "isolated"
      ? ["global", ...(await this.scoped.listNamespaces())]
      : ["global"];
  }
}

export const memoryPlatformStorage = createMemoryStorage();
export function createKkMemoryDriver(): KkMemoryDriver {
  return isTauri()
    ? new TauriMemoryDriver()
    : new BrowserMemoryDriver(memoryPlatformStorage);
}
