import assert from "node:assert/strict";
import test from "node:test";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";
import type { ChannelAdapter } from "../../src/features/ai-gateway/channels/adapter.ts";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";
import {
  AccountPool,
  CircuitBreaker,
} from "../../src/features/ai-gateway/accountPool.ts";
import type { NormalizedError } from "../../src/features/ai-gateway/errors.ts";
import { Scheduler } from "../../src/features/ai-gateway/scheduler.ts";

const capabilities: CapabilityManifest = {
  modalities: ["image"],
  operations: ["generate"],
  maxOutputs: 1,
  async: false,
};

const FIXED_NOW = 1_700_000_000_000;

function createTestScheduler(registrations: ChannelRegistration[], pools?: Map<string, AccountPool>): Scheduler {
  const registry = new ChannelRegistry();
  for (const adapter of new Set(registrations.map((entry) => entry.adapter))) {
    registry.registerAdapter(adapter);
  }
  registry.replace({ registrations, states: new Map() });
  return new Scheduler(registry, {
    random: () => 0,
    now: () => FIXED_NOW,
    ...(pools ? { accountPools: pools } : {}),
  });
}

test("AccountPool: multi-credential load balancing and cooldown filtering", () => {
  let currentTime = 1000;
  const pool = new AccountPool(
    "pool-test",
    [
      { credentialRef: "key-1", weight: 10 },
      { credentialRef: "key-2", weight: 10 },
    ],
    { now: () => currentTime, random: () => 0 },
  );

  assert.equal(pool.entries().length, 2);
  const picked1 = pool.pickNext();
  assert.ok(picked1);
  assert.equal(picked1.credentialRef, "key-1");

  // Put key-1 in cooldown
  pool.record429("key-1", 5000);
  assert.equal(pool.entries()[0]?.consecutive429, 1);
  assert.equal(pool.entries()[0]?.healthScore, 80); // 100 - 20
  assert.equal(pool.entries()[0]?.cooldownUntil, 6000);

  // Now only key-2 is available
  const picked2 = pool.pickNext();
  assert.ok(picked2);
  assert.equal(picked2.credentialRef, "key-2");

  // Advance clock past cooldown
  currentTime = 7000;
  const picked3 = pool.pickNext();
  assert.ok(picked3);
  assert.equal(picked3.credentialRef, "key-1");
});

test("AccountPool: continuous health scoring (0-100 EWMA) and latency penalties", () => {
  const pool = new AccountPool("pool-scoring", ["key-a"]);
  const entry = pool.entries()[0]!;
  assert.equal(entry.healthScore, 100);

  // Record slow latency (>1000ms penalty is -20, targetScore is 80)
  pool.recordSuccess("key-a", 1500);
  assert.equal(entry.recentLatencyEwma, 1500);
  // EWMA: 100 * 0.8 + 80 * 0.2 = 96
  assert.equal(entry.healthScore, 96);

  // Record 5xx (-25 penalty)
  pool.record5xx("key-a");
  assert.equal(entry.consecutive5xx, 1);
  assert.equal(entry.healthScore, 71); // 96 - 25 = 71

  // Record fast success (100ms) recovering score
  pool.recordSuccess("key-a", 100);
  // EWMA latency: 0.8 * 1500 + 0.2 * 100 = 1220 (latency > 1000, penalty 20, targetScore 80)
  // Health score recovers towards target: 71 * 0.8 + 80 * 0.2 = 56.8 + 16 = 72.8 -> 73
  assert.equal(entry.healthScore, 73); // Recovered from 71 to 73, does NOT degrade

  // Further fast requests continue to recover latency EWMA and score towards 100
  pool.recordSuccess("key-a", 50);
  // EWMA latency: 0.8 * 1220 + 0.2 * 50 = 986 (< 1000, penalty 10, targetScore 90)
  // 73 * 0.8 + 90 * 0.2 = 58.4 + 18 = 76.4 -> 76
  assert.equal(entry.healthScore, 76);
});

test("CircuitBreaker: 3-state machine (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)", () => {
  let currentTime = 10000;
  const cb = new CircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 5000,
    now: () => currentTime,
  });

  assert.equal(cb.state, "CLOSED");
  assert.equal(cb.canExecute(), true);

  // 1st failure (500)
  cb.recordFailure(500);
  assert.equal(cb.state, "CLOSED");

  // 2nd failure (502)
  cb.recordFailure(502);
  assert.equal(cb.state, "CLOSED");

  // 3rd failure (503) -> trips to OPEN
  cb.recordFailure(503);
  assert.equal(cb.state, "OPEN");
  assert.equal(cb.canExecute(), false);

  // Before cooldown expires: remains OPEN
  currentTime = 12000;
  assert.equal(cb.state, "OPEN");
  assert.equal(cb.canExecute(), false);

  // After cooldown expires: becomes HALF_OPEN
  currentTime = 16000;
  assert.equal(cb.state, "HALF_OPEN");
  assert.equal(cb.canExecute(), true);

  // Successful probe resets to CLOSED
  cb.recordSuccess();
  assert.equal(cb.state, "CLOSED");
  assert.equal(cb.canExecute(), true);

  // If in HALF_OPEN a failure occurs, immediately trips to OPEN
  currentTime = 20000;
  cb.recordFailure(500);
  cb.recordFailure(500);
  cb.recordFailure(500);
  assert.equal(cb.state, "OPEN");

  currentTime = 26000;
  assert.equal(cb.state, "HALF_OPEN");
  cb.recordFailure(500); // 1 fail in half_open trips back to open
  assert.equal(cb.state, "OPEN");
});

test("Scheduler 429 Hot-Drift: seamless millisecond-level failover to next credential before first token", async () => {
  const attempts: string[] = [];
  const rateLimitError: NormalizedError = {
    errorClass: "RATE_LIMITED",
    httpStatus: 429,
    retryable: true,
    cooldownMs: 5000,
  };

  const adapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "test-hotdrift",
    async submit(_ctx, _input, reqCtx) {
      const secret = await reqCtx.resolveSecret();
      attempts.push(secret ?? "none");
      if (secret === "secret-key-1") {
        throw Object.assign(new Error("Rate limited on key-1"), {
          normalized: rateLimitError,
        });
      }
      return { kind: "inline", assetBase64: "c3VjY2Vzcw==", mime: "text/plain" };
    },
    async poll() {
      return { status: "succeeded", assetBase64: "c3VjY2Vzcw==", mime: "text/plain" };
    },
  };

  const channel: ChannelRegistration = {
    id: "ch-drift",
    adapter,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://api.example.com",
    credentialRef: "pool.multi",
    capabilities,
    modelMapping: { "test-model": "upstream-m1" },
    timeoutMs: 30000,
  };

  const pool = new AccountPool("pool.multi", [
    { credentialRef: "key-1", weight: 10 },
    { credentialRef: "key-2", weight: 10 },
  ], { now: () => FIXED_NOW, random: () => 0 });

  const pools = new Map<string, AccountPool>([
    ["ch-drift", pool],
    ["pool.multi", pool],
  ]);

  const scheduler = createTestScheduler([channel], pools);

  const secretsMap: Record<string, string> = {
    "key-1": "secret-key-1",
    "key-2": "secret-key-2",
  };

  const result = await scheduler.dispatch({
    model: "test-model",
    operation: "generate",
    input: { model: "test-model", prompt: "hello", attachments: [] },
    idempotencyKey: "drift-req-1",
    resolveSecret: async (ref) => secretsMap[ref ?? ""] ?? ref,
    streamStarted: () => false, // No tokens pushed yet
  });

  // Both keys were attempted: key-1 failed with 429, hot-drifted to key-2 which succeeded
  assert.deepEqual(attempts, ["secret-key-1", "secret-key-2"]);
  assert.equal(result.channelId, "ch-drift");
  assert.equal(result.kind, "inline");

  // Key-1 is in cooldown, key-2 is healthy
  assert.ok(pool.entries()[0]!.consecutive429 >= 1);
  assert.ok(pool.entries()[0]!.cooldownUntil > FIXED_NOW);
  assert.equal(pool.entries()[1]!.consecutive429, 0);
});

test("Stream Started Fence: 429 hot-drift is strictly forbidden after first token has reached client", async () => {
  const attempts: string[] = [];
  const rateLimitError: NormalizedError = {
    errorClass: "RATE_LIMITED",
    httpStatus: 429,
    retryable: true,
    cooldownMs: 5000,
  };

  let tokenSent = false;
  const adapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "test-fence",
    async submit(_ctx, _input, reqCtx) {
      const secret = await reqCtx.resolveSecret();
      attempts.push(secret ?? "none");
      tokenSent = true;
      throw Object.assign(new Error("Late rate limit"), {
        normalized: rateLimitError,
      });
    },
    async poll() {
      return { status: "succeeded", assetBase64: "", mime: "text/plain" };
    },
  };

  const channel: ChannelRegistration = {
    id: "ch-fence",
    adapter,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://api.example.com",
    credentialRef: "pool.fence",
    capabilities,
    modelMapping: { "test-model": "upstream-m1" },
    timeoutMs: 30000,
  };

  const pool = new AccountPool("pool.fence", ["k1", "k2"], {
    now: () => FIXED_NOW,
    random: () => 0,
  });
  const pools = new Map([["ch-fence", pool]]);
  const scheduler = createTestScheduler([channel], pools);

  await assert.rejects(
    scheduler.dispatch({
      model: "test-model",
      operation: "generate",
      input: { model: "test-model", prompt: "hello", attachments: [] },
      idempotencyKey: "fence-req",
      resolveSecret: async (ref) => `secret-${ref}`,
      streamStarted: () => tokenSent, // Once tokenSent is true, fence blocks failover!
    }),
    (err: unknown) => {
      const n = (err as { normalized?: NormalizedError }).normalized;
      return n?.errorClass === "RATE_LIMITED";
    },
  );

  // Only the first key was attempted; failover was blocked by the stream fence!
  assert.deepEqual(attempts, ["secret-k1"]);
});

test("Circuit Breaker & Fallback Downgrade Chains: 5xx trips circuit breaker and falls down model chain", async () => {
  const upstream500: NormalizedError = {
    errorClass: "UPSTREAM_ERROR",
    httpStatus: 500,
    retryable: true,
    cooldownMs: 30000,
  };

  let primaryCalls = 0;
  const primaryAdapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "primary-provider",
    async submit() {
      primaryCalls++;
      throw Object.assign(new Error("Internal Server Error"), {
        normalized: upstream500,
      });
    },
    async poll() {
      return { status: "succeeded", assetBase64: "", mime: "text/plain" };
    },
  };

  let backupCalls = 0;
  let receivedBackupInputModel = "";
  const backupAdapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "backup-provider",
    async submit(_ctx, input) {
      backupCalls++;
      receivedBackupInputModel = input.model;
      return { kind: "inline", assetBase64: "YmFja3Vw", mime: "text/plain" };
    },
    async poll() {
      return { status: "succeeded", assetBase64: "YmFja3Vw", mime: "text/plain" };
    },
  };

  const primaryChannel: ChannelRegistration = {
    id: "ch-primary",
    adapter: primaryAdapter,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://primary.example.com",
    credentialRef: "cred.primary",
    capabilities,
    modelMapping: { "flagship-model": "ep-flagship" },
    timeoutMs: 30000,
  };

  const backupChannel: ChannelRegistration = {
    id: "ch-backup",
    adapter: backupAdapter,
    kind: "official_api",
    enabled: true,
    priority: 90,
    weight: 10,
    baseUrl: "https://backup.example.com",
    credentialRef: "cred.backup",
    capabilities,
    modelMapping: { "haiku-model": "ep-haiku" },
    timeoutMs: 30000,
  };

  const pool = new AccountPool("pool-flagship", ["cred.primary"], {
    now: () => FIXED_NOW,
    downgradeChain: ["haiku-model"],
  });

  const pools = new Map([
    ["ch-primary", pool],
    ["cred.primary", pool],
  ]);

  const scheduler = createTestScheduler([primaryChannel, backupChannel], pools);

  const result = await scheduler.dispatch({
    model: "flagship-model",
    operation: "generate",
    input: { model: "flagship-model", prompt: "test downgrade", attachments: [] },
    idempotencyKey: "downgrade-job-1",
    resolveSecret: async () => "dummy-secret",
    streamStarted: () => false,
  });

  assert.equal(primaryCalls, 1);
  assert.equal(backupCalls, 1);
  assert.equal(receivedBackupInputModel, "haiku-model");
  assert.equal(result.channelId, "ch-backup");
  assert.equal(result.downgradedFrom, "flagship-model");
  assert.equal(result.kind, "inline");
});
