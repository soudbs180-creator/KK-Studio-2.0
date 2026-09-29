import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { join, resolve, sep } from "node:path";
import type { CreationSnapshot } from "../creation/model.ts";
import { decodeSnapshot } from "../creation/snapshotCodec.ts";
import {
  assetMetadataSchema,
  backupManifestSchema,
  CompanionProtocolError,
  MAX_COMPANION_ASSET_BYTES,
  migrationPreflightSchema,
  rejectCompanionSecrets,
  snapshotPutSchema,
  type CompanionBackupManifest,
  type CompanionAssetMetadata,
} from "./protocol.ts";
import {
  canonicalJson,
  createManifest,
  sha256Bytes,
  sha256Json,
  verifyManifestHash,
} from "./manifest.ts";

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
  renameSync(temp, path);
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

function safeBackupId(id: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) && id.length <= 180;
}

export class CompanionStore {
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
    this.snapshotPath = join(this.root, "projects", "creation-v2.json");
    this.backupPath = `${this.snapshotPath}.bak`;
    this.assetsRoot = join(this.root, "assets");
    this.assetBlobsRoot = join(this.assetsRoot, "blobs");
    this.assetRecordsRoot = join(this.assetsRoot, "records");
    this.stagingRoot = join(this.root, "staging");
    this.backupsRoot = join(this.root, "backups");
    for (const path of [
      this.root,
      join(this.root, "projects"),
      this.assetsRoot,
      this.assetBlobsRoot,
      this.assetRecordsRoot,
      this.stagingRoot,
      this.backupsRoot,
    ])
      mkdirSync(path, { recursive: true });
  }

  readSnapshot(): SnapshotReadResult {
    if (!existsSync(this.snapshotPath) && !existsSync(this.backupPath))
      return { status: "missing", snapshot: null, revision: null };

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

    throw new CompanionProtocolError(
      "CORRUPT",
      500,
      "项目主文件和备份均无法读取。",
    );
  }

  writeSnapshot(snapshot: unknown, expectedRevision: number | null): void {
    rejectCompanionSecrets(snapshot);
    let parsed: CreationSnapshot;
    try {
      parsed = decodeSnapshot(snapshot);
      snapshotPutSchema.parse({ expectedRevision, snapshot: parsed });
    } catch (error) {
      if (error instanceof CompanionProtocolError) throw error;
      throw new CompanionProtocolError(
        "INVALID_SNAPSHOT",
        422,
        "项目快照无效。",
      );
    }
    const current = this.readSnapshot();
    if (current.revision !== expectedRevision)
      throw new CompanionProtocolError("CONFLICT", 409, "项目版本已变化。");
    if (current.revision !== null && parsed.revision <= current.revision)
      throw new CompanionProtocolError("CONFLICT", 409, "项目版本必须递增。");

    if (current.revision !== null && this.validSnapshotFile(this.snapshotPath))
      copyFileSync(this.snapshotPath, this.backupPath);
    writeAtomic(this.snapshotPath, canonicalJson(parsed));
  }

  stageAsset(rawMetadata: unknown, bytes: Uint8Array): StagedAsset {
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
    writeAtomic(join(stage, "blob"), bytes);
    writeAtomic(join(stage, "metadata.json"), canonicalJson(metadata));
    return { stageId, metadata };
  }

  publishStagedAsset(stageId: string): CompanionAssetMetadata {
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
      sha256Bytes(bytes) !== metadata.sha256
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
    } else writeAtomic(targetBlob, bytes);

    let merged = metadata;
    if (existsSync(targetRecord)) {
      try {
        const old = assetMetadataSchema.parse(
          JSON.parse(readFileSync(targetRecord, "utf8")),
        );
        merged = {
          ...old,
          ...metadata,
          tags: [...new Set([...old.tags, ...metadata.tags])].slice(0, 20),
        };
      } catch {
        throw new CompanionProtocolError("CORRUPT", 500, "素材索引校验失败。");
      }
    }
    writeAtomic(targetRecord, canonicalJson(merged));
    rmSync(stage, { recursive: true, force: true });
    return merged;
  }

  listAssets(offset = 0, limit = 100): CompanionAssetMetadata[] {
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
        const value = this.readAsset(name.slice(0, -5));
        if (!value)
          throw new CompanionProtocolError("CORRUPT", 500, "素材索引无效。");
        return value.metadata;
      });
  }

  preflightImport(
    snapshot: unknown,
    assets: unknown,
    manifestSha256: string,
  ): MigrationPreflightResult {
    try {
      rejectCompanionSecrets(snapshot);
      rejectCompanionSecrets(assets);
      const parsed = migrationPreflightSchema.parse({
        snapshot,
        assets,
        manifestSha256,
      });
      const decoded = decodeSnapshot(parsed.snapshot);
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
    const asset = this.readAsset(assetId);
    if (!asset)
      throw new CompanionProtocolError("NOT_FOUND", 404, "素材不存在。");
    return join(this.assetBlobsRoot, asset.metadata.sha256);
  }

  createBackup(): CompanionBackup {
    const snapshot = this.readSnapshot();
    if (!snapshot.snapshot)
      throw new CompanionProtocolError(
        "RESTORE_REQUIRED",
        409,
        "没有可备份的项目。",
      );
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
      writeAtomic(destination, entry.bytes);
    }
    writeAtomic(join(directory, "manifest.json"), canonicalJson(manifest));
    return { directory, manifest };
  }

  listBackups(): CompanionBackupSummary[] {
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

  restoreBackup(backupId: string): { id: string; revision: number } {
    if (!safeBackupId(backupId))
      throw new CompanionProtocolError(
        "INVALID_REQUEST",
        400,
        "备份标识无效。",
      );
    const directory = resolve(this.backupsRoot, backupId);
    if (!directory.startsWith(`${this.backupsRoot}${sep}`))
      throw new CompanionProtocolError(
        "INVALID_REQUEST",
        400,
        "备份路径无效。",
      );
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
    const entries = new Map<string, Uint8Array>();
    for (const entry of manifest.files) {
      const path = resolve(directory, entry.path);
      if (!path.startsWith(`${directory}${sep}`) || !existsSync(path))
        throw new CompanionProtocolError("CORRUPT", 422, "备份文件缺失。");
      const bytes = asBytes(readFileSync(path));
      if (
        bytes.byteLength !== entry.size ||
        sha256Bytes(bytes) !== entry.sha256
      )
        throw new CompanionProtocolError("CORRUPT", 422, "备份文件校验失败。");
      entries.set(entry.path, bytes);
    }
    const snapshotBytes = entries.get("projects/creation-v2.json");
    if (!snapshotBytes)
      throw new CompanionProtocolError("CORRUPT", 422, "备份缺少项目快照。");
    let snapshot: CreationSnapshot;
    try {
      snapshot = decodeSnapshot(
        JSON.parse(new TextDecoder().decode(snapshotBytes)),
      );
    } catch {
      throw new CompanionProtocolError("CORRUPT", 422, "备份项目快照无效。");
    }
    const records = new Map<string, CompanionAssetMetadata>();
    for (const [path, bytes] of entries) {
      const record = /^assets\/records\/(asset-[a-f0-9]{24})\.json$/i.exec(
        path,
      );
      if (!record) continue;
      try {
        records.set(
          record[1].toLowerCase(),
          assetMetadataSchema.parse(
            JSON.parse(new TextDecoder().decode(bytes)),
          ),
        );
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
        throw new CompanionProtocolError(
          "CORRUPT",
          422,
          "备份素材原件不完整。",
        );
    }
    const current = this.readSnapshot();
    if (current.snapshot && this.validSnapshotFile(this.snapshotPath))
      copyFileSync(this.snapshotPath, this.backupPath);
    for (const [path, bytes] of entries) {
      if (path === "projects/creation-v2.json") continue;
      writeAtomic(join(this.root, path), bytes);
    }
    writeAtomic(this.snapshotPath, canonicalJson(snapshot));
    return { id: backupId, revision: snapshot.revision };
  }

  private validSnapshotFile(path: string): boolean {
    return existsSync(path) && this.readSnapshotFile(path) !== null;
  }

  private readSnapshotFile(path: string): CreationSnapshot | null {
    if (!existsSync(path)) return null;
    try {
      return decodeSnapshot(JSON.parse(readFileSync(path, "utf8")));
    } catch {
      return null;
    }
  }
}
