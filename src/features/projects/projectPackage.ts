import { z } from "zod";
import type {
  CreationAttachment,
  CreationProject,
  CreationSnapshot,
} from "../creation/model.ts";
import type { StoredGeneratedAsset } from "../creation/assetRepository.ts";
import { isAssetReference } from "../creation/snapshotAssets.ts";
import { encodeSnapshotAssets } from "../creation/snapshotAssets.ts";
import {
  assetProvenanceSchema,
  loadStoredAsset,
} from "../creation/assetRepository.ts";
import { decodeSnapshot } from "../creation/snapshotCodec.ts";

const ASSET_ID = /^asset-[a-f0-9]{24}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_ENTRY = /^assets\/([a-f0-9]{64})\.bin$/;
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const MAX_ENTRIES = 10000;
const ALLOWED_MIME =
  /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm)|audio\/(mpeg|wav|ogg))$/i;

export type ProjectPackageErrorCode =
  | "corrupt"
  | "unsupported"
  | "checksum-mismatch"
  | "missing-asset"
  | "asset-hash-mismatch"
  | "secret-present"
  | "path-traversal"
  | "duplicate-entry"
  | "unreferenced-asset";

export class ProjectPackageError extends Error {
  readonly code: ProjectPackageErrorCode;
  constructor(code: ProjectPackageErrorCode, message: string) {
    super(message);
    this.name = "ProjectPackageError";
    this.code = code;
  }
}

export type PortableAssetMetadata = Omit<StoredGeneratedAsset, "preview"> & {
  size: number;
};

export interface ProjectPackageAssetEntry {
  path: string;
  bytes: Uint8Array;
}

export interface ProjectPackageManifestV1 {
  kind: "kk-studio-project";
  version: 1;
  exportedAt: string;
  snapshot: CreationSnapshot;
  assets: PortableAssetMetadata[];
  checksum: string;
}

export interface ProjectPackageInput {
  manifest: unknown;
  entries: readonly ProjectPackageAssetEntry[];
}

export interface ProjectPackagePreflight {
  manifest: ProjectPackageManifestV1;
  snapshot: CreationSnapshot;
  assets: ReadonlyMap<
    string,
    { metadata: PortableAssetMetadata; bytes: Uint8Array }
  >;
  checksum: string;
}

const provenanceSchema = assetProvenanceSchema.strict();
const originSchema = z
  .object({
    sourceJobId: z.string().max(200).optional(),
    promptHash: z.string().max(200).optional(),
    parentId: z.string().max(200).optional(),
    provenance: provenanceSchema,
  })
  .strict();
const metadataSchema = z
  .object({
    assetId: z.string().regex(ASSET_ID),
    sha256: z.string().regex(SHA256),
    mime: z.string().regex(ALLOWED_MIME),
    size: z.number().int().positive().max(MAX_BYTES),
    tags: z.array(z.string().max(200)).max(20),
    sourceJobId: z.string().max(200).optional(),
    promptHash: z.string().max(200).optional(),
    parentId: z.string().max(200).optional(),
    isAiGenerated: z.boolean().optional(),
    source: z.enum(["provider", "upload"]).optional(),
    origins: z.array(originSchema).max(200).optional(),
    provenance: provenanceSchema,
  })
  .strict();
const manifestSchema = z
  .object({
    kind: z.literal("kk-studio-project"),
    version: z.literal(1),
    exportedAt: z
      .string()
      .datetime({ offset: false })
      .refine((value) => value.endsWith("Z"), "exportedAt 必须是 UTC 时间"),
    snapshot: z.unknown(),
    assets: z.array(metadataSchema).max(10000),
    checksum: z.string().regex(SHA256),
  })
  .strict();

function rejectSecrets(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectSecrets);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      /(api[_-]?key|bearer[_-]?token|access[_-]?token|oauth[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|secret)/i.test(
        key,
      )
    )
      throw new ProjectPackageError(
        "secret-present",
        "项目包不能包含 API Key、访问令牌或授权请求头。",
      );
    rejectSecrets(child);
  }
}

/** Rejects normalization that drops or rewrites any field supplied by a package. */
function rejectSnapshotLoss(original: unknown, normalized: unknown): void {
  if (original === null || typeof original !== "object") {
    if (original !== normalized)
      throw new ProjectPackageError(
        "corrupt",
        "项目快照在读取时发生字段改写。",
      );
    return;
  }
  if (Array.isArray(original)) {
    if (!Array.isArray(normalized) || original.length !== normalized.length)
      throw new ProjectPackageError("corrupt", "项目快照集合无法完整恢复。");
    original.forEach((value, index) =>
      rejectSnapshotLoss(value, normalized[index]),
    );
    return;
  }
  if (
    !normalized ||
    typeof normalized !== "object" ||
    Array.isArray(normalized)
  )
    throw new ProjectPackageError("corrupt", "项目快照结构无法完整恢复。");
  for (const [key, value] of Object.entries(original)) {
    if (!(key in normalized))
      throw new ProjectPackageError(
        "corrupt",
        "项目快照包含当前版本无法保留的字段。",
      );
    rejectSnapshotLoss(value, (normalized as Record<string, unknown>)[key]);
  }
}

export function canonicalJson(value: unknown): string {
  // Serialize sorted keys directly: JSON.stringify(Object.fromEntries(...))
  // reorders integer-like keys, which disagrees with native RFC 8785 output.
  if (Array.isArray(value))
    return `[${value.map((child) => canonicalJson(child) ?? "null").join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(",")}}`;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new ProjectPackageError("corrupt", "当前环境不支持 SHA-256。");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function packageBody(manifest: Omit<ProjectPackageManifestV1, "checksum">) {
  return {
    kind: manifest.kind,
    version: manifest.version,
    exportedAt: manifest.exportedAt,
    snapshot: manifest.snapshot,
    assets: manifest.assets,
  };
}

export async function manifestChecksum(
  manifest: Omit<ProjectPackageManifestV1, "checksum">,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(canonicalJson(packageBody(manifest))),
  );
}

function checkAssetId(id: string): void {
  if (!ASSET_ID.test(id))
    throw new ProjectPackageError("corrupt", "项目包中的素材标识无效。");
}

function validatePortableMedia(snapshot: CreationSnapshot): void {
  function media(value?: string): void {
    if (!value || isAssetReference(value)) return;
    if (
      /^(\/fixtures\/demo\/|\/design\/figma\/)/.test(value) &&
      !/[\\\\?#%:]/.test(value) &&
      value
        .slice(1)
        .split("/")
        .every((part) => part && part !== "." && part !== "..")
    )
      return;
    throw new ProjectPackageError(
      "corrupt",
      "媒体尚未归档，项目包不能保留临时、远程或本机地址。",
    );
  }
  const attachments = (values: CreationAttachment[]) =>
    values.forEach((value) => media(value.dataUrl));
  attachments(snapshot.homeDraft.attachments);
  for (const project of snapshot.projects) {
    attachments(project.attachments);
    attachments(project.composerDraft.attachments);
    project.tasks.forEach((task) => attachments(task.attachments));
    project.items.forEach((item) => {
      media(item.preview);
      media(item.result?.src);
      media(item.result?.poster);
    });
  }
}

function collectAttachment(
  ids: Set<string>,
  attachment: CreationAttachment,
): void {
  if (attachment.assetId) {
    checkAssetId(attachment.assetId);
    ids.add(attachment.assetId);
  }
  if (attachment.dataUrl?.startsWith("kk-asset:")) {
    if (!isAssetReference(attachment.dataUrl))
      throw new ProjectPackageError("corrupt", "项目包中的素材引用无效。");
    const referencedId = attachment.dataUrl.slice("kk-asset:".length);
    if (attachment.assetId && attachment.assetId !== referencedId)
      throw new ProjectPackageError(
        "corrupt",
        "项目包中的素材引用与 assetId 不一致。",
      );
    ids.add(referencedId);
  }
}

function collectProject(ids: Set<string>, project: CreationProject): void {
  project.attachments.forEach((attachment) =>
    collectAttachment(ids, attachment),
  );
  project.composerDraft.attachments.forEach((attachment) =>
    collectAttachment(ids, attachment),
  );
  project.tasks.forEach((task) => {
    task.attachments.forEach((attachment) =>
      collectAttachment(ids, attachment),
    );
    task.outputs?.forEach((output) => {
      if (output.assetId) {
        checkAssetId(output.assetId);
        ids.add(output.assetId);
      }
    });
  });
  project.stagePlans?.forEach((plan) =>
    plan.stages.forEach((stage) =>
      stage.workItems.forEach((workItem) => {
        if (!workItem.assetId) return;
        checkAssetId(workItem.assetId);
        ids.add(workItem.assetId);
      }),
    ),
  );
  project.items.forEach((item) => {
    for (const id of [item.assetId, item.parentAssetId]) {
      if (id) {
        checkAssetId(id);
        ids.add(id);
      }
    }
    for (const media of [item.preview, item.result?.src]) {
      if (!media?.startsWith("kk-asset:")) continue;
      if (!isAssetReference(media))
        throw new ProjectPackageError("corrupt", "项目包中的素材引用无效。");
      const referencedId = media.slice("kk-asset:".length);
      if (item.assetId && item.assetId !== referencedId)
        throw new ProjectPackageError(
          "corrupt",
          "项目包中的素材引用与 assetId 不一致。",
        );
      ids.add(referencedId);
    }
    if (item.result?.poster?.startsWith("kk-asset:"))
      throw new ProjectPackageError(
        "corrupt",
        "视频或音频 poster 的原生引用暂不支持打包。",
      );
  });
}

export function collectReferencedAssetIds(
  snapshot: CreationSnapshot,
): string[] {
  const ids = new Set<string>();
  snapshot.homeDraft.attachments.forEach((attachment) =>
    collectAttachment(ids, attachment),
  );
  snapshot.projects.forEach((project) => collectProject(ids, project));
  return [...ids];
}

function decodePreview(preview: string, mime: string): Uint8Array {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(preview);
  if (!match || match[1].toLowerCase() !== mime.toLowerCase())
    throw new ProjectPackageError(
      "asset-hash-mismatch",
      "素材预览不是有效原件。",
    );
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    throw new ProjectPackageError("asset-hash-mismatch", "素材预览编码无效。");
  }
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function metadataWithoutPreview(
  asset: StoredGeneratedAsset,
  size: number,
): PortableAssetMetadata {
  const metadata = { ...asset } as Omit<StoredGeneratedAsset, "preview">;
  Reflect.deleteProperty(metadata, "preview");
  return { ...metadata, size };
}

export async function createProjectPackageManifest(
  snapshot: CreationSnapshot,
  readAsset: (
    assetId: string,
  ) => Promise<StoredGeneratedAsset | null> = loadStoredAsset,
): Promise<{
  manifest: ProjectPackageManifestV1;
  entries: ProjectPackageAssetEntry[];
}> {
  const encoded = await encodeSnapshotAssets(snapshot, readAsset);
  const portableSnapshot = decodeSnapshot(encoded);
  rejectSnapshotLoss(encoded, portableSnapshot);
  validatePortableMedia(portableSnapshot);
  const referenced = collectReferencedAssetIds(portableSnapshot);
  if (referenced.length >= MAX_ENTRIES)
    throw new ProjectPackageError("corrupt", "项目包条目超过上限。");
  const metadata: PortableAssetMetadata[] = [];
  const entries: ProjectPackageAssetEntry[] = [];
  let totalBytes = 0;
  for (const assetId of referenced) {
    const asset = await readAsset(assetId);
    if (!asset)
      throw new ProjectPackageError("missing-asset", `缺少素材 ${assetId}。`);
    const bytes = decodePreview(asset.preview, asset.mime);
    totalBytes += bytes.byteLength;
    if (bytes.byteLength > MAX_BYTES || totalBytes > MAX_TOTAL_BYTES)
      throw new ProjectPackageError("corrupt", "项目包大小超过上限。");
    if (bytes.byteLength === 0)
      throw new ProjectPackageError(
        "asset-hash-mismatch",
        "素材原件不能为空。",
      );
    const sha256 = await sha256Hex(bytes);
    if (
      sha256 !== asset.sha256 ||
      asset.assetId !== `asset-${sha256.slice(0, 24)}`
    )
      throw new ProjectPackageError(
        "asset-hash-mismatch",
        "素材原件校验失败。",
      );
    const portableMetadata = metadataWithoutPreview(asset, bytes.byteLength);
    rejectSecrets(portableMetadata);
    if (!metadataSchema.safeParse(portableMetadata).success)
      throw new ProjectPackageError(
        "corrupt",
        "素材元数据不符合项目包 schema。",
      );
    metadata.push(portableMetadata);
    entries.push({ path: `assets/${sha256}.bin`, bytes });
  }
  metadata.sort((a, b) => a.assetId.localeCompare(b.assetId));
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const body = {
    kind: "kk-studio-project" as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    snapshot: portableSnapshot,
    assets: metadata,
  };
  return {
    manifest: { ...body, checksum: await manifestChecksum(body) },
    entries,
  };
}

function validateEntryPath(path: string): string {
  if (
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    /^[A-Za-z]:/.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new ProjectPackageError("path-traversal", "项目包路径无效。");
  const match = ASSET_ENTRY.exec(path);
  if (!match) throw new ProjectPackageError("corrupt", "项目包包含未知文件。");
  return match[1];
}

export async function preflightProjectPackage(
  input: ProjectPackageInput,
): Promise<ProjectPackagePreflight> {
  if (
    input.entries.length >= MAX_ENTRIES ||
    input.entries.reduce(
      (total, entry) => total + (entry.bytes?.byteLength ?? 0),
      0,
    ) > MAX_TOTAL_BYTES
  )
    throw new ProjectPackageError("corrupt", "项目包条目或大小超过上限。");
  input = structuredClone(input);
  rejectSecrets(input.manifest);
  const parsed = manifestSchema.safeParse(input.manifest);
  if (!parsed.success)
    throw new ProjectPackageError("corrupt", "项目包清单无效。");
  const manifest = parsed.data as ProjectPackageManifestV1;
  let snapshot: CreationSnapshot;
  try {
    snapshot = decodeSnapshot(manifest.snapshot);
    rejectSnapshotLoss(manifest.snapshot, snapshot);
    validatePortableMedia(snapshot);
  } catch (error) {
    throw new ProjectPackageError(
      error instanceof Error && /版本/.test(error.message)
        ? "unsupported"
        : "corrupt",
      "项目包中的项目快照无效。",
    );
  }
  const metadataById = new Map<string, PortableAssetMetadata>();
  for (const metadata of manifest.assets) {
    if (metadataById.has(metadata.assetId))
      throw new ProjectPackageError("duplicate-entry", "项目包包含重复素材。");
    if (metadata.assetId !== `asset-${metadata.sha256.slice(0, 24)}`)
      throw new ProjectPackageError(
        "asset-hash-mismatch",
        "素材标识与 SHA-256 不匹配。",
      );
    metadataById.set(metadata.assetId, metadata);
  }
  const referenced = new Set(collectReferencedAssetIds(snapshot));
  for (const id of referenced)
    if (!metadataById.has(id))
      throw new ProjectPackageError(
        "missing-asset",
        `项目引用的素材 ${id} 不在包中。`,
      );
  for (const id of metadataById.keys())
    if (!referenced.has(id))
      throw new ProjectPackageError(
        "unreferenced-asset",
        `包中存在未引用素材 ${id}。`,
      );
  const expected = await manifestChecksum({
    kind: manifest.kind,
    version: manifest.version,
    exportedAt: manifest.exportedAt,
    snapshot: manifest.snapshot,
    assets: manifest.assets,
  });
  if (expected !== manifest.checksum)
    throw new ProjectPackageError("checksum-mismatch", "项目包清单校验失败。");
  const entries = new Map<string, Uint8Array>();
  for (const entry of input.entries) {
    const sha = validateEntryPath(entry.path);
    if (!(entry.bytes instanceof Uint8Array))
      throw new ProjectPackageError("corrupt", "项目包素材数据无效。");
    if (entry.bytes.byteLength === 0 || entry.bytes.byteLength > MAX_BYTES)
      throw new ProjectPackageError("corrupt", "项目包素材超过大小限制。");
    if (entries.has(entry.path))
      throw new ProjectPackageError("duplicate-entry", "项目包包含重复文件。");
    if (!metadataById.has(`asset-${sha.slice(0, 24)}`))
      throw new ProjectPackageError(
        "unreferenced-asset",
        "项目包包含未声明的素材文件。",
      );
    entries.set(entry.path, new Uint8Array(entry.bytes));
  }
  if (entries.size !== metadataById.size)
    throw new ProjectPackageError("missing-asset", "项目包缺少素材原件。");
  const assets = new Map<
    string,
    { metadata: PortableAssetMetadata; bytes: Uint8Array }
  >();
  for (const metadata of metadataById.values()) {
    const path = `assets/${metadata.sha256}.bin`;
    const bytes = entries.get(path);
    if (!bytes)
      throw new ProjectPackageError("missing-asset", "项目包缺少素材原件。");
    if (bytes.byteLength !== metadata.size)
      throw new ProjectPackageError(
        "asset-hash-mismatch",
        "素材大小与清单不匹配。",
      );
    if ((await sha256Hex(bytes)) !== metadata.sha256)
      throw new ProjectPackageError(
        "asset-hash-mismatch",
        "素材 SHA-256 校验失败。",
      );
    assets.set(metadata.assetId, {
      metadata,
      bytes: new Uint8Array(bytes),
    });
  }
  return { manifest, snapshot, assets, checksum: manifest.checksum };
}
