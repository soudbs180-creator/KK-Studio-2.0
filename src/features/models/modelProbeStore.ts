import { useSyncExternalStore } from "react";

export type LatencyTier = "fast" | "moderate" | "slow" | "error";

export interface ModelProbeMetric {
  providerId: string;
  modelId: string;
  latencyMs: number;
  ttftMs?: number;
  tier: LatencyTier;
  lastChecked: number;
  error?: string;
}

export function classifyLatencyTier(
  latencyMs: number,
  isError = false,
): LatencyTier {
  if (isError || !Number.isFinite(latencyMs) || latencyMs < 0) {
    return "error";
  }
  if (latencyMs < 100) {
    return "fast";
  }
  if (latencyMs < 500) {
    return "moderate";
  }
  return "slow";
}

export function getLatencyTierClass(tier: LatencyTier | string): string {
  if (tier === "medium") return "is-moderate";
  return `is-${tier}`;
}

function probeKey(providerId: string, modelId?: string): string {
  const p = (providerId || "").trim();
  const m = (modelId || "").trim();
  if (p && m) return `${p}::${m}`;
  return p || m;
}

const probeCache = new Map<string, ModelProbeMetric>();
const inFlightProbes = new Map<string, Promise<ModelProbeMetric>>();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      void err;
    }
  }
}

export function subscribeProbeMetrics(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordProbe(
  providerId: string,
  modelId: string,
  latencyMs: number,
  options?: { ttftMs?: number; error?: string } | string,
): ModelProbeMetric {
  const optionsObj = typeof options === "string" ? { error: options } : options;
  const tier = classifyLatencyTier(latencyMs, Boolean(optionsObj?.error));
  const metric: ModelProbeMetric = {
    providerId: providerId.trim(),
    modelId: modelId.trim(),
    latencyMs: Math.round(latencyMs),
    ttftMs:
      optionsObj?.ttftMs !== undefined
        ? Math.round(optionsObj.ttftMs)
        : undefined,
    tier,
    lastChecked: Date.now(),
    error: optionsObj?.error,
  };

  const keyFull = probeKey(providerId, modelId);
  probeCache.set(keyFull, metric);
  if (providerId.trim()) {
    probeCache.set(providerId.trim(), metric);
  }
  if (modelId.trim()) {
    probeCache.set(modelId.trim(), metric);
  }

  notifyListeners();
  return metric;
}

export function getProbeMetric(
  providerId: string,
  modelId?: string,
): ModelProbeMetric | undefined {
  const keyFull = probeKey(providerId, modelId);
  const found = probeCache.get(keyFull);
  if (found) return found;
  if (providerId && probeCache.has(providerId.trim())) {
    return probeCache.get(providerId.trim());
  }
  if (modelId && probeCache.has(modelId.trim())) {
    return probeCache.get(modelId.trim());
  }
  return undefined;
}

export function getAllProbeMetrics(): ModelProbeMetric[] {
  return Array.from(new Set(probeCache.values()));
}

export function clearProbeMetrics(): void {
  probeCache.clear();
  inFlightProbes.clear();
  notifyListeners();
}

export const PROBE_CACHE_TTL_MS = 60_000;
export const PROBE_TIMEOUT_MS = 3_000;

export async function probeEndpoint(
  providerId: string,
  baseUrl: string,
  modelId = "",
  options?: {
    timeoutMs?: number;
    force?: boolean;
    ttlMs?: number;
    fetcher?: typeof fetch;
  },
): Promise<ModelProbeMetric> {
  const key = probeKey(providerId, modelId);
  const existing = getProbeMetric(providerId, modelId);
  const ttl = options?.ttlMs ?? PROBE_CACHE_TTL_MS;

  if (!options?.force && existing && Date.now() - existing.lastChecked < ttl) {
    return existing;
  }

  const existingInFlight = inFlightProbes.get(key);
  if (existingInFlight) {
    return existingInFlight;
  }

  const timeoutMs = options?.timeoutMs ?? PROBE_TIMEOUT_MS;
  const fetchFn =
    options?.fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const probePromise = (async () => {
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      if (!fetchFn) {
        return recordProbe(providerId, modelId, -1, {
          error: "No fetch runtime",
        });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response | undefined;
      try {
        const pingUrl = baseUrl.endsWith("/")
          ? `${baseUrl}models`
          : `${baseUrl}/models`;
        response = await fetchFn(pingUrl, {
          method: "HEAD",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const finishedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = Math.max(1, finishedAt - startedAt);

      if (
        response &&
        (!response.ok ||
          (typeof response.status === "number" && response.status >= 400))
      ) {
        const status = response.status || 500;
        const statusText = response.statusText ? ` ${response.statusText}` : "";
        return recordProbe(providerId, modelId, elapsed, {
          error: `HTTP ${status}${statusText}`.trim(),
        });
      }

      return recordProbe(providerId, modelId, elapsed);
    } catch (err) {
      const finishedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = Math.max(1, finishedAt - startedAt);
      const errMsg = err instanceof Error ? err.message : String(err);
      return recordProbe(providerId, modelId, elapsed, { error: errMsg });
    } finally {
      inFlightProbes.delete(key);
    }
  })();

  inFlightProbes.set(key, probePromise);
  return probePromise;
}

export function useModelProbeMetric(
  providerId: string,
  modelId?: string,
): ModelProbeMetric | undefined {
  return useSyncExternalStore(
    subscribeProbeMetrics,
    () => getProbeMetric(providerId, modelId),
    () => getProbeMetric(providerId, modelId),
  );
}
