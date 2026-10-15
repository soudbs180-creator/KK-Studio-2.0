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
  const requestId = crypto.randomUUID();
  let prepared = false;
  let cancellation: Promise<unknown> | undefined;
  let rejectAborted!: (reason: unknown) => void;
  const aborted = new Promise<never>((_, reject) => {
    rejectAborted = reject;
  });
  const cancel = () => {
    if (!prepared) {
      rejectAborted(signal.reason);
      return;
    }
    cancellation = invoke("provider_models_cancel", { requestId }).catch(() => {
      throw new Error("cancel: 未能确认原生请求已取消，请重试或关闭应用。");
    });
    void cancellation.then(() => rejectAborted(signal.reason), rejectAborted);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const preparation = invoke("provider_models_prepare", { requestId }).then(
    () => {
      prepared = true;
    },
  );
  try {
    await Promise.race([preparation, aborted]);
    signal.throwIfAborted();
    const ids = await Promise.race([
      invoke<string[]>("provider_models_fetch", {
        requestId,
        baseUrl,
        protocol: options.protocol ?? null,
        authMode: options.authMode ?? null,
        credentialRef: options.credentialRef ?? null,
        secret: apiKey.trim() || null,
      }),
      aborted,
    ]);
    signal.throwIfAborted();
    return parseCatalogModels({ data: ids.map((id) => ({ id })) });
  } finally {
    signal.removeEventListener("abort", cancel);
    if (prepared) {
      try {
        await cancellation;
      } finally {
        await invoke("provider_models_release", { requestId }).catch(() => {
          throw new Error("cancel: 未能确认原生请求已释放，请重试或关闭应用。");
        });
      }
    } else {
      // No HTTP work starts before prepare; an abandoned Native prepare also expires after 30s.
      void preparation
        .then(() => invoke("provider_models_release", { requestId }))
        .catch(() => {});
    }
  }
}
