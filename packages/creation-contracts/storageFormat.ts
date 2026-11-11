/**
 * Shared warehouse-format handshake for Native (Desktop) and the Web
 * companion (old Node local service). The two families share snapshot
 * version numbers conceptually but write incompatible on-disk records.
 *
 * Each platform StoragePort admits only its own family. Cross-format
 * access is explicit import only and never deletes or in-place converts
 * originals (FEAT-037, ADR-021, TASK-CHAT-MIGRATION-20261017).
 *
 * WIRING STATUS (2026-11-09): CONTRACT-ONLY. Only `admitCompanionRoot` and
 * `detectAssetRecordFamily` are wired into the companion service. The Native,
 * Browser, protocol-version, snapshot-envelope and cross-format admissions
 * below are specified and unit-tested here but are NOT yet applied by their
 * StoragePort owners. See TASK-CLOSURE-20261109 (PARTIAL). Do not treat this
 * module as an active runtime guard for those families.
 */

export const NATIVE_REPOSITORY_IDENTITY_VERSION = 1 as const;
export const NATIVE_SUPPORTED_FORMAT_PAIRS = [
  { formatVersion: 1, minimumWriterVersion: 1 },
  { formatVersion: 2, minimumWriterVersion: 2 },
] as const;
export const BROWSER_SUPPORTED_FORMAT_PAIRS = [
  { formatVersion: 1, minWriterVersion: 1 },
  { formatVersion: 2, minWriterVersion: 2 },
] as const;
export const COMPANION_PROTOCOL_VERSION = 1 as const;
export const SUPPORTED_SNAPSHOT_ENVELOPE_VERSIONS = [2, 3] as const;
export const REPOSITORY_IDENTITY_RELATIVE_PATH = "app/repository.json" as const;

export type StorageFamily = "native" | "companion" | "browser";

export type AssetRecordFamily =
  | "companion-bare-metadata"
  | "native-envelope"
  | "unsupported-future"
  | "unknown";

export type StorageProtectionCode = "SNAPSHOT_UNSUPPORTED" | "IO";

export type RepositoryIdentity = {
  version: typeof NATIVE_REPOSITORY_IDENTITY_VERSION;
  repositoryId: string;
  formatVersion: number;
  minimumWriterVersion: number;
};

export type BrowserFormatMarker = {
  formatVersion: number;
  minWriterVersion: number;
};

export type NativeAssetEnvelopeV1 = {
  version: 1;
  metadata: Record<string, unknown>;
};

export type ParseIdentityResult =
  | { ok: true; identity: RepositoryIdentity }
  | { ok: false; code: StorageProtectionCode; reason: string };

export type SnapshotEnvelopeAdmission =
  | { ok: true; version: 2 | 3; revision: number }
  | { ok: false; code: StorageProtectionCode; reason: string };

export type CompanionRootProbe = {
  identityDocumentPresent: boolean;
  // NOTE: the presence of <root>/app is NOT a Native marker. The companion
  // service itself owns app/companion.json for its device identity
  // (src/features/local-service/main.ts deviceId). Refusing on "app exists
  // but repository.json missing" breaks every first launch. Telling a Native
  // root that lost its identity document from a healthy companion root needs
  // a positive companion marker plus a migration/ADR decision — UNRESOLVED
  // under TASK-CLOSURE-20261109, do not add an app/-presence refusal here.
};

export type NativeRootProbe = {
  /** Parsed JSON of app/repository.json, or null when the file is missing. */
  identity: unknown | null;
  sampleAssetRecord?: unknown;
};

export type StorageAdmission =
  | { action: "admit"; family: StorageFamily }
  | {
      action: "refuse-write";
      family?: StorageFamily;
      code: StorageProtectionCode;
      message: string;
      preserveOriginals: true;
    };

export type CrossFormatTransferMode = "explicit-import" | "in-place";

export type CrossFormatImportRequest = {
  sourceFamily: StorageFamily;
  targetFamily: StorageFamily;
  mode: CrossFormatTransferMode;
  deleteSource?: boolean;
};

export type CrossFormatImportDecision =
  | { allowed: true; deleteSource: false; preserveOriginals: true }
  | { allowed: false; code: StorageProtectionCode; reason: string };

const COMPANION_REFUSE_NATIVE_IDENTITY =
  "这是桌面原生仓库；本机服务只能使用独立数据目录，原件已保留。";
const NATIVE_REFUSE_COMPANION_ASSETS =
  "旧伴随服务素材格式不能作为 Native 仓库打开，请显式导入。";
const NATIVE_REFUSE_MISSING_IDENTITY =
  "缺少仓库身份，已停止写入以保留原件。";
const UNSUPPORTED_FORMAT =
  "仓库格式版本不受支持，已保留原件。";
const UNPARSEABLE_IDENTITY = "无法解析仓库身份，已停止写入以保留原件。";
const FUTURE_ASSET_RECORD = "素材记录版本不受支持，已保留原件。";
const UNPARSEABLE_ASSET_RECORD = "无法解析素材记录，已停止写入以保留原件。";
const BROWSER_MARKER_UNSUPPORTED =
  "仓库写入标记不受当前客户端支持，已暂停写入以保留原件。";
const COMPANION_PROTOCOL_UNSUPPORTED =
  "本机服务协议版本不受支持，已暂停写入以保留原件。";
const FUTURE_SNAPSHOT = "快照版本较新，已暂停写入以保留原件。";
const UNSUPPORTED_SNAPSHOT = "快照版本不受支持，已暂停写入以保留原件。";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUint32(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 0xffffffff
  );
}

export function parseRepositoryIdentity(value: unknown): ParseIdentityResult {
  if (!isPlainObject(value)) {
    return { ok: false, code: "IO", reason: "identity-unparseable" };
  }
  const allowed = new Set([
    "version",
    "repositoryId",
    "formatVersion",
    "minimumWriterVersion",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return { ok: false, code: "IO", reason: "identity-unparseable" };
  }
  const { version, repositoryId, formatVersion, minimumWriterVersion } = value;
  if (
    !isUint32(version) ||
    typeof repositoryId !== "string" ||
    !isUint32(formatVersion) ||
    !isUint32(minimumWriterVersion)
  ) {
    return { ok: false, code: "IO", reason: "identity-unparseable" };
  }
  if (version !== NATIVE_REPOSITORY_IDENTITY_VERSION) {
    return {
      ok: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "identity-version-unsupported",
    };
  }
  const pairOk = NATIVE_SUPPORTED_FORMAT_PAIRS.some(
    (pair) =>
      pair.formatVersion === formatVersion &&
      pair.minimumWriterVersion === minimumWriterVersion,
  );
  if (!pairOk) {
    return {
      ok: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "format-version-unsupported",
    };
  }
  return {
    ok: true,
    identity: {
      version: NATIVE_REPOSITORY_IDENTITY_VERSION,
      repositoryId,
      formatVersion,
      minimumWriterVersion,
    },
  };
}

export function detectAssetRecordFamily(value: unknown): {
  family: AssetRecordFamily;
  nativeEnvelopeVersion?: number;
} {
  if (!isPlainObject(value)) return { family: "unknown" };
  const metadata = value.metadata;
  if (isUint32(value.version) && isPlainObject(metadata)) {
    if (value.version === 1) {
      return { family: "native-envelope", nativeEnvelopeVersion: 1 };
    }
    if (value.version > 1) {
      return {
        family: "unsupported-future",
        nativeEnvelopeVersion: value.version,
      };
    }
  }
  if ("assetId" in value || "size" in value) {
    return { family: "companion-bare-metadata" };
  }
  return { family: "unknown" };
}

export function wrapCompanionMetadataAsNativeEnvelope(
  metadata: Record<string, unknown>,
): NativeAssetEnvelopeV1 {
  return { version: 1, metadata: { ...metadata } };
}

export function unwrapNativeEnvelope(value: unknown):
  | { ok: true; metadata: Record<string, unknown> }
  | {
      ok: false;
      code: StorageProtectionCode;
      family: AssetRecordFamily;
    } {
  const detected = detectAssetRecordFamily(value);
  if (detected.family === "native-envelope" && isPlainObject(value)) {
    const metadata = value.metadata;
    if (!isPlainObject(metadata)) {
      return { ok: false, code: "IO", family: "unknown" };
    }
    return { ok: true, metadata };
  }
  if (detected.family === "unsupported-future") {
    return {
      ok: false,
      code: "SNAPSHOT_UNSUPPORTED",
      family: detected.family,
    };
  }
  if (detected.family === "companion-bare-metadata") {
    return {
      ok: false,
      code: "SNAPSHOT_UNSUPPORTED",
      family: detected.family,
    };
  }
  return { ok: false, code: "IO", family: "unknown" };
}

export function admitCompanionRoot(probe: CompanionRootProbe): StorageAdmission {
  if (probe.identityDocumentPresent) {
    return {
      action: "refuse-write",
      family: "native",
      code: "SNAPSHOT_UNSUPPORTED",
      message: COMPANION_REFUSE_NATIVE_IDENTITY,
      preserveOriginals: true,
    };
  }
  // Deliberately no app/-presence branch: see CompanionRootProbe above.
  return { action: "admit", family: "companion" };
}

export function admitNativeRoot(probe: NativeRootProbe): StorageAdmission {
  if (probe.identity == null) {
    return {
      action: "refuse-write",
      code: "SNAPSHOT_UNSUPPORTED",
      message: NATIVE_REFUSE_MISSING_IDENTITY,
      preserveOriginals: true,
    };
  }
  const parsed = parseRepositoryIdentity(probe.identity);
  if (!parsed.ok) {
    return {
      action: "refuse-write",
      code: parsed.code,
      message:
        parsed.reason === "format-version-unsupported" ||
        parsed.reason === "identity-version-unsupported"
          ? UNSUPPORTED_FORMAT
          : UNPARSEABLE_IDENTITY,
      preserveOriginals: true,
    };
  }
  if (probe.sampleAssetRecord !== undefined) {
    const family = detectAssetRecordFamily(probe.sampleAssetRecord).family;
    if (family === "companion-bare-metadata") {
      return {
        action: "refuse-write",
        family: "companion",
        code: "SNAPSHOT_UNSUPPORTED",
        message: NATIVE_REFUSE_COMPANION_ASSETS,
        preserveOriginals: true,
      };
    }
    if (family === "unsupported-future") {
      return {
        action: "refuse-write",
        family: "native",
        code: "SNAPSHOT_UNSUPPORTED",
        message: FUTURE_ASSET_RECORD,
        preserveOriginals: true,
      };
    }
    if (family !== "native-envelope") {
      return {
        action: "refuse-write",
        code: "IO",
        message: UNPARSEABLE_ASSET_RECORD,
        preserveOriginals: true,
      };
    }
  }
  return { action: "admit", family: "native" };
}

export function admitBrowserFormatMarker(value: unknown): StorageAdmission {
  if (!isPlainObject(value)) {
    return {
      action: "refuse-write",
      family: "browser",
      code: "SNAPSHOT_UNSUPPORTED",
      message: BROWSER_MARKER_UNSUPPORTED,
      preserveOriginals: true,
    };
  }
  const { formatVersion, minWriterVersion } = value;
  const supported = BROWSER_SUPPORTED_FORMAT_PAIRS.some(
    (pair) =>
      pair.formatVersion === formatVersion &&
      pair.minWriterVersion === minWriterVersion,
  );
  if (!supported) {
    return {
      action: "refuse-write",
      family: "browser",
      code: "SNAPSHOT_UNSUPPORTED",
      message: BROWSER_MARKER_UNSUPPORTED,
      preserveOriginals: true,
    };
  }
  return { action: "admit", family: "browser" };
}

export function admitCompanionProtocolVersion(
  version: unknown,
): StorageAdmission {
  if (version === COMPANION_PROTOCOL_VERSION) {
    return { action: "admit", family: "companion" };
  }
  return {
    action: "refuse-write",
    family: "companion",
    code: "SNAPSHOT_UNSUPPORTED",
    message: COMPANION_PROTOCOL_UNSUPPORTED,
    preserveOriginals: true,
  };
}

export function admitSnapshotEnvelope(
  value: unknown,
): SnapshotEnvelopeAdmission {
  if (!isPlainObject(value)) {
    return { ok: false, code: "IO", reason: "snapshot-unparseable" };
  }
  const { version, revision } = value;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return { ok: false, code: "IO", reason: "snapshot-unparseable" };
  }
  if (version > 3) {
    return {
      ok: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "snapshot-version-future",
    };
  }
  if (version !== 2 && version !== 3) {
    return {
      ok: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "snapshot-version-unsupported",
    };
  }
  if (
    typeof revision !== "number" ||
    !Number.isInteger(revision) ||
    revision < 0
  ) {
    return { ok: false, code: "IO", reason: "snapshot-revision-invalid" };
  }
  return { ok: true, version, revision };
}

export function admitCrossFormatImport(
  request: CrossFormatImportRequest,
): CrossFormatImportDecision {
  if (request.mode === "in-place") {
    return {
      allowed: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "in-place-conversion-forbidden",
    };
  }
  if (request.mode !== "explicit-import") {
    return {
      allowed: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "unsupported-transfer-mode",
    };
  }
  if (request.sourceFamily === request.targetFamily) {
    return {
      allowed: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "not-cross-format",
    };
  }
  if (request.deleteSource === true) {
    return {
      allowed: false,
      code: "SNAPSHOT_UNSUPPORTED",
      reason: "delete-source-forbidden",
    };
  }
  return { allowed: true, deleteSource: false, preserveOriginals: true };
}
