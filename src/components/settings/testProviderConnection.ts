import type { MutableRefObject } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { isLocalProviderUrl } from "../../domain/providerUrl.ts";
import { loadApiKey } from "../../features/creation/providerCredentials.ts";
import {
  providerNeedsKey,
  providerHeaders,
  protocolBindingMatches,
  type ProviderProtocol,
  type ProviderAuthMode,
} from "../../domain/providerProtocol.ts";
import { getModelsEndpoint } from "../../domain/modelProvider.ts";
import { checkModelProvider } from "../../integrations/modelProvider.ts";
import { saveModelCatalog } from "../../features/models/modelCatalog.ts";
import { readProviderConnections } from "../../features/creation/providerRegistry.ts";
import type { ModelProviderProfile } from "../../domain/modelProvider.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  resolveModelProviderConnection,
  type ConnectionState,
} from "./modelProviderSettingsState.ts";

export interface LatencyProbeOptions {
  baseUrl: string;
  apiKey?: string;
  credentialRef?: string;
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface LatencyProbeResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  message: string;
  error?: string;
}

async function resolveKey(
  baseUrl: string,
  providedKey?: string,
  credentialRef?: string,
  needsKey = true,
): Promise<string> {
  if (!needsKey) return "";
  if (providedKey && providedKey.trim()) return providedKey.trim();
  if (isTauri()) return ""; // In Tauri, credentialRef is read natively by Rust IPC
  if (credentialRef) {
    try {
      const stored = await loadApiKey(baseUrl, credentialRef);
      if (stored) return stored.trim();
    } catch (error) {
      // ignore
      void error;
    }
  }
  return "";
}

async function discoveryKey(
  valid: ModelProviderProfile,
  apiKey: string,
  credentialRef: string,
) {
  if (!providerNeedsKey(valid)) return "";
  if (apiKey.trim() || isTauri()) return apiKey.trim();
  return loadApiKey(valid.baseUrl, credentialRef);
}

function reportStaleCancellation(
  error: unknown,
  onFeedback: ((message: string) => void) | undefined,
) {
  if (error instanceof Error && error.message.startsWith("cancel:")) {
    onFeedback?.(`此前的连接测试：${error.message.replace(/^cancel:\s*/, "")}`);
  }
}

function assertCatalogTargetCurrent(
  tested: ProviderConnection,
  initial: ProviderConnection | undefined,
) {
  const current = readProviderConnections().find(
    (item) => item.id === tested.id,
  );
  const expected = initial ?? tested;
  if (
    (initial && !current) ||
    (current &&
      (expected.baseUrl !== current.baseUrl ||
        expected.credentialRef !== current.credentialRef ||
        expected.healthRevision !== current.healthRevision ||
        !protocolBindingMatches(
          { ...expected, baseUrl: expected.baseUrl! },
          { ...current, baseUrl: current.baseUrl! },
        )))
  ) {
    throw new Error(
      "连接在检测期间已变化，未更新模型目录；请重新选择连接后检测。",
    );
  }
}

function formatProbeHttpResponse(
  response: Response,
  delta: number,
): LatencyProbeResult {
  const status = response.status;
  if (response.ok) {
    return {
      ok: true,
      status,
      latencyMs: delta,
      message: `连通正常 · ${delta}ms (HTTP ${status})`,
    };
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      status,
      latencyMs: delta,
      message: `密钥无效或未授权 · ${delta}ms (HTTP ${status})`,
      error: `HTTP ${status}`,
    };
  }
  return {
    ok: false,
    status,
    latencyMs: delta,
    message: `服务响应异常 · ${delta}ms (HTTP ${status})`,
    error: `HTTP ${status}`,
  };
}

function formatProbeFailure(
  error: unknown,
  signal: AbortSignal,
  delta: number,
  timeoutMs: number,
): LatencyProbeResult {
  if (
    signal.aborted &&
    !(error instanceof Error && error.message.startsWith("cancel:"))
  ) {
    const isTimeout = signal.reason === "timeout";
    return {
      ok: false,
      status: 0,
      latencyMs: delta,
      message: isTimeout
        ? `连接响应超时（超过 ${timeoutMs}ms 阈值，请检查网络代理）`
        : "已取消连接测试。",
      error: isTimeout ? "timeout" : "aborted",
    };
  }
  const isTypeError = error instanceof TypeError;
  const msg = isTypeError
    ? "无法连接，请检查地址、网络和服务的跨域访问设置。"
    : error instanceof Error
      ? error.message.replace(/^cancel:\s*/, "")
      : "连接失败，请重试。";
  return {
    ok: false,
    status: 0,
    latencyMs: delta,
    message: msg,
    error: msg,
  };
}

/**
 * Lightweight sub-3s latency probe that measures real-time network latency in milliseconds
 * and returns the actual HTTP status code.
 */
export async function probeProviderLatency(
  options: LatencyProbeOptions,
): Promise<LatencyProbeResult> {
  const isOnline =
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true;
  if (!isOnline && !isLocalProviderUrl(options.baseUrl)) {
    return {
      ok: false,
      status: 0,
      latencyMs: 0,
      message: "设备处于离线状态，请联网后重试。",
      error: "offline",
    };
  }

  // Strictly bound to <= 3000ms
  const timeoutMs = Math.min(options.timeoutMs ?? 3000, 3000);
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
    const key = await resolveKey(
      options.baseUrl,
      options.apiKey,
      options.credentialRef,
      needsKey,
    );

    const endpoint = getModelsEndpoint(options.baseUrl);

    // Try standard fetch first (supported in both web and Tauri webview)
    try {
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

      const delta = Math.max(1, Math.round(performance.now() - t0));
      return formatProbeHttpResponse(response, delta);
    } catch (fetchError) {
      // If fetch fails in Tauri (e.g. strict origin policy), try checkModelProvider
      if (isTauri() && !controller.signal.aborted) {
        await checkModelProvider(options.baseUrl, key, controller.signal, {
          protocol: options.protocol,
          authMode: options.authMode,
          credentialRef: options.credentialRef,
        });
        controller.signal.throwIfAborted();
        const delta = Math.max(1, Math.round(performance.now() - t0));
        return {
          ok: true,
          status: 200,
          latencyMs: delta,
          message: `连通正常 · ${delta}ms (HTTP 200)`,
        };
      }
      throw fetchError;
    }
  } catch (error) {
    const delta = Math.max(1, Math.round(performance.now() - t0));
    return formatProbeFailure(error, controller.signal, delta, timeoutMs);
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener("abort", onParentAbort);
    }
  }
}

function formatTauriTestFailureState(
  error: unknown,
  signal: AbortSignal,
  baseUrl: string,
): ConnectionState {
  if (
    signal.aborted &&
    !(error instanceof Error && error.message.startsWith("cancel:"))
  ) {
    return {
      kind: "cancelled",
      message:
        signal.reason === "timeout"
          ? "连接超时，已取消请求。"
          : "已取消连接测试。",
    };
  }
  const canReach = navigator.onLine || isLocalProviderUrl(baseUrl);
  if (!canReach) {
    return {
      kind: "offline",
      message: "网络已断开，请恢复后重试。",
    };
  }
  const message =
    error instanceof TypeError
      ? "无法连接，请检查地址、网络和服务的跨域访问设置。"
      : error instanceof Error
        ? error.message.replace(/^cancel:\s*/, "")
        : "连接失败，请重试。";
  return { kind: "error", message };
}

async function testTauriProviderConnection({
  valid,
  apiKey,
  credentialRef,
  connections,
  requestRef,
  setConnection,
  onFeedback,
}: {
  valid: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
  connections: ProviderConnection[];
  requestRef: MutableRefObject<AbortController | null>;
  setConnection: (value: ConnectionState) => void;
  onFeedback?: (message: string) => void;
}): Promise<void> {
  const controller = new AbortController();
  const tested = resolveModelProviderConnection(
    valid,
    credentialRef,
    connections,
  );
  const initial = connections.find((item) => item.id === tested.id);
  requestRef.current = controller;
  setConnection({ kind: "loading", message: "正在请求模型列表…" });
  const timeout = window.setTimeout(() => controller.abort("timeout"), 10_000);
  try {
    const key = await discoveryKey(valid, apiKey, credentialRef);
    if (requestRef.current !== controller) return;
    const models = await checkModelProvider(
      valid.baseUrl,
      key,
      controller.signal,
      { protocol: valid.protocol, authMode: valid.authMode, credentialRef },
    );
    if (requestRef.current !== controller) return;
    controller.signal.throwIfAborted();
    assertCatalogTargetCurrent(tested, initial);
    saveModelCatalog(tested, models);
    const msg = `已获取 ${models.length} 个模型；生成能力仍需实际验证。`;
    setConnection({
      kind: "success",
      message: msg,
    });
    onFeedback?.(msg);
  } catch (error) {
    if (requestRef.current !== controller) {
      reportStaleCancellation(error, onFeedback);
      return;
    }
    setConnection(
      formatTauriTestFailureState(error, controller.signal, valid.baseUrl),
    );
  } finally {
    window.clearTimeout(timeout);
    if (requestRef.current === controller) requestRef.current = null;
  }
}

function applyLatencyProbeResultState(
  result: LatencyProbeResult,
  setConnection: (value: ConnectionState) => void,
  onFeedback?: (message: string) => void,
): void {
  if (result.ok) {
    setConnection({ kind: "success", message: result.message });
    onFeedback?.(result.message);
  } else if (result.error === "timeout" || result.error === "aborted") {
    setConnection({ kind: "cancelled", message: result.message });
  } else if (result.error === "offline") {
    setConnection({ kind: "offline", message: result.message });
  } else {
    setConnection({ kind: "error", message: result.message });
  }
}

export async function testProviderConnection({
  valid,
  apiKey,
  credentialRef,
  connections,
  requestRef,
  setConnection,
  onFeedback,
}: {
  valid: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
  connections: ProviderConnection[];
  requestRef: MutableRefObject<AbortController | null>;
  setConnection: (value: ConnectionState) => void;
  onFeedback?: (message: string) => void;
}): Promise<void> {
  const isOnline =
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true;
  if (!isOnline && !isLocalProviderUrl(valid.baseUrl)) {
    setConnection({
      kind: "offline",
      message: "设备处于离线状态，请联网后重试。",
    });
    return;
  }

  if (isTauri()) {
    await testTauriProviderConnection({
      valid,
      apiKey,
      credentialRef,
      connections,
      requestRef,
      setConnection,
      onFeedback,
    });
    return;
  }

  const controller = new AbortController();
  requestRef.current = controller;
  setConnection({ kind: "loading", message: "正在快速测速 (sub-3s)…" });

  try {
    const result = await probeProviderLatency({
      baseUrl: valid.baseUrl,
      apiKey,
      credentialRef,
      protocol: valid.protocol,
      authMode: valid.authMode,
      signal: controller.signal,
      timeoutMs: 3000,
    });

    if (requestRef.current !== controller) return;
    applyLatencyProbeResultState(result, setConnection, onFeedback);
  } catch (error) {
    if (requestRef.current !== controller) return;
    setConnection({
      kind: "error",
      message: error instanceof Error ? error.message : "连接失败，请重试。",
    });
  } finally {
    if (requestRef.current === controller) {
      requestRef.current = null;
    }
  }
}
