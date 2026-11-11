/**
 * KK Studio Agent Dispatcher - Quota Signals & Rate-Limit Normalization.
 *
 * Provides pure functions to:
 * 1. Normalize and classify upstream errors into standard quota signals.
 * 2. Manipulate candidate quota states (markExhausted, applyCooldown, shouldSkipCandidate, etc.).
 * 3. Scrub and sanitize sensitive keys, tokens, and credentials so they NEVER leak into return values or logs.
 * 4. Adapt seamlessly to existing ChannelHealthTracker shape.
 *
 * Grounded in plan-addendum-agent-ui.md Section H & dispatch-board-20261109 Task 1.12.
 */

import type {
  ClassifySignalOptions,
  DispatchCandidate,
  HealthStatus,
  HealthTrackerLike,
  QuotaSignal,
  QuotaSignalType,
  QuotaState,
  SkipEvaluation,
} from "./dispatchTypes.ts";

export type { QuotaSignalType };

/** Default cooldown durations in milliseconds. */
export const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute
export const DEFAULT_QUOTA_EXHAUSTED_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
export const DEFAULT_SERVER_ERROR_COOLDOWN_MS = 30 * 1000; // 30 seconds

/**
 * Regex patterns matching sensitive credentials and secrets.
 */
const SENSITIVE_KEY_PATTERNS: ReadonlyArray<RegExp> = [
  // OpenAI, Anthropic, GitHub, Slack, etc. style keys: sk-..., rk-..., ghp-..., xox...
  /\b(?:sk|rk|ak|ghp|xox[baprs]|sess|live|test)-[A-Za-z0-9_-]{6,}\b/gi,
  // Google API keys: AIza...
  /\bAIza[A-Za-z0-9_-]{20,}\b/g,
  // Bearer / Basic tokens in headers or logs
  /\b(?:bearer|basic)\s+[A-Za-z0-9._~+/-]+=*/gi,
  // Key-value pairs in strings or query params: apiKey=..., token: ...
  /(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|credential|private[_-]?key)\b\s*[:=]\s*["']?)(?:(?:bearer|basic)\s+)?[^&\s"',;]+/gi,
];

/**
 * Pure function: scrubs all known and pattern-matched secrets from text.
 * Never throws.
 */
export function sanitizeSecrets(
  text: string,
  knownSecrets?: readonly string[],
): string {
  if (!text) return "";
  let result = text;

  // 1. Explicitly scrub any known secrets passed in
  if (knownSecrets && knownSecrets.length > 0) {
    for (const secret of knownSecrets) {
      if (!secret || typeof secret !== "string" || secret.trim().length < 3) {
        continue;
      }
      // Global string replacement
      result = result.split(secret).join("[REDACTED]");
    }
  }

  // 2. Scrub standard pattern matches
  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match, prefix) => {
      if (prefix) {
        return `${prefix}[REDACTED]`;
      }
      if (/^bearer\s+/i.test(match)) {
        return "Bearer [REDACTED]";
      }
      if (/^basic\s+/i.test(match)) {
        return "Basic [REDACTED]";
      }
      return "[REDACTED]";
    });
  }

  return result;
}

/**
 * Patterns identifying INSUFFICIENT_QUOTA (balance, quota exceeded, arrears).
 * Checked BEFORE simple rate-limit because providers like OpenAI often return 429
 * with type/code 'insufficient_quota', which requires long cooldown / user refill.
 */
const QUOTA_EXHAUSTED_PATTERNS = [
  /insufficient[_\s-]?(quota|balance|credit)/i,
  /quota[_\s-]?(exceeded|exhausted)/i,
  /credit[_\s-]?(exhausted|balance[_\s-]too[_\s-]low|too[_\s-]low)/i,
  /account[_\s-]?(overdue|arrears)/i,
  /billing[_\s-]?(not[_\s-]?active|arrears|required|issue)/i,
  /payment[_\s-]?required/i,
  /余额不足/i,
  /欠费/i,
  /额度用尽/i,
  /无额度/i,
  /超出配额/i,
];

/** Patterns identifying RATE_LIMITED (transient throttling, too many requests). */
const RATE_LIMIT_PATTERNS = [
  /rate[_\s-]?limit/i,
  /too[_\s-]?many[_\s-]?requests/i,
  /throttl/i,
  /\b429\b/,
  /requests[_\s-]per[_\s-]minute/i,
  /tokens[_\s-]per[_\s-]minute/i,
  /tpm[_\s-]limit/i,
  /rpm[_\s-]limit/i,
  /resource[_\s-]?exhausted.*(?:rate|quota|limit)/i,
];

/** Patterns identifying AUTH_FAILED (invalid key, forbidden, expired token). */
const AUTH_FAILED_PATTERNS = [
  /invalid[_\s-]?(api[_\s-]?)?(key|token|credential|signature)/i,
  /unauthorized/i,
  /authentication[_\s-]?(failed|error|required)/i,
  /permission[_\s-]?denied/i,
  /access[_\s-]?denied/i,
  /forbidden/i,
  /expired[_\s-]?(token|key|credential)/i,
  /auth[_\s-]?token[_\s-]?invalid/i,
  /鉴权失败/i,
  /认证失败/i,
  /密钥无效/i,
  /权限不足/i,
];

interface ExtractedErrorInfo {
  status?: number;
  code?: string;
  signalText: string;
  retryAfterMs?: number;
}

/**
 * Inspects any incoming error object / response / exception and extracts
 * status, error code, signal text, and vendor retry-after hints.
 */
function extractErrorInfo(error: unknown): ExtractedErrorInfo {
  if (error === null || error === undefined) {
    return { signalText: "" };
  }

  if (typeof error === "string") {
    return { signalText: error };
  }

  if (typeof error !== "object") {
    return { signalText: String(error) };
  }

  const obj = error as Record<string, unknown>;

  // Check if it already wraps a NormalizedError from ai-gateway
  const normalizedCandidate =
    (obj.normalized as Record<string, unknown> | undefined) ??
    (typeof obj.errorClass === "string" ? obj : undefined);
  if (normalizedCandidate && typeof normalizedCandidate.errorClass === "string") {
    const errorClass = String(normalizedCandidate.errorClass);
    const status =
      typeof normalizedCandidate.httpStatus === "number"
        ? normalizedCandidate.httpStatus
        : undefined;
    const cooldownMs =
      typeof normalizedCandidate.cooldownMs === "number"
        ? normalizedCandidate.cooldownMs
        : undefined;
    const detail =
      typeof normalizedCandidate.detail === "string"
        ? normalizedCandidate.detail
        : "";
    return {
      status,
      code: errorClass,
      signalText: `${errorClass} ${detail}`,
      retryAfterMs: cooldownMs,
    };
  }

  // Extract HTTP status
  let status: number | undefined;
  if (typeof obj.status === "number") status = obj.status;
  else if (typeof obj.statusCode === "number") status = obj.statusCode;
  else if (
    obj.response &&
    typeof (obj.response as Record<string, unknown>).status === "number"
  ) {
    status = (obj.response as Record<string, unknown>).status as number;
  }

  // Extract upstream code / type
  let code: string | undefined;
  const innerError =
    (obj.error as Record<string, unknown> | undefined) ??
    ((obj.response as Record<string, unknown> | undefined)?.data as
      | Record<string, unknown>
      | undefined);
  if (innerError && typeof innerError === "object") {
    const errorProp = (innerError.error as Record<string, unknown> | undefined) ?? innerError;
    if (typeof errorProp.code === "string") code = errorProp.code;
    else if (typeof errorProp.type === "string") code = errorProp.type;
  }
  if (!code && typeof obj.code === "string") {
    code = obj.code;
  }

  // Extract message / signal text
  const textParts: string[] = [];
  if (typeof obj.message === "string") textParts.push(obj.message);
  if (typeof obj.detail === "string") textParts.push(obj.detail);
  if (code) textParts.push(code);

  if (innerError && typeof innerError === "object") {
    const errorProp = (innerError.error as Record<string, unknown> | undefined) ?? innerError;
    if (typeof errorProp.message === "string") textParts.push(errorProp.message);
    if (typeof errorProp.detail === "string") textParts.push(errorProp.detail);
  }

  // If signal text is still very sparse, stringify safe representation
  if (textParts.length === 0) {
    try {
      textParts.push(JSON.stringify(obj));
    } catch {
      textParts.push(String(obj));
    }
  }

  // Extract retry-after hints
  let retryAfterMs: number | undefined;
  const retryCandidate =
    obj.retryAfterMs ??
    obj.retry_after ??
    obj.retryAfter ??
    obj.cooldownMs ??
    (innerError && typeof innerError === "object"
      ? innerError.retry_after ?? innerError.retryAfter ?? innerError.retryAfterMs
      : undefined);

  if (typeof retryCandidate === "number" && Number.isFinite(retryCandidate) && retryCandidate > 0) {
    // If < 10,000 and not explicitly retryAfterMs, assume seconds
    retryAfterMs =
      obj.retryAfterMs || (innerError && typeof innerError === "object" && innerError.retryAfterMs)
        ? Math.round(retryCandidate)
        : Math.round(retryCandidate > 1000 ? retryCandidate : retryCandidate * 1000);
  } else if (typeof retryCandidate === "string") {
    const num = Number(retryCandidate);
    if (!Number.isNaN(num) && num > 0) {
      retryAfterMs = Math.round(num > 1000 ? num : num * 1000);
    }
  }

  // Check headers if present (Axios / Fetch style)
  const headers =
    (obj.headers as Record<string, unknown> | undefined) ??
    ((obj.response as Record<string, unknown> | undefined)?.headers as
      | Record<string, unknown>
      | undefined);
  if (headers && typeof headers === "object") {
    const rawHeader =
      headers["retry-after"] ?? headers["Retry-After"] ?? headers["x-ratelimit-reset"];
    if (typeof rawHeader === "number" && rawHeader > 0) {
      retryAfterMs = rawHeader > 1000 ? rawHeader : rawHeader * 1000;
    } else if (typeof rawHeader === "string") {
      const parsedSeconds = Number(rawHeader);
      if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
        retryAfterMs = parsedSeconds * 1000;
      } else {
        const dateMs = Date.parse(rawHeader);
        if (!Number.isNaN(dateMs) && dateMs > Date.now()) {
          retryAfterMs = dateMs - Date.now();
        }
      }
    }
  }

  return {
    status,
    code,
    signalText: textParts.join(" "),
    retryAfterMs,
  };
}

/**
 * Pure function: Classifies an upstream error or HTTP response into a unified QuotaSignal.
 *
 * Guarantees:
 * - Return value never contains raw API keys or secrets.
 * - Always returns a typed QuotaSignal (RATE_LIMITED, INSUFFICIENT_QUOTA, AUTH_FAILED, or OTHER).
 * - Appropriate cooldown hints and retryability are set.
 */
export function classifyQuotaSignal(
  error: unknown,
  options?: ClassifySignalOptions,
): QuotaSignal {
  const extracted = extractErrorInfo(error);
  const { status, code, signalText, retryAfterMs } = extracted;
  const now = options?.now ?? Date.now();

  const sanitizedDetail = sanitizeSecrets(
    signalText.slice(0, 500).trim(),
    options?.knownSecrets,
  );
  const sanitizedCode = code ? sanitizeSecrets(code, options?.knownSecrets) : undefined;

  // 1. Check INSUFFICIENT_QUOTA first
  // Note: Some vendors report quota exhaustion with status 429 or 400 or 402.
  // Quota exhaustion takes precedence over transient rate limiting.
  const isQuotaExhaustedByPattern = QUOTA_EXHAUSTED_PATTERNS.some((pat) =>
    pat.test(signalText),
  );
  const isQuotaExhaustedCode =
    sanitizedCode !== undefined &&
    /quota|balance|arrears|credit/i.test(sanitizedCode);

  if (status === 402 || isQuotaExhaustedByPattern || isQuotaExhaustedCode) {
    const cooldownMs = retryAfterMs ?? DEFAULT_QUOTA_EXHAUSTED_COOLDOWN_MS;
    return {
      signalType: "INSUFFICIENT_QUOTA",
      retryable: false,
      httpStatus: status ?? 402,
      cooldownMs,
      resetAt: now + cooldownMs,
      sanitizedDetail: sanitizedDetail || "Quota or balance exhausted",
      ...(sanitizedCode ? { upstreamCode: sanitizedCode } : {}),
    };
  }

  // 2. Check RATE_LIMITED (429 or rate limit wording)
  const isRateLimitedByPattern = RATE_LIMIT_PATTERNS.some((pat) =>
    pat.test(signalText),
  );
  const isRateLimitedCode =
    sanitizedCode !== undefined &&
    /rate_limit|too_many_requests|throttl/i.test(sanitizedCode);

  if (status === 429 || isRateLimitedByPattern || isRateLimitedCode) {
    const cooldownMs =
      retryAfterMs ?? options?.defaultCooldownMs ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS;
    return {
      signalType: "RATE_LIMITED",
      retryable: true,
      httpStatus: status ?? 429,
      cooldownMs,
      resetAt: now + cooldownMs,
      sanitizedDetail: sanitizedDetail || "Upstream rate limit exceeded",
      ...(sanitizedCode ? { upstreamCode: sanitizedCode } : {}),
    };
  }

  // 3. Check AUTH_FAILED (401, 403, or invalid credential patterns)
  const isAuthFailedByPattern = AUTH_FAILED_PATTERNS.some((pat) =>
    pat.test(signalText),
  );
  const isAuthFailedCode =
    sanitizedCode !== undefined &&
    /unauthorized|invalid_api_key|auth_error|forbidden/i.test(sanitizedCode);

  if (
    status === 401 ||
    status === 403 ||
    isAuthFailedByPattern ||
    isAuthFailedCode
  ) {
    return {
      signalType: "AUTH_FAILED",
      retryable: false,
      httpStatus: status ?? (isAuthFailedByPattern ? 401 : 403),
      sanitizedDetail: sanitizedDetail || "Authentication failed or access denied",
      ...(sanitizedCode ? { upstreamCode: sanitizedCode } : {}),
    };
  }

  // 4. Fallback: OTHER (e.g. 500, 502, 503, 504, timeout, network error)
  const isServerFailure = status !== undefined && status >= 500;
  const isTimeout =
    status === 408 ||
    status === 504 ||
    /time[_\s-]?out|timed[_\s-]?out|etimedout|econnreset|econnrefused|network/i.test(
      signalText,
    );
  const retryable = isServerFailure || isTimeout;
  const cooldownMs = retryAfterMs ?? (retryable ? DEFAULT_SERVER_ERROR_COOLDOWN_MS : undefined);

  return {
    signalType: "OTHER",
    retryable,
    ...(status !== undefined ? { httpStatus: status } : {}),
    ...(cooldownMs !== undefined ? { cooldownMs } : {}),
    sanitizedDetail: sanitizedDetail || "Upstream error",
    ...(sanitizedCode ? { upstreamCode: sanitizedCode } : {}),
  };
}

/**
 * Pure function: Marks a candidate's quota as exhausted.
 * Does NOT mutate the input candidate. Returns a new candidate object.
 */
export function markExhausted(
  candidate: DispatchCandidate,
  options?: { resetAt?: number; now?: number },
): DispatchCandidate {
  const updatedQuota: QuotaState = {
    ...candidate.quota,
    exhausted: true,
    ...(options?.resetAt !== undefined ? { resetAt: options.resetAt } : {}),
  };

  // If candidate was "ok", degrade health to signal exhausted capacity
  const updatedHealth: HealthStatus =
    candidate.health === "ok" ? "degraded" : candidate.health;

  return {
    ...candidate,
    quota: updatedQuota,
    health: updatedHealth,
  };
}

/**
 * Pure function: Clears exhausted state from a candidate.
 * Restores degraded health back to "ok" if no active cooldown is in effect.
 */
export function clearExhausted(
  candidate: DispatchCandidate,
  options?: { now?: number },
): DispatchCandidate {
  const now = options?.now ?? Date.now();
  const updatedQuota: QuotaState = {
    ...candidate.quota,
    exhausted: false,
    resetAt: undefined,
  };

  const isStillCooling =
    updatedQuota.cooldownUntil !== undefined && updatedQuota.cooldownUntil > now;
  const updatedHealth: HealthStatus =
    candidate.health === "degraded" && !isStillCooling ? "ok" : candidate.health;

  return {
    ...candidate,
    quota: updatedQuota,
    health: updatedHealth,
  };
}

/**
 * Pure function: Applies a cooldown window to a candidate.
 * Does NOT mutate the input candidate. Returns a new candidate object.
 */
export function applyCooldown(
  candidate: DispatchCandidate,
  cooldownMs: number,
  options?: { now?: number },
): DispatchCandidate {
  const now = options?.now ?? Date.now();
  const validCooldownMs = Math.max(0, cooldownMs);
  const newCooldownUntil = now + validCooldownMs;

  const currentCooldownUntil = candidate.quota.cooldownUntil ?? 0;
  const cooldownUntil = Math.max(currentCooldownUntil, newCooldownUntil);

  const updatedQuota: QuotaState = {
    ...candidate.quota,
    cooldownUntil,
  };

  return {
    ...candidate,
    quota: updatedQuota,
  };
}

/**
 * Pure function: Clears active cooldown from a candidate.
 */
export function clearCooldown(
  candidate: DispatchCandidate,
): DispatchCandidate {
  const updatedQuota: QuotaState = {
    ...candidate.quota,
    cooldownUntil: undefined,
  };

  return {
    ...candidate,
    quota: updatedQuota,
  };
}

/**
 * Pure function: Evaluates whether a candidate should be skipped during dispatch.
 * Checks for:
 * 1. Quota exhaustion (with automatic reset expiration handling).
 * 2. Active cooldown window.
 * 3. Health status 'down'.
 */
export function shouldSkipCandidate(
  candidate: DispatchCandidate,
  options?: { now?: number },
): SkipEvaluation {
  const now = options?.now ?? Date.now();

  // 1. Quota exhaustion check
  if (candidate.quota.exhausted) {
    // If resetAt has arrived, the quota is auto-recovered and should not be skipped for exhaustion
    if (candidate.quota.resetAt !== undefined && candidate.quota.resetAt <= now) {
      // Reset elapsed; fall through to cooldown/health check
    } else {
      const resetRemainingMs =
        candidate.quota.resetAt !== undefined
          ? Math.max(0, candidate.quota.resetAt - now)
          : undefined;
      return {
        skip: true,
        reason: "exhausted",
        resetRemainingMs,
      };
    }
  }

  // 2. Cooldown check
  if (
    candidate.quota.cooldownUntil !== undefined &&
    candidate.quota.cooldownUntil > now
  ) {
    const cooldownRemainingMs = candidate.quota.cooldownUntil - now;
    return {
      skip: true,
      reason: "cooling_down",
      cooldownRemainingMs,
    };
  }

  // 3. Health status check
  if (candidate.health === "down") {
    return {
      skip: true,
      reason: "health_down",
    };
  }

  return { skip: false };
}

/**
 * Pure function: Applies a classified QuotaSignal directly to a candidate.
 * - INSUFFICIENT_QUOTA -> marks exhausted and applies cooldown
 * - RATE_LIMITED -> applies cooldown
 * - AUTH_FAILED -> sets health down
 * - OTHER -> applies cooldown if retryable with backoff
 */
export function applyQuotaSignal(
  candidate: DispatchCandidate,
  signal: QuotaSignal,
  options?: { now?: number },
): DispatchCandidate {
  const now = options?.now ?? Date.now();

  switch (signal.signalType) {
    case "INSUFFICIENT_QUOTA": {
      const exhaustedCandidate = markExhausted(candidate, {
        resetAt: signal.resetAt,
        now,
      });
      if (signal.cooldownMs && signal.cooldownMs > 0) {
        return applyCooldown(exhaustedCandidate, signal.cooldownMs, { now });
      }
      return exhaustedCandidate;
    }

    case "RATE_LIMITED": {
      const cooldownMs = signal.cooldownMs ?? DEFAULT_RATE_LIMIT_COOLDOWN_MS;
      return applyCooldown(candidate, cooldownMs, { now });
    }

    case "AUTH_FAILED": {
      return {
        ...candidate,
        health: "down",
      };
    }

    case "OTHER":
    default: {
      if (signal.cooldownMs && signal.cooldownMs > 0) {
        return applyCooldown(candidate, signal.cooldownMs, { now });
      }
      return candidate;
    }
  }
}

/**
 * Adapter helper: Bridges a QuotaSignal to ChannelHealthTracker without altering ai-gateway.
 * Formats signal as a NormalizedError-like payload that ChannelHealthTracker expects.
 */
export function adaptToChannelHealthTracker(
  tracker: HealthTrackerLike,
  channelId: string,
  signal: QuotaSignal,
): void {
  if (!tracker || typeof tracker.recordFailure !== "function") return;

  const normalizedErrorClass =
    signal.signalType === "RATE_LIMITED"
      ? "RATE_LIMITED"
      : signal.signalType === "INSUFFICIENT_QUOTA"
        ? "QUOTA_EXHAUSTED"
        : signal.signalType === "AUTH_FAILED"
          ? "AUTH_INVALID"
          : "UPSTREAM_ERROR";

  const normalizedPayload = {
    errorClass: normalizedErrorClass,
    httpStatus: signal.httpStatus ?? (signal.signalType === "RATE_LIMITED" ? 429 : 500),
    retryable: signal.retryable,
    cooldownMs: signal.cooldownMs,
    channelId,
    detail: signal.sanitizedDetail,
  };

  tracker.recordFailure(channelId, normalizedPayload);
}

/**
 * Adapter helper: Reads state from ChannelHealthTracker and maps it to QuotaState & HealthStatus.
 */
export function adaptFromChannelHealthTracker(
  tracker: HealthTrackerLike,
  channelId: string,
  options?: { now?: number },
): { quota: QuotaState; health: HealthStatus } | undefined {
  if (!tracker || typeof tracker.state !== "function") return undefined;

  const rawState = tracker.state(channelId);
  if (!rawState) return undefined;

  const now = options?.now ?? Date.now();
  const cooldownUntil =
    typeof rawState.cooldownUntil === "number" && rawState.cooldownUntil > now
      ? rawState.cooldownUntil
      : undefined;

  let health: HealthStatus = "ok";
  if (rawState.quarantined) {
    health = "down";
  } else if (
    cooldownUntil !== undefined ||
    (typeof rawState.healthScore === "number" && rawState.healthScore < 60)
  ) {
    health = "degraded";
  }

  return {
    quota: {
      exhausted: false,
      cooldownUntil,
    },
    health,
  };
}
