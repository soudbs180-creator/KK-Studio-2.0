import {
  assetMetadataSchema,
  type CompanionAssetMetadata,
} from "./protocol.ts";
import {
  CompanionClient,
  CompanionClientError,
  type CompanionMigrationReceipt,
} from "./client.ts";
import { decodeSnapshot } from "../creation/snapshotCodec.ts";
import type { CreationSnapshot } from "../creation/model.ts";
import type { StoredGeneratedAsset } from "../creation/assetRepository.ts";

const CREATION_DATABASE = "kk-studio-next";
const CREATION_STORE = "creation";
const CREATION_RECORD = "snapshot";
const ASSET_DATABASE = "kk-studio-assets";
const ASSET_STORE = "blobs";
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;

export type LegacyIndexedAsset = {
  metadata: StoredGeneratedAsset | CompanionAssetMetadata;
  bytes: Uint8Array;
};

export type MigratableAsset = {
  metadata: CompanionAssetMetadata;
  bytes: Uint8Array;
};

export interface LegacyIndexedData {
  snapshot: unknown | null;
  assets: LegacyIndexedAsset[];
}

export interface LegacyIndexedDataSource {
  read(): Promise<LegacyIndexedData>;
}

export interface MigrationPreflightReport {
  snapshot: CreationSnapshot;
  assets: MigratableAsset[];
  manifestSha256: string;
  referencedAssetIds: string[];
  totalBytes: number;
  reportId: string;
}

export type MigrationErrorCode =
  | "missing-snapshot"
  | "missing-asset"
  | "asset-hash-mismatch"
  | "asset-too-large"
  | "manifest-mismatch"
  | "import-rollback";

export class MigrationError extends Error {
  readonly code: MigrationErrorCode;

  constructor(code: MigrationErrorCode, message: string, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = "MigrationError";
    this.code = code;
  }
}

function randomReportId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(",")}}`;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new MigrationError("asset-hash-mismatch", "当前环境不支持 SHA-256。");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

async function manifestHash(
  snapshot: CreationSnapshot,
  assets: CompanionAssetMetadata[],
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(canonicalJson({ snapshot, assets })),
  );
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
        throw new MigrationError("missing-asset", "项目引用的素材标识无效。");
      ids.add(child.toLowerCase());
    } else if (
      ["dataUrl", "preview", "src", "poster"].includes(key) &&
      typeof child === "string" &&
      child.startsWith("kk-asset:")
    ) {
      const id = child.slice("kk-asset:".length);
      if (!/^asset-[a-f0-9]{24}$/i.test(id))
        throw new MigrationError("missing-asset", "项目引用的素材路径无效。");
      ids.add(id.toLowerCase());
    }
    collectAssetIds(child, ids);
  }
  return ids;
}

function metadataFor(
  value: StoredGeneratedAsset | CompanionAssetMetadata,
  bytes: Uint8Array,
): CompanionAssetMetadata {
  const copy = { ...value } as Record<string, unknown>;
  delete copy.preview;
  delete copy.origins;
  return assetMetadataSchema.parse({ ...copy, size: bytes.byteLength });
}

async function normalizeLegacyData(
  data: LegacyIndexedData,
): Promise<MigrationPreflightReport> {
  if (data.snapshot === null)
    throw new MigrationError(
      "missing-snapshot",
      "没有可迁移的浏览器项目快照。",
    );
  let snapshot: CreationSnapshot;
  try {
    snapshot = decodeSnapshot(data.snapshot);
  } catch (error) {
    throw new MigrationError(
      "import-rollback",
      "浏览器项目快照无法通过完整性校验。",
      error,
    );
  }
  let totalBytes = 0;
  const assets: MigratableAsset[] = [];
  const ids = new Set<string>();
  for (const entry of data.assets) {
    if (
      entry.bytes.byteLength < 1 ||
      entry.bytes.byteLength > 100 * 1024 * 1024
    )
      throw new MigrationError(
        "asset-too-large",
        "浏览器素材大小超出 1 至 100 MiB 限制。",
      );
    totalBytes += entry.bytes.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES)
      throw new MigrationError(
        "asset-too-large",
        "迁移素材总大小超过 512 MiB 限制。",
      );
    let metadata: CompanionAssetMetadata;
    try {
      metadata = metadataFor(entry.metadata, entry.bytes);
    } catch (error) {
      throw new MigrationError(
        "import-rollback",
        "浏览器素材元数据无效。",
        error,
      );
    }
    if (ids.has(metadata.assetId))
      throw new MigrationError("manifest-mismatch", "迁移清单包含重复素材。");
    ids.add(metadata.assetId);
    const digest = await sha256Hex(entry.bytes);
    if (digest !== metadata.sha256.toLowerCase())
      throw new MigrationError(
        "asset-hash-mismatch",
        `素材 ${metadata.assetId} 的 SHA-256 不匹配。`,
      );
    assets.push({ metadata, bytes: new Uint8Array(entry.bytes) });
  }
  const referencedAssetIds = [...collectAssetIds(snapshot)];
  if (referencedAssetIds.some((id) => !ids.has(id)))
    throw new MigrationError("missing-asset", "项目引用的浏览器素材不完整。");
  const manifestSha256 = await manifestHash(
    snapshot,
    assets.map((entry) => entry.metadata),
  );
  return {
    snapshot,
    assets,
    manifestSha256,
    referencedAssetIds,
    totalBytes,
    reportId: randomReportId(),
  };
}

function sourceFrom(
  source?: LegacyIndexedDataSource | (() => Promise<LegacyIndexedData>),
): LegacyIndexedDataSource {
  if (typeof source === "function") return { read: source };
  if (source) return source;
  return { read: readLegacyIndexedData };
}

export async function preflightIndexedData(
  source?: LegacyIndexedDataSource | (() => Promise<LegacyIndexedData>),
): Promise<MigrationPreflightReport> {
  return normalizeLegacyData(await sourceFrom(source).read());
}

export interface IndexedImportOptions {
  client?: CompanionMigrationClient;
  onProgress?: (completed: number, total: number) => void;
}

export interface CompanionMigrationClient {
  loadCompanionSnapshot(): Promise<{
    status: "missing" | "loaded" | "recovered";
    snapshot: unknown | null;
    revision: number | null;
  }>;
  preflightCompanionMigration(input: {
    snapshot: unknown;
    assets: CompanionAssetMetadata[];
    manifestSha256: string;
  }): Promise<CompanionMigrationReceipt>;
  putCompanionAsset(
    metadata: CompanionAssetMetadata,
    bytes: Uint8Array,
  ): Promise<CompanionAssetMetadata>;
  importCompanionMigration(input: {
    reportId: string;
    manifestSha256: string;
    expectedRevision: number | null;
    snapshot: CreationSnapshot;
  }): Promise<CompanionMigrationReceipt>;
}

export async function importIndexedData(
  report: MigrationPreflightReport,
  options: IndexedImportOptions = {},
): Promise<CompanionMigrationReceipt> {
  const client = options.client ?? new CompanionClient();
  try {
    const current = await client.loadCompanionSnapshot();
    const receipt = await client.preflightCompanionMigration({
      snapshot: report.snapshot,
      assets: report.assets.map((entry) => entry.metadata),
      manifestSha256: report.manifestSha256,
    });
    for (let index = 0; index < report.assets.length; index++) {
      const entry = report.assets[index];
      await client.putCompanionAsset(entry.metadata, entry.bytes);
      options.onProgress?.(index + 1, report.assets.length);
    }
    return await client.importCompanionMigration({
      reportId: receipt.reportId!,
      manifestSha256: report.manifestSha256,
      expectedRevision: current.revision,
      snapshot: report.snapshot,
    });
  } catch (error) {
    if (error instanceof CompanionClientError && error.code === "CONFLICT")
      throw new MigrationError(
        "import-rollback",
        "本机项目已有新版本，迁移未发布。",
        error,
      );
    if (error instanceof MigrationError) throw error;
    throw new MigrationError(
      "import-rollback",
      "迁移未完成；旧浏览器数据仍保留。",
      error,
    );
  }
}

export async function exportCompanionBackup(
  client = new CompanionClient(),
): Promise<{ backupId: string; manifest: unknown }> {
  return client.exportCompanionBackup();
}

export async function restoreCompanionBackup(
  backupId: string,
  client = new CompanionClient(),
): Promise<{ id: string; revision: number }> {
  return client.restoreCompanionBackup(backupId);
}

async function readDatabaseValue(
  database: string,
  storeName: string,
  key: IDBValidKey,
): Promise<unknown | null> {
  if (typeof indexedDB === "undefined") return null;
  const databases = indexedDB.databases ? await indexedDB.databases() : [];
  if (databases.length && !databases.some((entry) => entry.name === database))
    return null;
  const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(database);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(null);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!db || !db.objectStoreNames.contains(storeName)) {
    db?.close();
    return null;
  }
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function readLegacyAssets(): Promise<LegacyIndexedAsset[]> {
  if (typeof indexedDB === "undefined") return [];
  const databases = indexedDB.databases ? await indexedDB.databases() : [];
  if (
    databases.length &&
    !databases.some((entry) => entry.name === ASSET_DATABASE)
  )
    return [];
  const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(ASSET_DATABASE);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(null);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!db || !db.objectStoreNames.contains(ASSET_STORE)) {
    db?.close();
    return [];
  }
  try {
    const records = await new Promise<
      Array<{ blob: Blob; metadata: StoredGeneratedAsset }>
    >((resolve, reject) => {
      const values: Array<{ blob: Blob; metadata: StoredGeneratedAsset }> = [];
      const request = db
        .transaction(ASSET_STORE, "readonly")
        .objectStore(ASSET_STORE)
        .openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(values);
          return;
        }
        try {
          const value = cursor.value as {
            blob?: Blob;
            metadata?: StoredGeneratedAsset;
          };
          if (!value.blob || !value.metadata)
            throw new MigrationError(
              "import-rollback",
              "浏览器素材记录不完整。",
            );
          values.push({ blob: value.blob, metadata: value.metadata });
          cursor.continue();
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error);
    });
    return await Promise.all(
      records.map(async (record) => ({
        metadata: record.metadata,
        bytes: new Uint8Array(await record.blob.arrayBuffer()),
      })),
    );
  } finally {
    db.close();
  }
}

export async function readLegacyIndexedData(): Promise<LegacyIndexedData> {
  const snapshot = await readDatabaseValue(
    CREATION_DATABASE,
    CREATION_STORE,
    CREATION_RECORD,
  );
  return { snapshot, assets: await readLegacyAssets() };
}
