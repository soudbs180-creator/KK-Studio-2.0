import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ProviderProtocolOptions } from "../domain/providerProtocol.ts";
import {
  parseCatalogModels,
  type CatalogModel,
} from "../features/models/modelCatalog.ts";
import { discoverProviderModels } from "./providerModelDiscovery.ts";

export async function checkModelProvider(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal,
  options: Omit<ProviderProtocolOptions, "baseUrl"> & {
    credentialRef?: string;
  } = {},
): Promise<CatalogModel[]> {
  signal.throwIfAborted();
  if (!isTauri())
    return discoverProviderModels({ baseUrl, ...options }, apiKey, signal);
  const ids = await invoke<string[]>("provider_models_fetch", {
    baseUrl,
    protocol: options.protocol ?? null,
    authMode: options.authMode ?? null,
    credentialRef: options.credentialRef ?? null,
    secret: apiKey.trim() || null,
  });
  signal.throwIfAborted();
  return parseCatalogModels({ data: ids.map((id) => ({ id })) });
}
