/**
 * Pure Domain Gateway Dual-Stickiness TTL & Watermark Trimming Contracts.
 *
 * Adheres strictly to Clean Architecture (Hexagonal Core):
 * Zero framework, zero DOM, zero platform/Tauri dependencies.
 */

export const CACHE_STICKY_TTL = 10 * 60 * 1000; // 10 minutes sliding renewal (prompt cache affinity)
export const FALLBACK_STICKY_TTL = 10 * 60 * 1000; // 10 minutes fixed ceiling (failover pinning)
export const SESSION_STICKY_TTL = 24 * 60 * 60 * 1000; // 24 hours (session affinity)
export const DEFAULT_STICKY_LIMIT = 2048; // Max table capacity
export const DEFAULT_STICKY_TRIM_TARGET = 1536; // Target capacity after trimming (75%)

export type StickinessMode = "cache" | "session" | "off";

export interface CandidateRef {
  readonly channelId: string;
  readonly upstreamModel: string;
}

export interface StickyBinding {
  readonly channelId: string;
  readonly upstreamModel: string;
  readonly recordedAt: number;
  readonly ttlMs: number;
  readonly isFallback: boolean;
  readonly initialFallbackAt?: number;
}

export interface DualStickinessOptions {
  readonly cacheStickyTtlMs?: number;
  readonly fallbackStickyTtlMs?: number;
  readonly sessionStickyTtlMs?: number;
  readonly maxCapacity?: number;
  readonly trimTarget?: number;
  readonly now?: () => number;
}

export interface DualStickinessManager {
  recall(sessionId: string): CandidateRef | undefined;
  record(
    sessionId: string,
    candidate: CandidateRef,
    options?: {
      mode?: StickinessMode;
      isFallback?: boolean;
    },
  ): void;
  forget(sessionId: string): void;
  clear(): void;
  stats(): { size: number; capacity: number; expiredCount: number };

  // Convenience methods
  setCacheAffinity?(sessionId: string, accountId: string, ttl?: number): void;
  setFallbackAffinity?(
    sessionId: string,
    accountId: string,
    ttl?: number,
  ): void;
  resolveAccount?(sessionId: string): {
    accountId: string | null;
    stickinessType: "cache" | "fallback" | null;
  };
}

export class StandardDualStickinessManager implements DualStickinessManager {
  readonly #cacheTable = new Map<string, StickyBinding>();
  readonly #fallbackTable = new Map<string, StickyBinding>();
  readonly #now: () => number;
  readonly #cacheTtl: number;
  readonly #fallbackTtl: number;
  readonly #sessionTtl: number;
  readonly #capacity: number;
  readonly #trimTarget: number;

  constructor(options: DualStickinessOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#cacheTtl = options.cacheStickyTtlMs ?? CACHE_STICKY_TTL;
    this.#fallbackTtl = options.fallbackStickyTtlMs ?? FALLBACK_STICKY_TTL;
    this.#sessionTtl = options.sessionStickyTtlMs ?? SESSION_STICKY_TTL;
    this.#capacity = options.maxCapacity ?? DEFAULT_STICKY_LIMIT;
    this.#trimTarget = options.trimTarget ?? DEFAULT_STICKY_TRIM_TARGET;
  }

  recall(sessionId: string): CandidateRef | undefined {
    if (!sessionId) return undefined;
    const currentTime = this.#now();

    // 1. Fallback affinity takes precedence while active
    const fallback = this.#fallbackTable.get(sessionId);
    if (fallback) {
      if (currentTime - fallback.recordedAt < fallback.ttlMs) {
        return {
          channelId: fallback.channelId,
          upstreamModel: fallback.upstreamModel,
        };
      }
      this.#fallbackTable.delete(sessionId);
    }

    // 2. Cache affinity
    const cache = this.#cacheTable.get(sessionId);
    if (cache) {
      if (currentTime - cache.recordedAt < cache.ttlMs) {
        return {
          channelId: cache.channelId,
          upstreamModel: cache.upstreamModel,
        };
      }
      this.#cacheTable.delete(sessionId);
    }

    return undefined;
  }

  record(
    sessionId: string,
    candidate: CandidateRef,
    options: {
      mode?: StickinessMode;
      isFallback?: boolean;
    } = {},
  ): void {
    if (!sessionId) return;
    const mode = options.mode ?? "cache";
    if (mode === "off") {
      this.forget(sessionId);
      return;
    }

    const currentTime = this.#now();
    const totalSize = this.#cacheTable.size + this.#fallbackTable.size;

    if (totalSize >= this.#capacity) {
      this.#trim(currentTime);
    }

    const isFallback = options.isFallback ?? false;

    if (isFallback) {
      // FALLBACK STICKINESS (fixed ceiling, non-renewing)
      const existing = this.#fallbackTable.get(sessionId);
      const isContinuingFallback =
        existing !== undefined &&
        existing.channelId === candidate.channelId &&
        existing.upstreamModel === candidate.upstreamModel &&
        currentTime - existing.recordedAt < existing.ttlMs;

      const initialAt = isContinuingFallback
        ? (existing.initialFallbackAt ?? existing.recordedAt)
        : currentTime;

      const elapsed = currentTime - initialAt;
      const effectiveTtl = Math.max(0, this.#fallbackTtl - elapsed);

      if (effectiveTtl <= 0) {
        this.#fallbackTable.delete(sessionId);
        return;
      }

      this.#fallbackTable.set(sessionId, {
        channelId: candidate.channelId,
        upstreamModel: candidate.upstreamModel,
        recordedAt: currentTime,
        ttlMs: effectiveTtl,
        isFallback: true,
        initialFallbackAt: initialAt,
      });
    } else {
      // PRIMARY CACHE STICKINESS (sliding renewal)
      // Clear any prior fallback affinity since we are successfully on primary
      this.#fallbackTable.delete(sessionId);

      const ttl = mode === "session" ? this.#sessionTtl : this.#cacheTtl;
      this.#cacheTable.set(sessionId, {
        channelId: candidate.channelId,
        upstreamModel: candidate.upstreamModel,
        recordedAt: currentTime,
        ttlMs: ttl,
        isFallback: false,
      });
    }
  }

  forget(sessionId: string): void {
    if (sessionId) {
      this.#cacheTable.delete(sessionId);
      this.#fallbackTable.delete(sessionId);
    }
  }

  clear(): void {
    this.#cacheTable.clear();
    this.#fallbackTable.clear();
  }

  stats(): { size: number; capacity: number; expiredCount: number } {
    const currentTime = this.#now();
    let expired = 0;
    for (const b of this.#cacheTable.values()) {
      if (currentTime - b.recordedAt >= b.ttlMs) expired += 1;
    }
    for (const b of this.#fallbackTable.values()) {
      if (currentTime - b.recordedAt >= b.ttlMs) expired += 1;
    }
    return {
      size: this.#cacheTable.size + this.#fallbackTable.size,
      capacity: this.#capacity,
      expiredCount: expired,
    };
  }

  setCacheAffinity(
    sessionId: string,
    accountId: string,
    ttl = this.#cacheTtl,
  ): void {
    if (ttl <= 0) {
      this.#cacheTable.delete(sessionId);
      return;
    }
    this.#cacheTable.set(sessionId, {
      channelId: accountId,
      upstreamModel: "",
      recordedAt: this.#now(),
      ttlMs: ttl,
      isFallback: false,
    });
  }

  setFallbackAffinity(
    sessionId: string,
    accountId: string,
    ttl = this.#fallbackTtl,
  ): void {
    if (ttl <= 0) {
      this.#fallbackTable.delete(sessionId);
      return;
    }
    const currentTime = this.#now();
    this.#fallbackTable.set(sessionId, {
      channelId: accountId,
      upstreamModel: "",
      recordedAt: currentTime,
      ttlMs: ttl,
      isFallback: true,
      initialFallbackAt: currentTime,
    });
  }

  resolveAccount(sessionId: string): {
    accountId: string | null;
    stickinessType: "cache" | "fallback" | null;
  } {
    const currentTime = this.#now();

    const fallback = this.#fallbackTable.get(sessionId);
    if (fallback) {
      if (currentTime - fallback.recordedAt < fallback.ttlMs) {
        return { accountId: fallback.channelId, stickinessType: "fallback" };
      }
      this.#fallbackTable.delete(sessionId);
    }

    const cache = this.#cacheTable.get(sessionId);
    if (cache) {
      if (currentTime - cache.recordedAt < cache.ttlMs) {
        return { accountId: cache.channelId, stickinessType: "cache" };
      }
      this.#cacheTable.delete(sessionId);
    }

    return { accountId: null, stickinessType: null };
  }

  #trim(currentTime: number): void {
    // Phase 1: Purge expired entries
    for (const [id, b] of this.#fallbackTable) {
      if (currentTime - b.recordedAt >= b.ttlMs) this.#fallbackTable.delete(id);
    }
    for (const [id, b] of this.#cacheTable) {
      if (currentTime - b.recordedAt >= b.ttlMs) this.#cacheTable.delete(id);
    }

    const total = this.#cacheTable.size + this.#fallbackTable.size;
    if (total < this.#trimTarget) return;

    // Phase 2: LRU purge oldest entries down to #trimTarget
    const allEntries: Array<{
      id: string;
      table: Map<string, StickyBinding>;
      recordedAt: number;
    }> = [];
    for (const [id, b] of this.#fallbackTable) {
      allEntries.push({
        id,
        table: this.#fallbackTable,
        recordedAt: b.recordedAt,
      });
    }
    for (const [id, b] of this.#cacheTable) {
      allEntries.push({
        id,
        table: this.#cacheTable,
        recordedAt: b.recordedAt,
      });
    }

    allEntries.sort((a, b) => a.recordedAt - b.recordedAt);
    const deleteCount = total - this.#trimTarget;
    for (let i = 0; i < deleteCount; i++) {
      const entry = allEntries[i];
      if (entry) entry.table.delete(entry.id);
    }
  }
}
