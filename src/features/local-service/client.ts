import { z } from "zod";
import {
  COMPANION_PROTOCOL_VERSION,
  healthResponseSchema,
  type CompanionErrorCode,
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
    this.requestFetch = options.fetch ?? fetch;
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
    const body = await readJson(response);
    if (!response.ok) {
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
    return { response, body };
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
      if (error instanceof CompanionClientError && error.status === 401) {
        clearCompanionConnection(this.storage);
        return;
      }
      if (error instanceof CompanionClientError) throw error;
      throw new CompanionClientError(
        "SERVICE_UNAVAILABLE",
        0,
        "本机服务未运行或暂时不可访问。",
      );
    }
    clearCompanionConnection(this.storage);
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
