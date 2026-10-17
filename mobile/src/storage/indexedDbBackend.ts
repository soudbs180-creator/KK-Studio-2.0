import type { SnapshotBackend, OriginalStore } from "./ports.ts";
import { invariant, parseSnapshot } from "./validation.ts";
import type { StorageValidationPolicy } from "./schemaPrimitives.ts";

/** Browser preview persists in IndexedDB; unavailable storage is an error. */
export class IndexedDbBackend implements SnapshotBackend, OriginalStore {
  private readonly database: Promise<IDBDatabase>;
  private readonly policy: StorageValidationPolicy;
  constructor(
    factory: IDBFactory = globalThis.indexedDB,
    policy: StorageValidationPolicy = {},
  ) {
    this.policy = { allowLoopbackHttp: policy.allowLoopbackHttp === true };
    invariant(
      factory,
      "IndexedDB unavailable; persistent preview storage required",
    );
    this.database = new Promise((resolve, reject) => {
      const request = factory.open("kk-mobile-creation-v1", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("snapshots");
        request.result.createObjectStore("originals");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB open failed"));
      request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
    });
  }
  private async operation<T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore, complete: (value: T) => void) => void,
  ): Promise<T> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      let value: T;
      const complete = (result: T) => {
        value = result;
      };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("IndexedDB operation failed"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
      try {
        run(transaction.objectStore(storeName), complete);
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }
  async read(accountId: string): Promise<string | null>;
  async read(accountId: string, assetId: string): Promise<Uint8Array>;
  async read(
    accountId: string,
    assetId?: string,
  ): Promise<string | null | Uint8Array> {
    return this.operation(
      assetId ? "originals" : "snapshots",
      "readonly",
      (store, complete) => {
        const request = store.get(assetId ? [accountId, assetId] : accountId);
        request.onsuccess = () => {
          try {
            if (assetId) {
              invariant(
                request.result instanceof Uint8Array,
                "Original missing or corrupt",
              );
              complete(request.result.slice());
            } else {
              invariant(
                request.result === undefined ||
                  typeof request.result === "string",
                "Corrupt IndexedDB snapshot",
              );
              complete(request.result ?? null);
            }
          } catch {
            store.transaction.abort();
          }
        };
      },
    );
  }
  async compareAndSwap(
    accountId: string,
    expectedRevision: number | null,
    payload: string,
  ): Promise<boolean> {
    const next = parseSnapshot(payload, this.policy);
    invariant(
      next.revision === (expectedRevision === null ? 0 : expectedRevision + 1),
      "Invalid CAS revision",
    );
    return this.operation("snapshots", "readwrite", (store, complete) => {
      const request = store.get(accountId);
      request.onsuccess = () => {
        try {
          const revision =
            request.result === undefined
              ? null
              : parseSnapshot(request.result, this.policy).revision;
          if (revision !== expectedRevision) {
            complete(false);
            return;
          }
          store.put(payload, accountId);
          complete(true);
        } catch {
          store.transaction.abort();
        }
      };
    });
  }
  async write(
    accountId: string,
    assetId: string,
    bytes: Uint8Array,
  ): Promise<void> {
    return this.operation("originals", "readwrite", (store, complete) => {
      store.add(bytes.slice(), [accountId, assetId]);
      complete(undefined);
    });
  }
  async remove(accountId: string, assetId: string): Promise<void> {
    return this.operation("originals", "readwrite", (store, complete) => {
      store.delete([accountId, assetId]);
      complete(undefined);
    });
  }
}
