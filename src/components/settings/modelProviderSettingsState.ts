import type { ProviderConnection } from "../../domain/providerConnections";
import { protocolBindingMatches } from "../../domain/providerProtocol.ts";
import {
  findModelProfileConnection,
  newModelProfileConnection,
} from "../../features/creation/providerRegistry.ts";
import {
  DEFAULT_MODEL_PROVIDER,
  MODEL_PROVIDER_STORAGE_KEY,
  parseModelProvider,
  modelProviderSchema,
  type ModelProviderProfile,
} from "../../domain/modelProvider.ts";

export type ConnectionState =
  | { kind: "idle"; message: string }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "cancelled"; message: string }
  | { kind: "offline"; message: string };

export function validateModelProviderProfile(
  profile: ModelProviderProfile,
  onError: (connection: ConnectionState) => void,
  connections: ProviderConnection[] = [],
): ModelProviderProfile | null {
  if (requiresModelProviderSelection(profile, connections)) {
    onError({
      kind: "error",
      message: "此配置未明确选择账号，请先在已登记连接中选择要使用的账号。",
    });
    return null;
  }
  const result = modelProviderSchema.safeParse(profile);
  if (result.success) return result.data;
  onError({
    kind: "error",
    message: result.error.issues[0]?.message ?? "请检查供应商配置。",
  });
  return null;
}

export function requiresModelProviderSelection(
  profile: ModelProviderProfile,
  connections: ProviderConnection[],
): boolean {
  if (findModelProfileConnection(profile, connections)) return false;
  return (
    Boolean(profile.connectionId) ||
    connections.filter(
      (item) =>
        item.baseUrl === profile.baseUrl && item.provider === profile.name,
    ).length > 1
  );
}

export function readModelProviderProfile(): ModelProviderProfile {
  try {
    return parseModelProvider(
      window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
    ).profile;
  } catch {
    return { ...DEFAULT_MODEL_PROVIDER };
  }
}

export function resolveModelProviderConnection(
  profile: ModelProviderProfile,
  credentialRef: string,
  connections: ProviderConnection[],
): ProviderConnection {
  const existing = connections.find(
    (item) =>
      item.baseUrl === profile.baseUrl &&
      item.provider === profile.name &&
      (!profile.connectionId || item.id === profile.connectionId) &&
      item.credentialRef === credentialRef,
  );
  return existing
    ? {
        ...existing,
        model: profile.model,
        protocol: profile.protocol,
        authMode: profile.authMode,
        verificationStatus: protocolBindingMatches(
          { ...existing, baseUrl: existing.baseUrl! },
          profile,
        )
          ? existing.verificationStatus
          : "unverified",
        lastSuccessfulGenerationAt: protocolBindingMatches(
          { ...existing, baseUrl: existing.baseUrl! },
          profile,
        )
          ? existing.lastSuccessfulGenerationAt
          : undefined,
        capabilities:
          existing.model === profile.model &&
          protocolBindingMatches(
            { ...existing, baseUrl: existing.baseUrl! },
            profile,
          )
            ? existing.capabilities
            : newModelProfileConnection(profile).capabilities,
      }
    : { ...newModelProfileConnection(profile), credentialRef };
}
