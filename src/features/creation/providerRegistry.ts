import {
  canEnterManagedPool,
  providerConnectionSchema,
  isProviderGenerationVerified,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  MODEL_PROVIDER_STORAGE_KEY,
  parseModelProvider,
  serializeModelProvider,
  type ModelProviderProfile,
} from "../../domain/modelProvider.ts";
import { invoke } from "@tauri-apps/api/core";
import { withProviderStoreLock } from "./providerCoordination.ts";
import { credentialId } from "./providerCredentials.ts";
import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract.ts";
import { modelSupportsKind } from "./model.ts";
import {
  protocolBindingMatches,
  supportsProviderImages,
  providerNeedsKey,
  type ProviderProtocol,
  type ProviderAuthMode,
} from "../../domain/providerProtocol.ts";

export const PROVIDER_CONNECTIONS_STORAGE_KEY =
  BROWSER_STORAGE_KEYS.providerConnections;

/**
 * Fill additive metadata for connections written by older versions. Keeping
 * this normalizer at the registry boundary means every scheduler/settings
 * read sees the same configured-versus-verified contract.
 */
export function normalizeProviderConnection(
  value: unknown,
): ProviderConnection | null {
  const parsed = providerConnectionSchema.safeParse(value);
  if (!parsed.success) return null;
  const connection = parsed.data;
  return {
    ...connection,
    verificationStatus: isProviderGenerationVerified(connection)
      ? "verified"
      : "unverified",
  };
}

function safeConnections(value: unknown): ProviderConnection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeProviderConnection(item);
    return normalized ? [normalized] : [];
  });
}

function sanitizeConnections(
  connections: readonly unknown[],
): ProviderConnection[] {
  return connections.map((connection) => {
    const normalized = normalizeProviderConnection(connection);
    if (!normalized) throw new Error("无效的供应商连接记录");
    return normalized;
  });
}

let nativeRevision: number | null = null;

export function isDesktopProviderDurable(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.protocol === "tauri:" ||
      window.location.hostname === "tauri.localhost" ||
      Boolean(
        (window as Window & { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__,
      ))
  );
}

/**
 * Desktop: hydrate the durable native provider config and refresh the browser
 * cache. Returns null when no native record exists so the caller can migrate
 * older browser metadata; a recovered backup is honored, not overwritten.
 */
export async function loadProviderConnectionsDurable(
  options: {
    publishCache?: boolean;
  } = {},
): Promise<ProviderConnection[] | null> {
  return withProviderStoreLock(isDesktopProviderDurable(), async () => {
    const snapshot = await loadProviderConnectionsDurableSnapshot();
    if (!snapshot) return null;
    nativeRevision = snapshot.revision;
    const connections = snapshot.connections;
    if (!connections) return null;
    if (options.publishCache !== false) {
      try {
        const raw = window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY);
        const { profile, recovered } = parseModelProvider(raw);
        const matches =
          raw && !recovered
            ? connections.filter((item) =>
                profile.connectionId
                  ? item.id === profile.connectionId
                  : item.baseUrl === profile.baseUrl &&
                    item.provider === profile.name,
              )
            : [];
        const selected = matches.length === 1 ? matches[0] : undefined;
        if (!writeProviderConnections(connections))
          throw new Error("Cache unavailable");
        // Recover an acknowledged account even if its profile cache was interrupted.
        if (selected?.baseUrl && selected.model !== undefined)
          window.localStorage.setItem(
            MODEL_PROVIDER_STORAGE_KEY,
            serializeModelProvider({
              version: 1,
              name: selected.provider,
              baseUrl: selected.baseUrl,
              model: selected.model,
              connectionId: selected.id,
              protocol: selected.protocol,
              authMode: selected.authMode,
            }),
          );
      } catch {
        throw new Error(
          "系统连接已读取，但无法刷新页面缓存，请检查本地存储后重试。",
        );
      }
    }
    return connections;
  });
}

/** Bind each save and compensation to its own observed revision. */
export async function loadProviderConnectionsDurableSnapshot(): Promise<{
  revision: number | null;
  connections: ProviderConnection[] | null;
} | null> {
  if (!isDesktopProviderDurable()) return null;
  const result = await invoke<{
    status: "loaded" | "missing" | "recovered";
    revision: number | null;
    connections: unknown;
  }>("read_provider_config");
  if (result.status === "missing") {
    return { revision: null, connections: null };
  }
  if (!Array.isArray(result.connections))
    throw new Error("系统供应商配置必须是数组，已保留原配置；请检查后重试。");
  const connections = sanitizeConnections(result.connections);
  return { revision: result.revision, connections };
}

/**
 * Desktop: durable commit before the UI reports success. A stale revision or
 * a failed write throws so callers fail closed instead of faking success.
 */
export async function persistProviderConnectionsDurable(
  connections: readonly ProviderConnection[],
  options: { publishCache?: boolean; expectedRevision?: number | null } = {},
): Promise<number | null> {
  if (!isDesktopProviderDurable()) return null;
  const commit = async () => {
    const sanitized = sanitizeConnections(connections);
    const committedRevision = await invoke<number>("write_provider_config", {
      connections: sanitized,
      expectedRevision:
        options.expectedRevision === undefined
          ? nativeRevision
          : options.expectedRevision,
    });
    nativeRevision = committedRevision;
    if (options.publishCache !== false && !writeProviderConnections(sanitized))
      throw new Error(
        "系统连接已保存，但无法刷新页面缓存，请检查本地存储后重试。",
      );
    return committedRevision;
  };
  // Metadata-only writers also serialize their acknowledged cache publication.
  return options.publishCache === false
    ? commit()
    : withProviderStoreLock(true, commit);
let lastRawProviderConnections: string | null = null;
let cachedProviderConnections: ProviderConnection[] = [];

/** Browser-persisted metadata only. Credentials are never part of this record. */
export function readProviderConnections(): ProviderConnection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(PROVIDER_CONNECTIONS_STORAGE_KEY) ?? "[]";
    if (raw === lastRawProviderConnections) {
      return cachedProviderConnections;
    }
    const parsed = safeConnections(JSON.parse(raw));
    lastRawProviderConnections = raw;
    cachedProviderConnections = parsed;
    return parsed;
  } catch {
    return [];
  }
}

export function writeProviderConnections(
  connections: readonly ProviderConnection[],
): boolean {
  if (typeof window === "undefined") return false;
  const sanitized = sanitizeConnections(connections);
  try {
    const json = JSON.stringify(sanitized);
    window.localStorage.setItem(PROVIDER_CONNECTIONS_STORAGE_KEY, json);
    lastRawProviderConnections = json;
    cachedProviderConnections = sanitized;
    return true;
  } catch {
    // Callers that submit work must fail closed if a slot cannot be recorded.
    return false;
  }
}

export function addProviderConnection(
  connection: ProviderConnection,
): ProviderConnection[] {
  const current = readProviderConnections();
  const next = mergeProviderConnection(connection, current);
  writeProviderConnections(next);
  return next;
}

/** Build an update without publishing uncommitted metadata to consumers. */
export function mergeProviderConnection(
  connection: ProviderConnection,
  current: readonly ProviderConnection[],
): ProviderConnection[] {
  const previous = current.find((item) => item.id === connection.id);
  const identityChanged =
    previous !== undefined &&
    (previous.baseUrl !== connection.baseUrl ||
      previous.credentialRef !== connection.credentialRef ||
      previous.model !== connection.model ||
      previous.kind !== connection.kind ||
      !protocolBindingMatches(
        { ...previous, baseUrl: previous.baseUrl ?? "" },
        { ...connection, baseUrl: connection.baseUrl ?? "" },
      ));
  // Saving edited metadata must not reset a provider that the worker already
  // cooled down or quarantined. A changed generation identity is separately
  // invalidated below so an older in-flight request cannot verify the edit.
  const nextConnection = previous
    ? {
        ...connection,
        state: previous.state,
        activeJobs: previous.activeJobs,
        cooldownUntil: previous.cooldownUntil,
        lastHealthCheckAt: previous.lastHealthCheckAt,
        healthRevision: identityChanged
          ? (previous.healthRevision ?? 0) + 1
          : previous.healthRevision,
        verificationStatus: identityChanged
          ? "unverified"
          : previous.verificationStatus,
        lastSuccessfulGenerationAt: identityChanged
          ? undefined
          : previous.lastSuccessfulGenerationAt,
        activeLeaseIds: previous.activeLeaseIds,
      }
    : connection;
  const next = [
    ...current.filter((item) => item.id !== nextConnection.id),
    normalizeProviderConnection(nextConnection)!,
  ];
  return next;
}

export function removeProviderConnection(id: string): ProviderConnection[] {
  const next = readProviderConnections().filter((item) => item.id !== id);
  writeProviderConnections(next);
  return next;
}

export function updateProviderConnection(
  id: string,
  update: (connection: ProviderConnection) => ProviderConnection,
): ProviderConnection[] {
  const next = readProviderConnections().map((connection) =>
    connection.id === id
      ? normalizeProviderConnection(update(connection))!
      : connection,
  );
  writeProviderConnections(next);
  return next;
}

export function releaseProviderLease(
  id: string,
  leaseId: string,
): ProviderConnection[] {
  return updateProviderConnection(id, (connection) => {
    const activeLeaseIds = connection.activeLeaseIds ?? [];
    if (!activeLeaseIds.includes(leaseId)) return connection;
    return {
      ...connection,
      activeJobs: Math.max(0, (connection.activeJobs ?? 0) - 1),
      activeLeaseIds: activeLeaseIds.filter((item) => item !== leaseId),
    };
  });
}

function matchesHealthIdentity(
  connection: ProviderConnection,
  expected?: Pick<
    ProviderConnection,
    "baseUrl" | "credentialRef" | "protocol" | "authMode"
  >,
): boolean {
  return (
    !expected ||
    ((expected.baseUrl === undefined ||
      connection.baseUrl === expected.baseUrl) &&
      (expected.credentialRef === undefined ||
        connection.credentialRef === expected.credentialRef) &&
      protocolBindingMatches(
        { ...connection, baseUrl: connection.baseUrl ?? "" },
        { ...expected, baseUrl: expected.baseUrl ?? "" },
      ))
  );
}

export function markProviderConnectionHealthy(
  id: string,
  expected?: {
    baseUrl?: string;
    credentialRef?: string;
    protocol?: ProviderProtocol;
    authMode?: ProviderAuthMode;
  },
): ProviderConnection[] {
  const validatedAt = new Date().toISOString();
  return updateProviderConnection(id, (connection) => {
    if (!matchesHealthIdentity(connection, expected))
      // A late receipt bound to an old identity must not reset the new config.
      return connection;
    return {
      ...connection,
      state: "active",
      cooldownUntil: undefined,
      lastHealthCheckAt: validatedAt,
      healthRevision: (connection.healthRevision ?? 0) + 1,
      verificationStatus: "verified",
      lastSuccessfulGenerationAt: validatedAt,
    };
  });
}

/** A key or connection identity change invalidates prior image verification. */
export function markProviderConnectionUnverified(
  id: string,
): ProviderConnection[] {
  return updateProviderConnection(id, (connection) => ({
    ...connection,
    verificationStatus: "unverified",
    lastSuccessfulGenerationAt: undefined,
    healthRevision: (connection.healthRevision ?? 0) + 1,
  }));
}

export function markProviderConnectionFailure(
  id: string,
  failure: {
    kind:
      | "rate_limited"
      | "unauthorized"
      | "forbidden"
      | "invalid_scope"
      | "project_disabled"
      | "provider_unavailable"
      | "network";
    retryAfterSeconds?: number;
  },
  expected?: {
    baseUrl?: string;
    credentialRef?: string;
    protocol?: ProviderProtocol;
    authMode?: ProviderAuthMode;
  },
): ProviderConnection[] {
  const now = Date.now();
  return updateProviderConnection(id, (connection) => {
    if (!matchesHealthIdentity(connection, expected))
      // A late receipt bound to an old identity must not degrade the new config.
      return connection;
    if (connection.state === "disabled" || connection.state === "quarantined")
      return connection;
    if (
      failure.kind === "unauthorized" ||
      failure.kind === "forbidden" ||
      failure.kind === "invalid_scope" ||
      failure.kind === "project_disabled"
    )
      return {
        ...connection,
        state: "quarantined",
        cooldownUntil: undefined,
        lastHealthCheckAt: new Date().toISOString(),
        healthRevision: (connection.healthRevision ?? 0) + 1,
      };
    if (failure.kind === "rate_limited")
      return {
        ...connection,
        state: "cooldown",
        cooldownUntil: Math.max(
          connection.cooldownUntil ?? 0,
          now +
            Math.min(
              Number.MAX_SAFE_INTEGER - now,
              Math.max(
                5000,
                Number.isFinite(failure.retryAfterSeconds)
                  ? Math.ceil(failure.retryAfterSeconds! * 1000)
                  : 30000,
              ),
            ),
        ),
        lastHealthCheckAt: new Date().toISOString(),
        healthRevision: (connection.healthRevision ?? 0) + 1,
      };
    if (
      connection.state === "cooldown" &&
      (connection.cooldownUntil ?? Infinity) > now
    )
      return connection;
    return {
      ...connection,
      state: "degraded",
      lastHealthCheckAt: new Date().toISOString(),
      healthRevision: (connection.healthRevision ?? 0) + 1,
    };
  });
}

export function managedConnections(
  connections = readProviderConnections(),
): ProviderConnection[] {
  return connections.filter(canEnterManagedPool);
}

/** Legacy profiles are safe to restore only when their account is unique. */
export function findModelProfileConnection(
  profile: ModelProviderProfile,
  connections: ProviderConnection[],
): ProviderConnection | undefined {
  const matches = connections.filter(
    (item) =>
      item.baseUrl === profile.baseUrl && item.provider === profile.name,
  );
  if (profile.connectionId)
    return matches.find((item) => item.id === profile.connectionId);
  if (matches.length === 1) return matches[0];
  return undefined;
}

/** Build a new account without borrowing another account's opaque identity. */
export function newModelProfileConnection(
  profile: ModelProviderProfile,
): ProviderConnection {
  const credentialRef = credentialId(profile.baseUrl, profile.name);
  const images = supportsProviderImages(profile) && providerNeedsKey(profile);
  return {
    id: `byok-${credentialRef}`,
    provider: profile.name,
    kind: "user_byok",
    displayName: profile.name,
    baseUrl: profile.baseUrl,
    credentialRef,
    model: profile.model,
    protocol: profile.protocol,
    authMode: profile.authMode,
    capabilities: {
      modalities: [
        !images || modelSupportsKind(profile.model, "text") ? "text" : "image",
      ],
      operations: images
        ? ["generate", "edit", "inpaint", "outpaint", "batch"]
        : ["generate"],
      maxReferences: images ? 4 : undefined,
      // OpenAI's official Images endpoint accepts at most n=10 (dall-e-3 is 1).
      // Larger UI batches are split into separate idempotent requests.
      maxOutputs: images ? 10 : 1,
      async: false,
      estimatedLatencyClass: "interactive",
    },
    state: "active",
    concurrencyLimit: 2,
    verificationStatus: "unverified",
  };
}

/** Bridges a selected settings profile into its exact registered account. */
export function connectionFromModelProfile(
  profile: ModelProviderProfile,
): ProviderConnection {
  const connections = readProviderConnections();
  const existing = findModelProfileConnection(profile, connections);
  if (
    !existing &&
    (profile.connectionId ||
      connections.filter(
        (item) =>
          item.baseUrl === profile.baseUrl && item.provider === profile.name,
      ).length > 1)
  )
    throw new Error("请在模型接入中明确选择并保存要使用的账号。");
  const connection = newModelProfileConnection(profile);
  return existing
    ? {
        ...existing,
        model: profile.model,
        protocol: profile.protocol,
        authMode: profile.authMode,
        capabilities:
          existing.model === profile.model &&
          protocolBindingMatches(
            { ...existing, baseUrl: existing.baseUrl! },
            profile,
          )
            ? existing.capabilities
            : connection.capabilities,
      }
    : connection;
}
