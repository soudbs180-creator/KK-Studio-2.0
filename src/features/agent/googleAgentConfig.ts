import { credentialId, loadApiKey } from "../creation/index.ts";
import { readProviderConnections } from "../creation/index.ts";
import {
  restoreProviderConnection,
  saveProviderConnection,
} from "../creation/index.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { GOOGLE_API_BASE, GOOGLE_IMAGE_MODEL } from "./googleInteractions.ts";
import { GEMINI_BRIDGE_DEFAULT_URL } from "./geminiCliAdapter.ts";
export const GOOGLE_CONNECTION_ID = "google-interactions";
export const GOOGLE_CREDENTIAL_REF = credentialId(
  GOOGLE_API_BASE,
  GOOGLE_CONNECTION_ID,
);
export const GOOGLE_LOGIN_MODE_KEY = "kk-google-login-mode";
export const GOOGLE_BRIDGE_URL_KEY = "kk-google-bridge-url";
export function readGoogleCliPreference(): {
  loginMode: "api-key" | "cli";
  bridgeUrl: string;
} {
  try {
    const mode = window.localStorage.getItem(GOOGLE_LOGIN_MODE_KEY);
    const url = window.localStorage.getItem(GOOGLE_BRIDGE_URL_KEY);
    return {
      loginMode: mode === "cli" ? "cli" : "api-key",
      bridgeUrl: url || GEMINI_BRIDGE_DEFAULT_URL,
    };
  } catch {
    return {
      loginMode: "api-key",
      bridgeUrl: GEMINI_BRIDGE_DEFAULT_URL,
    };
  }
}
export function writeGoogleCliPreference(
  loginMode: "api-key" | "cli",
  bridgeUrl: string,
): boolean {
  try {
    if (loginMode === "cli") {
      window.localStorage.setItem(GOOGLE_LOGIN_MODE_KEY, "cli");
      window.localStorage.setItem(
        GOOGLE_BRIDGE_URL_KEY,
        bridgeUrl.trim() || GEMINI_BRIDGE_DEFAULT_URL,
      );
    } else {
      window.localStorage.removeItem(GOOGLE_LOGIN_MODE_KEY);
      window.localStorage.removeItem(GOOGLE_BRIDGE_URL_KEY);
    }
    return true;
  } catch {
    return false;
  }
}
export async function saveGoogleApiKeyConnection(
  apiKey: string,
): Promise<void> {
  await saveProviderConnection(googleApiConnection(), apiKey);
}
function googleApiConnection(): ProviderConnection {
  return {
    id: GOOGLE_CONNECTION_ID,
    provider: "Gemini",
    displayName: "Google Gemini",
    kind: "user_byok",
    baseUrl: GOOGLE_API_BASE,
    credentialRef: GOOGLE_CREDENTIAL_REF,
    model: GOOGLE_IMAGE_MODEL,
    state: "active",
    concurrencyLimit: 1,
    healthRevision: 0,
    verificationStatus: "unverified",
    capabilities: {
      modalities: ["image"],
      operations: ["generate", "edit"],
      maxReferences: 6,
      maxOutputs: 1,
      async: false,
    },
  };
}
export async function getGoogleCredential() {
  let connection = readProviderConnections().find(
    (item) => item.id === GOOGLE_CONNECTION_ID,
  );
  if (
    connection &&
    (connection.state === "disabled" ||
      connection.state === "quarantined" ||
      connection.baseUrl !== GOOGLE_API_BASE ||
      connection.credentialRef !== GOOGLE_CREDENTIAL_REF)
  )
    throw new Error("请先在设置 → 模型接入中保存 Google API Key。");
  const apiKey = await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF);
  if (!apiKey)
    throw new Error(
      "请在模型接入设置中填写 Google API Key；网页版刷新后需要重新填写。",
    );
  if (!connection) {
    // Older desktop builds could lose the metadata while the stable vault key
    // survived. Rebuild only its non-secret connection; never rewrite the key.
    const restored = await restoreProviderConnection(googleApiConnection());
    connection = restored.find((item) => item.id === GOOGLE_CONNECTION_ID);
    if (
      !connection ||
      connection.state === "disabled" ||
      connection.state === "quarantined" ||
      connection.baseUrl !== GOOGLE_API_BASE ||
      connection.credentialRef !== GOOGLE_CREDENTIAL_REF
    )
      throw new Error("Google 连接未启用，请检查模型接入设置。");
  }
  return {
    apiKey,
    identity: `${GOOGLE_CONNECTION_ID}:${connection.healthRevision ?? 0}`,
  };
}
