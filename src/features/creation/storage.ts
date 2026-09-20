import { invoke } from "@tauri-apps/api/core";
import { loadStoredAsset } from "./assetRepository";
import { encodeSnapshotAssets, hydrateSnapshotAssets } from "./snapshotAssets";
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
  type CreationSnapshot,
} from "./model";
import {
  decodeSnapshot,
  parseSnapshot,
  SnapshotStorageError,
} from "./snapshotCodec";

const DATABASE = "kk-studio-next";
const STORE = "creation";
const RECORD = "snapshot";
const JOURNAL = `${CREATION_STORAGE_KEY}:pending`;
let expectedRevision: number | null = null;
let writable = false;
export interface SnapshotLoad {
  snapshot: CreationSnapshot;
  recovered: boolean;
  durableRevision: number | null;
  recoveryDraft?: CreationSnapshot;
}
function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__,
    )
  );
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new SnapshotStorageError("io", "浏览器本地存储不可用。"));
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readIndexed(): Promise<unknown> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .get(RECORD);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function writeIndexed(snapshot: CreationSnapshot): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      let failure: unknown;
      const read = store.get(RECORD);
      read.onsuccess = () => {
        try {
          const current =
            read.result == null ? null : decodeSnapshot(read.result);
          if ((current?.revision ?? null) !== expectedRevision)
            throw new SnapshotStorageError(
              "conflict",
              "项目已在另一窗口更新。",
            );
          if (current && snapshot.revision <= current.revision)
            throw new SnapshotStorageError(
              "conflict",
              "项目版本已变化，请重新读取。",
            );
          if (current) {
            store.put(read.result, "backup");
            if (
              (read.result as CreationSnapshot).projects.some(
                (project) =>
                  !(project as unknown as { canvas?: unknown }).canvas,
              )
            ) {
              const original = store.get("pre-canvas-v1");
              original.onsuccess = () => {
                if (original.result === undefined)
                  store.put(read.result, "pre-canvas-v1");
              };
            }
          }
          store.put(snapshot, RECORD);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(failure ?? transaction.error ?? new Error("项目保存中断"));
    });
  } finally {
    db.close();
  }
}
export async function loadCreationSnapshot(
  preferDurable = false,
): Promise<SnapshotLoad> {
  writable = false;
  if (isDesktop()) {
    const result = await invoke<{
      status: "loaded" | "missing" | "recovered";
      snapshot: unknown;
    }>("read_creation_snapshot");
    const decoded =
      result.status === "missing" && result.snapshot === null
        ? emptySnapshot()
        : decodeSnapshot(result.snapshot);
    const snapshot = await hydrateSnapshotAssets(decoded, loadStoredAsset);
    expectedRevision = result.status === "missing" ? null : snapshot.revision;
    writable = true;
    return {
      snapshot,
      recovered: result.status === "recovered",
      durableRevision: expectedRevision,
    };
  }
  const raw = window.localStorage.getItem(CREATION_STORAGE_KEY);
  const local = raw === null ? null : parseSnapshot(raw);
  const indexedValue = await readIndexed();
  const indexed = indexedValue === null ? null : decodeSnapshot(indexedValue);
  expectedRevision = indexed?.revision ?? null;
  let snapshot = indexed ?? local ?? emptySnapshot();
  if (local && local.revision > snapshot.revision) snapshot = local;
  const journal = window.sessionStorage.getItem(JOURNAL);
  let recoveryDraft: CreationSnapshot | undefined;
  if (journal) {
    let pending: { baseRevision?: unknown; snapshot?: unknown };
    try {
      pending = JSON.parse(journal);
    } catch {
      throw new SnapshotStorageError("corrupt", "未保存草稿副本损坏，已保留。");
    }
    const draft = decodeSnapshot(pending.snapshot);
    if (preferDurable) recoveryDraft = draft;
    else if (
      draft.revision >= snapshot.revision &&
      JSON.stringify(draft) !== JSON.stringify(snapshot)
    ) {
      if (
        draft.revision === snapshot.revision ||
        pending.baseRevision !== expectedRevision
      )
        throw new SnapshotStorageError(
          "conflict",
          "未保存草稿与另一窗口的项目冲突，原件已保留。",
        );
      snapshot = draft;
    }
  }
  if (preferDurable && journal) {
    window.sessionStorage.setItem(`${JOURNAL}:recovery`, journal);
    window.sessionStorage.removeItem(JOURNAL);
  }
  writable = true;
  return {
    snapshot,
    recovered: Boolean(journal) || (!indexed && Boolean(local)),
    durableRevision: expectedRevision,
    recoveryDraft,
  };
}

export function pendingRecoveryDraft(): CreationSnapshot | null {
  if (isDesktop()) return null;
  try {
    const raw =
      window.sessionStorage.getItem(JOURNAL) ??
      window.sessionStorage.getItem(`${JOURNAL}:recovery`);
    return raw ? decodeSnapshot(JSON.parse(raw).snapshot) : null;
  } catch {
    return null;
  }
}
/** A per-tab draft never overwrites the shared durable source or another tab. */
export function persistCreationSnapshotSync(snapshot: CreationSnapshot): void {
  if (!writable || isDesktop()) return;
  const serialized = JSON.stringify({
    baseRevision: expectedRevision,
    snapshot,
  });
  if (serialized.length < 4_000_000) {
    try {
      window.sessionStorage.setItem(JOURNAL, serialized);
    } catch {
      /* Durable storage reports failures. */
    }
  }
}
export async function persistCreationSnapshotAsync(
  snapshot: CreationSnapshot,
): Promise<void> {
  if (!writable)
    throw new SnapshotStorageError(
      "corrupt",
      "项目尚未读取成功，禁止覆盖原件。",
    );
  const persisted = isDesktop()
    ? await encodeSnapshotAssets(snapshot, loadStoredAsset)
    : snapshot;
  decodeSnapshot(persisted);
  if (isDesktop())
    await invoke("write_creation_snapshot", {
      snapshot: persisted,
      expectedRevision,
    });
  else await writeIndexed(snapshot);
  expectedRevision = snapshot.revision;
  if (isDesktop()) return;
  try {
    const raw = window.sessionStorage.getItem(JOURNAL);
    if (raw) {
      const pending = JSON.parse(raw) as {
        snapshot: CreationSnapshot;
        baseRevision: number | null;
      };
      if (pending.snapshot.revision <= snapshot.revision)
        window.sessionStorage.removeItem(JOURNAL);
      else
        window.sessionStorage.setItem(
          JOURNAL,
          JSON.stringify({ ...pending, baseRevision: expectedRevision }),
        );
    }
    const serialized = JSON.stringify(snapshot);
    const previous = window.localStorage.getItem(CREATION_STORAGE_KEY);
    if (
      serialized.length < 4_000_000 &&
      (!previous || parseSnapshot(previous).revision <= snapshot.revision)
    )
      window.localStorage.setItem(CREATION_STORAGE_KEY, serialized);
  } catch {
    /* IDB committed successfully; bounded copies are optional. */
  }
}
