import { invoke } from "@tauri-apps/api/core";
import { loadStoredAsset } from "./assetRepository.ts";
import { encodeSnapshotAssets, hydrateSnapshotAssets } from "./snapshotAssets.ts";
import {
  CompanionClient,
  CompanionClientError,
} from "../local-service/client.ts";
import { readCompanionConnection } from "../local-service/connection.ts";
import {
  CREATION_STORAGE_KEY,
  emptyDraft,
  emptySnapshot,
  type ChatItem,
  type ChatItemDraft,
  type CreationSnapshot,
  type CreationSnapshotV3,
} from "./model.ts";
import {
  decodeSnapshot,
  parseSnapshot,
  SnapshotStorageError,
} from "./snapshotCodec.ts";
import { sha256Hex } from "./chatMigration.ts";

export { sha256Hex };

/**
 * Non-Downgradable Write Barrier simulator and execution engine per ADR-022:
 * 1. Read v2 raw bytes -> compute SHA-256
 * 2. Write immutable archive: archive-v2-${sha256}.json
 * 3. Write v3 backup: creation-backup.json (.bak)
 * 4. Write v3 main: creation-v2.json
 * 5. Advance authority marker: formatVersion = 2, minWriterVersion = 2
 */
export class NonDowngradableWriteBarrier {
  readonly memoryFiles = new Map<string, string>();
  #formatMarker = { formatVersion: 1, minWriterVersion: 1 };
  #stepLog: string[] = [];

  constructor(initialV2Raw: string) {
    this.memoryFiles.set("projects/creation-v2.json", initialV2Raw);
  }

  get formatMarker(): { formatVersion: number; minWriterVersion: number } {
    return { ...this.#formatMarker };
  }

  get stepLog(): string[] {
    return [...this.#stepLog];
  }

  executeMigrationWriteBarrier(v3Snapshot: CreationSnapshotV3): {
    archivePath: string;
    archiveSha: string;
    backupPath: string;
    mainPath: string;
  } {
    // Step 1: Read existing raw bytes and compute SHA-256
    const rawV2 = this.memoryFiles.get("projects/creation-v2.json");
    if (!rawV2) throw new Error("Missing projects/creation-v2.json to migrate");
    const sha256 = sha256Hex(rawV2);
    this.#stepLog.push(`sha256:${sha256}`);

    // Step 2: Write immutable archive
    const archivePath = `projects/archive-v2-${sha256}.json`;
    this.memoryFiles.set(
      archivePath,
      JSON.stringify({
        rawBytes: rawV2,
        sha256,
        targetFormat: 3,
        archivedAt: Date.now(),
      }),
    );
    this.#stepLog.push(`archived:${archivePath}`);

    // Step 3: Write v3 backup barrier
    const backupPath = "projects/creation-backup.json";
    const serializedV3 = JSON.stringify(v3Snapshot, null, 2);
    this.memoryFiles.set(backupPath, serializedV3);
    this.#stepLog.push(`backup_written:${backupPath}`);

    // Step 4: Write v3 main publication
    const mainPath = "projects/creation-v2.json";
    this.memoryFiles.set(mainPath, serializedV3);
    this.#stepLog.push(`main_written:${mainPath}`);

    // Step 5: Advance authority marker
    this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
    this.memoryFiles.set(
      "app/repository.json",
      JSON.stringify({ ...this.#formatMarker, updatedAt: Date.now() }),
    );
    this.#stepLog.push("marker_advanced:formatVersion=2");

    return { archivePath, archiveSha: sha256, backupPath, mainPath };
  }

  /** Crash recovery simulation */
  recoverFromCrash(): { state: "v2" | "v3_recovered" } {
    const backup = this.memoryFiles.get("projects/creation-backup.json");
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        if (parsed.version === 3) {
          this.memoryFiles.set("projects/creation-v2.json", backup);
          this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
          return { state: "v3_recovered" };
        }
      } catch (err) {
        void err;
      }
    }
    return { state: "v2" };
  }
}

const DATABASE = "kk-studio-next";
const STORE = "creation";
const RECORD = "snapshot";
const JOURNAL = `${CREATION_STORAGE_KEY}:pending`;
let expectedRevision: number | null = null;
let writable = false;
let companionClient: CompanionClient | null = null;
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
function isCompanionEnabled(): boolean {
  return !isDesktop() && Boolean(readCompanionConnection()?.enabled);
}
function getCompanionClient(): CompanionClient {
  return (companionClient ??= new CompanionClient());
}
function companionStorageError(error: unknown): SnapshotStorageError {
  if (error instanceof CompanionClientError) {
    if (error.code === "CONFLICT")
      return new SnapshotStorageError(
        "conflict",
        "本机服务中的项目已被其他窗口更新。",
      );
    if (error.code === "PROTOCOL_UNSUPPORTED")
      return new SnapshotStorageError(
        "unsupported",
        "本机服务协议版本不兼容，请更新客户端或本机服务。",
      );
    if (error.code === "SNAPSHOT_UNSUPPORTED")
      return new SnapshotStorageError(
        "unsupported",
        "项目版本较新，请更新客户端或本机服务，已暂停保存以保护原件。",
      );
    if (error.code === "INVALID_SNAPSHOT" || error.code === "CORRUPT")
      return new SnapshotStorageError(
        "corrupt",
        "本机服务中的项目快照格式无效，原件已保留。",
      );
    return new SnapshotStorageError(
      "io",
      "无法连接本机伴随服务，请启动服务后重试；原项目仍保留。",
    );
  }
  return error instanceof SnapshotStorageError
    ? error
    : new SnapshotStorageError("io", "无法访问本机伴随服务，原项目仍保留。");
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
            // Write barrier for v2 -> v3
            if ((current.version as number) === 2 && snapshot.version === 3) {
              const rawV2 = JSON.stringify(read.result);
              const sha256 = sha256Hex(rawV2);
              store.put(
                { rawBytes: rawV2, sha256, targetFormat: 3, archivedAt: Date.now() },
                `archive-v2-${sha256}`,
              );
              store.put(
                { formatVersion: 2, minWriterVersion: 2, updatedAt: Date.now() },
                "formatMarker",
              );
              try {
                localStorage.setItem(
                  "kk-format-marker",
                  JSON.stringify({ formatVersion: 2, minWriterVersion: 2 }),
                );
              } catch (err) {
                void err;
              }
            }
            // Always write v3 to backup before main
            store.put(snapshot.version === 3 ? snapshot : read.result, "backup");
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
  if (isCompanionEnabled()) {
    try {
      const loaded = await getCompanionClient().loadCompanionSnapshot();
      const snapshot =
        loaded.status === "missing" && loaded.snapshot === null
          ? emptySnapshot()
          : decodeSnapshot(loaded.snapshot);
      const hydrated = await hydrateSnapshotAssets(snapshot, loadStoredAsset);
      expectedRevision = loaded.revision;
      writable = true;
      return {
        snapshot: hydrated,
        recovered: loaded.status === "recovered",
        durableRevision: expectedRevision,
      };
    } catch (error) {
      throw companionStorageError(error);
    }
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
  const cleanSnapshot = sanitizeSnapshotForPersistence(snapshot);
  const serialized = JSON.stringify({
    baseRevision: expectedRevision,
    snapshot: cleanSnapshot,
  });
  if (serialized.length < 4_000_000) {
    try {
      window.sessionStorage.setItem(JOURNAL, serialized);
    } catch {
      /* Durable storage reports failures. */
    }
  }
}
export function sanitizeSnapshotForPersistence(
  snapshot: CreationSnapshot,
): CreationSnapshot {
  return {
    ...snapshot,
    projects: snapshot.projects.map((proj) => {
      if (!proj.chats) return proj;
      const sanitizedChats: Record<string, ChatItem> = {};
      let activeChatId = proj.activeChatId;
      for (const [id, chat] of Object.entries(proj.chats)) {
        if (!chat.isTemporary) {
          sanitizedChats[id] = chat;
        }
      }
      if (Object.keys(sanitizedChats).length === 0) {
        const defaultId = "chat-default";
        sanitizedChats[defaultId] = {
          id: defaultId,
          name: "对话 1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          draft: { ...emptyDraft() } as ChatItemDraft,
          messages: [],
          mainAgent: "codex",
          modelAllowlist: [],
        };
        activeChatId = defaultId;
      } else if (activeChatId && !sanitizedChats[activeChatId]) {
        activeChatId = Object.keys(sanitizedChats)[0];
      }
      return {
        ...proj,
        chats: sanitizedChats,
        activeChatId,
      };
    }),
  };
}

export async function persistCreationSnapshotAsync(
  snapshot: CreationSnapshot,
): Promise<void> {
  if (!writable)
    throw new SnapshotStorageError(
      "corrupt",
      "项目尚未读取成功，禁止覆盖原件。",
    );
  const cleanSnapshot = sanitizeSnapshotForPersistence(snapshot);
  const persisted =
    isDesktop() || isCompanionEnabled()
      ? await encodeSnapshotAssets(cleanSnapshot, loadStoredAsset)
      : cleanSnapshot;
  decodeSnapshot(persisted);
  if (isDesktop()) {
    await invoke("write_creation_snapshot", {
      snapshot: persisted,
      expectedRevision,
    });
    expectedRevision = persisted.revision;
  } else if (isCompanionEnabled()) {
    try {
      const result = await getCompanionClient().persistCompanionSnapshot(
        persisted,
        expectedRevision,
      );
      expectedRevision = result.revision;
    } catch (error) {
      throw companionStorageError(error);
    }
  } else {
    await writeIndexed(cleanSnapshot);
    expectedRevision = cleanSnapshot.revision;
  }
  if (isDesktop()) return;
  try {
    const raw = window.sessionStorage.getItem(JOURNAL);
    if (raw) {
      const pending = JSON.parse(raw) as {
        snapshot: CreationSnapshot;
        baseRevision: number | null;
      };
      if (pending.snapshot.revision <= cleanSnapshot.revision)
        window.sessionStorage.removeItem(JOURNAL);
      else
        window.sessionStorage.setItem(
          JOURNAL,
          JSON.stringify({ ...pending, baseRevision: expectedRevision }),
        );
    }
    const serialized = JSON.stringify(cleanSnapshot);
    const previous = window.localStorage.getItem(CREATION_STORAGE_KEY);
    if (
      serialized.length < 4_000_000 &&
      (!previous || parseSnapshot(previous).revision <= cleanSnapshot.revision)
    )
      window.localStorage.setItem(CREATION_STORAGE_KEY, serialized);
  } catch {
    /* IDB committed successfully; bounded copies are optional. */
  }
}
