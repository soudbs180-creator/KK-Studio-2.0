import assert from "node:assert/strict";
import test from "node:test";
import {
  computeExponentialBackoffWithJitter,
  parseDurationOrTimestamp,
  parseRateLimitHeaders,
  sortWaitingQueue,
  type WaitingCandidate,
} from "../../src/domain/gatewayCooldown.ts";
import { GatewayCooldownScheduler } from "../../src/features/ai-gateway/cooldownQueue.ts";
import { AccountPool } from "../../src/features/ai-gateway/accountPool.ts";

test("computeExponentialBackoffWithJitter: 0 consecutive failures returns 0", () => {
  assert.equal(computeExponentialBackoffWithJitter(0), 0);
  assert.equal(computeExponentialBackoffWithJitter(-1), 0);
});

test("computeExponentialBackoffWithJitter: bounds between base and max", () => {
  const base = 5_000;
  const max = 600_000;

  for (let failures = 1; failures <= 15; failures++) {
    // Test with min random (0) -> returns base
    const minVal = computeExponentialBackoffWithJitter(failures, {
      baseCooldownMs: base,
      maxCooldownMs: max,
      random: () => 0,
    });
    assert.equal(minVal, base);

    // Test with max random (0.999) -> returns cap
    const maxVal = computeExponentialBackoffWithJitter(failures, {
      baseCooldownMs: base,
      maxCooldownMs: max,
      random: () => 0.999999,
    });
    assert.ok(maxVal >= base);
    assert.ok(maxVal <= max);
  }
});

test("computeExponentialBackoffWithJitter: spreads across full jitter distribution", () => {
  const values = new Set<number>();
  for (let i = 0; i < 20; i++) {
    const val = computeExponentialBackoffWithJitter(3, {
      baseCooldownMs: 5000,
      maxCooldownMs: 50000,
      random: () => i / 20,
    });
    values.add(val);
  }
  assert.ok(
    values.size > 10,
    "Jitter should generate distributed backoff values",
  );
});

test("parseDurationOrTimestamp: parses duration units correctly", () => {
  assert.equal(parseDurationOrTimestamp("250ms"), 250);
  assert.equal(parseDurationOrTimestamp("1.5s"), 1500);
  assert.equal(parseDurationOrTimestamp("2m30s"), 150000);
  assert.equal(parseDurationOrTimestamp("1h"), 3600000);
  assert.equal(parseDurationOrTimestamp("10"), 10000); // bare seconds
});

test("parseDurationOrTimestamp: parses epoch timestamps correctly", () => {
  const now = 1_700_000_000_000;
  // Second timestamp (1e9 <= num < 1e12)
  const secTimestamp = 1_700_000_010; // +10s
  assert.equal(parseDurationOrTimestamp(String(secTimestamp), now), 10000);

  // Millisecond timestamp (>= 1e12)
  const msTimestamp = 1_700_000_005_000; // +5s
  assert.equal(parseDurationOrTimestamp(String(msTimestamp), now), 5000);
});

test("parseRateLimitHeaders: parses retry-after-ms, retry-after, and x-ratelimit-reset", () => {
  // 1. retry-after-ms
  assert.equal(parseRateLimitHeaders({ "retry-after-ms": "3500" }), 3500);

  // 2. retry-after (seconds)
  assert.equal(parseRateLimitHeaders({ "retry-after": "12" }), 12000);

  // 3. retry-after (HTTP date)
  const now = Date.now();
  const futureDate = new Date(now + 8000).toUTCString();
  const parsedDate = parseRateLimitHeaders({ "retry-after": futureDate }, now);
  assert.ok(
    parsedDate !== undefined && parsedDate >= 7000 && parsedDate <= 9000,
  );

  // 4. x-ratelimit-reset-requests
  assert.equal(
    parseRateLimitHeaders({ "x-ratelimit-reset-requests": "250ms" }),
    250,
  );

  // 5. x-ratelimit-reset
  assert.equal(parseRateLimitHeaders({ "x-ratelimit-reset": "1m" }), 60000);
});

test("parseRateLimitHeaders & parseDurationOrTimestamp: fuzzing & edge-case robustness", () => {
  // Empty / whitespace headers must return undefined (NEVER 0ms!)
  assert.equal(parseRateLimitHeaders({ "retry-after": "" }), undefined);
  assert.equal(parseRateLimitHeaders({ "retry-after": "   " }), undefined);
  assert.equal(parseRateLimitHeaders({ "retry-after-ms": "" }), undefined);
  assert.equal(
    parseRateLimitHeaders({ "retry-after-ms": "  \t \n " }),
    undefined,
  );
  assert.equal(
    parseRateLimitHeaders({ "x-ratelimit-reset": "   " }),
    undefined,
  );

  // Negative / zero values must return undefined (NEVER 0ms or negative!)
  assert.equal(parseRateLimitHeaders({ "retry-after": "-5" }), undefined);
  assert.equal(parseRateLimitHeaders({ "retry-after": "0" }), undefined);
  assert.equal(parseRateLimitHeaders({ "retry-after-ms": "-100" }), undefined);
  assert.equal(parseRateLimitHeaders({ "retry-after-ms": "0" }), undefined);
  assert.equal(parseRateLimitHeaders({ "x-ratelimit-reset": "-1" }), undefined);
  assert.equal(parseRateLimitHeaders({ "x-ratelimit-reset": "0" }), undefined);

  // Past HTTP dates must return undefined
  const now = 1_700_000_000_000;
  const pastDate = new Date(now - 10000).toUTCString();
  assert.equal(
    parseRateLimitHeaders({ "retry-after": pastDate }, now),
    undefined,
  );

  // Malformed text headers must return undefined
  assert.equal(
    parseRateLimitHeaders({ "retry-after": "malformed_text" }),
    undefined,
  );
  assert.equal(
    parseRateLimitHeaders({ "retry-after-ms": "abc123ms" }),
    undefined,
  );
  assert.equal(
    parseRateLimitHeaders({ "x-ratelimit-reset": "10s_trailing_garbage" }),
    undefined,
  );

  // parseDurationOrTimestamp direct edge cases
  assert.equal(parseDurationOrTimestamp(""), undefined);
  assert.equal(parseDurationOrTimestamp("   "), undefined);
  assert.equal(parseDurationOrTimestamp("-10s"), undefined);
  assert.equal(parseDurationOrTimestamp("0s"), undefined);
  assert.equal(parseDurationOrTimestamp("0"), undefined);
  assert.equal(parseDurationOrTimestamp("-5"), undefined);
  assert.equal(parseDurationOrTimestamp("10s_corrupted"), undefined);
});

test("sortWaitingQueue: sorts ascending by availableAfterMs", () => {
  const queue: WaitingCandidate[] = [
    { accountId: "c", availableAfterMs: 3000 },
    { accountId: "a", availableAfterMs: 500 },
    { accountId: "b", availableAfterMs: 1500 },
  ];
  const sorted = sortWaitingQueue(queue);
  assert.equal(sorted[0]!.accountId, "a");
  assert.equal(sorted[1]!.accountId, "b");
  assert.equal(sorted[2]!.accountId, "c");
});

test("GatewayCooldownScheduler: registration and immediate selection", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("key-1");
  const plan = scheduler.acquireRoutePlan();
  assert.equal(plan.selectedAccountId, "key-1");
  assert.equal(plan.coolingDurationMs, 0);
  assert.equal(plan.waitingQueue.length, 0);
});

test("GatewayCooldownScheduler: rate limit puts account in waiting queue", () => {
  const currentTime = 1000;
  const scheduler = new GatewayCooldownScheduler({
    now: () => currentTime,
    random: () => 0,
  });
  scheduler.registerAccount("k1");
  scheduler.registerAccount("k2");

  scheduler.reportRateLimit("k1", 10); // 10s cooldown
  const plan = scheduler.acquireRoutePlan();
  assert.equal(plan.selectedAccountId, "k2");
  assert.equal(plan.waitingQueue.length, 1);
  assert.equal(plan.waitingQueue[0]!.accountId, "k1");
  assert.equal(plan.waitingQueue[0]!.availableAfterMs, 10000);
});

test("GatewayCooldownScheduler: recovery after clock advance past cooldown", () => {
  let currentTime = 1000;
  const scheduler = new GatewayCooldownScheduler({
    now: () => currentTime,
  });
  scheduler.registerAccount("k1");
  scheduler.reportRateLimit("k1", 5);

  assert.equal(scheduler.acquireRoutePlan().selectedAccountId, null);

  currentTime += 6000;
  const plan = scheduler.acquireRoutePlan();
  assert.equal(plan.selectedAccountId, "k1");
  assert.equal(plan.waitingQueue.length, 0);
});

test("GatewayCooldownScheduler: circuit breaker half-open bypass when all blocked by 5xx", () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("k-server-err");

  // Report 3 consecutive server errors to trip breaker
  scheduler.reportServerError("k-server-err");
  scheduler.reportServerError("k-server-err");
  scheduler.reportServerError("k-server-err");

  // With half-open bypass, it permits a probe candidate
  const plan = scheduler.acquireRoutePlan();
  assert.equal(plan.selectedAccountId, "k-server-err");
  assert.equal(plan.bypassCircuitBreaker, true);
});

test("GatewayCooldownScheduler: async acquireCandidate sleeps and wakes", async () => {
  const scheduler = new GatewayCooldownScheduler({
    maxWaitLimitMs: 5000,
  });
  scheduler.registerAccount("k-quick");
  scheduler.reportRateLimit("k-quick", 0.04); // 40ms cooldown

  const promise = scheduler.acquireCandidate("service", "session", false);
  const result = await promise;
  assert.equal(result, "k-quick");
});

test("GatewayCooldownScheduler: async acquireCandidate rejects on AbortSignal", async () => {
  const scheduler = new GatewayCooldownScheduler();
  scheduler.registerAccount("k-abort");
  scheduler.reportRateLimit("k-abort", 10); // 10s

  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error("TestAbort")), 20);

  await assert.rejects(
    () =>
      scheduler.acquireCandidate(
        "service",
        "session",
        false,
        controller.signal,
      ),
    /TestAbort/,
  );
});

test("GatewayCooldownScheduler: async acquireCandidate fails fast when cooldown > maxWaitLimitMs", async () => {
  const scheduler = new GatewayCooldownScheduler({
    maxWaitLimitMs: 20_000,
  });
  scheduler.registerAccount("k-long");
  scheduler.reportRateLimit("k-long", 60); // 60s > 20s

  await assert.rejects(
    () => scheduler.acquireCandidate("service", "session", false),
    (err: unknown) => {
      const e = err as { httpStatus?: number; errorClass?: string };
      return e.httpStatus === 429 && e.errorClass === "RATE_LIMITED";
    },
  );
});

test("AccountPool: waitingCandidates returns cooling credentials sorted", () => {
  const currentTime = 1000;
  const pool = new AccountPool(
    "pool-wait",
    [
      { credentialRef: "key-a" },
      { credentialRef: "key-b" },
      { credentialRef: "key-c" },
    ],
    { now: () => currentTime },
  );

  pool.record429("key-a", 10000);
  pool.record429("key-b", 5000);

  const waiting = pool.waitingCandidates();
  assert.equal(waiting.length, 2);
  assert.equal(waiting[0]!.accountId, "key-b");
  assert.equal(waiting[0]!.availableAfterMs, 5000);
  assert.equal(waiting[1]!.accountId, "key-a");
  assert.equal(waiting[1]!.availableAfterMs, 10000);
});
