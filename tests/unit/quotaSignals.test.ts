/**
 * Unit tests for Quota Signals & Rate-Limit Normalization (Task 1.12).
 * Verifies:
 * 1. Upstream error classification (429/RATE_LIMITED, INSUFFICIENT_QUOTA, AUTH_FAILED, OTHER).
 * 2. 429 -> cooldown mapping & Retry-After handling.
 * 3. Pure candidate filtering (exhausted, cooling_down, health_down, auto-recovery on resetAt).
 * 4. Fake API keys and secrets are NEVER echoed in return values.
 * 5. Compatibility and adaptation with ChannelHealthTracker.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { DispatchCandidate } from "../../src/features/agent-dispatch/dispatchTypes.ts";
import {
  adaptFromChannelHealthTracker,
  adaptToChannelHealthTracker,
  applyCooldown,
  applyQuotaSignal,
  classifyQuotaSignal,
  clearCooldown,
  clearExhausted,
  DEFAULT_QUOTA_EXHAUSTED_COOLDOWN_MS,
  DEFAULT_RATE_LIMIT_COOLDOWN_MS,
  markExhausted,
  sanitizeSecrets,
  shouldSkipCandidate,
} from "../../src/features/agent-dispatch/quotaSignals.ts";
import { ChannelHealthTracker } from "../../src/features/ai-gateway/scheduler.ts";

function createCandidate(overrides: Partial<DispatchCandidate> = {}): DispatchCandidate {
  return {
    id: "candidate-worker-1",
    kind: "openai-compat",
    roleHint: "worker",
    capabilities: ["text.plan", "text.chat"],
    costTier: "cheap",
    quota: {
      exhausted: false,
    },
    health: "ok",
    ...overrides,
  };
}

test("classifyQuotaSignal: maps 429 status to RATE_LIMITED with cooldown", () => {
  const baseTime = 1_700_000_000_000;
  const signal = classifyQuotaSignal(
    {
      status: 429,
      message: "Too Many Requests - Rate limit reached",
    },
    { now: baseTime },
  );

  assert.equal(signal.signalType, "RATE_LIMITED");
  assert.equal(signal.retryable, true);
  assert.equal(signal.httpStatus, 429);
  assert.equal(signal.cooldownMs, DEFAULT_RATE_LIMIT_COOLDOWN_MS);
  assert.equal(signal.resetAt, baseTime + DEFAULT_RATE_LIMIT_COOLDOWN_MS);
});

test("classifyQuotaSignal: respects upstream Retry-After in headers or body", () => {
  const baseTime = 1_700_000_000_000;
  // Scenario 1: Retry-After header in seconds
  const signal1 = classifyQuotaSignal(
    {
      status: 429,
      headers: { "retry-after": "15" },
      message: "Rate limit exceeded",
    },
    { now: baseTime },
  );
  assert.equal(signal1.signalType, "RATE_LIMITED");
  assert.equal(signal1.cooldownMs, 15_000);
  assert.equal(signal1.resetAt, baseTime + 15_000);

  // Scenario 2: retryAfterMs in body
  const signal2 = classifyQuotaSignal(
    {
      status: 429,
      retryAfterMs: 45_000,
      message: "Please wait before retry",
    },
    { now: baseTime },
  );
  assert.equal(signal2.cooldownMs, 45_000);
});

test("classifyQuotaSignal: maps quota exhaustion and balance errors to INSUFFICIENT_QUOTA", () => {
  const baseTime = 1_700_000_000_000;

  // Scenario 1: OpenAI returns 429 with insufficient_quota
  const openAiError = {
    status: 429,
    error: {
      message: "You exceeded your current quota, please check your plan and billing details.",
      type: "insufficient_quota",
      code: "insufficient_quota",
    },
  };
  const signal1 = classifyQuotaSignal(openAiError, { now: baseTime });
  assert.equal(signal1.signalType, "INSUFFICIENT_QUOTA");
  assert.equal(signal1.retryable, false);
  assert.equal(signal1.cooldownMs, DEFAULT_QUOTA_EXHAUSTED_COOLDOWN_MS);

  // Scenario 2: Chinese wording (余额不足 / 欠费)
  const doubaoError = {
    status: 400,
    message: "账户余额不足，请充值后重试",
  };
  const signal2 = classifyQuotaSignal(doubaoError, { now: baseTime });
  assert.equal(signal2.signalType, "INSUFFICIENT_QUOTA");
  assert.equal(signal2.retryable, false);

  // Scenario 3: HTTP 402 Payment Required
  const paymentRequired = {
    status: 402,
    message: "Payment Required: Credit balance exhausted",
  };
  const signal3 = classifyQuotaSignal(paymentRequired, { now: baseTime });
  assert.equal(signal3.signalType, "INSUFFICIENT_QUOTA");
});

test("classifyQuotaSignal: maps 401/403 and invalid key errors to AUTH_FAILED", () => {
  const signal1 = classifyQuotaSignal({
    status: 401,
    message: "Unauthorized: Invalid API key provided",
  });
  assert.equal(signal1.signalType, "AUTH_FAILED");
  assert.equal(signal1.retryable, false);
  assert.equal(signal1.httpStatus, 401);

  const signal2 = classifyQuotaSignal({
    status: 403,
    message: "Permission denied for the requested model",
  });
  assert.equal(signal2.signalType, "AUTH_FAILED");
  assert.equal(signal2.retryable, false);
});

test("classifyQuotaSignal: maps server and transport failures to OTHER", () => {
  const signal500 = classifyQuotaSignal({
    status: 500,
    message: "Internal Server Error",
  });
  assert.equal(signal500.signalType, "OTHER");
  assert.equal(signal500.retryable, true);
  assert.equal(signal500.httpStatus, 500);

  const signalTimeout = classifyQuotaSignal(new Error("ETIMEDOUT: Connection timed out"));
  assert.equal(signalTimeout.signalType, "OTHER");
  assert.equal(signalTimeout.retryable, true);
});

test("SECURITY: fake API keys and secrets do NOT appear in return values", () => {
  const FAKE_OPENAI_KEY = "sk-proj-test1234567890abcdefABCDEF123456";
  const FAKE_GOOGLE_KEY = "AIzaSyD-FakeGoogleSecretKey1234567890";
  const FAKE_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakePayload.fakeSig";
  const CUSTOM_KEYWORD_SECRET = "custom_super_secret_password_987654";

  const rawErrorMessage =
    `Request failed for key ${FAKE_OPENAI_KEY} and google key ${FAKE_GOOGLE_KEY}; ` +
    `Authorization: Bearer ${FAKE_BEARER_TOKEN}; secret=${CUSTOM_KEYWORD_SECRET}`;

  const signal = classifyQuotaSignal(
    {
      status: 401,
      message: rawErrorMessage,
      code: `invalid_key_${FAKE_OPENAI_KEY}`,
    },
    {
      knownSecrets: [CUSTOM_KEYWORD_SECRET, FAKE_OPENAI_KEY],
    },
  );

  // 1. None of the fake keys appear in sanitizedDetail
  assert.ok(signal.sanitizedDetail, "sanitizedDetail should exist");
  assert.equal(signal.sanitizedDetail.includes(FAKE_OPENAI_KEY), false);
  assert.equal(signal.sanitizedDetail.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(signal.sanitizedDetail.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(signal.sanitizedDetail.includes(CUSTOM_KEYWORD_SECRET), false);

  // 2. Entire JSON stringified representation of signal contains zero raw secrets
  const serialized = JSON.stringify(signal);
  assert.equal(serialized.includes(FAKE_OPENAI_KEY), false);
  assert.equal(serialized.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(serialized.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(serialized.includes(CUSTOM_KEYWORD_SECRET), false);

  // 3. Directly test sanitizeSecrets standalone
  const cleaned = sanitizeSecrets(rawErrorMessage, [CUSTOM_KEYWORD_SECRET]);
  assert.equal(cleaned.includes(FAKE_OPENAI_KEY), false);
  assert.equal(cleaned.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(cleaned.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(cleaned.includes(CUSTOM_KEYWORD_SECRET), false);
  assert.ok(cleaned.includes("[REDACTED]"));
});

test("markExhausted: pure function marks candidate exhausted without mutation", () => {
  const original = createCandidate({
    health: "ok",
    quota: { exhausted: false },
  });

  const updated = markExhausted(original, { resetAt: 1_700_500_000_000 });

  // Original remains untouched
  assert.equal(original.quota.exhausted, false);
  assert.equal(original.health, "ok");

  // New object updated
  assert.equal(updated.quota.exhausted, true);
  assert.equal(updated.quota.resetAt, 1_700_500_000_000);
  assert.equal(updated.health, "degraded");
});

test("clearExhausted: restores candidate quota and degraded health", () => {
  const exhausted = createCandidate({
    health: "degraded",
    quota: { exhausted: true, resetAt: 1_700_500_000_000 },
  });

  const cleared = clearExhausted(exhausted);
  assert.equal(cleared.quota.exhausted, false);
  assert.equal(cleared.quota.resetAt, undefined);
  assert.equal(cleared.health, "ok");
});

test("applyCooldown: applies cooldown timestamp without mutation", () => {
  const baseTime = 1_000_000;
  const original = createCandidate({
    quota: { exhausted: false, cooldownUntil: baseTime + 10_000 },
  });

  // Extending cooldown
  const updated1 = applyCooldown(original, 30_000, { now: baseTime });
  assert.equal(original.quota.cooldownUntil, baseTime + 10_000);
  assert.equal(updated1.quota.cooldownUntil, baseTime + 30_000);

  // Shorter cooldown does not decrease existing longer cooldown
  const updated2 = applyCooldown(updated1, 5_000, { now: baseTime });
  assert.equal(updated2.quota.cooldownUntil, baseTime + 30_000);

  // clearCooldown removes cooldown
  const cleared = clearCooldown(updated2);
  assert.equal(cleared.quota.cooldownUntil, undefined);
});

test("shouldSkipCandidate: correctly identifies candidates to skip or dispatch", () => {
  const now = 2_000_000;

  // 1. Normal available candidate
  const available = createCandidate({ health: "ok", quota: { exhausted: false } });
  assert.deepEqual(shouldSkipCandidate(available, { now }), { skip: false });

  // 2. Exhausted candidate
  const exhausted = createCandidate({
    quota: { exhausted: true, resetAt: now + 50_000 },
  });
  const skipExhausted = shouldSkipCandidate(exhausted, { now });
  assert.equal(skipExhausted.skip, true);
  assert.equal(skipExhausted.reason, "exhausted");
  assert.equal(skipExhausted.resetRemainingMs, 50_000);

  // 3. Exhausted candidate whose resetAt has passed -> auto-recovered, do not skip
  const autoRecovered = createCandidate({
    quota: { exhausted: true, resetAt: now - 100 },
  });
  assert.deepEqual(shouldSkipCandidate(autoRecovered, { now }), { skip: false });

  // 4. Cooling down candidate
  const coolingDown = createCandidate({
    quota: { exhausted: false, cooldownUntil: now + 15_000 },
  });
  const skipCooling = shouldSkipCandidate(coolingDown, { now });
  assert.equal(skipCooling.skip, true);
  assert.equal(skipCooling.reason, "cooling_down");
  assert.equal(skipCooling.cooldownRemainingMs, 15_000);

  // 5. Cooldown passed -> do not skip
  const cooledOff = createCandidate({
    quota: { exhausted: false, cooldownUntil: now - 10 },
  });
  assert.deepEqual(shouldSkipCandidate(cooledOff, { now }), { skip: false });

  // 6. Health down candidate
  const downCandidate = createCandidate({ health: "down" });
  const skipDown = shouldSkipCandidate(downCandidate, { now });
  assert.equal(skipDown.skip, true);
  assert.equal(skipDown.reason, "health_down");
});

test("applyQuotaSignal: applies signal directly to candidate", () => {
  const baseTime = 1_000_000;
  const initial = createCandidate({ health: "ok", quota: { exhausted: false } });

  // 1. 429 signal -> applies cooldown
  const rateLimitSignal = classifyQuotaSignal(
    { status: 429, message: "Too many requests" },
    { now: baseTime, defaultCooldownMs: 60_000 },
  );
  const cooled = applyQuotaSignal(initial, rateLimitSignal, { now: baseTime });
  assert.equal(cooled.quota.exhausted, false);
  assert.equal(cooled.quota.cooldownUntil, baseTime + 60_000);

  // 2. Insufficient quota signal -> marks exhausted + cooldown
  const quotaSignal = classifyQuotaSignal(
    { status: 402, message: "Balance empty" },
    { now: baseTime },
  );
  const exhausted = applyQuotaSignal(initial, quotaSignal, { now: baseTime });
  assert.equal(exhausted.quota.exhausted, true);
  assert.equal(exhausted.health, "degraded");

  // 3. Auth failed signal -> sets health to down
  const authSignal = classifyQuotaSignal(
    { status: 401, message: "Invalid API key" },
    { now: baseTime },
  );
  const down = applyQuotaSignal(initial, authSignal, { now: baseTime });
  assert.equal(down.health, "down");
});

test("ChannelHealthTracker integration: adapts QuotaSignal to ChannelHealthTracker", () => {
  const now = 1_500_000_000;
  const tracker = new ChannelHealthTracker({ now: () => now });
  const channelId = "test-channel-provider-1";

  assert.equal(tracker.isAvailable(channelId), true);

  // Classify a 429 error with 20s retry hint
  const signal = classifyQuotaSignal(
    {
      status: 429,
      headers: { "retry-after": "20" },
      message: "Rate limited",
    },
    { now },
  );

  // Adapt and record to tracker
  adaptToChannelHealthTracker(tracker, channelId, signal);

  // Channel should now be cooling down in tracker
  assert.equal(tracker.isAvailable(channelId), false);
  const state = tracker.state(channelId);
  assert.equal(state.consecutiveFailures, 1);
  assert.equal(state.cooldownUntil, now + 20_000);

  // Adapt state back to dispatch candidate format
  const mapped = adaptFromChannelHealthTracker(tracker, channelId, { now });
  assert.ok(mapped);
  assert.equal(mapped.quota.cooldownUntil, now + 20_000);
  assert.equal(mapped.health, "degraded");
});

test("edge cases: handles empty error, nulls, and special regex characters in secrets", () => {
  // Empty / null error classification
  const emptySignal = classifyQuotaSignal(null);
  assert.equal(emptySignal.signalType, "OTHER");
  assert.equal(emptySignal.retryable, false);

  const undefinedSignal = classifyQuotaSignal(undefined);
  assert.equal(undefinedSignal.signalType, "OTHER");

  // Status-only without message
  const statusOnly = classifyQuotaSignal({ status: 429 });
  assert.equal(statusOnly.signalType, "RATE_LIMITED");
  assert.equal(statusOnly.httpStatus, 429);

  // Secret with special regex characters (+, *, (, ), [, ])
  const trickySecret = "sk-special+key[with](regex)*symbols";
  const messageWithTrickySecret = `Auth error with token ${trickySecret} in header`;
  const sanitized = sanitizeSecrets(messageWithTrickySecret, [trickySecret]);
  assert.equal(sanitized.includes(trickySecret), false);
  assert.ok(sanitized.includes("[REDACTED]"));

  // Health 'down' is preserved when marking exhausted
  const downCandidate = createCandidate({ health: "down" });
  const markedDown = markExhausted(downCandidate);
  assert.equal(markedDown.health, "down");
  assert.equal(markedDown.quota.exhausted, true);

  // Health 'down' is NOT accidentally restored by clearExhausted
  const clearedDown = clearExhausted(markedDown);
  assert.equal(clearedDown.health, "down");
  assert.equal(clearedDown.quota.exhausted, false);
});

