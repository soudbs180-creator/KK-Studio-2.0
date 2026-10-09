/**
 * OpenAI-compatible `/v1/chat/completions` surface.
 *
 * This module owns request validation, role-to-prompt flattening and the
 * OpenAI error envelope. It performs no IO of its own: the scheduler and the
 * channel adapters do that, so the endpoint stays testable with in-memory
 * adapters and the credential path is exercised exactly once, in the adapter.
 */
import { z } from "zod";
import type { GenerationInput } from "./channels/adapter.ts";
import type { ErrorClass, NormalizedError } from "./errors.ts";
import { noChannelAvailable } from "./errors.ts";
import type { Scheduler } from "./scheduler.ts";
import { extractNormalized } from "./scheduler.ts";

const attachmentSchema = z
  .object({
    id: z.string().min(1).max(120),
    name: z.string().min(1).max(200),
    mime: z.string().min(1).max(120),
    dataUrl: z.string().max(2_000_000).optional(),
  })
  .strict();

/**
 * `.strict()` on purpose: an unknown field usually means the caller believes it
 * set a parameter the gateway silently ignores. Rejecting loudly is safer than
 * generating something other than what was asked for.
 */
export const chatRequestSchema = z
  .object({
    model: z.string().min(1).max(160),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string().max(200_000),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    stream: z.boolean().optional(),
    max_tokens: z.number().int().positive().max(1_000_000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    session_id: z.string().min(1).max(160).optional(),
    attachments: z.array(attachmentSchema).max(20).optional(),
  })
  .strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface ChatDeps {
  readonly scheduler: Scheduler;
  readonly resolveSecret: (
    credentialRef?: string,
  ) => Promise<string | undefined>;
  readonly defaultModel?: string;
}

const ERROR_TYPE_BY_CLASS: Readonly<Record<ErrorClass, string>> = {
  AUTH_INVALID: "authentication_error",
  AUTH_FORBIDDEN: "permission_error",
  QUOTA_EXHAUSTED: "insufficient_quota",
  RATE_LIMITED: "rate_limit_error",
  ENDPOINT_STALE: "not_found_error",
  BAD_REQUEST: "invalid_request_error",
  CONTENT_BLOCKED: "content_policy_error",
  UPSTREAM_ERROR: "api_error",
  TIMEOUT: "timeout_error",
  GATEWAY_AUTH_FAILED: "authentication_error",
  NO_CHANNEL_AVAILABLE: "api_error",
};

/** OpenAI-compatible error envelope, extended with `kk_meta` for diagnostics. */
export function toOpenAiError(normalized: NormalizedError): {
  readonly status: number;
  readonly body: {
    error: { message: string; type: string; code: string; param: null };
    kk_meta: { errorClass: ErrorClass; retryable: boolean; channelId?: string };
  };
} {
  const message =
    normalized.detail ?? `Request failed with class ${normalized.errorClass}`;
  return {
    status: normalized.httpStatus,
    body: {
      error: {
        message: message.slice(0, 500),
        type: ERROR_TYPE_BY_CLASS[normalized.errorClass],
        code: normalized.errorClass,
        param: null,
      },
      kk_meta: {
        errorClass: normalized.errorClass,
        retryable: normalized.retryable,
        ...(normalized.channelId ? { channelId: normalized.channelId } : {}),
      },
    },
  };
}

/**
 * Flattens a conversation into one prompt string.
 *
 * Role semantics are concentrated here so every adapter takes a single prompt
 * and vendors that need real role structure can be given the raw array later
 * without touching the scheduler.
 */
export function buildPrompt(
  messages: ReadonlyArray<{
    role: "system" | "user" | "assistant";
    content: string;
  }>,
): string {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) =>
      message.role === "user"
        ? `[User]\n${message.content}`
        : `[Assistant]\n${message.content}`,
    )
    .join("\n\n");
  return system ? `${system}\n\n${turns}` : turns;
}

export function buildInput(request: ChatRequest): GenerationInput {
  // Build `extra` first, then spread conditionally: assigning it twice would let
  // the second branch drop `temperature`.
  const extra: Record<string, string | number | boolean> = {};
  if (request.temperature !== undefined)
    extra.temperature = request.temperature;
  if (request.max_tokens !== undefined) extra.maxTokens = request.max_tokens;
  return {
    model: request.model,
    prompt: buildPrompt(request.messages),
    attachments: request.attachments ?? [],
    ...(Object.keys(extra).length ? { extra } : {}),
  };
}

/**
 * Rejects credentials in the payload before Zod runs, so a client cannot smuggle
 * a key into a prompt that would then be logged and billed as content.
 */
export function parseChatRequest(value: unknown): ChatRequest {
  if (typeof value !== "object" || value === null)
    throw Object.assign(new Error("Request body must be a JSON object"), {
      normalized: {
        errorClass: "BAD_REQUEST",
        httpStatus: 400,
        retryable: false,
        detail: "body must be an object",
      } satisfies NormalizedError,
    });
  rejectSecretsDeep(value);
  const parsed = chatRequestSchema.safeParse(value);
  if (!parsed.success)
    throw Object.assign(
      new Error(parsed.error.issues[0]?.message ?? "invalid request"),
      {
        normalized: {
          errorClass: "BAD_REQUEST",
          httpStatus: 400,
          retryable: false,
          detail: parsed.error.issues[0]?.message,
        } satisfies NormalizedError,
      },
    );
  return parsed.data;
}

const SECRET_PATTERN =
  /(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|https?:\/\/[^\s/@]+:[^\s/@]+@|[?&](?:key|api_key|access_token|token|secret)=)/i;

function rejectSecretsDeep(value: unknown, depth = 0): void {
  if (depth > 16) return;
  if (Array.isArray(value)) {
    for (const entry of value) rejectSecretsDeep(entry, depth + 1);
    return;
  }
  if (typeof value === "string") {
    if (SECRET_PATTERN.test(value))
      throw Object.assign(
        new Error("Request payload appears to contain a credential"),
        {
          normalized: {
            errorClass: "BAD_REQUEST",
            httpStatus: 400,
            retryable: false,
            detail: "payload contains credential-shaped text",
          } satisfies NormalizedError,
        },
      );
    return;
  }
  if (typeof value === "object" && value !== null)
    for (const entry of Object.values(value))
      rejectSecretsDeep(entry, depth + 1);
}

export function newCompletionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `chatcmpl-${hex}`;
}

/**
 * Streaming is not implemented yet. Returning 501 keeps a client that already
 * sends `stream: true` on a clear, actionable error instead of a truncated
 * non-streaming body it would try to parse as SSE.
 */
export function runChatCompletion(
  deps: ChatDeps,
  request: ChatRequest,
  idempotencyKey: string,
): Promise<{ readonly channelId: string; readonly text: string }> {
  if (request.stream)
    return Promise.reject(
      Object.assign(
        new Error("Streaming is not implemented for this gateway yet"),
        {
          normalized: {
            errorClass: "BAD_REQUEST",
            httpStatus: 501,
            retryable: false,
            detail: "stream=true is not supported yet; retry with stream=false",
          } satisfies NormalizedError,
        },
      ),
    );

  return (async () => {
    const outcome = await deps.scheduler.dispatch({
      model: request.model,
      operation: "generate",
      input: buildInput(request),
      idempotencyKey,
      ...(request.session_id ? { sessionId: request.session_id } : {}),
      resolveSecret: deps.resolveSecret,
    });
    // An adapter returning `submitted` means the platform works asynchronously;
    // that belongs to /v1/jobs, not to a synchronous chat completion.
    if (outcome.kind === "submitted")
      throw Object.assign(
        new Error("Channel produced an async job for a synchronous endpoint"),
        {
          normalized: {
            errorClass: "BAD_REQUEST",
            httpStatus: 409,
            retryable: false,
            detail: "use /v1/jobs for async channels",
            channelId: outcome.channelId,
          } satisfies NormalizedError,
        },
      );
    const bytes = Buffer.from(outcome.assetBase64, "base64");
    return { channelId: outcome.channelId, text: bytes.toString("utf8") };
  })();
}

export { extractNormalized, noChannelAvailable };
