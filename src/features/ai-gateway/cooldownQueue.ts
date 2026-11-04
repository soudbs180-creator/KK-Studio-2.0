/**
 * Asynchronous Cooldown Queue & Account Scheduler.
 *
 * Implements GatewayRouter with asynchronous pause/retry up to 20s,
 * AbortSignal support, and circuit breaker half-open bypass.
 */
import {
  type WaitingCandidate,
  type RoutePlan,
  type GatewayRouter,
  computeExponentialBackoffWithJitter,
  sortWaitingQueue,
} from "../../domain/gatewayCooldown.ts";

export const DEFAULT_COOLING_WAIT_LIMIT_MS = 20_000; // 20s maximum async wait threshold

export interface CooldownAccountRecord {
  readonly accountId: string;
  healthy: boolean;
  cooldownUntil: number;
  consecutiveRateLimits: number;
  consecutiveServerErrors: number;
  breakerOpenUntil?: number;
}

export interface CooldownSchedulerOptions {
  readonly now?: () => number;
  readonly random?: () => number;
  readonly maxWaitLimitMs?: number;
}

export class GatewayCooldownScheduler implements GatewayRouter {
  readonly #accounts = new Map<string, CooldownAccountRecord>();
  readonly #now: () => number;
  readonly #random: () => number;
  readonly #maxWaitLimitMs: number;

  constructor(options: CooldownSchedulerOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#random = options.random ?? Math.random;
    this.#maxWaitLimitMs =
      options.maxWaitLimitMs ?? DEFAULT_COOLING_WAIT_LIMIT_MS;
  }

  registerAccount(accountId: string): void {
    if (this.#accounts.has(accountId)) return;
    this.#accounts.set(accountId, {
      accountId,
      healthy: true,
      cooldownUntil: 0,
      consecutiveRateLimits: 0,
      consecutiveServerErrors: 0,
    });
  }

  reportRateLimit(accountId: string, retryAfterSeconds?: number): void {
    const acc = this.#accounts.get(accountId);
    if (!acc) throw new Error(`Unknown account: ${accountId}`);

    acc.consecutiveRateLimits += 1;
    let cooldownMs: number;
    if (retryAfterSeconds !== undefined && retryAfterSeconds >= 0) {
      cooldownMs = retryAfterSeconds * 1000;
    } else {
      cooldownMs = computeExponentialBackoffWithJitter(
        acc.consecutiveRateLimits,
        {
          random: this.#random,
        },
      );
    }

    acc.cooldownUntil = this.#now() + cooldownMs;
    acc.healthy = false;
  }

  reportSuccess(accountId: string): void {
    const acc = this.#accounts.get(accountId);
    if (!acc) return;
    acc.healthy = true;
    acc.consecutiveRateLimits = 0;
    acc.consecutiveServerErrors = 0;
    acc.cooldownUntil = 0;
    acc.breakerOpenUntil = undefined;
  }

  reportServerError(accountId: string): void {
    const acc = this.#accounts.get(accountId);
    if (!acc) return;
    acc.consecutiveServerErrors += 1;
    if (acc.consecutiveServerErrors >= 3) {
      acc.breakerOpenUntil = this.#now() + 60_000; // 60s circuit breaker
    }
  }

  acquireRoutePlan(): RoutePlan {
    const now = this.#now();
    const waitingQueue: WaitingCandidate[] = [];
    const available: string[] = [];
    const breakerBlocked: string[] = [];

    for (const [id, acc] of this.#accounts.entries()) {
      const isBreakerOpen =
        acc.breakerOpenUntil !== undefined && acc.breakerOpenUntil > now;
      const isCooling = acc.cooldownUntil > now;

      if (!isCooling && !isBreakerOpen) {
        available.push(id);
      } else if (isCooling) {
        waitingQueue.push({
          accountId: id,
          availableAfterMs: Math.max(0, acc.cooldownUntil - now),
          reason: "RATE_LIMITED",
          consecutiveFailures: acc.consecutiveRateLimits,
        });
      } else if (isBreakerOpen) {
        breakerBlocked.push(id);
      }
    }

    const sortedWaiting = sortWaitingQueue(waitingQueue);

    // 1. Available candidate exists: immediate selection
    if (available.length > 0) {
      return {
        selectedAccountId: available[0]!,
        coolingDurationMs: 0,
        waitingQueue: sortedWaiting,
      };
    }

    // 2. Circuit Breaker Half-Open Bypass:
    // If NO candidate is cooling and all registered accounts are breaker-blocked,
    // allow a single probe through rather than causing an absolute blackout.
    if (sortedWaiting.length === 0 && breakerBlocked.length > 0) {
      return {
        selectedAccountId: breakerBlocked[0]!,
        coolingDurationMs: 0,
        waitingQueue: [],
        bypassCircuitBreaker: true,
      };
    }

    // 3. Accounts in cooldown: populate waitingQueue and soonest wait
    const soonestWait = sortedWaiting[0]?.availableAfterMs ?? 0;
    return {
      selectedAccountId: null,
      coolingDurationMs: soonestWait,
      waitingQueue: sortedWaiting,
    };
  }

  /**
   * Compatibility alias matching e2e test method signature:
   * acquireCandidate(): RoutePlan
   */
  acquireCandidate(): RoutePlan;
  /**
   * Async GatewayRouter contract:
   * acquireCandidate(service?, sessionId?, isFallback?, signal?): Promise<string>
   */
  acquireCandidate(
    service?: string,
    sessionId?: string,
    isFallback?: boolean,
    signal?: AbortSignal,
  ): Promise<string>;
  acquireCandidate(
    service?: string,
    _sessionId?: string,
    _isFallback?: boolean,
    signal?: AbortSignal,
  ): RoutePlan | Promise<string> {
    // When called synchronously with no arguments or undefined service, return RoutePlan for backward-compatibility with e2e tests
    if (arguments.length === 0) {
      return this.acquireRoutePlan();
    }

    return this.#acquireCandidateAsync(service, signal);
  }

  async #acquireCandidateAsync(
    _service?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    signal?.throwIfAborted();
    const plan = this.acquireRoutePlan();

    if (plan.selectedAccountId) {
      return plan.selectedAccountId;
    }

    const firstWaiting = plan.waitingQueue[0];
    if (!firstWaiting || firstWaiting.availableAfterMs > this.#maxWaitLimitMs) {
      throw Object.assign(new Error("All upstream accounts are in cooldown"), {
        errorClass: "RATE_LIMITED",
        httpStatus: 429,
        coolingDurationMs: plan.coolingDurationMs,
      });
    }

    // Asynchronous pause for the soonest candidate
    await this.#sleep(firstWaiting.availableAfterMs, signal);
    signal?.throwIfAborted();

    // Re-evaluate candidate availability upon wake-up
    const nextPlan = this.acquireRoutePlan();
    if (nextPlan.selectedAccountId) {
      return nextPlan.selectedAccountId;
    }

    throw Object.assign(
      new Error("Cooldown retry expired without candidate recovery"),
      {
        errorClass: "RATE_LIMITED",
        httpStatus: 429,
      },
    );
  }

  #sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(signal.reason ?? new Error("Aborted"));
      }

      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      const onAbort = () => {
        cleanup();
        reject(signal?.reason ?? new Error("Aborted"));
      };

      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };

      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}
