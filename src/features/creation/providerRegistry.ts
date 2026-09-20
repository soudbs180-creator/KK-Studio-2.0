import {
  canEnterManagedPool,
  providerConnectionSchema,
  isProviderGenerationVerified,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import type { ModelProviderProfile } from "../../domain/modelProvider.ts";
import { credentialId } from "./providerCredentials.ts";
import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract.ts";

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

/** Browser-persisted metadata only. Credentials are never part of this record. */
export function readProviderConnections(): ProviderConnection[] {
  if (typeof window === "undefined") return [];
  try {
    return safeConnections(
      JSON.parse(
        window.localStorage.getItem(PROVIDER_CONNECTIONS_STORAGE_KEY) ?? "[]",
      ),
    );
  } catch {
    return [];
  }
}

export function writeProviderConnections(
  connections: readonly ProviderConnection[],
): boolean {
  if (typeof window === "undefined") return false;
  const sanitized = connections.map((connection) => {
    const normalized = normalizeProviderConnection(connection);
    if (!normalized) throw new Error("无效的供应商连接记录");
    return normalized;
  });
  try {
    window.localStorage.setItem(
      PROVIDER_CONNECTIONS_STORAGE_KEY,
      JSON.stringify(sanitized),
    );
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
  const previous = current.find((item) => item.id === connection.id);
  const identityChanged =
    previous !== undefined &&
    (previous.baseUrl !== connection.baseUrl ||
      previous.credentialRef !== connection.credentialRef ||
      previous.model !== connection.model ||
      previous.kind !== connection.kind);
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
  writeProviderConnections(next);
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

export function markProviderConnectionHealthy(
  id: string,
): ProviderConnection[] {
  const validatedAt = new Date().toISOString();
  return updateProviderConnection(id, (connection) => ({
    ...connection,
    state: "active",
    cooldownUntil: undefined,
    lastHealthCheckAt: validatedAt,
    healthRevision: (connection.healthRevision ?? 0) + 1,
    verificationStatus: "verified",
    lastSuccessfulGenerationAt: validatedAt,
  }));
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
): ProviderConnection[] {
  const now = Date.now();
  return updateProviderConnection(id, (connection) => {
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

/** Bridges the existing single-provider settings into the connection registry. */
export function connectionFromModelProfile(
  profile: ModelProviderProfile,
): ProviderConnection {
  const credentialRef = credentialId(profile.baseUrl, profile.name);
  return {
    id: `byok-${credentialRef}`,
    provider: profile.name,
    kind: "user_byok",
    displayName: profile.name,
    baseUrl: profile.baseUrl,
    credentialRef,
    model: profile.model,
    capabilities: {
      modalities: ["image"],
      operations: ["generate", "edit", "inpaint", "outpaint", "batch"],
      maxReferences: 4,
      // OpenAI's official Images endpoint accepts at most n=10 (dall-e-3 is 1).
      // Larger UI batches are split into separate idempotent requests.
      maxOutputs: 10,
      async: false,
      estimatedLatencyClass: "interactive",
    },
    state: "active",
    concurrencyLimit: 2,
    verificationStatus: "unverified",
  };
}
