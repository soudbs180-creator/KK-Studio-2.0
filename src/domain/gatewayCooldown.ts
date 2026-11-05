/**
 * Pure Domain Gateway Cooldown & Waiting Candidate Contracts.
 *
 * Adheres strictly to Clean Architecture (Hexagonal Core):
 * Zero framework, zero DOM, zero platform/Tauri dependencies.
 */

export interface WaitingCandidate {
  readonly accountId: string;
  readonly availableAfterMs: number;
  readonly reason?: "RATE_LIMITED" | "QUOTA_EXHAUSTED" | "CIRCUIT_BREAKER";
  readonly consecutiveFailures?: number;
}

export interface RoutePlan {
  readonly selectedAccountId: string | null;
  readonly coolingDurationMs?: number;
  readonly waitingQueue: readonly WaitingCandidate[];
  readonly bypassCircuitBreaker?: boolean;
}

export interface GatewayRouter {
  acquireCandidate(
    service?: string,
    sessionId?: string,
    isFallback?: boolean,
    signal?: AbortSignal,
  ): Promise<string>;
  reportRateLimit(accountId: string, retryAfterSeconds?: number): void;
}

export interface BackoffConfig {
  readonly baseCooldownMs?: number; // default: 5,000ms
  readonly maxCooldownMs?: number; // default: 600,000ms (10 minutes)
  readonly quotaCooldownMs?: number; // default: 3,600,000ms (1 hour)
  readonly random?: () => number;
}

/**
 * Computes exponential backoff with Full Jitter to eliminate thundering herds.
 * Formula:
 *   cap = min(maxCooldownMs, baseCooldownMs * 2^(consecutive - 1))
 *   jittered = floor(random() * (cap - baseCooldownMs)) + baseCooldownMs
 */
export function computeExponentialBackoffWithJitter(
  consecutiveFailures: number,
  config: BackoffConfig = {},
): number {
  if (consecutiveFailures <= 0) return 0;

  const base = config.baseCooldownMs ?? 5_000;
  const max = config.maxCooldownMs ?? 600_000;
  const rand = config.random ?? Math.random;

  // Saturate exponent at 10 to avoid numeric overflow
  const exponent = Math.min(consecutiveFailures - 1, 10);
  const cap = Math.min(base * 2 ** exponent, max);

  if (cap <= base) {
    return base;
  }
  return Math.floor(rand() * (cap - base)) + base;
}

/**
 * Parses duration strings like "250ms", "1.5s", "2m30s", "1h", or numeric timestamps.
 * Returns strictly positive duration in ms, or undefined if invalid, non-positive, or malformed.
 */
export function parseDurationOrTimestamp(
  value: string,
  nowMs = Date.now(),
): number | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Numeric check: timestamp or bare seconds
  const num = Number(trimmed);
  if (Number.isFinite(num)) {
    if (num <= 0) {
      return undefined;
    }
    if (num >= 1e12) {
      // Millisecond timestamp
      const diff = Math.round(num - nowMs);
      return diff > 0 ? diff : undefined;
    }
    if (num >= 1e9) {
      // Second timestamp
      const diff = Math.round(num * 1000 - nowMs);
      return diff > 0 ? diff : undefined;
    }
    // Bare seconds
    return Math.round(num * 1000);
  }

  // Duration string parser: e.g. "1h2m3.5s" or "250ms"
  let totalMs = 0;
  let rest = trimmed;
  let matched = false;

  const unitRegex = /^([0-9]+(?:\.[0-9]+)?)(ms|s|m|h)/i;
  while (rest.length > 0) {
    const match = unitRegex.exec(rest);
    if (!match) break;

    const amount = Number(match[1]);
    const unit = match[2]!.toLowerCase();
    matched = true;

    if (unit === "ms") totalMs += amount;
    else if (unit === "s") totalMs += amount * 1000;
    else if (unit === "m") totalMs += amount * 60 * 1000;
    else if (unit === "h") totalMs += amount * 3600 * 1000;

    rest = rest.slice(match[0].length).trim();
  }

  return matched && rest.length === 0 && Number.isFinite(totalMs) && totalMs > 0
    ? Math.round(totalMs)
    : undefined;
}

/**
 * Parses upstream rate-limit headers across OpenAI, Anthropic, Cloudflare, and Azure.
 * Handles:
 * - `retry-after-ms`: direct numeric milliseconds (> 0)
 * - `retry-after`: delta-seconds or HTTP-date (future only)
 * - `x-ratelimit-reset-requests`, `x-ratelimit-reset-tokens`: duration strings or unix timestamps
 * - `x-ratelimit-reset`: delta-seconds or epoch seconds/milliseconds
 *
 * Strictly returns a positive duration in milliseconds, or undefined if invalid/malformed/blank/negative.
 */
export function parseRateLimitHeaders(
  headers: Record<string, string | string[] | undefined> | Headers,
  nowMs = Date.now(),
): number | undefined {
  const getHeader = (name: string): string | undefined => {
    if (typeof (headers as Headers)?.get === "function") {
      return (headers as Headers).get(name) ?? undefined;
    }
    const record = headers as Record<string, string | string[] | undefined>;
    const targetKey = Object.keys(record).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    if (!targetKey) return undefined;
    const val = record[targetKey];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  // 1. retry-after-ms (exact milliseconds, must be strictly > 0)
  const retryAfterMsRaw = getHeader("retry-after-ms");
  if (retryAfterMsRaw) {
    const trimmed = retryAfterMsRaw.trim();
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        if (parsed > 0) {
          return Math.round(parsed);
        }
        return undefined;
      }
    }
  }

  // 2. retry-after (seconds or HTTP date, must be strictly > 0)
  const retryAfterRaw = getHeader("retry-after");
  if (retryAfterRaw) {
    const trimmed = retryAfterRaw.trim();
    if (trimmed.length > 0) {
      const asNum = Number(trimmed);
      if (Number.isFinite(asNum)) {
        if (asNum > 0) {
          return Math.round(asNum * 1000);
        }
        // Non-positive (0 or negative) is invalid / expired
        return undefined;
      }
      const dateParsed = Date.parse(trimmed);
      if (!Number.isNaN(dateParsed)) {
        const diff = dateParsed - nowMs;
        if (diff > 0) {
          return Math.round(diff);
        }
        return undefined;
      }
    }
  }

  // 3. x-ratelimit-reset-*
  const resetKeys = [
    "x-ratelimit-reset-requests",
    "x-ratelimit-reset-tokens",
    "x-ratelimit-reset",
  ];
  for (const key of resetKeys) {
    const raw = getHeader(key);
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const dur = parseDurationOrTimestamp(trimmed, nowMs);
    if (dur !== undefined && dur > 0) return dur;
  }

  return undefined;
}

/**
 * Sorts waiting candidates ascending by remaining recovery time.
 */
export function sortWaitingQueue(
  queue: readonly WaitingCandidate[],
): WaitingCandidate[] {
  return [...queue].sort((a, b) => a.availableAfterMs - b.availableAfterMs);
}
