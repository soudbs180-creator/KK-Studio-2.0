import { isTauri } from "@tauri-apps/api/core";
import { isLocalProviderUrl } from "../../domain/providerUrl.ts";
import { checkModelProvider } from "../../integrations/modelProvider.ts";
import { loadApiKey } from "../../features/creation/index.ts";
import {
  saveModelCatalog,
  type CatalogModel,
} from "../../features/models/index.ts";
import {
  providerNeedsKey,
  providerHeaders,
  type ProviderProtocol,
  type ProviderAuthMode,
} from "../../domain/providerProtocol.ts";
import { getModelsEndpoint } from "../../domain/modelProvider.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";

export interface FetchProviderModelsOptions {
  baseUrl: string;
  apiKey?: string;
  credentialRef?: string;
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface FetchProviderModelsResult {
  ok: boolean;
  models: CatalogModel[];
  count: number;
  durationMs: number;
  status: number;
  message: string;
  error?: string;
}

export async function resolveApiKey(
  baseUrl: string,
  providedKey?: string,
  credentialRef?: string,
  needsKey = true,
): Promise<string> {
  if (!needsKey) return "";
  if (providedKey && providedKey.trim()) return providedKey.trim();
  if (credentialRef) {
    try {
      const stored = await loadApiKey(baseUrl, credentialRef);
      if (stored) return stored.trim();
    } catch (error) {
      // ignore credential retrieval errors
      void error;
    }
  }
  return "";
}

/**
 * Independently fetches the /v1/models catalog from a remote or local provider.
 */
export async function fetchProviderModels(
  options: FetchProviderModelsOptions,
): Promise<FetchProviderModelsResult> {
  const isOnline =
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true;
  if (!isOnline && !isLocalProviderUrl(options.baseUrl)) {
    return {
      ok: false,
      models: [],
      count: 0,
      durationMs: 0,
      status: 0,
      message: "设备处于离线状态，请联网后重试。",
      error: "offline",
    };
  }

  const timeoutMs = options.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("timeout"), timeoutMs);

  const onParentAbort = () => controller.abort(options.signal?.reason);
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener("abort", onParentAbort, { once: true });
    }
  }

  const t0 = performance.now();

  try {
    const needsKey = providerNeedsKey({
      baseUrl: options.baseUrl,
      authMode: options.authMode,
    });
    const key = await resolveApiKey(
      options.baseUrl,
      options.apiKey,
      options.credentialRef,
      needsKey,
    );

    let models: CatalogModel[] = [];

    if (isTauri()) {
      models = await checkModelProvider(
        options.baseUrl,
        key,
        controller.signal,
        {
          protocol: options.protocol,
          authMode: options.authMode,
          credentialRef: options.credentialRef,
        },
      );
    } else {
      // Web / fetch fallback
      const endpoint = getModelsEndpoint(options.baseUrl);
      const headers = {
        Accept: "application/json",
        ...providerHeaders(
          {
            baseUrl: options.baseUrl,
            protocol: options.protocol,
            authMode: options.authMode,
          },
          key,
        ),
      };

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const delta = Math.round(performance.now() - t0);
        const errMessage =
          response.status === 401 || response.status === 403
            ? `鉴权失败（HTTP ${response.status}），请检查 API Key。`
            : `请求失败（HTTP ${response.status}）。`;
        return {
          ok: false,
          models: [],
          count: 0,
          durationMs: delta,
          status: response.status,
          message: errMessage,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const rawList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      const seen = new Set<string>();
      models = rawList.flatMap((item: unknown) => {
        const id =
          typeof item === "object" && item !== null && "id" in item
            ? String((item as { id: unknown }).id)
            : typeof item === "string"
              ? item
              : "";
        if (!id || seen.has(id)) return [];
        seen.add(id);
        return [
          {
            id,
            kind: "text" as const,
            source: "reported" as const,
          },
        ];
      });
    }

    const durationMs = Math.round(performance.now() - t0);
    return {
      ok: true,
      models,
      count: models.length,
      durationMs,
      status: 200,
      message: `成功拉取 ${models.length} 个模型 (${durationMs}ms)`,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    if (controller.signal.aborted) {
      const isTimeout = controller.signal.reason === "timeout";
      return {
        ok: false,
        models: [],
        count: 0,
        durationMs,
        status: 0,
        message: isTimeout
          ? `拉取模型超时（超过 ${timeoutMs}ms）`
          : "已取消拉取模型",
        error: isTimeout ? "timeout" : "aborted",
      };
    }

    const message =
      error instanceof Error
        ? error.message
        : "无法获取模型列表，请检查网络或配置。";
    return {
      ok: false,
      models: [],
      count: 0,
      durationMs,
      status: 0,
      message,
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener("abort", onParentAbort);
    }
  }
}

/**
 * Fetches models from the provider and automatically saves them into the persistent model catalog.
 */
export async function fetchAndSaveProviderModels(
  connection: ProviderConnection,
  options: Omit<FetchProviderModelsOptions, "baseUrl"> & { baseUrl?: string },
): Promise<FetchProviderModelsResult> {
  const baseUrl = options.baseUrl ?? connection.baseUrl;
  if (!baseUrl) {
    return {
      ok: false,
      models: [],
      count: 0,
      durationMs: 0,
      status: 0,
      message: "未配置服务商地址 (Base URL)",
      error: "missing_base_url",
    };
  }

  const result = await fetchProviderModels({
    ...options,
    baseUrl,
    protocol: options.protocol ?? connection.protocol,
    authMode: options.authMode ?? connection.authMode,
    credentialRef: options.credentialRef ?? connection.credentialRef,
  });

  if (result.ok && result.models.length > 0) {
    saveModelCatalog(connection, result.models);
  }

  return result;
}
