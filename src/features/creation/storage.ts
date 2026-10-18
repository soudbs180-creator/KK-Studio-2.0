import { invoke } from "@tauri-apps/api/core";
import { loadStoredAsset } from "./assetRepository.ts";
import {
  encodeSnapshotAssets,
  hydrateSnapshotAssets,
} from "./snapshotAssets.ts";
import {
  CompanionClient,
  CompanionClientError,
} from "../local-service/client.ts";
import { readCompanionConnection } from "../local-service/connection.ts";
import {
  CREATION_STORAGE_KEY,
  emptyDraft,
  emptySnapshot,
  snapshotWriteBlockReason,
  projectChatExecutionBlockReason,
  serializeCreationSnapshot,
  hasLegacyChatAuthority,
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
import {
  sha256Hex,
  migrateSnapshotToV3,
  type LegacyV2Snapshot,
} from "./chatMigration.ts";
import { commitIndexedChatMigration } from "./indexedChatMigration.ts";

export { sha256Hex };

/**
 * Test-only model of the write barrier. Production IDB and Native use real transactions.
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
  readOnlyReason?: string;
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
/** Durable legacy roots are migrated from raw input before a component projection can replace them. */
function decodeMigrationSource(value: unknown): CreationSnapshot {
  if (!hasLegacyChatAuthority(value)) return decodeSnapshot(value);
  const migrated = migrateSnapshotToV3(value as CreationSnapshotV3);
  const snapshot = decodeSnapshot(migrated);
  return { ...snapshot, revision: (value as CreationSnapshot).revision };
}

function backupWriteProtection(
  backup: unknown,
  marker: unknown,
): Pick<SnapshotLoad, "readOnlyReason" | "recoveryDraft"> {
  let recoveryDraft: CreationSnapshot | undefined;
  if (backup != null) {
    try {
      recoveryDraft = decodeMigrationSource(backup);
    } catch {
      return {
        readOnlyReason:
          "项目备份格式无法由当前客户端校验，已暂停写入以保留原件。",
      };
    }
  }
  const identity = marker as {
    formatVersion?: unknown;
    minWriterVersion?: unknown;
  } | null;
  const readOnlyReason =
    marker != null &&
    (![1, 2].includes(Number(identity?.formatVersion)) ||
      identity?.minWriterVersion !== identity?.formatVersion)
      ? "仓库写入标记不受当前客户端支持，已暂停写入以保留原件。"
      : recoveryDraft &&
        (recoveryDraft.version === 3
          ? snapshotWriteBlockReason(recoveryDraft)
          : recoveryDraft.projects
              .map(projectChatExecutionBlockReason)
              .find(Boolean));
  return {
    readOnlyReason,
    recoveryDraft: readOnlyReason ? recoveryDraft : undefined,
  };
}

async function readIndexed(): Promise<{
  snapshot: unknown;
  backup: unknown;
  marker: unknown;
}> {
  const db = await openDatabase();
  try {
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    const [snapshot, backup, marker] = await Promise.all(
      [RECORD, "backup", "formatMarker"].map(
        (key) =>
          new Promise<unknown>((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
          }),
      ),
    );
    return { snapshot, backup, marker };
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
      const backup = store.get("backup");
      const marker = store.get("formatMarker");
      let remaining = 3;
      const loaded = () => {
        if (--remaining) return;
        try {
          const protection = backupWriteProtection(
            backup.result,
            marker.result,
          );
          if (protection.readOnlyReason)
            throw new SnapshotStorageError(
              "unsupported",
              protection.readOnlyReason,
            );
          if (
            hasLegacyChatAuthority(read.result) ||
            hasLegacyChatAuthority(backup.result)
          )
            throw new SnapshotStorageError(
              "unsupported",
              "旧聊天权威字段尚未迁移，原件未覆盖。",
            );
          const current =
            read.result == null ? null : decodeSnapshot(read.result);
          const format = marker.result as
            { formatVersion?: number } | undefined;
          const backupVersion = (
            backup.result as { version?: number } | undefined
          )?.version;
          if (
            (current?.version === 3 || format?.formatVersion === 2) &&
            (snapshot.version !== 3 ||
              current?.version !== 3 ||
              backupVersion !== 3)
          )
            throw new SnapshotStorageError(
              "unsupported",
              "禁止降级或覆盖不完整的聊天迁移屏障。",
            );
          const blocked = current && snapshotWriteBlockReason(current);
          if (blocked) throw new SnapshotStorageError("unsupported", blocked);
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
            // Always write v3 to backup before main
            store.put(
              snapshot.version === 3 ? snapshot : read.result,
              "backup",
            );
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
      read.onsuccess = backup.onsuccess = marker.onsuccess = loaded;
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
      readOnlyReason?: string;
    }>("read_creation_snapshot");
    const decoded =
      result.status === "missing" && result.snapshot === null
        ? { ...emptySnapshot(), version: 3 as const }
        : decodeSnapshot(result.snapshot);
    const snapshot = await hydrateSnapshotAssets(decoded, loadStoredAsset);
    const readOnlyReason =
      result.readOnlyReason ?? snapshotWriteBlockReason(decoded);
    expectedRevision = result.status === "missing" ? null : snapshot.revision;
    writable = !readOnlyReason;
    return {
      snapshot,
      recovered: result.status === "recovered",
      durableRevision: expectedRevision,
      readOnlyReason,
      recoveryDraft: readOnlyReason ? decoded : undefined,
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
      const readOnlyReason = snapshotWriteBlockReason(snapshot);
      expectedRevision = loaded.revision;
      writable = !readOnlyReason;
      return {
        snapshot: hydrated,
        recovered: loaded.status === "recovered",
        durableRevision: expectedRevision,
        readOnlyReason,
        recoveryDraft: readOnlyReason ? snapshot : undefined,
      };
    } catch (error) {
      throw companionStorageError(error);
    }
  }
  const raw = window.localStorage.getItem(CREATION_STORAGE_KEY);
  let localValue: unknown = null;
  if (raw !== null) {
    try {
      localValue = JSON.parse(raw);
    } catch {
      throw new SnapshotStorageError("corrupt", "项目 JSON 损坏，原件已保留。");
    }
  }
  const local = localValue === null ? null : decodeMigrationSource(localValue);
  const indexedValue = await readIndexed();
  const indexed =
    indexedValue.snapshot === null
      ? null
      : decodeMigrationSource(indexedValue.snapshot);
  const protection = backupWriteProtection(
    indexedValue.backup,
    indexedValue.marker,
  );
  const journal = window.sessionStorage.getItem(JOURNAL);
  let pending: { baseRevision?: unknown; snapshot?: unknown } | undefined;
  let pendingSnapshot: CreationSnapshot | undefined;
  if (journal) {
    try {
      pending = JSON.parse(journal);
    } catch {
      throw new SnapshotStorageError("corrupt", "未保存草稿副本损坏，已保留。");
    }
    pendingSnapshot = decodeMigrationSource(pending?.snapshot);
  }
  expectedRevision = indexed?.revision ?? null;
  let snapshot = indexed ??
    local ?? { ...emptySnapshot(), version: 3 as const };
  let rawSnapshot =
    indexedValue.snapshot ?? (raw === null ? snapshot : JSON.parse(raw));
  if (local && local.revision > snapshot.revision) {
    snapshot = local;
    rawSnapshot = JSON.parse(raw!);
  }
  let readOnlyReason = protection.readOnlyReason;
  // Validate every source before migration, even a lower-revision weak copy.
  for (const source of [indexed, local, pendingSnapshot]) {
    if (!source) continue;
    if (
      source.projects.some((project) =>
        Object.values(project.chats ?? {}).some((chat) => chat.isTemporary),
      )
    )
      readOnlyReason ??= "临时聊天隔离尚未完成，原始恢复资料已保留。";
  }
  let recoveryDraft = protection.recoveryDraft;
  if (pendingSnapshot) {
    if (readOnlyReason || preferDurable) recoveryDraft ??= pendingSnapshot;
    else if (
      pendingSnapshot.revision >= snapshot.revision &&
      JSON.stringify(pendingSnapshot) !== JSON.stringify(snapshot)
    ) {
      if (
        pendingSnapshot.revision === snapshot.revision ||
        pending?.baseRevision !== expectedRevision
      )
        throw new SnapshotStorageError(
          "conflict",
          "未保存草稿与另一窗口的项目冲突，原件已保留。",
        );
      snapshot = pendingSnapshot;
      rawSnapshot = pending!.snapshot;
    }
  }
  const marker = indexedValue.marker as { formatVersion?: number } | null;
  const rawVersion = (rawSnapshot as { version?: unknown }).version;
  const backupVersion = (indexedValue.backup as { version?: unknown } | null)
    ?.version;
  if (marker?.formatVersion === 2 && (rawVersion !== 3 || backupVersion !== 3))
    readOnlyReason ??= "仓库迁移状态不一致，已保留全部原件并暂停写入。";
  // A v3 backup beside a legacy main is an unknown interrupted older writer.
  if (rawVersion === 2 && backupVersion === 3)
    readOnlyReason ??= "项目备份已升级，旧主文件仅供恢复查看。";
  if (!hasLegacyChatAuthority(rawSnapshot)) {
    const legacyRecovery = [
      indexedValue.backup,
      localValue,
      pending?.snapshot,
    ].find(hasLegacyChatAuthority);
    if (legacyRecovery) {
      readOnlyReason ??= "恢复副本仍有未迁移的旧聊天权威，已保留原件。";
      recoveryDraft ??= decodeMigrationSource(legacyRecovery);
    }
  }
  if (
    !readOnlyReason &&
    (rawVersion === 2 ||
      marker?.formatVersion !== 2 ||
      hasLegacyChatAuthority(rawSnapshot))
  ) {
    const candidate = migrateSnapshotToV3(rawSnapshot as LegacyV2Snapshot);
    const checked = decodeSnapshot(candidate);
    const blocked = snapshotWriteBlockReason(checked);
    if (blocked) readOnlyReason = blocked;
    else {
      const originals: Record<string, string> = {};
      if (indexedValue.snapshot !== null)
        originals.main = JSON.stringify(indexedValue.snapshot);
      if (indexedValue.backup !== null)
        originals.backup = JSON.stringify(indexedValue.backup);
      if (raw !== null) originals.local = raw;
      if (journal !== null) originals.journal = journal;
      const db = await openDatabase();
      try {
        await commitIndexedChatMigration(
          db,
          indexedValue,
          candidate,
          originals,
        );
      } finally {
        db.close();
      }
      expectedRevision = candidate.revision;
      snapshot = checked;
      // Do not consume recovery records. Copies are updated only after commit and only if unchanged.
      if (window.localStorage.getItem(CREATION_STORAGE_KEY) === raw) {
        try {
          window.localStorage.setItem(
            CREATION_STORAGE_KEY,
            JSON.stringify(candidate),
          );
        } catch {
          /* The durable transaction already committed. */
        }
      }
      if (journal && window.sessionStorage.getItem(JOURNAL) === journal) {
        try {
          window.sessionStorage.setItem(`${JOURNAL}:recovery`, journal);
        } catch {
          /* The immutable transaction archive is authoritative. */
        }
      }
    }
  }
  readOnlyReason ??= snapshotWriteBlockReason(snapshot);
  writable = !readOnlyReason;
  return {
    snapshot,
    recovered: Boolean(journal) || (!indexed && Boolean(local)),
    durableRevision: expectedRevision,
    recoveryDraft,
    readOnlyReason,
  };
}

export function pendingRecoveryDraft(): CreationSnapshot | null {
  if (isDesktop()) return null;
  try {
    const raw =
      window.sessionStorage.getItem(JOURNAL) ??
      window.sessionStorage.getItem(`${JOURNAL}:recovery`);
    return raw ? decodeMigrationSource(JSON.parse(raw).snapshot) : null;
  } catch {
    return null;
  }
}
/** A per-tab draft never overwrites the shared durable source or another tab. */
export function persistCreationSnapshotSync(snapshot: CreationSnapshot): void {
  if (snapshotWriteBlockReason(snapshot)) return;
  if (!writable || isDesktop()) return;
  const cleanSnapshot = serializeCreationSnapshot(
    sanitizeSnapshotForPersistence(snapshot),
  );
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
  const canonical = serializeCreationSnapshot(snapshot);
  return {
    ...canonical,
    projects: canonical.projects.map((proj) => {
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
  const blocked = snapshotWriteBlockReason(snapshot);
  if (blocked) throw new SnapshotStorageError("unsupported", blocked);
  if (!writable)
    throw new SnapshotStorageError(
      "corrupt",
      "项目尚未读取成功，禁止覆盖原件。",
    );
  const cleanSnapshot = serializeCreationSnapshot(
    sanitizeSnapshotForPersistence(snapshot),
  );
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
