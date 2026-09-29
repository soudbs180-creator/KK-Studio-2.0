import { z } from "zod";
import {
  assetMetadataSchema,
  backupManifestSchema,
  COMPANION_PROTOCOL_VERSION,
  healthResponseSchema,
  migrationImportSchema,
  migrationPreflightSchema,
  type CompanionErrorCode,
  type CompanionAssetMetadata,
} from "./protocol.ts";
import {
  clearCompanionConnection,
  normalizeCompanionEndpoint,
  readCompanionConnection,
  writeCompanionConnection,
  type CompanionConnection,
} from "./connection.ts";
import type { CreationSnapshot } from "../creation/model.ts";

export type CompanionConnectionState =
  | "unconfigured"
  | "checking"
  | "connected"
  | "offline"
  | "unauthenticated"
  | "conflict"
  | "migration-required"
  | "error";

export type CompanionClientErrorCode = CompanionErrorCode | "UNCONFIGURED";

export class CompanionClientError extends Error {
  readonly code: CompanionClientErrorCode;
  readonly status: number;

  constructor(code: CompanionClientErrorCode, status = 0, message?: string) {
    super(message ?? code);
    this.name = "CompanionClientError";
    this.code = code;
    this.status = status;
  }
}

export interface CompanionCheckResult {
  state: CompanionConnectionState;
  connection: CompanionConnection | null;
  error?: CompanionClientError;
}

export interface CompanionSnapshotResponse {
  status: "missing" | "loaded" | "recovered";
  snapshot: unknown | null;
  revision: number | null;
}

export interface CompanionAssetResponse {
  metadata: CompanionAssetMetadata;
  bytes: Uint8Array;
}

export interface CompanionMigrationReceipt {
  status: "ready" | "imported";
  reportId?: string;
  manifestSha256: string;
  snapshotRevision: number;
  assetCount?: number;
  assetBytes?: number;
  revision?: number;
}

export interface CompanionBackupSummary {
  id: string;
  manifest: unknown;
}

export interface CompanionClientOptions {
  fetch?: typeof fetch;
  storage?: Storage;
}

const pairResponseSchema = z
  .object({
    protocolVersion: z.number().int().positive(),
    deviceId: z.string().min(1).max(120),
  })
  .strict();
const snapshotResponseSchema = z
  .object({
    status: z.enum(["missing", "loaded", "recovered"]),
    snapshot: z.unknown().nullable(),
    revision: z.number().int().nonnegative().nullable(),
  })
  .strict();
const saveResponseSchema = z
  .object({
    status: z.literal("saved"),
    revision: z.number().int().nonnegative(),
  })
  .strict();

function stateForError(error: CompanionClientError): CompanionConnectionState {
  if (error.code === "UNAUTHENTICATED") return "unauthenticated";
  if (error.code === "CONFLICT") return "conflict";
  if (error.code === "PROTOCOL_UNSUPPORTED") return "migration-required";
  if (error.code === "SERVICE_UNAVAILABLE") return "offline";
  if (error.code === "UNCONFIGURED") return "unconfigured";
  return "error";
}

function errorCodeForStatus(status: number): CompanionErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "BODY_TOO_LARGE";
  if (status === 404) return "NOT_FOUND";
  return "IO";
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class CompanionClient {
  private readonly requestFetch: typeof fetch;
  private readonly storage?: Storage;

  constructor(options: CompanionClientOptions = {}) {
    const fetcher = options.fetch ?? globalThis.fetch;
    this.requestFetch = (...args) => fetcher(...args);
    this.storage = options.storage;
  }

  private connection(): CompanionConnection {
    const connection = readCompanionConnection(this.storage);
    if (!connection || !connection.enabled)
      throw new CompanionClientError("UNCONFIGURED", 0, "本机服务尚未连接。");
    return connection;
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<{ response: Response; body: unknown }> {
    const response = await this.rawRequest(path, init);
    return { response, body: await readJson(response) };
  }

  private async rawRequest(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const connection = this.connection();
    let response: Response;
    try {
      response = await this.requestFetch(`${connection.endpoint}${path}`, {
        ...init,
        credentials: "include",
      });
    } catch {
      throw new CompanionClientError(
        "SERVICE_UNAVAILABLE",
        0,
        "本机服务未运行或暂时不可访问。",
      );
    }
    if (!response.ok) {
      const body = await readJson(response);
      const candidate =
        body && typeof body === "object" && "error" in body
          ? (body as { error?: unknown }).error
          : undefined;
      const code =
        typeof candidate === "string" &&
        [
          "SERVICE_UNAVAILABLE",
          "UNAUTHENTICATED",
          "CONFLICT",
          "INVALID_SNAPSHOT",
          "INVALID_ASSET",
          "IMPORT_ROLLBACK",
          "ORIGIN_FORBIDDEN",
          "INVALID_REQUEST",
          "PAIRING_INVALID",
          "PAIRING_USED",
          "PROTOCOL_UNSUPPORTED",
          "NOT_FOUND",
          "BODY_TOO_LARGE",
          "CORRUPT",
          "IO",
          "RESTORE_REQUIRED",
        ].includes(candidate)
          ? (candidate as CompanionErrorCode)
          : errorCodeForStatus(response.status);
      throw new CompanionClientError(code, response.status);
    }
    return response;
  }

  async pairCompanion(
    endpoint: string,
    code: string,
  ): Promise<CompanionConnection> {
    const normalized = normalizeCompanionEndpoint(endpoint);
    let response: Response;
    try {
      response = await this.requestFetch(`${normalized}/v1/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
    } catch {
      throw new CompanionClientError(
        "SERVICE_UNAVAILABLE",
        0,
        "本机服务未运行或暂时不可访问。",
      );
    }
    const body = await readJson(response);
    if (!response.ok) {
      const candidate =
        body && typeof body === "object" && "error" in body
          ? (body as { error?: unknown }).error
          : undefined;
      const codeFromResponse =
        candidate === "PAIRING_USED" || candidate === "PAIRING_INVALID"
          ? candidate
          : errorCodeForStatus(response.status);
      throw new CompanionClientError(codeFromResponse, response.status);
    }
    const paired = pairResponseSchema.safeParse(body);
    if (
      !paired.success ||
      paired.data.protocolVersion !== COMPANION_PROTOCOL_VERSION
    )
      throw new CompanionClientError(
        "PROTOCOL_UNSUPPORTED",
        200,
        "本机服务协议版本不兼容。",
      );
    const connection: CompanionConnection = {
      version: 1,
      endpoint: normalized,
      deviceId: paired.data.deviceId,
      protocolVersion: paired.data.protocolVersion,
      enabled: true,
    };
    writeCompanionConnection(connection, this.storage);
    return connection;
  }

  async checkCompanion(): Promise<CompanionCheckResult> {
    const connection = readCompanionConnection(this.storage);
    if (!connection || !connection.enabled)
      return { state: "unconfigured", connection: null };
    try {
      const result = await this.request("/health");
      const health = healthResponseSchema.safeParse(result.body);
      if (
        !health.success ||
        health.data.protocolVersion !== COMPANION_PROTOCOL_VERSION
      ) {
        const error = new CompanionClientError(
          "PROTOCOL_UNSUPPORTED",
          result.response.status,
          "本机服务协议版本不兼容。",
        );
        return { state: stateForError(error), connection, error };
      }
      // Health is intentionally public. Probe an authenticated route so a
      // restarted service cannot be reported as connected with a stale cookie.
      await this.loadCompanionSnapshot();
      const next = {
        ...connection,
        deviceId: health.data.deviceId,
        protocolVersion: health.data.protocolVersion,
      };
      writeCompanionConnection(next, this.storage);
      return { state: "connected", connection: next };
    } catch (error) {
      const failure =
        error instanceof CompanionClientError
          ? error
          : new CompanionClientError("IO", 0, "本机服务检查失败。");
      return { state: stateForError(failure), connection, error: failure };
    }
  }

  async disconnectCompanion(): Promise<void> {
    const connection = readCompanionConnection(this.storage);
    if (!connection) return;
    try {
      const response = await this.requestFetch(
        `${connection.endpoint}/v1/session`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok && response.status !== 401)
        throw new CompanionClientError(
          errorCodeForStatus(response.status),
          response.status,
        );
    } catch (error) {
      if (error instanceof CompanionClientError && error.status === 401) return;
      if (error instanceof CompanionClientError) throw error;
      throw new CompanionClientError(
        "SERVICE_UNAVAILABLE",
        0,
        "本机服务未运行或暂时不可访问。",
      );
    } finally {
      // A local disconnect is a recovery action even when the service is offline.
      // Clearing the endpoint lets the web app fall back to its browser archive.
      clearCompanionConnection(this.storage);
    }
  }

  async loadCompanionSnapshot(): Promise<CompanionSnapshotResponse> {
    const result = await this.request("/v1/snapshot");
    const parsed = snapshotResponseSchema.safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "INVALID_SNAPSHOT",
        result.response.status,
        "本机项目快照格式无效。",
      );
    return parsed.data;
  }

  async persistCompanionSnapshot(
    snapshot: CreationSnapshot,
    expectedRevision: number | null,
  ): Promise<{ revision: number }> {
    const result = await this.request("/v1/snapshot", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedRevision, snapshot }),
    });
    const parsed = saveResponseSchema.safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "INVALID_SNAPSHOT",
        result.response.status,
        "本机项目保存响应无效。",
      );
    return { revision: parsed.data.revision };
  }

  async putCompanionAsset(
    metadata: CompanionAssetMetadata,
    bytes: Uint8Array,
  ): Promise<CompanionAssetMetadata> {
    const parsed = assetMetadataSchema.parse(metadata);
    const encodedMetadata = toBase64Url(
      new TextEncoder().encode(JSON.stringify(parsed)),
    );
    const result = await this.request(`/v1/assets/${parsed.assetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-KK-Asset-Metadata": encodedMetadata,
      },
      body: bytes as unknown as BodyInit,
    });
    const body =
      result.body &&
      typeof result.body === "object" &&
      "metadata" in result.body
        ? (result.body as { metadata?: unknown }).metadata
        : undefined;
    const saved = assetMetadataSchema.safeParse(body);
    if (!saved.success)
      throw new CompanionClientError(
        "INVALID_ASSET",
        result.response.status,
        "本机素材保存响应无效。",
      );
    return saved.data;
  }

  async loadCompanionAsset(assetId: string): Promise<CompanionAssetResponse> {
    if (!/^asset-[a-f0-9]{24}$/i.test(assetId))
      throw new CompanionClientError("INVALID_ASSET", 422, "素材标识无效。");
    const response = await this.rawRequest(`/v1/assets/${assetId}`);
    const rawMetadata = response.headers.get("x-kk-asset-metadata");
    if (!rawMetadata)
      throw new CompanionClientError(
        "INVALID_ASSET",
        response.status,
        "本机素材元数据缺失。",
      );
    let metadata: CompanionAssetMetadata;
    try {
      metadata = assetMetadataSchema.parse(
        JSON.parse(new TextDecoder().decode(fromBase64Url(rawMetadata))),
      );
    } catch {
      throw new CompanionClientError(
        "INVALID_ASSET",
        response.status,
        "本机素材元数据无效。",
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      metadata.assetId !== assetId.toLowerCase() ||
      metadata.size !== bytes.byteLength
    )
      throw new CompanionClientError(
        "INVALID_ASSET",
        response.status,
        "本机素材大小或身份不一致。",
      );
    if ((await digestHex(bytes)) !== metadata.sha256.toLowerCase())
      throw new CompanionClientError(
        "INVALID_ASSET",
        response.status,
        "本机素材 SHA-256 校验失败。",
      );
    return { metadata, bytes };
  }

  async listCompanionAssets(
    offset = 0,
    limit = 50,
  ): Promise<CompanionAssetMetadata[]> {
    const result = await this.request(
      `/v1/assets?offset=${offset}&limit=${limit}`,
    );
    const assets =
      result.body && typeof result.body === "object" && "assets" in result.body
        ? (result.body as { assets?: unknown }).assets
        : undefined;
    const parsed = z.array(assetMetadataSchema).safeParse(assets);
    if (!parsed.success)
      throw new CompanionClientError(
        "INVALID_ASSET",
        result.response.status,
        "本机素材索引无效。",
      );
    return parsed.data;
  }

  async preflightCompanionMigration(input: {
    snapshot: unknown;
    assets: CompanionAssetMetadata[];
    manifestSha256: string;
  }): Promise<CompanionMigrationReceipt> {
    const request = migrationPreflightSchema.parse(input);
    const result = await this.request("/v1/migration/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const parsed = z
      .object({
        status: z.literal("ready"),
        reportId: z.string().uuid(),
        manifestSha256: z.string().regex(/^[a-f0-9]{64}$/i),
        snapshotRevision: z.number().int().nonnegative(),
        assetCount: z.number().int().nonnegative(),
        assetBytes: z.number().int().nonnegative(),
      })
      .safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "IMPORT_ROLLBACK",
        result.response.status,
        "本机迁移预检响应无效。",
      );
    return parsed.data;
  }

  async importCompanionMigration(input: {
    reportId: string;
    manifestSha256: string;
    expectedRevision: number | null;
    snapshot: CreationSnapshot;
  }): Promise<CompanionMigrationReceipt> {
    const request = migrationImportSchema.parse(input);
    const result = await this.request("/v1/migration/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const parsed = z
      .object({
        status: z.literal("imported"),
        revision: z.number().int().nonnegative(),
      })
      .safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "IMPORT_ROLLBACK",
        result.response.status,
        "本机迁移响应无效。",
      );
    return {
      status: "imported",
      manifestSha256: request.manifestSha256,
      snapshotRevision: request.snapshot.revision,
      revision: parsed.data.revision,
    };
  }

  async exportCompanionBackup(): Promise<{
    backupId: string;
    manifest: unknown;
  }> {
    const result = await this.request("/v1/backups/export", { method: "POST" });
    const parsed = z
      .object({
        status: z.literal("created"),
        backupId: z.string().min(1),
        manifest: backupManifestSchema,
      })
      .safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "IO",
        result.response.status,
        "本机备份响应无效。",
      );
    return { backupId: parsed.data.backupId, manifest: parsed.data.manifest };
  }

  async listCompanionBackups(): Promise<CompanionBackupSummary[]> {
    const result = await this.request("/v1/backups");
    const parsed = z
      .object({
        backups: z.array(
          z.object({ id: z.string(), manifest: backupManifestSchema }),
        ),
      })
      .safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "IO",
        result.response.status,
        "本机备份列表无效。",
      );
    return parsed.data.backups;
  }

  async restoreCompanionBackup(
    backupId: string,
  ): Promise<{ id: string; revision: number }> {
    const result = await this.request("/v1/backups/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupId }),
    });
    const parsed = z
      .object({
        status: z.literal("restored"),
        id: z.string(),
        revision: z.number().int().nonnegative(),
      })
      .safeParse(result.body);
    if (!parsed.success)
      throw new CompanionClientError(
        "IO",
        result.response.status,
        "本机恢复响应无效。",
      );
    return { id: parsed.data.id, revision: parsed.data.revision };
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replaceAll("-", "+").replaceAll("_", "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function digestHex(bytes: Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new CompanionClientError(
      "INVALID_ASSET",
      0,
      "当前环境不支持素材校验。",
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export function companionConnectionState(
  storage?: Storage,
): CompanionConnectionState {
  const connection = readCompanionConnection(storage);
  return connection?.enabled ? "checking" : "unconfigured";
}

export async function pairCompanion(
  endpoint: string,
  code: string,
  options?: CompanionClientOptions,
): Promise<CompanionConnection> {
  return new CompanionClient(options).pairCompanion(endpoint, code);
}

export async function checkCompanion(
  options?: CompanionClientOptions,
): Promise<CompanionCheckResult> {
  return new CompanionClient(options).checkCompanion();
}

export async function disconnectCompanion(
  options?: CompanionClientOptions,
): Promise<void> {
  return new CompanionClient(options).disconnectCompanion();
}
