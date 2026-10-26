/**
 * AccountPool Multi-Credential Load Balancing, Health Scoring & Circuit Breaker
 */

export interface AccountPoolEntry {
  readonly id?: string;
  readonly credentialRef: string;
  weight?: number;
  healthScore: number; // 0 - 100 EWMA
  consecutive429: number;
  consecutive5xx: number;
  cooldownUntil: number;
  recentLatencyEwma?: number;
  lastUsedAt?: number;
}

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  readonly failureThreshold?: number; // default: 3
  readonly cooldownMs?: number; // default: 30,000ms
  readonly now?: () => number;
}

export class CircuitBreaker {
  #state: CircuitBreakerState = "CLOSED";
  #failureCount = 0;
  #openedAt = 0;
  readonly #threshold: number;
  readonly #cooldownMs: number;
  readonly #now: () => number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.#threshold = options.failureThreshold ?? 3;
    this.#cooldownMs = options.cooldownMs ?? 30_000;
    this.#now = options.now ?? Date.now;
  }

  get state(): CircuitBreakerState {
    if (this.#state === "OPEN") {
      if (this.#now() >= this.#openedAt + this.#cooldownMs) {
        this.#state = "HALF_OPEN";
      }
    }
    return this.#state;
  }

  canExecute(): boolean {
    const s = this.state;
    return s === "CLOSED" || s === "HALF_OPEN";
  }

  recordSuccess(): void {
    this.#failureCount = 0;
    this.#state = "CLOSED";
  }

  recordFailure(status?: number): void {
    // Only 5xx or server failures trip the circuit breaker
    if (status !== undefined && status < 500) return;

    this.#failureCount += 1;
    if (this.#state === "HALF_OPEN" || this.#failureCount >= this.#threshold) {
      this.#state = "OPEN";
      this.#openedAt = this.#now();
    }
  }

  reset(): void {
    this.#state = "CLOSED";
    this.#failureCount = 0;
    this.#openedAt = 0;
  }
}

export interface AccountPoolOptions {
  readonly now?: () => number;
  readonly random?: () => number;
  readonly circuitBreaker?: CircuitBreakerOptions;
  readonly downgradeChain?: readonly string[];
}

export class AccountPool {
  readonly poolId: string;
  readonly #entries: AccountPoolEntry[] = [];
  readonly #now: () => number;
  readonly #random: () => number;
  readonly #circuitBreaker: CircuitBreaker;
  #downgradeChain: string[] = [];

  constructor(
    poolId: string,
    initialEntries: (
      string | (Partial<AccountPoolEntry> & { credentialRef: string })
    )[] = [],
    options: AccountPoolOptions = {},
  ) {
    this.poolId = poolId;
    this.#now = options.now ?? Date.now;
    this.#random = options.random ?? Math.random;
    this.#circuitBreaker = new CircuitBreaker({
      now: this.#now,
      ...options.circuitBreaker,
    });
    if (options.downgradeChain) {
      this.#downgradeChain = [...options.downgradeChain];
    }

    for (const item of initialEntries) {
      this.addCredential(item);
    }
  }

  get circuitBreaker(): CircuitBreaker {
    return this.#circuitBreaker;
  }

  get downgradeChain(): readonly string[] {
    return this.#downgradeChain;
  }

  setDowngradeChain(chain: readonly string[]): void {
    this.#downgradeChain = [...chain];
  }

  addCredential(
    entry: string | (Partial<AccountPoolEntry> & { credentialRef: string }),
  ): AccountPoolEntry {
    const credentialRef =
      typeof entry === "string" ? entry : entry.credentialRef;
    const existing = this.#entries.find(
      (e) => e.credentialRef === credentialRef,
    );
    if (existing) return existing;

    const fresh: AccountPoolEntry = {
      id: typeof entry === "object" ? entry.id : undefined,
      credentialRef,
      weight:
        typeof entry === "object" && entry.weight !== undefined
          ? entry.weight
          : 10,
      healthScore:
        typeof entry === "object" && entry.healthScore !== undefined
          ? entry.healthScore
          : 100,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      recentLatencyEwma:
        typeof entry === "object" ? entry.recentLatencyEwma : undefined,
      lastUsedAt: 0,
    };
    this.#entries.push(fresh);
    return fresh;
  }

  entries(): readonly AccountPoolEntry[] {
    return this.#entries;
  }

  /**
   * Pick next available credential with highest health score / weighted selection.
   * Filters out credentials in cooldown or in excludedRefs set.
   */
  pickNext(excludedRefs?: ReadonlySet<string>): AccountPoolEntry | undefined {
    const now = this.#now();
    const candidates = this.#entries.filter((e) => {
      if (excludedRefs?.has(e.credentialRef)) return false;
      if (e.cooldownUntil > now) return false;
      return e.healthScore > 0;
    });

    if (candidates.length === 0) {
      // If all healthy are in cooldown, check if any entry expired cooldown
      const expired = this.#entries.filter(
        (e) => !excludedRefs?.has(e.credentialRef) && e.cooldownUntil <= now,
      );
      if (expired.length === 0) return undefined;
      return expired[0];
    }

    if (candidates.length === 1) {
      candidates[0]!.lastUsedAt = now;
      return candidates[0];
    }

    // Weighted selection proportional to (healthScore * weight)
    const totalWeight = candidates.reduce(
      (sum, c) =>
        sum + Math.max(c.healthScore, 1) * Math.max(c.weight ?? 10, 1),
      0,
    );

    let cursor = this.#random() * totalWeight;
    for (const c of candidates) {
      cursor -= Math.max(c.healthScore, 1) * Math.max(c.weight ?? 10, 1);
      if (cursor <= 0) {
        c.lastUsedAt = now;
        return c;
      }
    }

    const picked = candidates[candidates.length - 1]!;
    picked.lastUsedAt = now;
    return picked;
  }

  recordSuccess(credentialRef: string, latencyMs?: number): void {
    const entry = this.#entries.find((e) => e.credentialRef === credentialRef);
    if (!entry) return;

    entry.consecutive429 = 0;
    entry.consecutive5xx = 0;
    entry.cooldownUntil = 0;

    // Update latency EWMA (alpha = 0.2)
    if (latencyMs !== undefined && latencyMs >= 0) {
      if (entry.recentLatencyEwma === undefined) {
        entry.recentLatencyEwma = latencyMs;
      } else {
        entry.recentLatencyEwma =
          0.8 * entry.recentLatencyEwma + 0.2 * latencyMs;
      }
    }

    // Calculate latency penalty: <200ms: 0, <500ms: -5, <1000ms: -10, >=1000ms: -20
    let latencyPenalty = 0;
    const lat = entry.recentLatencyEwma ?? 100;
    if (lat > 1000) latencyPenalty = 20;
    else if (lat > 500) latencyPenalty = 10;
    else if (lat > 200) latencyPenalty = 5;

    // Recover score towards (100 - latencyPenalty) with EWMA
    const targetScore = Math.max(20, 100 - latencyPenalty);
    entry.healthScore = Math.min(
      100,
      Math.round(entry.healthScore * 0.8 + targetScore * 0.2),
    );
    this.#circuitBreaker.recordSuccess();
  }

  record429(credentialRef: string, cooldownMs = 15_000): void {
    const entry = this.#entries.find((e) => e.credentialRef === credentialRef);
    if (!entry) return;

    entry.consecutive429 += 1;
    entry.cooldownUntil = this.#now() + cooldownMs;
    // Penalize score by 20 per 429
    entry.healthScore = Math.max(
      0,
      entry.healthScore - 20 * entry.consecutive429,
    );
  }

  record5xx(credentialRef: string, cooldownMs = 30_000): void {
    const entry = this.#entries.find((e) => e.credentialRef === credentialRef);
    if (entry) {
      entry.consecutive5xx += 1;
      entry.cooldownUntil = this.#now() + cooldownMs;
      // Penalize score by 25 per 5xx
      entry.healthScore = Math.max(
        0,
        entry.healthScore - 25 * entry.consecutive5xx,
      );
    }
    this.#circuitBreaker.recordFailure(500);
  }
}
