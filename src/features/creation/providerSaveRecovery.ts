import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  MODEL_PROVIDER_STORAGE_KEY,
  serializeModelProvider,
  type ModelProviderProfile,
} from "../../domain/modelProvider.ts";
import { invoke } from "@tauri-apps/api/core";
import { withProviderStoreLock } from "./providerCoordination.ts";
import {
  deleteApiKey,
  saveApiKey,
  setSessionApiKey,
} from "./providerCredentials.ts";
import {
  isDesktopProviderDurable,
  loadProviderConnectionsDurableSnapshot,
  mergeProviderConnection,
  readProviderConnections,
  writeProviderConnections,
} from "./providerRegistry.ts";

export class ProviderSaveError extends Error {
  readonly credentialState?: "saved" | "missing";
  constructor(message: string, credentialState?: "saved" | "missing") {
    super(message);
    this.name = "ProviderSaveError";
    this.credentialState = credentialState;
  }
}

export function providerSaveErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof ProviderSaveError ? error.message : fallback;
}

let saving = false;
type CredentialChange = { value: string } | { remove: true };

/** Coordinate shared browser cache publication across same-profile windows.
 * The native command independently locks all Windows-session vault writers. */
async function commitConnection(
  connection: ProviderConnection,
  change?: CredentialChange,
  profile?: ModelProviderProfile,
  restoreMissing = false,
): Promise<ProviderConnection[]> {
  if (saving) throw new ProviderSaveError("另一项连接正在保存，请稍后重试。");
  const desktop = isDesktopProviderDurable();
  saving = true;
  try {
    return await withProviderStoreLock(desktop, () =>
      commitLocked(connection, change, profile, restoreMissing, desktop),
    );
  } finally {
    saving = false;
  }
}

async function commitLocked(
  connection: ProviderConnection,
  change: CredentialChange | undefined,
  profile: ModelProviderProfile | undefined,
  restoreMissing: boolean,
  desktop: boolean,
): Promise<ProviderConnection[]> {
  const snapshot = desktop
    ? await loadProviderConnectionsDurableSnapshot()
    : null;
  const previous = snapshot?.connections ?? readProviderConnections();
  if (restoreMissing && previous.some((item) => item.id === connection.id)) {
    if (!writeProviderConnections(previous))
      throw new ProviderSaveError(
        "系统连接已读取，但页面缓存未能刷新；请检查本地存储后重新读取。",
      );
    return previous;
  }
  const next = mergeProviderConnection(connection, previous).map((item) =>
    item.id === connection.id && change
      ? {
          ...item,
          verificationStatus: "unverified" as const,
          lastSuccessfulGenerationAt: undefined,
          healthRevision: (item.healthRevision ?? 0) + 1,
        }
      : item,
  );
  let credentialState: "saved" | "missing" | undefined;
  if (desktop) {
    const receipt = await invoke<{
      revision: number;
      credentialState: "saved" | "missing" | "unchanged";
    }>("commit_provider_connection", {
      connections: next,
      expectedRevision: snapshot?.revision ?? null,
      providerId: change ? (connection.credentialRef ?? null) : null,
      secret: change && "value" in change ? change.value : null,
      clearSecret: Boolean(change && "remove" in change),
    });
    if (
      !Number.isSafeInteger(receipt.revision) ||
      receipt.revision < 1 ||
      !["saved", "missing", "unchanged"].includes(receipt.credentialState)
    )
      throw new ProviderSaveError(
        "系统保存回执无法确认，请重新读取连接状态后重试。",
      );
    credentialState =
      receipt.credentialState === "unchanged"
        ? undefined
        : receipt.credentialState;
    if (change && connection.baseUrl)
      setSessionApiKey(
        "value" in change ? change.value : "",
        connection.baseUrl,
        connection.credentialRef,
      );
  } else {
    if (change) {
      if (!connection.baseUrl) throw new Error("Connection endpoint missing");
      if ("remove" in change)
        await deleteApiKey(connection.baseUrl, connection.credentialRef);
      else
        await saveApiKey(
          connection.baseUrl,
          change.value,
          connection.credentialRef,
        );
    }
    credentialState = change
      ? "remove" in change
        ? "missing"
        : "saved"
      : undefined;
  }
  try {
    if (!writeProviderConnections(next)) throw new Error("Cache unavailable");
    if (profile)
      window.localStorage.setItem(
        MODEL_PROVIDER_STORAGE_KEY,
        serializeModelProvider(profile),
      );
  } catch {
    throw new ProviderSaveError(
      desktop
        ? change && "remove" in change
          ? "系统密钥已清除，但页面缓存未能刷新；请检查本地存储后重新读取。"
          : "系统连接和凭据已保存，但页面缓存未能刷新；请检查本地存储后重新读取。"
        : "无法保存页面连接信息；本次会话密钥仍保留，请检查本地存储后重试。",
      credentialState,
    );
  }
  return next;
}

/** Recover missing metadata, never edit an account found in the durable store. */
export function restoreProviderConnection(
  connection: ProviderConnection,
): Promise<ProviderConnection[]> {
  return commitConnection(connection, undefined, undefined, true);
}

export function saveProviderConnection(
  connection: ProviderConnection,
  apiKey = "",
  profile?: ModelProviderProfile,
): Promise<ProviderConnection[]> {
  return commitConnection(
    connection,
    apiKey.trim() ? { value: apiKey.trim() } : undefined,
    profile,
  );
}

export function clearProviderConnectionKey(
  connection: ProviderConnection,
): Promise<ProviderConnection[]> {
  return commitConnection(connection, { remove: true });
}
