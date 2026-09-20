import { invoke } from "@tauri-apps/api/core";

const sessionApiKeys = new Map<string, string>();

function isDesktop(): boolean {
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

/** A non-secret, stable Windows Credential Manager account name. */
export function credentialId(baseUrl: string, accountId = ""): string {
  const canonical = canonicalBaseUrl(baseUrl);
  const identity = accountId ? `${canonical}|${accountId.trim()}` : canonical;
  let first = 2166136261;
  let second = 2246822519;
  for (const character of identity) {
    first = Math.imul(first ^ character.charCodeAt(0), 16777619);
    second = Math.imul(second ^ character.charCodeAt(0), 3266489917);
  }
  return `provider-${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

function canonicalBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    url.hash = "";
    url.search = "";
    // URL lowercases protocol/host while preserving a provider's path case.
    // The same canonical value is used for the memory cache and credential ID.
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return baseUrl.trim().replace(/\/$/, "");
  }
}

function keyFor(baseUrl: string, credentialRef?: string): string {
  return credentialRef
    ? `${canonicalBaseUrl(baseUrl)}|${credentialRef}`
    : canonicalBaseUrl(baseUrl);
}

export function setSessionApiKey(
  value: string,
  baseUrl: string,
  credentialRef?: string,
): void {
  const key = keyFor(baseUrl, credentialRef);
  if (value.trim()) sessionApiKeys.set(key, value);
  else sessionApiKeys.delete(key);
}

export function getSessionApiKey(
  baseUrl: string,
  credentialRef?: string,
): string {
  return sessionApiKeys.get(keyFor(baseUrl, credentialRef)) ?? "";
}

/** Reads a desktop credential into memory for one request session. */
export async function loadApiKey(
  baseUrl: string,
  credentialRef?: string,
): Promise<string> {
  const cached = getSessionApiKey(baseUrl, credentialRef);
  if (cached) return cached;
  if (!isDesktop()) return "";
  const value = await invoke<string | null>("credential_get", {
    providerId: credentialRef ?? credentialId(baseUrl),
  });
  if (value) setSessionApiKey(value, baseUrl, credentialRef);
  return value ?? "";
}

export async function hasApiKey(
  baseUrl: string,
  credentialRef?: string,
): Promise<boolean> {
  return Boolean(await loadApiKey(baseUrl, credentialRef));
}

export async function saveApiKey(
  baseUrl: string,
  value: string,
  credentialRef?: string,
): Promise<void> {
  if (!value.trim()) return;
  if (isDesktop()) {
    await invoke("credential_set", {
      providerId: credentialRef ?? credentialId(baseUrl),
      secret: value,
    });
  }
  setSessionApiKey(value, baseUrl, credentialRef);
}

export async function deleteApiKey(
  baseUrl: string,
  credentialRef?: string,
): Promise<void> {
  if (isDesktop()) {
    await invoke("credential_delete", {
      providerId: credentialRef ?? credentialId(baseUrl),
    });
  }
  setSessionApiKey("", baseUrl, credentialRef);
}
