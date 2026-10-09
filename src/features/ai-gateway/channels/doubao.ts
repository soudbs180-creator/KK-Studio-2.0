/**
 * Doubao / Volcengine Ark adapter.
 *
 * Ark is OpenAI-compatible on the wire but not in configuration: the `model`
 * field must carry an inference endpoint id (`ep-...`), not a model name. A
 * bare model name yields 404, and a 404 classified as a stale endpoint would
 * rotate healthy accounts looking for a configuration problem.
 */
import type {
  ChannelAdapter,
  ChannelContext,
  ChannelRequestContext,
  GenerationInput,
  PollState,
  ProbeResult,
  SubmitResult,
} from "./adapter.ts";
import { alreadyNormalized, normalizeUnknownFailure } from "./adapter.ts";
import type { NormalizedError } from "../errors.ts";
import { normalizeHttpFailure } from "../errors.ts";

export const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

/**
 * Endpoint ids look like `ep-20260101abcdef`. Model names such as
 * `doubao-pro-32k` are deliberately rejected: passing one produces a 404 that
 * looks like a stale endpoint rather than a configuration error.
 */
const ENDPOINT_PATTERN = /^ep-[A-Za-z0-9-]{4,120}$/;

export class ArkConfigurationError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "ArkConfigurationError";
  }
}

export function isArkEndpointId(value: string): boolean {
  return ENDPOINT_PATTERN.test(value.trim());
}

/** Ark wraps errors as `{ error: { message, code, ... } }`; 400 covers two causes. */
function readErrorEnvelope(body: unknown): string {
  if (typeof body !== "object" || body === null)
    return typeof body === "string" ? body : "";
  const envelope = (body as { error?: unknown }).error;
  if (typeof envelope === "string") return envelope;
  if (typeof envelope === "object" && envelope !== null) {
    const message = (envelope as { message?: unknown }).message;
    const code = (envelope as { code?: unknown }).code;
    return [message, code].filter((part) => typeof part === "string").join(" ");
  }
  return JSON.stringify(body);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function authHeaders(
  secret: string | undefined,
  idempotencyKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    // Ark honours this to deduplicate retries of the same logical job.
    "x-idempotency-key": idempotencyKey,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return headers;
}

async function requireSecret(request: ChannelRequestContext): Promise<string> {
  const secret = await request.resolveSecret();
  // Missing credentials are a configuration fault, not a transport failure, so
  // this must surface as AUTH_INVALID rather than a generic timeout.
  if (!secret)
    throw Object.assign(new Error("Channel credential is missing or empty"), {
      normalized: {
        errorClass: "AUTH_INVALID",
        httpStatus: 401,
        retryable: false,
        detail: "credential unavailable",
      } satisfies NormalizedError,
    });
  return secret;
}

function mapExtra(input: GenerationInput): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  if (input.seed !== undefined) extra.seed = input.seed;
  if (input.steps !== undefined) extra.steps = input.steps;
  if (input.guidance !== undefined) extra.guidance = input.guidance;
  if (input.width !== undefined) extra.width = input.width;
  if (input.height !== undefined) extra.height = input.height;
  if (input.negativePrompt) extra.negative_prompt = input.negativePrompt;
  // Caller-supplied extras win: the chat endpoint owns temperature/max_tokens.
  return { ...extra, ...(input.extra ?? {}) };
}

export const doubaoAdapter: ChannelAdapter = {
  provider: "doubao",
  kind: "official_api",
  asyncTasking: false,

  resolveModel(context: ChannelContext, model: string): string {
    const mapped = context.modelMapping[model];
    if (!mapped)
      throw new ArkConfigurationError(
        `No Ark endpoint mapped for kk model "${model}"; configure modelMapping first`,
      );
    if (!isArkEndpointId(mapped))
      throw new ArkConfigurationError(
        `Mapped value "${mapped}" is not an Ark endpoint id (expected ep-...)`,
      );
    return mapped;
  },

  async submit(
    context: ChannelContext,
    input: GenerationInput,
    request: ChannelRequestContext,
  ): Promise<SubmitResult> {
    const secret = await requireSecret(request);
    const endpointId = this.resolveModel(context, input.model);
    const response = await fetch(`${context.baseUrl}/images/generations`, {
      method: "POST",
      headers: authHeaders(secret, request.idempotencyKey),
      body: JSON.stringify({
        model: endpointId,
        prompt: input.prompt,
        response_format: "b64_json",
        ...mapExtra(input),
      }),
      ...(request.signal ? { signal: request.signal } : {}),
    });
    if (!response.ok) {
      const body = await readJson(response);
      throw Object.assign(new Error(`Ark submit failed: ${response.status}`), {
        normalized: normalizeHttpFailure({
          status: response.status,
          body,
          signalText: readErrorEnvelope(body),
          channelId: context.channelId,
        }),
      });
    }
    const body = (await readJson(response)) as
      { data?: Array<{ b64_json?: string }> } | undefined;
    const encoded = body?.data?.[0]?.b64_json;
    if (!encoded)
      throw Object.assign(new Error("Ark response contained no image data"), {
        normalized: {
          errorClass: "UPSTREAM_ERROR",
          httpStatus: 502,
          retryable: true,
          channelId: context.channelId,
          detail: "missing b64_json",
        } satisfies NormalizedError,
      });
    return { kind: "inline", assetBase64: encoded, mime: "image/png" };
  },

  /**
   * Ark image generation is synchronous. Polling is required by the contract but
   * a provider job id can never appear here, so this reports a non-retryable
   * configuration fault instead of polling forever.
   */
  async poll(
    context: ChannelContext,
    providerJobId: string,
    request: ChannelRequestContext,
  ): Promise<PollState> {
    await requireSecret(request);
    void providerJobId;
    throw Object.assign(
      new Error("Ark image generation does not produce async jobs"),
      {
        normalized: {
          errorClass: "BAD_REQUEST",
          httpStatus: 400,
          retryable: false,
          channelId: context.channelId,
          detail: "unexpected async job for a synchronous channel",
        } satisfies NormalizedError,
      },
    );
  },

  async probe(
    context: ChannelContext,
    request: ChannelRequestContext,
  ): Promise<ProbeResult> {
    const startedAt = Date.now();
    try {
      const secret = await requireSecret(request);
      const response = await fetch(`${context.baseUrl}/chat/completions`, {
        method: "POST",
        headers: authHeaders(secret, `probe-${context.channelId}`),
        body: JSON.stringify({
          model: Object.values(context.modelMapping)[0] ?? "probe",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        // Probes run on a timer; a long wait would stack up behind the scheduler.
        signal: AbortSignal.timeout(Math.min(context.timeoutMs, 15_000)),
      });
      const latencyMs = Date.now() - startedAt;
      if (response.ok) return { ok: true, latencyMs };
      const body = await readJson(response);
      return {
        ok: false,
        latencyMs,
        normalized: normalizeHttpFailure({
          status: response.status,
          body,
          signalText: readErrorEnvelope(body),
          channelId: context.channelId,
        }),
      };
    } catch (error) {
      // Keep an existing classification: flattening this catch would turn a
      // missing credential into a TIMEOUT and stop the account from being
      // quarantined.
      const preserved = alreadyNormalized(error);
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        normalized: preserved ?? normalizeUnknownFailure(error),
      };
    }
  },

  normalizeError(raw: unknown): NormalizedError {
    return alreadyNormalized(raw) ?? normalizeUnknownFailure(raw);
  },
};
