/**
 * Shared failure taxonomy for every channel adapter.
 *
 * Adapters classify their own failures so the scheduler can branch on the
 * classification rather than on HTTP status codes. A 400 from Ark means
 * "invalid parameters" for one payload and "content rejected" for another, so
 * the status code alone is not actionable; the class is.
 */
import { z } from "zod";

export const errorClassSchema = z.enum([
  /** The credential itself is wrong: expired, revoked, malformed. */
  "AUTH_INVALID",
  /** The credential is valid but not permitted to do this. */
  "AUTH_FORBIDDEN",
  /** Balance or quota exhausted. Long cooldown; retrying sooner is wasteful. */
  "QUOTA_EXHAUSTED",
  /** Transient throttling. Short cooldown; another account usually succeeds. */
  "RATE_LIMITED",
  /** The configured endpoint/model id no longer exists upstream. */
  "ENDPOINT_STALE",
  /** The request payload itself is wrong. Retrying any account repeats this. */
  "BAD_REQUEST",
  /** Refused by upstream safety policy. Describes the prompt, not the account. */
  "CONTENT_BLOCKED",
  /** Upstream failed for a reason that does not map to a more specific class. */
  "UPSTREAM_ERROR",
  /** Network-level failure or a locally enforced deadline. */
  "TIMEOUT",
  /** The kk gateway itself refused the call: bad or missing client token. */
  "GATEWAY_AUTH_FAILED",
  /** No configured channel can serve this model/operation right now. */
  "NO_CHANNEL_AVAILABLE",
]);
export type ErrorClass = z.infer<typeof errorClassSchema>;
export const errorClasses = errorClassSchema.options;

export const normalizedErrorSchema = z.object({
  errorClass: errorClassSchema,
  httpStatus: z.number().int(),
  retryable: z.boolean(),
  /** Vendor-supplied cool-down hint. Wins over locally computed backoff. */
  cooldownMs: z.number().int().positive().optional(),
  detail: z.string().max(500).optional(),
  channelId: z.string().max(120).optional(),
});
export type NormalizedError = z.infer<typeof normalizedErrorSchema>;

/**
 * Classification is by signal priority, not by status code. Several signals
 * are checked before the status mapping because the vendor message is more
 * specific than the code it arrived with.
 */
const CLASSIFICATION_RULES: ReadonlyArray<{
  readonly errorClass: ErrorClass;
  readonly retryable: boolean;
  readonly defaultCooldownMs?: number;
  readonly pattern: RegExp;
}> = [
  {
    // Content policy wording must precede BAD_REQUEST: Ark reports a content
    // rejection as 400, so a status-first rule would call it a bad request and
    // the prompt would never be surfaced to the user as a policy refusal.
    errorClass: "CONTENT_BLOCKED",
    retryable: false,
    pattern:
      /content[_\s-]?(policy|filter|review)|sensitive|blocked|prohibited|risk[_\s-]?control|违规|敏感/i,
  },
  {
    errorClass: "AUTH_INVALID",
    retryable: false,
    pattern:
      /api[_\s-]?key|unauthorized|invalid[_\s-]?(key|token|signature|credential)|authentication|expired[_\s-]?token/i,
  },
  {
    errorClass: "AUTH_FORBIDDEN",
    retryable: false,
    pattern: /forbidden|permission|access[_\s-]?denied|not[_\s-]?enabled/i,
  },
  {
    errorClass: "QUOTA_EXHAUSTED",
    retryable: true,
    // Quota needs hours, not seconds: the account cannot recover by waiting
    // out a minute, and hammering it delays the refill.
    defaultCooldownMs: 6 * 60 * 60 * 1000,
    pattern:
      /quota|insufficient[_\s-]?(balance|quota|credit)|billing|arrears|payment[_\s-]?required|余额不足|欠费/i,
  },
  {
    errorClass: "RATE_LIMITED",
    retryable: true,
    defaultCooldownMs: 60 * 1000,
    pattern: /rate[_\s-]?limit|too[_\s-]?many[_\s-]?requests|throttl|429/i,
  },
  {
    errorClass: "ENDPOINT_STALE",
    retryable: false,
    pattern:
      /endpoint[_\s-]?(not[_\s-]?found|does[_\s-]?not[_\s-]?exist)|model[_\s-]?(not[_\s-]?found|does[_\s-]?exist|deprecated)|unknown[_\s-]?model/i,
  },
];

const STATUS_DEFAULTS: Readonly<
  Record<number, { errorClass: ErrorClass; retryable: boolean }>
> = {
  400: { errorClass: "BAD_REQUEST", retryable: false },
  401: { errorClass: "AUTH_INVALID", retryable: false },
  403: { errorClass: "AUTH_FORBIDDEN", retryable: false },
  404: { errorClass: "ENDPOINT_STALE", retryable: false },
  408: { errorClass: "TIMEOUT", retryable: true },
  413: { errorClass: "BAD_REQUEST", retryable: false },
  429: { errorClass: "RATE_LIMITED", retryable: true },
  500: { errorClass: "UPSTREAM_ERROR", retryable: true },
  502: { errorClass: "UPSTREAM_ERROR", retryable: true },
  503: { errorClass: "UPSTREAM_ERROR", retryable: true },
  504: { errorClass: "TIMEOUT", retryable: true },
};

/** Vendor bodies carry a numeric hint either at the top or inside `error`. */
function vendorRetryAfterMs(body: unknown): number | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const candidates = [body, (body as { error?: unknown }).error];
  for (const candidate of candidates) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const record = candidate as Record<string, unknown>;
    const raw = record.retry_after ?? record.retryAfter ?? record.retryAfterMs;
    // Milliseconds are passed through; bare numbers are seconds.
    const value = typeof raw === "string" ? Number(raw) : raw;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
      continue;
    const ms = record.retryAfterMs === value ? value : value * 1000;
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms);
  }
  return undefined;
}

export function noChannelAvailable(detail: string): NormalizedError {
  return {
    errorClass: "NO_CHANNEL_AVAILABLE",
    httpStatus: 503,
    retryable: false,
    detail,
  };
}

export function gatewayAuthFailed(detail: string): NormalizedError {
  return {
    errorClass: "GATEWAY_AUTH_FAILED",
    httpStatus: 401,
    retryable: false,
    detail,
  };
}

/**
 * Classifies an HTTP failure from an upstream response.
 *
 * `signalText` should carry the response body: Ark uses 400 for both malformed
 * parameters and content-policy refusals, and only the body tells them apart.
 */
export function normalizeHttpFailure(args: {
  readonly status: number;
  readonly body?: unknown;
  readonly signalText?: string;
  readonly channelId?: string;
}): NormalizedError {
  const signal = args.signalText ?? safeStringify(args.body);
  for (const rule of CLASSIFICATION_RULES) {
    if (!rule.pattern.test(signal)) continue;
    // A vendor retry-after hint is more accurate than our default, so it wins.
    const cooldownMs = vendorRetryAfterMs(args.body) ?? rule.defaultCooldownMs;
    return {
      errorClass: rule.errorClass,
      httpStatus: args.status,
      retryable: rule.retryable,
      ...(cooldownMs === undefined ? {} : { cooldownMs }),
      ...(args.channelId ? { channelId: args.channelId } : {}),
      detail: signal.slice(0, 500) || undefined,
    };
  }
  const fallback = STATUS_DEFAULTS[args.status] ?? {
    errorClass: "UPSTREAM_ERROR" as ErrorClass,
    // An unmapped 4xx describes the request; retrying another account repeats it.
    retryable: args.status >= 500 || args.status === 408 || args.status === 429,
  };
  return {
    errorClass: fallback.errorClass,
    httpStatus: args.status,
    retryable: fallback.retryable,
    ...(args.channelId ? { channelId: args.channelId } : {}),
    detail: signal.slice(0, 500) || undefined,
  };
}

export function normalizeTransportFailure(detail: string): NormalizedError {
  return {
    errorClass: "TIMEOUT",
    httpStatus: 504,
    retryable: true,
    detail: detail.slice(0, 500),
  };
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}
