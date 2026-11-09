/**
 * KK Studio Agent Dispatcher - Agent Registry (Task 1.10).
 *
 * Implements candidate agent registration, state transitions, and filtering:
 * 1. Filter out exhausted candidates by default.
 * 2. Automatic and explicit recovery when resetAt expires (resetAt <= now).
 * 3. Sanitizes all return values, metadata, and debug logs so fake keys/credentials never leak.
 * 4. Minimal candidate pool management for downstream dispatcher (Task 1.11).
 *
 * Grounded in plan-addendum-agent-ui.md Section H & dispatch-board-20261109.
 */

import type {
  AgentRegistryOptions,
  CandidateFilter,
  DispatchCandidate,
  HealthStatus,
  QuotaSignal,
  QuotaState,
} from "./dispatchTypes.ts";
import {
  applyCooldown as applyCandidateCooldown,
  clearCooldown as clearCandidateCooldown,
  clearExhausted as clearCandidateExhausted,
  markExhausted as markCandidateExhausted,
  applyQuotaSignal,
  sanitizeSecrets,
} from "./quotaSignals.ts";

/**
 * Recursively sanitizes any unknown value (objects, arrays, strings)
 * to ensure credentials and fake keys are completely redacted.
 */
function sanitizeValue(
  value: unknown,
  knownSecrets?: readonly string[],
): unknown {
  if (typeof value === "string") {
    return sanitizeSecrets(value, knownSecrets);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, knownSecrets));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const safeKey = sanitizeSecrets(key, knownSecrets);
      result[safeKey] = sanitizeValue(val, knownSecrets);
    }
    return result;
  }
  return value;
}

/**
 * Returns a cloned, deeply sanitized candidate guaranteed free of raw secrets.
 */
export function sanitizeCandidate(
  candidate: DispatchCandidate,
  knownSecrets?: readonly string[],
): DispatchCandidate {
  const sanitizedCapabilities = candidate.capabilities.map((c) =>
    sanitizeSecrets(c, knownSecrets),
  );
  const sanitizedMetadata = candidate.metadata
    ? (sanitizeValue(candidate.metadata, knownSecrets) as Record<
        string,
        unknown
      >)
    : undefined;

  return {
    ...candidate,
    id: sanitizeSecrets(candidate.id, knownSecrets),
    runtimeRef: candidate.runtimeRef
      ? sanitizeSecrets(candidate.runtimeRef, knownSecrets)
      : undefined,
    capabilities: sanitizedCapabilities,
    quota: { ...candidate.quota },
    ...(sanitizedMetadata ? { metadata: sanitizedMetadata } : {}),
  };
}

/**
 * Pure evaluation function: checks if a single candidate is currently available.
 *
 * Availability rules:
 * - If capability is required, candidate must provide it.
 * - If quota.exhausted is true:
 *     - If resetAt is defined and resetAt <= now: treated as recovered (not skipped).
 *     - Otherwise: skipped as exhausted.
 * - If cooldownUntil is defined and cooldownUntil > now: skipped as cooling down.
 * - If health is 'down': skipped as unavailable.
 */
export function isCandidateAvailable(
  candidate: DispatchCandidate,
  options?: { now?: number; capability?: string },
): boolean {
  const now = options?.now ?? Date.now();

  if (
    options?.capability &&
    !candidate.capabilities.includes(options.capability)
  ) {
    return false;
  }

  // Quota exhaustion check with resetAt expiration recovery
  if (candidate.quota.exhausted) {
    if (
      candidate.quota.resetAt === undefined ||
      candidate.quota.resetAt > now
    ) {
      return false;
    }
  }

  // Active cooldown check
  if (
    candidate.quota.cooldownUntil !== undefined &&
    candidate.quota.cooldownUntil > now
  ) {
    return false;
  }

  // Health check
  if (candidate.health === "down") {
    return false;
  }

  return true;
}

/**
 * Pure function: filters an array of candidates against a CandidateFilter.
 * Does not mutate input candidates.
 */
export function filterCandidates(
  candidates: readonly DispatchCandidate[],
  filter?: CandidateFilter,
  knownSecrets?: readonly string[],
): DispatchCandidate[] {
  const now = filter?.now ?? Date.now();
  const results: DispatchCandidate[] = [];

  for (const rawCandidate of candidates) {
    let candidate = rawCandidate;

    // Auto-recover exhausted quota if resetAt has passed
    if (
      candidate.quota.exhausted &&
      candidate.quota.resetAt !== undefined &&
      candidate.quota.resetAt <= now
    ) {
      candidate = clearCandidateExhausted(candidate, { now });
    }

    // Filter by capability
    if (
      filter?.capability &&
      !candidate.capabilities.includes(filter.capability)
    ) {
      continue;
    }

    // Filter by roleHint
    if (filter?.roleHint && candidate.roleHint !== filter.roleHint) {
      continue;
    }

    // Filter by backend kind
    if (filter?.kind && candidate.kind !== filter.kind) {
      continue;
    }

    // Filter by costTier
    if (filter?.costTier && candidate.costTier !== filter.costTier) {
      continue;
    }

    // Filter exhausted (unless explicitly included)
    if (!filter?.includeExhausted && candidate.quota.exhausted) {
      if (
        candidate.quota.resetAt === undefined ||
        candidate.quota.resetAt > now
      ) {
        continue;
      }
    }

    // Filter cooling down (unless explicitly included)
    if (
      !filter?.includeCoolingDown &&
      candidate.quota.cooldownUntil !== undefined &&
      candidate.quota.cooldownUntil > now
    ) {
      continue;
    }

    // Filter health down (unless explicitly included)
    if (!filter?.includeDown && candidate.health === "down") {
      continue;
    }

    results.push(sanitizeCandidate(candidate, knownSecrets));
  }

  return results;
}

/**
 * AgentRegistry: in-memory candidate registry for the agent dispatcher pool.
 */
export class AgentRegistry {
  private readonly candidates = new Map<string, DispatchCandidate>();
  private readonly nowProvider: () => number;
  private readonly knownSecrets: readonly string[];

  constructor(
    initialCandidates?: Iterable<DispatchCandidate>,
    options?: AgentRegistryOptions,
  ) {
    this.nowProvider = options?.now ?? (() => Date.now());
    this.knownSecrets = options?.knownSecrets ?? [];

    if (initialCandidates) {
      for (const candidate of initialCandidates) {
        this.register(candidate);
      }
    }
  }

  /**
   * Current timestamp in epoch ms.
   */
  private getNow(overrideNow?: number): number {
    return overrideNow ?? this.nowProvider();
  }

  /**
   * Resolves the stored key for an ID, handling either raw or sanitized variations.
   */
  private findKey(id: string): string | undefined {
    if (this.candidates.has(id)) return id;
    const safeId = sanitizeSecrets(id, this.knownSecrets);
    if (this.candidates.has(safeId)) return safeId;
    for (const candId of this.candidates.keys()) {
      if (
        candId === id ||
        candId === safeId ||
        sanitizeSecrets(candId, this.knownSecrets) === safeId
      ) {
        return candId;
      }
    }
    return undefined;
  }

  /**
   * Registers a candidate in the registry. Sanitizes all strings to prevent secret leakage.
   * Overwrites any existing candidate with the same ID.
   */
  public register(candidate: DispatchCandidate): DispatchCandidate {
    const existingKey = this.findKey(candidate.id);
    if (existingKey && existingKey !== candidate.id) {
      this.candidates.delete(existingKey);
    }

    const cloned: DispatchCandidate = {
      ...candidate,
      capabilities: [...candidate.capabilities],
      quota: { ...candidate.quota },
      metadata: candidate.metadata ? { ...candidate.metadata } : undefined,
    };

    this.candidates.set(candidate.id, cloned);
    return sanitizeCandidate(cloned, this.knownSecrets);
  }

  /**
   * Registers a batch of candidates.
   */
  public registerBatch(
    candidates: Iterable<DispatchCandidate>,
  ): DispatchCandidate[] {
    const registered: DispatchCandidate[] = [];
    for (const candidate of candidates) {
      registered.push(this.register(candidate));
    }
    return registered;
  }

  /**
   * Unregisters a candidate by ID.
   */
  public unregister(id: string): boolean {
    const key = this.findKey(id);
    if (!key) return false;
    return this.candidates.delete(key);
  }

  /**
   * Retrieves a candidate by ID.
   * If the candidate was marked exhausted and resetAt has elapsed,
   * automatically clears the exhausted state and restores health.
   */
  public get(
    id: string,
    options?: { now?: number },
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    let candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const now = this.getNow(options?.now);

    // Auto-recover if resetAt has elapsed
    if (
      candidate.quota.exhausted &&
      candidate.quota.resetAt !== undefined &&
      candidate.quota.resetAt <= now
    ) {
      candidate = clearCandidateExhausted(candidate, { now });
      this.candidates.set(key, candidate);
    }

    return sanitizeCandidate(candidate, this.knownSecrets);
  }

  /**
   * Checks whether a candidate with the given ID exists.
   */
  public has(id: string): boolean {
    return this.findKey(id) !== undefined;
  }

  /**
   * Number of registered candidates.
   */
  public get size(): number {
    return this.candidates.size;
  }

  /**
   * Clears all registered candidates.
   */
  public clear(): void {
    this.candidates.clear();
  }

  /**
   * Returns all registered candidates, automatically sweeping expired resets.
   */
  public getAll(options?: { now?: number }): DispatchCandidate[] {
    const now = this.getNow(options?.now);
    this.sweepExpiredResets(now);

    const list: DispatchCandidate[] = [];
    for (const candidate of this.candidates.values()) {
      list.push(sanitizeCandidate(candidate, this.knownSecrets));
    }
    return list;
  }

  /**
   * Marks a candidate's quota as exhausted.
   * Optionally attaches a resetAt timestamp and cooldown window.
   */
  public markExhausted(
    id: string,
    options?: { resetAt?: number; cooldownMs?: number; now?: number },
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const now = this.getNow(options?.now);
    let updated = markCandidateExhausted(candidate, {
      resetAt: options?.resetAt,
      now,
    });

    if (options?.cooldownMs !== undefined && options.cooldownMs > 0) {
      updated = applyCandidateCooldown(updated, options.cooldownMs, { now });
    }

    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Manually clears the exhausted state from a candidate (e.g. after manual refill or probe).
   */
  public recoverExhausted(
    id: string,
    options?: { now?: number },
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const now = this.getNow(options?.now);
    const updated = clearCandidateExhausted(candidate, { now });
    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Sweeps all candidates in the registry and automatically recovers any whose resetAt <= now.
   * Returns the list of recovered candidates.
   */
  public sweepExpiredResets(now?: number): DispatchCandidate[] {
    const currentTime = this.getNow(now);
    const recovered: DispatchCandidate[] = [];

    for (const [key, candidate] of this.candidates.entries()) {
      if (
        candidate.quota.exhausted &&
        candidate.quota.resetAt !== undefined &&
        candidate.quota.resetAt <= currentTime
      ) {
        const updated = clearCandidateExhausted(candidate, {
          now: currentTime,
        });
        this.candidates.set(key, updated);
        recovered.push(sanitizeCandidate(updated, this.knownSecrets));
      }
    }

    return recovered;
  }

  /**
   * Applies a cooldown window to a candidate.
   */
  public applyCooldown(
    id: string,
    cooldownMs: number,
    options?: { now?: number },
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const now = this.getNow(options?.now);
    const updated = applyCandidateCooldown(candidate, cooldownMs, { now });
    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Clears active cooldown from a candidate.
   */
  public clearCooldown(id: string): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const updated = clearCandidateCooldown(candidate);
    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Updates health status of a candidate.
   */
  public updateHealth(
    id: string,
    health: HealthStatus,
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const updated: DispatchCandidate = {
      ...candidate,
      health,
    };
    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Updates quota state of a candidate with partial values.
   */
  public updateQuota(
    id: string,
    quotaPatch: Partial<QuotaState>,
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const updated: DispatchCandidate = {
      ...candidate,
      quota: {
        ...candidate.quota,
        ...quotaPatch,
      },
    };
    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Applies an upstream QuotaSignal directly to a registered candidate.
   */
  public recordSignal(
    id: string,
    signal: QuotaSignal,
    options?: { now?: number },
  ): DispatchCandidate | undefined {
    const key = this.findKey(id);
    if (!key) return undefined;

    const candidate = this.candidates.get(key);
    if (!candidate) return undefined;

    const now = this.getNow(options?.now);
    const updated = applyQuotaSignal(candidate, signal, { now });
    this.candidates.set(key, updated);
    return sanitizeCandidate(updated, this.knownSecrets);
  }

  /**
   * Retrieves available candidates matching the given criteria.
   *
   * By default:
   * - Sweeps and recovers any candidates whose resetAt has expired.
   * - Filters out exhausted candidates (whose resetAt is in the future or unset).
   * - Filters out candidates in active cooldown.
   * - Filters out candidates with health === 'down'.
   *
   * Accepts either a single capability string (e.g. 'text.plan') or a CandidateFilter.
   */
  public getAvailableCandidates(
    filterOrCapability?: string | CandidateFilter,
    options?: { now?: number },
  ): DispatchCandidate[] {
    const filter: CandidateFilter =
      typeof filterOrCapability === "string"
        ? { capability: filterOrCapability, now: options?.now }
        : {
            ...filterOrCapability,
            now: filterOrCapability?.now ?? options?.now,
          };

    const now = this.getNow(filter.now);

    // Auto-recover any candidates whose resetAt has passed
    this.sweepExpiredResets(now);

    return filterCandidates(
      Array.from(this.candidates.values()),
      { ...filter, now },
      this.knownSecrets,
    );
  }

  /**
   * Produces a formatted debug dump of all registered candidates,
   * guaranteed to be scrubbed of any fake keys or secrets.
   */
  public dumpSafeDebug(): string {
    const safeList = Array.from(this.candidates.values()).map((c) =>
      sanitizeCandidate(c, this.knownSecrets),
    );
    const serialized = JSON.stringify(safeList, null, 2);
    return sanitizeSecrets(serialized, this.knownSecrets);
  }
}

/**
 * Factory helper: creates an AgentRegistry instance.
 */
export function createAgentRegistry(
  initialCandidates?: Iterable<DispatchCandidate>,
  options?: AgentRegistryOptions,
): AgentRegistry {
  return new AgentRegistry(initialCandidates, options);
}

export default AgentRegistry;
