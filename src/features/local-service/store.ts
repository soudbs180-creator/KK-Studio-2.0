import { mergeAssetOrigins } from "../../../packages/creation-contracts/index.ts";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, sep } from "node:path";
import type { CreationSnapshot } from "../../domain/creationTypes.ts";
import {
  creationSnapshotCodec,
  SnapshotStorageError,
} from "../../domain/creationSnapshotCodec.ts";
import {
  canonicalJson,
  createManifest,
  sha256Bytes,
  sha256Json,
  verifyManifestHash,
} from "./manifest.ts";
import {
  assetMetadataSchema,
  backupManifestSchema,
  CompanionProtocolError,
  MAX_COMPANION_ASSET_BYTES,
  migrationPreflightSchema,
  rejectCompanionSecrets,
  snapshotPutSchema,
  type CompanionAssetMetadata,
  type CompanionBackupManifest,
} from "./protocol.ts";
import { assertStandaloneRoot } from "./standaloneRoot.ts";

export type SnapshotReadResult = {
  status: "missing" | "loaded" | "recovered";
  snapshot: CreationSnapshot | null;
  revision: number | null;
};

export type StagedAsset = {
  stageId: string;
  metadata: CompanionAssetMetadata;
};

export type StoredAsset = {
  metadata: CompanionAssetMetadata;
  bytes: Uint8Array;
};

export type CompanionBackup = {
  directory: string;
  manifest: CompanionBackupManifest;
};

export type CompanionBackupSummary = {
  id: string;
  manifest: CompanionBackupManifest;
};

export type MigrationPreflightResult = {
  snapshot: CreationSnapshot;
  assets: CompanionAssetMetadata[];
  manifestSha256: string;
  referencedAssetIds: string[];
};

function writeAtomic(path: string, bytes: Uint8Array | string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  const temp = `${path}.tmp-${randomUUID()}`;
  const fd = openSync(temp, "w");
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(temp, path);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

function asBytes(value: Uint8Array | Buffer): Uint8Array {
  return new Uint8Array(value);
}

function invalidAsset(message: string): CompanionProtocolError {
  return new CompanionProtocolError("INVALID_ASSET", 422, message);
}

function collectAssetIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectAssetIds(entry, ids));
    return ids;
  }
  if (!value || typeof value !== "object") return ids;
  for (const [key, child] of Object.entries(value)) {
    if (
      (key === "assetId" || key === "parentAssetId") &&
      typeof child === "string"
    ) {
      if (!/^asset-[a-f0-9]{24}$/i.test(child))
        throw new CompanionProtocolError(
          "IMPORT_ROLLBACK",
          422,
          "项目引用的素材标识无效。",
        );
      ids.add(child.toLowerCase());
    } else if (
      ["dataUrl", "preview", "src", "poster"].includes(key) &&
      typeof child === "string" &&
      child.startsWith("kk-asset:")
    ) {
      const id = child.slice("kk-asset:".length);
      if (!/^asset-[a-f0-9]{24}$/i.test(id))
        throw new CompanionProtocolError(
          "IMPORT_ROLLBACK",
          422,
          "项目引用的素材路径无效。",
        );
      ids.add(id.toLowerCase());
    }
    collectAssetIds(child, ids);
  }
  return ids;
}

function snapshotAssetIds(snapshot: CreationSnapshot): string[] {
  try {
    return [...collectAssetIds(snapshot)];
  } catch (error) {
    if (error instanceof CompanionProtocolError)
      throw new CompanionProtocolError(
        "INVALID_SNAPSHOT",
        422,
        "项目引用的素材标识无效。",
      );
    throw error;
  }
}

function safeBackupId(id: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) && id.length <= 180;
}

function assertCanonicalWireSnapshot(snapshot: unknown): void {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    !("version" in snapshot) ||
    snapshot.version !== 3
  )
    return;
  const projects = "projects" in snapshot ? snapshot.projects : undefined;
  if (!Array.isArray(projects)) return;
  if (
    projects.some(
      (project) =>
        project &&
        typeof project === "object" &&
        [
          "messages",
          "composerDraft",
          "agentThreadId",
          "googleConversation",
        ].some((key) => Object.hasOwn(project, key)),
    )
  )
    throw new CompanionProtocolError(
      "SNAPSHOT_UNSUPPORTED",
      409,
      "项目包含尚未迁移的旧聊天记录，已暂停操作以保护原件。",
    );
}

function isRestorableBackupPath(path: string): boolean {
  return (
    path === "projects/creation-v2.json" ||
    /^assets\/records\/asset-[a-f0-9]{24}\.json$/i.test(path) ||
    /^assets\/blobs\/[a-f0-9]{64}$/i.test(path)
  );
}

function readVerifiedBackupManifest(
  backupsRoot: string,
  backupId: string,
): { directory: string; manifest: CompanionBackupManifest } {
  if (!safeBackupId(backupId))
    throw new CompanionProtocolError("INVALID_REQUEST", 400, "备份标识无效。");
  const directory = resolve(backupsRoot, backupId);
  if (!directory.startsWith(`${backupsRoot}${sep}`))
    throw new CompanionProtocolError("INVALID_REQUEST", 400, "备份路径无效。");
  const manifestPath = join(directory, "manifest.json");
  if (!existsSync(manifestPath))
    throw new CompanionProtocolError("NOT_FOUND", 404, "备份不存在。");
  let manifest: CompanionBackupManifest;
  try {
    manifest = backupManifestSchema.parse(
      JSON.parse(readFileSync(manifestPath, "utf8")),
    );
  } catch {
    throw new CompanionProtocolError("CORRUPT", 422, "备份清单无效。");
  }
  if (!verifyManifestHash(manifest))
    throw new CompanionProtocolError("CORRUPT", 422, "备份清单校验和无效。");
  return { directory, manifest };
}

function loadAndVerifyBackupEntries(
  directory: string,
  manifest: CompanionBackupManifest,
): Map<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>();
  for (const entry of manifest.files) {
    if (entries.has(entry.path))
      throw new CompanionProtocolError(
        "CORRUPT",
        422,
        "备份清单包含重复文件。",
      );
    if (!isRestorableBackupPath(entry.path))
      throw new CompanionProtocolError(
        "CORRUPT",
        422,
        "备份文件路径不受支持。",
      );
    const path = resolve(directory, entry.path);
    if (!path.startsWith(`${directory}${sep}`) || !existsSync(path))
      throw new CompanionProtocolError("CORRUPT", 422, "备份文件缺失。");
    const bytes = asBytes(readFileSync(path));
    if (bytes.byteLength !== entry.size || sha256Bytes(bytes) !== entry.sha256)
      throw new CompanionProtocolError("CORRUPT", 422, "备份文件校验失败。");
    entries.set(entry.path, bytes);
  }
  return entries;
}

function decodeBackupSnapshot(
  entries: ReadonlyMap<string, Uint8Array>,
): CreationSnapshot {
  const snapshotBytes = entries.get("projects/creation-v2.json");
  if (!snapshotBytes)
    throw new CompanionProtocolError("CORRUPT", 422, "备份缺少项目快照。");
  try {
    const value = JSON.parse(new TextDecoder().decode(snapshotBytes));
    assertCanonicalWireSnapshot(value);
    const decoded = decodeSnapshot(value);
    return decoded.version === 3
      ? serializeCreationSnapshot(value as CreationSnapshot)
      : decoded;
  } catch (error) {
    if (error instanceof CompanionProtocolError) throw error;
    throw new CompanionProtocolError("CORRUPT", 422, "备份项目快照无效。");
  }
}

function verifyBackupAssetsAndReferences(
  entries: ReadonlyMap<string, Uint8Array>,
  snapshot: CreationSnapshot,
): void {
  const records = new Map<string, CompanionAssetMetadata>();
  for (const [path, bytes] of entries) {
    const record = /^assets\/records\/(asset-[a-f0-9]{24})\.json$/i.exec(path);
    if (!record) continue;
    try {
      const assetId = record[1].toLowerCase();
      const metadata = assetMetadataSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      );
      if (metadata.assetId !== assetId)
        throw new Error("record asset id mismatch");
      if (records.has(assetId)) throw new Error("duplicate asset record");
      records.set(assetId, metadata);
    } catch {
      throw new CompanionProtocolError("CORRUPT", 422, "备份素材索引无效。");
    }
  }
  for (const metadata of records.values()) {
    const blob = entries.get(`assets/blobs/${metadata.sha256}`);
    if (
      !blob ||
      blob.byteLength !== metadata.size ||
      sha256Bytes(blob) !== metadata.sha256
    )
      throw new CompanionProtocolError("CORRUPT", 422, "备份素材原件不完整。");
  }
  for (const assetId of snapshotAssetIds(snapshot)) {
    if (!records.has(assetId))
      throw new CompanionProtocolError(
        "CORRUPT",
        422,
        "备份缺少项目引用的素材索引。",
      );
  }
}

type OriginalFileSnapshot =
  { kind: "missing" } | { kind: "file"; bytes: Uint8Array } | { kind: "other" };

function captureOriginalFile(
  originals: Map<string, OriginalFileSnapshot>,
  path: string,
): void {
  if (!existsSync(path)) {
    originals.set(path, { kind: "missing" });
    return;
  }
  try {
    const stat = lstatSync(path);
    originals.set(
      path,
      stat.isFile()
        ? { kind: "file", bytes: asBytes(readFileSync(path)) }
        : { kind: "other" },
    );
  } catch {
    originals.set(path, { kind: "other" });
  }
}

export class CompanionStore {
  private ownerHandle: number | undefined;
  private closed = false;
  readonly root: string;
  readonly snapshotPath: string;
  readonly backupPath: string;
  readonly assetsRoot: string;
  readonly assetBlobsRoot: string;
  readonly assetRecordsRoot: string;
  readonly stagingRoot: string;
  readonly backupsRoot: string;

  constructor(root: string) {
    this.root = resolve(root);
    assertStandaloneRoot(this.root);
    mkdirSync(this.root, { recursive: true });
    // Windows shares this standard read/write handle with Native's exclusive owner lock.
    if (process.platform === "win32") {
      try {
        this.ownerHandle = openSync(
          join(this.root, ".kk-native-owner.lock"),
          "a+",
        );
      } catch {
        throw new CompanionProtocolError(
          "IO",
          409,
          "仓库正由桌面客户端使用，已停止本机服务初始化。",
        );
      }
    }
    this.snapshotPath = join(this.root, "projects", "creation-v2.json");
    this.backupPath = `${this.snapshotPath}.bak`;
    this.assetsRoot = join(this.root, "assets");
    this.assetBlobsRoot = join(this.assetsRoot, "blobs");
    this.assetRecordsRoot = join(this.assetsRoot, "records");
    this.stagingRoot = join(this.root, "staging");
    this.backupsRoot = join(this.root, "backups");
    try {
      for (const path of [
        this.root,
        join(this.root, "projects"),
        this.assetsRoot,
        this.assetBlobsRoot,
        this.assetRecordsRoot,
        this.stagingRoot,
        this.backupsRoot,
      ]) {
        this.assertStandaloneRoot();
        mkdirSync(path, { recursive: true });
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }

  assertStandaloneRoot(): void {
    if (this.closed)
      throw new CompanionProtocolError("IO", 409, "本机服务已关闭。");
    assertStandaloneRoot(this.root);
  }

  close(): void {
    if (this.ownerHandle !== undefined) closeSync(this.ownerHandle);
    this.ownerHandle = undefined;
    this.closed = true;
  }

  private writeAtomic(path: string, bytes: Uint8Array | string): void {
    this.assertStandaloneRoot();
    writeAtomic(path, bytes);
  }

  private cleanupStage(path: string): void {
    try {
      this.assertStandaloneRoot();
    } catch {
      return;
    } // Retain the prepared stage when repository admission is lost.
    rmSync(path, { recursive: true, force: true });
  }

  readSnapshot(): SnapshotReadResult {
    this.assertStandaloneRoot();
    const primary = this.readSnapshotFile(this.snapshotPath);
    if (primary)
      return {
        status: "loaded",
        snapshot: primary,
        revision: primary.revision,
      };

    const backup = this.readSnapshotFile(this.backupPath);
    if (backup)
      return {
        status: "recovered",
        snapshot: backup,
        revision: backup.revision,
      };
    if (primary === undefined && backup === undefined)
      return { status: "missing", snapshot: null, revision: null };

    throw new CompanionProtocolError(
      "CORRUPT",
      500,
      "项目主文件和备份均无法读取。",
    );
  }

  writeSnapshot(snapshot: unknown, expectedRevision: number | null): void {
    this.assertStandaloneRoot();
    assertCanonicalWireSnapshot(snapshot);
    rejectCompanionSecrets(snapshot);
    let parsed: CreationSnapshot;
    try {
      const decoded = decodeSnapshot(snapshot);
      parsed =
        decoded.version === 3
          ? serializeCreationSnapshot(snapshot as CreationSnapshot)
          : decoded;
      snapshotPutSchema.parse({ expectedRevision, snapshot: parsed });
    } catch (error) {
      if (error instanceof CompanionProtocolError) throw error;
      throw new CompanionProtocolError(
        "INVALID_SNAPSHOT",
        422,
        "项目快照无效。",
      );
    }
    for (const assetId of snapshotAssetIds(parsed)) {
      if (!this.readAsset(assetId))
        throw new CompanionProtocolError(
          "INVALID_SNAPSHOT",
          422,
          "项目引用的素材尚未归档。",
        );
    }
    const backup = this.readSnapshotFile(this.backupPath);
    const current = this.readSnapshot();
    if (
      [current.snapshot, backup].some(
        (stored) => stored && stored.version > parsed.version,
      )
    )
      throw new CompanionProtocolError(
        "SNAPSHOT_UNSUPPORTED",
        409,
        "不能用旧格式覆盖新格式主文件或备份，原件已保留。",
      );
    if (current.snapshot?.version === 2 && parsed.version === 3)
      throw new CompanionProtocolError(
        "SNAPSHOT_UNSUPPORTED",
        409,
        "旧本机服务仓库需要独立迁移，不能直接覆盖升级；原件已保留。",
      );
    if (current.revision !== expectedRevision)
      throw new CompanionProtocolError("CONFLICT", 409, "项目版本已变化。");
    if (current.revision !== null && parsed.revision <= current.revision)
      throw new CompanionProtocolError("CONFLICT", 409, "项目版本必须递增。");

    if (current.revision === null && parsed.version === 3)
      this.writeAtomic(this.backupPath, canonicalJson(parsed));
    else if (
      current.revision !== null &&
      this.validSnapshotFile(this.snapshotPath)
    )
      this.writeAtomic(
        this.backupPath,
        asBytes(readFileSync(this.snapshotPath)),
      );
    this.writeAtomic(this.snapshotPath, canonicalJson(parsed));
  }

  stageAsset(rawMetadata: unknown, bytes: Uint8Array): StagedAsset {
    this.assertStandaloneRoot();
    let metadata: CompanionAssetMetadata;
    try {
      rejectCompanionSecrets(rawMetadata);
      metadata = assetMetadataSchema.parse(rawMetadata);
    } catch (error) {
      if (error instanceof CompanionProtocolError) throw error;
      throw invalidAsset("素材索引无效。");
    }
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_COMPANION_ASSET_BYTES)
      throw invalidAsset("素材大小超出限制。");
    if (metadata.size !== bytes.byteLength)
      throw invalidAsset("素材大小与索引不一致。");
    if (sha256Bytes(bytes) !== metadata.sha256.toLowerCase())
      throw invalidAsset("素材 SHA-256 校验失败。");

    const stageId = randomUUID();
    const stage = join(this.stagingRoot, stageId);
    mkdirSync(stage, { recursive: true });
    this.writeAtomic(join(stage, "blob"), bytes);
    this.writeAtomic(join(stage, "metadata.json"), canonicalJson(metadata));
    return { stageId, metadata };
  }

  publishStagedAsset(stageId: string): CompanionAssetMetadata {
    this.assertStandaloneRoot();
    if (!/^[0-9a-f-]{36}$/i.test(stageId))
      throw new CompanionProtocolError("IO", 500, "素材暂存批次无效。");
    const stage = join(this.stagingRoot, stageId);
    const blobPath = join(stage, "blob");
    const metadataPath = join(stage, "metadata.json");
    if (!existsSync(blobPath) || !existsSync(metadataPath))
      throw new CompanionProtocolError("IO", 500, "素材暂存批次不存在。");
    let metadata: CompanionAssetMetadata;
    let bytes: Uint8Array;
    try {
      metadata = assetMetadataSchema.parse(
        JSON.parse(readFileSync(metadataPath, "utf8")),
      );
      bytes = asBytes(readFileSync(blobPath));
    } catch {
      throw new CompanionProtocolError(
        "INVALID_ASSET",
        422,
        "素材暂存批次无效。",
      );
    }
    if (
      metadata.size !== bytes.byteLength ||
      sha256Bytes(bytes) !== metadata.sha256.toLowerCase()
    )
      throw invalidAsset("素材暂存批次校验失败。");

    const targetBlob = join(this.assetBlobsRoot, metadata.sha256);
    const targetRecord = join(
      this.assetRecordsRoot,
      `${metadata.assetId}.json`,
    );
    if (existsSync(targetBlob)) {
      const oldBytes = asBytes(readFileSync(targetBlob));
      if (sha256Bytes(oldBytes) !== metadata.sha256)
        throw new CompanionProtocolError("CORRUPT", 500, "素材原件校验失败。");
    } else this.writeAtomic(targetBlob, bytes);

    let merged = metadata;
    if (existsSync(targetRecord)) {
      try {
        const old = assetMetadataSchema.parse(
          JSON.parse(readFileSync(targetRecord, "utf8")),
        );
        const canonical = old.isAiGenerated !== false ? old : metadata;
        const oldProvenance = {
          ...(old.provenance ?? {}),
          generatedAt: old.provenance?.generatedAt ?? new Date().toISOString(),
        };
        const newProvenance = {
          ...(metadata.provenance ?? {}),
          generatedAt:
            metadata.provenance?.generatedAt ?? new Date().toISOString(),
        };
        const origins = mergeAssetOrigins(
          { ...old, provenance: oldProvenance },
          { ...metadata, provenance: newProvenance },
        );
        merged = {
          ...metadata,
          ...canonical,
          origins,
          tags: [...new Set([...old.tags, ...metadata.tags])].slice(0, 20),
        };
      } catch {
        throw new CompanionProtocolError("CORRUPT", 500, "素材索引校验失败。");
      }
    }
    this.writeAtomic(targetRecord, canonicalJson(merged));
    this.assertStandaloneRoot();
    this.cleanupStage(stage);
    return merged;
  }

  listAssets(offset = 0, limit = 100): CompanionAssetMetadata[] {
    this.assertStandaloneRoot();
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new CompanionProtocolError(
        "INVALID_REQUEST",
        400,
        "素材分页位置无效。",
      );
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new CompanionProtocolError(
        "INVALID_REQUEST",
        400,
        "素材分页大小无效。",
      );
    return readdirSync(this.assetRecordsRoot)
      .filter((name) => /^asset-[a-f0-9]{24}\.json$/i.test(name))
      .sort()
      .slice(offset, offset + limit)
      .map((name) => {
        try {
          const metadata = assetMetadataSchema.parse(
            JSON.parse(readFileSync(join(this.assetRecordsRoot, name), "utf8")),
          );
          if (metadata.assetId !== name.slice(0, -5).toLowerCase())
            throw new Error("asset id mismatch");
          return metadata;
        } catch {
          throw new CompanionProtocolError("CORRUPT", 500, "素材索引无效。");
        }
      });
  }

  preflightImport(
    snapshot: unknown,
    assets: unknown,
    manifestSha256: string,
  ): MigrationPreflightResult {
    this.assertStandaloneRoot();
    assertCanonicalWireSnapshot(snapshot);
    try {
      rejectCompanionSecrets(snapshot);
      rejectCompanionSecrets(assets);
      const parsed = migrationPreflightSchema.parse({
        snapshot,
        assets,
        manifestSha256,
      });
      const validated = decodeSnapshot(parsed.snapshot);
      const decoded =
        validated.version === 3
          ? serializeCreationSnapshot(
              parsed.snapshot as unknown as CreationSnapshot,
            )
          : validated;
      const metadata = parsed.assets.map((entry) =>
        assetMetadataSchema.parse(entry),
      );
      const unique = new Set(metadata.map((entry) => entry.assetId));
      if (unique.size !== metadata.length)
        throw new CompanionProtocolError(
          "IMPORT_ROLLBACK",
          422,
          "迁移清单包含重复素材。",
        );
      const computed = sha256Json({ snapshot: decoded, assets: metadata });
      if (computed !== manifestSha256.toLowerCase())
        throw new CompanionProtocolError(
          "IMPORT_ROLLBACK",
          422,
          "迁移清单校验和不匹配。",
        );
      const referencedAssetIds = [...collectAssetIds(decoded)];
      const available = new Set(metadata.map((entry) => entry.assetId));
      if (referencedAssetIds.some((id) => !available.has(id)))
        throw new CompanionProtocolError(
          "IMPORT_ROLLBACK",
          422,
          "迁移缺少项目引用的素材。",
        );
      return {
        snapshot: decoded,
        assets: metadata,
        manifestSha256: computed,
        referencedAssetIds,
      };
    } catch (error) {
      if (error instanceof CompanionProtocolError) throw error;
      throw new CompanionProtocolError(
        "IMPORT_ROLLBACK",
        422,
        "迁移预检失败。",
      );
    }
  }

  publishImportedSnapshot(
    preflight: MigrationPreflightResult,
    expectedRevision: number | null,
  ): void {
    this.assertStandaloneRoot();
    for (const asset of preflight.assets) {
      if (!this.readAsset(asset.assetId))
        throw new CompanionProtocolError(
          "IMPORT_ROLLBACK",
          422,
          "迁移清单中的素材尚未完整上传。",
        );
    }
    this.writeSnapshot(preflight.snapshot, expectedRevision);
  }

  readAsset(assetId: string): StoredAsset | null {
    this.assertStandaloneRoot();
    const parsedId = assetId.toLowerCase();
    if (!/^asset-[a-f0-9]{24}$/.test(parsedId))
      throw invalidAsset("素材标识无效。");
    const recordPath = join(this.assetRecordsRoot, `${parsedId}.json`);
    if (!existsSync(recordPath)) return null;
    let metadata: CompanionAssetMetadata;
    try {
      metadata = assetMetadataSchema.parse(
        JSON.parse(readFileSync(recordPath, "utf8")),
      );
    } catch {
      throw new CompanionProtocolError("CORRUPT", 500, "素材索引无效。");
    }
    const blobPath = join(this.assetBlobsRoot, metadata.sha256);
    if (!existsSync(blobPath))
      throw new CompanionProtocolError("CORRUPT", 500, "素材原件缺失。");
    const bytes = asBytes(readFileSync(blobPath));
    if (
      bytes.byteLength !== metadata.size ||
      sha256Bytes(bytes) !== metadata.sha256 ||
      metadata.assetId !== parsedId
    )
      throw new CompanionProtocolError("CORRUPT", 500, "素材原件校验失败。");
    return { metadata, bytes };
  }

  assetBlobPath(assetId: string): string {
    this.assertStandaloneRoot();
    const asset = this.readAsset(assetId);
    if (!asset)
      throw new CompanionProtocolError("NOT_FOUND", 404, "素材不存在。");
    return join(this.assetBlobsRoot, asset.metadata.sha256);
  }

  createBackup(): CompanionBackup {
    this.assertStandaloneRoot();
    const snapshot = this.readSnapshot();
    if (!snapshot.snapshot)
      throw new CompanionProtocolError(
        "RESTORE_REQUIRED",
        409,
        "没有可备份的项目。",
      );
    for (const assetId of snapshotAssetIds(snapshot.snapshot)) {
      if (!this.readAsset(assetId))
        throw new CompanionProtocolError(
          "CORRUPT",
          500,
          "项目引用的素材缺失。",
        );
    }
    const entries: Array<{ path: string; bytes: Uint8Array }> = [
      {
        path: "projects/creation-v2.json",
        bytes: asBytes(
          readFileSync(
            this.validSnapshotFile(this.snapshotPath)
              ? this.snapshotPath
              : this.backupPath,
          ),
        ),
      },
    ];
    for (const name of readdirSync(this.assetRecordsRoot)) {
      if (!name.endsWith(".json")) continue;
      const assetId = name.slice(0, -5).toLowerCase();
      const stored = this.readAsset(assetId);
      if (!stored)
        throw new CompanionProtocolError("CORRUPT", 500, "素材索引无效。");
      entries.push({
        path: `assets/records/${name}`,
        bytes: asBytes(readFileSync(join(this.assetRecordsRoot, name))),
      });
    }
    for (const name of readdirSync(this.assetBlobsRoot)) {
      if (!/^[a-f0-9]{64}$/i.test(name)) continue;
      entries.push({
        path: `assets/blobs/${name}`,
        bytes: asBytes(readFileSync(join(this.assetBlobsRoot, name))),
      });
    }
    const manifest = createManifest(snapshot.snapshot.revision, entries);
    const directory = join(
      this.backupsRoot,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
    );
    mkdirSync(directory, { recursive: true });
    for (const entry of entries) {
      const destination = join(directory, entry.path);
      mkdirSync(join(destination, ".."), { recursive: true });
      this.writeAtomic(destination, entry.bytes);
    }
    this.writeAtomic(join(directory, "manifest.json"), canonicalJson(manifest));
    return { directory, manifest };
  }

  listBackups(): CompanionBackupSummary[] {
    this.assertStandaloneRoot();
    return readdirSync(this.backupsRoot)
      .filter((id) => safeBackupId(id))
      .sort()
      .flatMap((id) => {
        const directory = join(this.backupsRoot, id);
        const path = join(directory, "manifest.json");
        if (!existsSync(path)) return [];
        try {
          const manifest = backupManifestSchema.parse(
            JSON.parse(readFileSync(path, "utf8")),
          );
          return verifyManifestHash(manifest) ? [{ id, manifest }] : [];
        } catch {
          return [];
        }
      });
  }

  private stageAndCaptureRestoreFiles(
    restoreStage: string,
    entries: ReadonlyMap<string, Uint8Array>,
  ): Map<string, OriginalFileSnapshot> {
    const originals = new Map<string, OriginalFileSnapshot>();
    mkdirSync(restoreStage, { recursive: true });
    for (const [path, bytes] of entries) {
      const stagedPath = join(restoreStage, path);
      this.writeAtomic(stagedPath, bytes);
      const staged = asBytes(readFileSync(stagedPath));
      if (
        staged.byteLength !== bytes.byteLength ||
        sha256Bytes(staged) !== sha256Bytes(bytes)
      )
        throw new CompanionProtocolError("IO", 500, "备份暂存校验失败。");
      captureOriginalFile(originals, join(this.root, path));
    }
    captureOriginalFile(originals, this.snapshotPath);
    captureOriginalFile(originals, this.backupPath);
    return originals;
  }

  private rollbackRestoreOriginals(
    originals: ReadonlyMap<string, OriginalFileSnapshot>,
  ): void {
    this.assertStandaloneRoot();
    for (const [path, original] of originals) {
      if (original.kind === "missing")
        rmSync(path, { recursive: true, force: true });
      else if (original.kind === "file") this.writeAtomic(path, original.bytes);
    }
  }

  private validateRestoreSnapshotCompatibility(
    snapshot: CreationSnapshot,
  ): CreationSnapshot | null | undefined {
    const current = this.readSnapshotFile(this.snapshotPath);
    const backup = this.readSnapshotFile(this.backupPath);
    if (
      [current, backup].some(
        (stored) => stored && stored.version > snapshot.version,
      )
    )
      throw new CompanionProtocolError(
        "SNAPSHOT_UNSUPPORTED",
        409,
        "不能恢复旧格式覆盖新格式主文件或备份，原件已保留。",
      );
    if (current?.version === 2 && snapshot.version === 3)
      throw new CompanionProtocolError(
        "SNAPSHOT_UNSUPPORTED",
        409,
        "旧本机服务仓库需要独立迁移，原件已保留。",
      );
    return current;
  }

  private writeRestoredEntries(
    entries: ReadonlyMap<string, Uint8Array>,
    snapshot: CreationSnapshot,
  ): void {
    for (const [path, bytes] of entries) {
      if (path === "projects/creation-v2.json") continue;
      this.writeAtomic(join(this.root, path), bytes);
    }
    this.writeAtomic(this.snapshotPath, canonicalJson(snapshot));
  }

  restoreBackup(backupId: string): { id: string; revision: number } {
    this.assertStandaloneRoot();
    const { directory, manifest } = readVerifiedBackupManifest(
      this.backupsRoot,
      backupId,
    );
    const entries = loadAndVerifyBackupEntries(directory, manifest);
    const snapshot = decodeBackupSnapshot(entries);
    verifyBackupAssetsAndReferences(entries, snapshot);

    const restoreStage = join(this.stagingRoot, `restore-${randomUUID()}`);
    try {
      const originals = this.stageAndCaptureRestoreFiles(restoreStage, entries);
      const current = this.validateRestoreSnapshotCompatibility(snapshot);
      if (current)
        this.writeAtomic(
          this.backupPath,
          asBytes(readFileSync(this.snapshotPath)),
        );
      try {
        this.writeRestoredEntries(entries, snapshot);
      } catch (error) {
        try {
          this.rollbackRestoreOriginals(originals);
        } catch {
          // Preserve the original failure while leaving diagnostics in the log.
        }
        throw error;
      }
      return { id: backupId, revision: snapshot.revision };
    } catch (error) {
      if (error instanceof CompanionProtocolError) throw error;
      throw new CompanionProtocolError("IO", 500, "备份恢复失败。");
    } finally {
      this.cleanupStage(restoreStage);
    }
  }

  private validSnapshotFile(path: string): boolean {
    return this.readSnapshotFile(path) != null;
  }

  private readSnapshotFile(path: string): CreationSnapshot | null | undefined {
    try {
      const raw = readFileSync(path, "utf8");
      assertCanonicalWireSnapshot(JSON.parse(raw));
      const decoded = parseSnapshot(raw);
      // The codec's root projection is an in-memory UI view, not the v3 wire format.
      return decoded.version === 3
        ? serializeCreationSnapshot(JSON.parse(raw) as CreationSnapshot)
        : decoded;
    } catch (error) {
      if (error instanceof CompanionProtocolError) throw error;
      if (error instanceof SyntaxError) return null;
      if (error instanceof SnapshotStorageError) {
        if (error.code === "corrupt") return null;
        throw new CompanionProtocolError(
          "SNAPSHOT_UNSUPPORTED",
          409,
          "项目版本较新，请更新客户端或本机服务，已暂停保存以保护原件。",
        );
      }
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new CompanionProtocolError(
        "IO",
        500,
        "无法读取项目文件，原件已保留。",
      );
    }
  }
}

const {
  decode: decodeSnapshot,
  parse: parseSnapshot,
  serialize: serializeCreationSnapshot,
} = creationSnapshotCodec;
