import type { ProviderConnection } from "../../domain/providerConnections";
import {
  MODEL_PROVIDER_STORAGE_KEY,
  serializeModelProvider,
  type ModelProviderProfile,
} from "../../domain/modelProvider";
import {
  saveApiKey,
  deleteApiKey,
} from "../../features/creation/providerCredentials";
import {
  isDesktopProviderDurable,
  persistProviderConnectionsDurable,
  readProviderConnections,
  writeProviderConnections,
  mergeProviderConnection,
} from "../../features/creation/providerRegistry";

async function commit(connections: ProviderConnection[]): Promise<void> {
  if (isDesktopProviderDurable())
    await persistProviderConnectionsDurable(connections);
  else if (!writeProviderConnections(connections))
    throw new Error("无法保存供应商配置");
}

async function invalidate(id: string): Promise<void> {
  const current = readProviderConnections();
  if (!current.some((item) => item.id === id)) return;
  await commit(
    current.map((item) =>
      item.id === id
        ? {
            ...item,
            verificationStatus: "unverified",
            lastSuccessfulGenerationAt: undefined,
            healthRevision: (item.healthRevision ?? 0) + 1,
          }
        : item,
    ),
  );
}

// Invalidate durable verification before changing a credential. If the native
// write fails, the key is untouched; if the key write fails, it stays unverified.
export async function persistModelProviderSettings(
  profile: ModelProviderProfile,
  connection: ProviderConnection,
  apiKey: string,
  credentialRef: string,
): Promise<ProviderConnection[]> {
  if (profile.authMode !== "none" && apiKey.trim()) {
    await invalidate(connection.id);
    await saveApiKey(profile.baseUrl, apiKey, credentialRef);
  }
  const next = mergeProviderConnection(readProviderConnections(), connection);
  await commit(next);
  window.localStorage.setItem(
    MODEL_PROVIDER_STORAGE_KEY,
    serializeModelProvider(profile),
  );
  return next;
}

export async function clearModelProviderKey(
  baseUrl: string,
  credentialRef: string,
  connectionId: string,
): Promise<void> {
  await invalidate(connectionId);
  await deleteApiKey(baseUrl, credentialRef);
}
