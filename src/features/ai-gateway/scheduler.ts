/**
 * Channel scheduler: turns one logical request into an attempt sequence.
 *
 * Three rules drive every decision here.
 *
 * 1. A retry must target a *different* account. Retrying the same failing
 *    account wastes the user's money and delays the request.
 * 2. A non-retryable error aborts the whole dispatch. It describes the request,
 *    not the account, so another account would reject it identically while
 *    piling up risk signals on the platform.
 * 3. Once the first stream chunk reached the client, nothing may be retried:
 *    the client already has output, and a second attempt would duplicate it.
 */
import type {
  ChannelContext,
  ChannelRequestContext,
  GenerationInput,
  PollState,
  SubmitResult,
} from "./channels/adapter.ts";
import { ChannelNotApplicable } from "./channels/adapter.ts";
import type {
  ChannelIndexEntry,
  ChannelRegistry,
  PublicModelDescriptor,
} from "./channels/registry.ts";
import type { NormalizedError } from "./errors.ts";
import { noChannelAvailable } from "./errors.ts";

export interface DispatchRequest {
  readonly model: string;
  readonly operation: string;
  readonly input: GenerationInput;
  readonly idempotencyKey: string;
  /** Sticky conversations keep talking to the same account for context quality. */
  readonly sessionId?: string;
  readonly resolveSecret: (
    credentialRef?: string,
  ) => Promise<string | undefined>;
  readonly signal?: AbortSignal;
  /** Set by the caller once the first chunk reached the client. */
  readonly streamStarted?: () => boolean;
}

/**
 * `SubmitResult` is a union, so this must be a type alias: an interface would
 * flatten it and both the `kind` discriminant and `assetBase64` would vanish.
 */
export type DispatchOutcome = SubmitResult & { readonly channelId: string };

export interface SchedulerOptions {
  readonly random?: () => number;
  readonly now?: () => number;
  /** Consecutive failures before an account is quarantined outright. */
  readonly quarantineThreshold?: number;
  readonly maxCooldownMs?: number;
}

interface ChannelHealth {
  consecutiveFailures: number;
  cooldownUntil: number;
  quarantined: boolean;
}

const DEFAULT_QUARANTINE_THRESHOLD = 5;
const DEFAULT_MAX_COOLDOWN_MS = 30 * 60 * 1000;

/**
 * Per-account failure state. Vendor-supplied cooldown hints win over our own
 * exponential backoff: when Ark says "retry in 6 hours" because the balance is
 * empty, a locally computed 30 seconds would keep hammering a dead account.
 */
export class ChannelHealthTracker {
  readonly #health = new Map<string, ChannelHealth>();
  readonly #now: () => number;
  readonly #threshold: number;
  readonly #maxCooldownMs: number;

  constructor(options: SchedulerOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#threshold =
      options.quarantineThreshold ?? DEFAULT_QUARANTINE_THRESHOLD;
    this.#maxCooldownMs = options.maxCooldownMs ?? DEFAULT_MAX_COOLDOWN_MS;
  }

  state(channelId: string): ChannelHealth {
    const existing = this.#health.get(channelId);
    if (existing) return existing;
    const fresh: ChannelHealth = {
      consecutiveFailures: 0,
      cooldownUntil: 0,
      quarantined: false,
    };
    this.#health.set(channelId, fresh);
    return fresh;
  }

  isAvailable(channelId: string): boolean {
    const state = this.#health.get(channelId);
    if (!state) return true;
    if (state.quarantined) return false;
    return state.cooldownUntil <= this.#now();
  }

  recordSuccess(channelId: string): void {
    const state = this.state(channelId);
    state.consecutiveFailures = 0;
    state.cooldownUntil = 0;
  }

  recordFailure(channelId: string, error: NormalizedError): void {
    const state = this.state(channelId);
    state.consecutiveFailures += 1;
    const backoff = Math.min(
      2 ** state.consecutiveFailures * 1000,
      this.#maxCooldownMs,
    );
    // A vendor hint is authoritative and is NOT capped: when a vendor says the
    // balance is empty for six hours, clamping to our own 30 minute ceiling would
    // resume hammering an account that cannot possibly succeed.
    const cooldown = error.cooldownMs ?? backoff;
    state.cooldownUntil = this.#now() + cooldown;
    if (state.consecutiveFailures >= this.#threshold) state.quarantined = true;
  }

  /** Clears quarantine after an operator or a successful probe re-enables it. */
  reset(channelId: string): void {
    this.#health.delete(channelId);
  }

  snapshot(): ReadonlyMap<string, ChannelHealth> {
    return new Map(this.#health);
  }
}

/** Wraps a normalized error in a real Error so stacks survive the throw. */
export function channelError(
  normalized: NormalizedError,
  message?: string,
): Error {
  return Object.assign(
    new Error(message ?? normalized.detail ?? normalized.errorClass),
    {
      normalized,
    },
  );
}

/** Recovers the classification from a throwable that crossed an adapter boundary. */
export function extractNormalized(error: unknown): NormalizedError {
  if (typeof error === "object" && error !== null) {
    const candidate = (error as { normalized?: unknown }).normalized;
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      typeof (candidate as { errorClass?: unknown }).errorClass === "string" &&
      typeof (candidate as { retryable?: unknown }).retryable === "boolean"
    ) {
      return candidate as NormalizedError;
    }
  }
  return {
    errorClass: "UPSTREAM_ERROR",
    httpStatus: 502,
    retryable: false,
    detail:
      error instanceof Error ? error.message.slice(0, 200) : "unknown failure",
  };
}

export class Scheduler {
  readonly #registry: ChannelRegistry;
  readonly #health: ChannelHealthTracker;
  readonly #random: () => number;
  readonly #sticky = new Map<string, string>();

  constructor(registry: ChannelRegistry, options: SchedulerOptions = {}) {
    this.#registry = registry;
    this.#health = new ChannelHealthTracker(options);
    this.#random = options.random ?? Math.random;
  }

  health(): ChannelHealthTracker {
    return this.#health;
  }

  publicModels(): PublicModelDescriptor[] {
    return this.#registry.publicModels();
  }

  /**
   * Ordered attempt plan for one request. Each generation steps down one
   * priority tier, so repeated failures degrade service quality instead of
   * hammering the same failing account. Within a tier, selection is weighted.
   */
  plan(
    model: string,
    operation: string,
    generation: number,
  ): ChannelIndexEntry[] {
    const tiers = this.#registry.tiers(
      this.#registry.candidates(model, operation),
    );
    if (!tiers.length) return [];
    // The last tier is reused once exhausted: a single-account setup must still
    // be able to retry its own account rather than fail with no attempt at all.
    const index = Math.min(generation, tiers.length - 1);
    return [this.#weightedPick(tiers[index]!)];
  }

  async dispatch(request: DispatchRequest): Promise<DispatchOutcome> {
    const candidates = this.#registry.candidates(
      request.model,
      request.operation,
    );
    const pinnedId = request.sessionId
      ? this.#sticky.get(request.sessionId)
      : undefined;
    const pinned = pinnedId
      ? candidates.find((entry) => entry.channelId === pinnedId)
      : undefined;

    const ordered: ChannelIndexEntry[] = [];
    if (pinned && this.#health.isAvailable(pinned.channelId))
      ordered.push(pinned);
    // Attempt 0 targets the top tier. When a pin is active it already is that
    // account, so the second slot starts at the next tier to avoid a duplicate.
    const generationOffset = ordered.length;
    const tiers = this.#registry.tiers(candidates);
    const limit = Math.max(tiers.length, 1);
    for (let index = 0; index < limit; index += 1) {
      const generation = index + generationOffset;
      const attempt = this.plan(
        request.model,
        request.operation,
        generation,
      )[0];
      if (!attempt) break;
      if (ordered.some((entry) => entry.channelId === attempt.channelId))
        continue;
      ordered.push(attempt);
    }

    let lastError: Error | undefined;
    for (let generation = 0; generation < ordered.length; generation += 1) {
      const entry = ordered[generation]!;
      if (!this.#health.isAvailable(entry.channelId)) continue;
      const context = this.#registry.contextFor(entry.channelId);
      if (!context) continue;
      try {
        const result = await this.#attempt(entry, context, request);
        this.#health.recordSuccess(entry.channelId);
        if (request.sessionId)
          this.#sticky.set(request.sessionId, entry.channelId);
        return { ...result, channelId: entry.channelId };
      } catch (error) {
        if (error instanceof ChannelNotApplicable) continue;
        lastError =
          error instanceof Error
            ? error
            : channelError(extractNormalized(error));
        const normalized = extractNormalized(error);
        this.#health.recordFailure(entry.channelId, normalized);
        // A pin that fails must be released even when the request then fails,
        // otherwise every later turn of that session re-picks the same account.
        this.#forgetPin(request.sessionId, entry.channelId);
        // The request itself is unacceptable: another account rejects it too.
        if (!normalized.retryable) throw lastError;
        // Output already reached the client; a retry would duplicate it.
        if (this.#streamStarted(request)) throw lastError;
      }
    }
    throw (
      lastError ??
      channelError(noChannelAvailable(`No channel serves ${request.model}`))
    );
  }

  /**
   * Polls a job on the channel that owns it. Polling targets a known channel, so
   * it bypasses model filtering entirely; an unknown channel is a routing bug
   * rather than a transient 503.
   */
  async poll(
    channelId: string,
    providerJobId: string,
    request: Omit<DispatchRequest, "model" | "operation" | "input">,
  ): Promise<PollState> {
    const context = this.#registry.contextFor(channelId);
    if (!context)
      throw channelError(noChannelAvailable(`Unknown channel ${channelId}`));
    const adapter = this.#registry.adapterForContext(channelId);
    if (!adapter)
      throw channelError(
        noChannelAvailable(`No adapter for channel ${channelId}`),
      );
    const requestContext: ChannelRequestContext = {
      idempotencyKey: request.idempotencyKey,
      ...(request.signal ? { signal: request.signal } : {}),
      // Polling must resolve the secret through the channel's credential ref,
      // exactly like submit does. Passing the channel id here would look up a
      // key that does not exist in the vault and fail every poll with AUTH_INVALID.
      resolveSecret: () =>
        request.resolveSecret(this.#registry.credentialRefFor(channelId)),
    };
    try {
      return await adapter.poll(context, providerJobId, requestContext);
    } catch (error) {
      this.#health.recordFailure(channelId, extractNormalized(error));
      throw error;
    }
  }

  async #attempt(
    entry: ChannelIndexEntry,
    context: ChannelContext,
    request: DispatchRequest,
  ): Promise<SubmitResult> {
    const requestContext: ChannelRequestContext = {
      idempotencyKey: `${request.idempotencyKey}:${context.channelId}`,
      ...(request.signal ? { signal: request.signal } : {}),
      resolveSecret: () => request.resolveSecret(entry.credentialRef),
    };
    return entry.adapter.submit(context, request.input, requestContext);
  }

  #weightedPick(entries: readonly ChannelIndexEntry[]): ChannelIndexEntry {
    if (entries.length === 1) return entries[0]!;
    // Smooth weighted round-robin: total weight is offset by a constant so a
    // single-entry tier still receives traffic proportional to its weight.
    const total = entries.reduce(
      (sum, entry) => sum + Math.max(entry.weight, 0) + 10,
      0,
    );
    let cursor = this.#random() * total;
    for (const entry of entries) {
      cursor -= Math.max(entry.weight, 0) + 10;
      if (cursor <= 0) return entry;
    }
    return entries[entries.length - 1]!;
  }

  #forgetPin(sessionId: string | undefined, channelId: string): void {
    if (!sessionId) return;
    if (this.#sticky.get(sessionId) === channelId)
      this.#sticky.delete(sessionId);
  }

  #streamStarted(request: DispatchRequest): boolean {
    return request.streamStarted?.() ?? false;
  }
}
