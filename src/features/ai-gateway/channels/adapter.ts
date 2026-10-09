/**
 * Channel abstraction for pluggable upstream platforms.
 *
 * One adapter implementation serves N configured channels, so adding a platform
 * is a config change rather than a code change. Every adapter must implement all
 * four methods: an adapter that cannot probe reliably cannot be auto-disabled,
 * and one that guesses about retries will cause a retry storm.
 */
import type { CapabilityManifest } from "../../../domain/providerConnections.ts";
import type { NormalizedError } from "../errors.ts";
import { normalizeTransportFailure } from "../errors.ts";

export type ChannelKind = "official_api" | "openai_compatible" | "local";

export interface AttachmentInput {
  readonly id: string;
  readonly name: string;
  readonly mime: string;
  readonly dataUrl?: string;
}

export interface GenerationInput {
  /** kk-level model name. Adapters map it to a vendor model id or endpoint id. */
  readonly model: string;
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly attachments: readonly AttachmentInput[];
  readonly seed?: number;
  readonly steps?: number;
  readonly guidance?: number;
  readonly width?: number;
  readonly height?: number;
  readonly extra?: Record<string, string | number | boolean>;
}

export interface ChannelRequestContext {
  /** Stable key forwarded upstream so retries cannot double-create work. */
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
  /** Never log this. It resolves the secret for the upstream Authorization header. */
  readonly resolveSecret: () => Promise<string | undefined>;
}

/** Synchronous adapters may return the asset without entering the polling loop. */
export interface InlineResult {
  readonly kind: "inline";
  readonly assetBase64: string;
  readonly mime: string;
}

export interface SubmittedJob {
  readonly kind: "submitted";
  readonly providerJobId: string;
  /** Seconds the scheduler should wait before the first poll. */
  readonly pollAfterMs?: number;
}

export type SubmitResult = InlineResult | SubmittedJob;

export interface PollState {
  readonly status: "pending" | "running" | "succeeded" | "failed";
  readonly progress?: number;
  readonly assetBase64?: string;
  readonly mime?: string;
  readonly normalized?: NormalizedError;
}

export interface ProbeResult {
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly normalized?: NormalizedError;
}

export interface ChannelContext {
  readonly channelId: string;
  readonly baseUrl: string;
  readonly capabilities: CapabilityManifest;
  readonly modelMapping: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface ChannelAdapter {
  /** Vendor discriminator, e.g. `doubao`. Registry keys on this. */
  readonly provider: string;
  readonly kind: ChannelKind;
  /**
   * Resolves a kk model name to the vendor identifier. Throwing is allowed when
   * the mapping is missing, so unmapped models fail loudly instead of silently
   * hitting the wrong vendor endpoint.
   */
  resolveModel(context: ChannelContext, model: string): string;
  submit(
    context: ChannelContext,
    input: GenerationInput,
    request: ChannelRequestContext,
  ): Promise<SubmitResult>;
  /** Only called for adapters returning `submitted`. */
  poll(
    context: ChannelContext,
    providerJobId: string,
    request: ChannelRequestContext,
  ): Promise<PollState>;
  /** Must stay cheap: `maxTokens=1`, no artifacts, no side effects. */
  probe(context: ChannelContext, request: ChannelRequestContext): Promise<ProbeResult>;
  /** Must always return `retryable`; the scheduler branches on it. */
  normalizeError(raw: unknown): NormalizedError;
  /** Virtual policy endpoint; omit when the platform has none. */
  readonly asyncTasking?: boolean;
}

export class ChannelNotApplicable extends Error {
  constructor(operation: string) {
    super(`Operation not applicable: ${operation}`);
    this.name = "ChannelNotApplicable";
  }
}

/**
 * Maps an unknown throwable into the shared taxonomy. Adapters should call this
 * for any failure they did not classify themselves, so the scheduler still sees
 * a usable errorClass instead of an opaque exception.
 */
export function normalizeUnknownFailure(error: unknown): NormalizedError {
  if (error instanceof Error) {
    if (error.name === "AbortError") return normalizeTransportFailure("aborted");
    return normalizeTransportFailure(error.message.slice(0, 200));
  }
  return normalizeTransportFailure("unknown failure");
}

/**
 * Preserves a classification that already exists on a throwable.
 *
 * Probe and submit wrap a whole operation in one try/catch, so a flattened
 * catch would overwrite e.g. an AUTH_INVALID raised while resolving the secret
 * with a generic TIMEOUT and hide the real cause from the health tracker.
 */
export function alreadyNormalized(error: unknown): NormalizedError | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = (error as { normalized?: unknown }).normalized;
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as { errorClass?: unknown }).errorClass === "string" &&
    typeof (candidate as { retryable?: unknown }).retryable === "boolean"
  ) {
    return candidate as NormalizedError;
  }
  return undefined;
}
