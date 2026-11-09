/**
 * Unit tests for KK Studio Agent Dispatcher (Task 1.11).
 *
 * Verifies:
 * 1. Filtering: capability, health !== down, exhausted (!resetAt expired), cooldownUntil.
 *    Prohibits main agent from handling image/video generation tasks directly.
 * 2. Sorting across every level:
 *    - Level 1: user priorityBias (higher first)
 *    - Level 2: explicit remaining quota (has quota > 0 first)
 *    - Level 3: costTier (lower cost first: free < cheap < standard < premium)
 *    - Level 4: probe latency (lower latency first)
 *    - Level 5: stable tie-breaker by id
 * 3. resetAt expiration recovery: exhausted candidates become available when resetAt <= now.
 * 4. Paid budget gate: over budget or zero budget requires L2 confirmation.
 * 5. 429 fallback chain rotation and non-blocking notification copy ("xx 额度用尽，已改走 yy。").
 * 6. Structured explanation when no candidate is available (missing credentials, switch model, etc.) without throwing.
 * 7. Fake API keys and secrets NEVER leak into return values, explanations, notifications, or logs.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentRegistry,
} from "../../src/features/agent-dispatch/agentRegistry.ts";
import {
  Dispatcher,
  createDispatcher,
  explainNoCandidates,
  filterEligibleCandidates,
  formatFallbackNotification,
  handleDispatchFallback,
  isCandidateEligible,
  isMediaCapability,
  selectCandidate,
  sortCandidates,
} from "../../src/features/agent-dispatch/dispatcher.ts";
import type {
  DispatchCandidate,
  DispatchRequest,
} from "../../src/features/agent-dispatch/dispatchTypes.ts";

function makeCandidate(
  overrides: Partial<DispatchCandidate> = {},
): DispatchCandidate {
  return {
    id: overrides.id ?? "worker-candidate-1",
    kind: overrides.kind ?? "openai-compat",
    roleHint: overrides.roleHint ?? "worker",
    capabilities: overrides.capabilities ?? ["text.plan", "text.chat"],
    costTier: overrides.costTier ?? "cheap",
    quota: {
      exhausted: false,
      ...overrides.quota,
    },
    health: overrides.health ?? "ok",
    runtimeRef: overrides.runtimeRef,
    priorityBias: overrides.priorityBias,
    metadata: overrides.metadata ? { ...overrides.metadata } : undefined,
  };
}

// ============================================================================
// 1. Filtering Tests
// ============================================================================

test("Filter: matches capability and excludes non-matching candidates", () => {
  const c1 = makeCandidate({ id: "agent-text", capabilities: ["text.plan"] });
  const c2 = makeCandidate({
    id: "agent-image",
    capabilities: ["image.generate"],
  });

  const pool = [c1, c2];
  const eligibleText = filterEligibleCandidates(pool, "text.plan");
  assert.equal(eligibleText.length, 1);
  assert.equal(eligibleText[0].id, "agent-text");

  const eligibleImage = filterEligibleCandidates(pool, "image.generate");
  assert.equal(eligibleImage.length, 1);
  assert.equal(eligibleImage[0].id, "agent-image");

  const eligibleVideo = filterEligibleCandidates(pool, "video.generate");
  assert.equal(eligibleVideo.length, 0);
});

test("Filter: excludes health down but keeps ok and degraded", () => {
  const cOk = makeCandidate({ id: "agent-ok", health: "ok" });
  const cDegraded = makeCandidate({ id: "agent-degraded", health: "degraded" });
  const cDown = makeCandidate({ id: "agent-down", health: "down" });

  const eligible = filterEligibleCandidates(
    [cOk, cDegraded, cDown],
    "text.plan",
  );
  const ids = eligible.map((c) => c.id);
  assert.deepEqual(ids, ["agent-ok", "agent-degraded"]);
});

test("Filter: excludes exhausted candidates unless resetAt has arrived", () => {
  const baseTime = 1_000_000;
  const cNormal = makeCandidate({
    id: "agent-normal",
    quota: { exhausted: false },
  });
  const cExhaustedNoReset = makeCandidate({
    id: "agent-exhausted-no-reset",
    quota: { exhausted: true },
  });
  const cExhaustedFutureReset = makeCandidate({
    id: "agent-exhausted-future",
    quota: { exhausted: true, resetAt: baseTime + 10_000 },
  });
  const cExhaustedExpiredReset = makeCandidate({
    id: "agent-exhausted-expired",
    quota: { exhausted: true, resetAt: baseTime - 1 },
  });

  const eligible = filterEligibleCandidates(
    [
      cNormal,
      cExhaustedNoReset,
      cExhaustedFutureReset,
      cExhaustedExpiredReset,
    ],
    "text.plan",
    { now: baseTime },
  );

  const ids = eligible.map((c) => c.id);
  assert.equal(ids.includes("agent-normal"), true);
  assert.equal(ids.includes("agent-exhausted-no-reset"), false);
  assert.equal(ids.includes("agent-exhausted-future"), false);
  // resetAt <= now is recovered!
  assert.equal(ids.includes("agent-exhausted-expired"), true);
});

test("Filter: excludes candidates currently in cooldown", () => {
  const now = 2_000_000;
  const cCooling = makeCandidate({
    id: "agent-cooling",
    quota: { exhausted: false, cooldownUntil: now + 5000 },
  });
  const cCooldownPassed = makeCandidate({
    id: "agent-passed",
    quota: { exhausted: false, cooldownUntil: now - 100 },
  });
  const cNoCooldown = makeCandidate({
    id: "agent-ready",
    quota: { exhausted: false },
  });

  const eligible = filterEligibleCandidates(
    [cCooling, cCooldownPassed, cNoCooldown],
    "text.plan",
    { now },
  );
  const ids = eligible.map((c) => c.id);
  assert.equal(ids.includes("agent-cooling"), false);
  assert.equal(ids.includes("agent-passed"), true);
  assert.equal(ids.includes("agent-ready"), true);
});

test("Filter: main agent is strictly prohibited from direct image/video generation", () => {
  const mainAgent = makeCandidate({
    id: "main-planner",
    roleHint: "main",
    capabilities: ["text.plan", "image.generate", "video.generate"],
  });
  const imageWorker = makeCandidate({
    id: "image-worker",
    roleHint: "worker",
    capabilities: ["image.generate"],
  });
  const videoSpecialist = makeCandidate({
    id: "video-specialist",
    roleHint: "specialist",
    capabilities: ["video.generate"],
  });

  const pool = [mainAgent, imageWorker, videoSpecialist];

  // For text planning, main agent is eligible
  const planEligible = filterEligibleCandidates(pool, "text.plan");
  assert.equal(planEligible.map((c) => c.id).includes("main-planner"), true);

  // For image generation, main agent MUST NOT be selected
  const imageEligible = filterEligibleCandidates(pool, "image.generate");
  assert.equal(imageEligible.length, 1);
  assert.equal(imageEligible[0].id, "image-worker");

  // For video generation, main agent MUST NOT be selected
  const videoEligible = filterEligibleCandidates(pool, "video.generate");
  assert.equal(videoEligible.length, 1);
  assert.equal(videoEligible[0].id, "video-specialist");
});

test("Filter: respects excludeCandidateIds", () => {
  const c1 = makeCandidate({ id: "agent-1" });
  const c2 = makeCandidate({ id: "agent-2" });

  const eligible = filterEligibleCandidates([c1, c2], "text.plan", {
    excludeCandidateIds: ["agent-1"],
  });
  assert.deepEqual(
    eligible.map((c) => c.id),
    ["agent-2"],
  );
});

// ============================================================================
// 2. Sorting Tests Across Every Level
// ============================================================================

test("Sorting Level 1: user priorityBias takes top precedence", () => {
  // cLowCost has cheaper tier and explicit quota, but lower priorityBias
  const cLowCost = makeCandidate({
    id: "agent-low-cost",
    costTier: "free",
    quota: { remaining: 1000, exhausted: false },
    priorityBias: 1,
  });
  // cHighBias has higher priorityBias
  const cHighBias = makeCandidate({
    id: "agent-high-bias",
    costTier: "premium",
    quota: { remaining: 5, exhausted: false },
    priorityBias: 10,
  });

  const sorted = sortCandidates([cLowCost, cHighBias]);
  assert.equal(sorted[0].id, "agent-high-bias");
  assert.equal(sorted[1].id, "agent-low-cost");
});

test("Sorting Level 2: explicit remaining quota takes precedence when priorityBias is tied", () => {
  // Both have equal priorityBias (0)
  // cWithQuota has remaining: 50, but costTier 'standard'
  const cWithQuota = makeCandidate({
    id: "agent-with-quota",
    costTier: "standard",
    quota: { remaining: 50, exhausted: false },
    priorityBias: 0,
  });
  // cNoQuota has costTier 'free', but undefined remaining quota
  const cNoQuota = makeCandidate({
    id: "agent-unmetered-free",
    costTier: "free",
    quota: { remaining: undefined, exhausted: false },
    priorityBias: 0,
  });
  // cZeroQuota has remaining 0
  const cZeroQuota = makeCandidate({
    id: "agent-zero-quota",
    costTier: "cheap",
    quota: { remaining: 0, exhausted: false },
    priorityBias: 0,
  });

  const sorted = sortCandidates([cNoQuota, cZeroQuota, cWithQuota]);
  // cWithQuota has explicit remaining > 0, so it comes first!
  assert.equal(sorted[0].id, "agent-with-quota");
});

test("Sorting Level 3: costTier takes precedence when priorityBias and quota are tied", () => {
  // All three have explicit remaining quota > 0 and same priorityBias
  const cPremium = makeCandidate({
    id: "agent-premium",
    costTier: "premium",
    quota: { remaining: 100, exhausted: false },
    priorityBias: 0,
  });
  const cFree = makeCandidate({
    id: "agent-free",
    costTier: "free",
    quota: { remaining: 100, exhausted: false },
    priorityBias: 0,
  });
  const cCheap = makeCandidate({
    id: "agent-cheap",
    costTier: "cheap",
    quota: { remaining: 100, exhausted: false },
    priorityBias: 0,
  });
  const cStandard = makeCandidate({
    id: "agent-standard",
    costTier: "standard",
    quota: { remaining: 100, exhausted: false },
    priorityBias: 0,
  });

  const sorted = sortCandidates([cPremium, cStandard, cFree, cCheap]);
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["agent-free", "agent-cheap", "agent-standard", "agent-premium"],
  );
});

test("Sorting Level 4: probe latency takes precedence when costTier is tied", () => {
  // Same priorityBias, both have quota, same costTier ('cheap')
  const cSlow = makeCandidate({
    id: "agent-slow",
    costTier: "cheap",
    quota: { remaining: 50, exhausted: false },
    metadata: { probeLatencyMs: 450 },
  });
  const cFast = makeCandidate({
    id: "agent-fast",
    costTier: "cheap",
    quota: { remaining: 50, exhausted: false },
    metadata: { probeLatencyMs: 65 },
  });
  const cUnknownLatency = makeCandidate({
    id: "agent-unknown-latency",
    costTier: "cheap",
    quota: { remaining: 50, exhausted: false },
  });

  const sorted = sortCandidates([cSlow, cUnknownLatency, cFast]);
  assert.equal(sorted[0].id, "agent-fast");
  assert.equal(sorted[1].id, "agent-slow");
  assert.equal(sorted[2].id, "agent-unknown-latency");
});

test("Sorting Level 4 via options.getProbeLatency and probeLatencies map", () => {
  const cA = makeCandidate({ id: "agent-a", costTier: "standard" });
  const cB = makeCandidate({ id: "agent-b", costTier: "standard" });

  const sortedMap = sortCandidates([cA, cB], {
    probeLatencies: { "agent-a": 300, "agent-b": 100 },
  });
  assert.equal(sortedMap[0].id, "agent-b");
  assert.equal(sortedMap[1].id, "agent-a");

  const sortedHook = sortCandidates([cA, cB], {
    getProbeLatency: (c) => (c.id === "agent-a" ? 50 : 200),
  });
  assert.equal(sortedHook[0].id, "agent-a");
  assert.equal(sortedHook[1].id, "agent-b");
});

test("Sorting Level 5: stable tie-breaker by id when all prior levels are tied", () => {
  const cZ = makeCandidate({
    id: "agent-zebra",
    costTier: "cheap",
    priorityBias: 0,
  });
  const cA = makeCandidate({
    id: "agent-alpha",
    costTier: "cheap",
    priorityBias: 0,
  });
  const cM = makeCandidate({
    id: "agent-mike",
    costTier: "cheap",
    priorityBias: 0,
  });

  const sorted = sortCandidates([cZ, cA, cM]);
  assert.deepEqual(
    sorted.map((c) => c.id),
    ["agent-alpha", "agent-mike", "agent-zebra"],
  );
});

// ============================================================================
// 3. resetAt Expiration Recovery Tests
// ============================================================================

test("resetAt: auto-recovers exhausted candidate during selection when resetAt <= now", () => {
  const now = 5_000_000;
  const expiredCandidate = makeCandidate({
    id: "agent-expired-quota",
    quota: { exhausted: true, resetAt: now - 1000 },
  });

  const result = selectCandidate([expiredCandidate], {
    capability: "text.plan",
    now,
  });

  assert.equal(result.status, "selected");
  assert.ok(result.candidate);
  assert.equal(result.candidate.id, "agent-expired-quota");
});

test("resetAt: candidate remains unavailable while resetAt is still in the future", () => {
  const now = 5_000_000;
  const futureCandidate = makeCandidate({
    id: "agent-future-reset",
    quota: { exhausted: true, resetAt: now + 60_000 },
  });

  const result = selectCandidate([futureCandidate], {
    capability: "text.plan",
    now,
  });

  assert.equal(result.status, "no_candidate");
  assert.equal(result.explanation?.reason, "all_exhausted");
});

// ============================================================================
// 4. Budget Gate: Paid Over Budget Needs L2 Confirmation
// ============================================================================

test("Budget: paid work item with remaining budget 0 requires L2 confirmation", () => {
  const candidate = makeCandidate({
    id: "agent-paid-worker",
    costTier: "standard",
  });

  const request: DispatchRequest = {
    capability: "text.plan",
    budgetClass: "paid",
    budget: { remaining: 0 },
    estimatedCost: 10,
  };

  const result = selectCandidate([candidate], request);
  assert.equal(result.status, "needs_confirmation");
  assert.ok(result.candidate);
  assert.equal(result.candidate.id, "agent-paid-worker");
  assert.ok(result.budgetDecision);
  assert.equal(result.budgetDecision.needsConfirmation, true);
  assert.equal(result.budgetDecision.allow, false);
  assert.equal(result.budgetDecision.reason, "zero_budget");
  assert.match(result.message ?? "", /超出预算|L2 确认/);
});

test("Budget: paid work item with insufficient budget requires L2 confirmation", () => {
  const candidate = makeCandidate({
    id: "agent-paid-worker",
    costTier: "standard",
  });

  const request: DispatchRequest = {
    capability: "text.plan",
    budgetClass: "paid",
    budget: { remaining: 5 },
    estimatedCost: 15,
  };

  const result = selectCandidate([candidate], request);
  assert.equal(result.status, "needs_confirmation");
  assert.equal(result.budgetDecision?.reason, "insufficient_budget");
});

test("Budget: paid work item within budget allows auto-dispatch", () => {
  const candidate = makeCandidate({
    id: "agent-paid-worker",
    costTier: "standard",
  });

  const request: DispatchRequest = {
    capability: "text.plan",
    budgetClass: "paid",
    budget: { remaining: 50 },
    estimatedCost: 10,
  };

  const result = selectCandidate([candidate], request);
  assert.equal(result.status, "selected");
  assert.ok(result.candidate);
  assert.equal(result.candidate.id, "agent-paid-worker");
  assert.ok(result.budgetDecision);
  assert.equal(result.budgetDecision.allow, true);
  assert.equal(result.budgetDecision.needsConfirmation, false);
});

test("Budget: user confirmation unlocks dispatch even with 0 budget", () => {
  const candidate = makeCandidate({ id: "agent-paid-worker" });

  const request: DispatchRequest = {
    capability: "text.plan",
    budgetClass: "paid",
    budget: { remaining: 0 },
    confirmed: true,
  };

  const result = selectCandidate([candidate], request);
  assert.equal(result.status, "selected");
  assert.equal(result.budgetDecision?.reason, "user_confirmed");
  assert.equal(result.budgetDecision?.allow, true);
});

test("Budget: free budgetClass always allows regardless of budget state", () => {
  const candidate = makeCandidate({ id: "agent-free-worker" });

  const request: DispatchRequest = {
    capability: "text.plan",
    budgetClass: "free",
    budget: { remaining: 0 },
  };

  const result = selectCandidate([candidate], request);
  assert.equal(result.status, "selected");
});

// ============================================================================
// 5. 429 Fallback Chain Rotation & Non-Blocking Notification Copy
// ============================================================================

test("Fallback: 429 error updates registry cooldown, selects next candidate, and produces notification copy", () => {
  const registry = new AgentRegistry();
  const c1 = makeCandidate({
    id: "worker-openai",
    capabilities: ["text.plan"],
    priorityBias: 10,
  });
  const c2 = makeCandidate({
    id: "worker-deepseek",
    capabilities: ["text.plan"],
    priorityBias: 5,
  });
  registry.register(c1);
  registry.register(c2);

  const dispatcher = new Dispatcher({ registry });
  const request: DispatchRequest = { capability: "text.plan" };

  // First selection picks c1 (worker-openai) due to higher priorityBias
  const initial = dispatcher.selectNext(request);
  assert.equal(initial.status, "selected");
  assert.equal(initial.candidate?.id, "worker-openai");

  // Worker-openai fails with 429 Too Many Requests
  const fallback = dispatcher.handleFailure(
    "worker-openai",
    {
      status: 429,
      message: "Rate limit exceeded. Please retry after 30 seconds.",
      retryAfterMs: 30_000,
    },
    request,
  );

  // Assert classified signal
  assert.equal(fallback.signal.signalType, "RATE_LIMITED");
  assert.equal(fallback.signal.cooldownMs, 30_000);

  // Assert non-blocking notification format: "某某额度用尽，已改走某某。"
  assert.equal(
    fallback.notification,
    "worker-openai 额度用尽，已改走 worker-deepseek。",
  );

  // Assert next candidate is selected
  assert.equal(fallback.decision.status, "selected");
  assert.ok(fallback.nextCandidate);
  assert.equal(fallback.nextCandidate.id, "worker-deepseek");

  // Registry state verification: worker-openai now has cooldownUntil set
  const storedC1 = registry.get("worker-openai");
  assert.ok(storedC1);
  assert.ok(
    storedC1.quota.cooldownUntil && storedC1.quota.cooldownUntil > Date.now(),
  );
});

test("Fallback: 402 / insufficient_quota marks candidate exhausted and rotates chain", () => {
  const registry = new AgentRegistry();
  const c1 = makeCandidate({
    id: "worker-primary",
    capabilities: ["image.generate"],
    priorityBias: 10,
  });
  const c2 = makeCandidate({
    id: "worker-secondary",
    capabilities: ["image.generate"],
    priorityBias: 5,
  });
  registry.register(c1);
  registry.register(c2);

  const dispatcher = new Dispatcher({ registry });
  const request: DispatchRequest = { capability: "image.generate" };

  const fallback = dispatcher.handleFailure(
    "worker-primary",
    {
      status: 402,
      message: "insufficient_quota: You have exceeded your current quota.",
    },
    request,
  );

  assert.equal(fallback.signal.signalType, "INSUFFICIENT_QUOTA");
  assert.equal(
    fallback.notification,
    "worker-primary 额度用尽，已改走 worker-secondary。",
  );
  assert.equal(fallback.nextCandidate?.id, "worker-secondary");

  // Registry state: worker-primary is marked exhausted
  const storedC1 = registry.get("worker-primary");
  assert.ok(storedC1);
  assert.equal(storedC1.quota.exhausted, true);
  assert.equal(storedC1.health, "degraded");
});

test("Fallback: when all candidates in chain fail, returns structured no_candidate", () => {
  const registry = new AgentRegistry();
  const c1 = makeCandidate({
    id: "lone-worker",
    capabilities: ["text.plan"],
  });
  registry.register(c1);

  const dispatcher = new Dispatcher({ registry });
  const request: DispatchRequest = { capability: "text.plan" };

  const fallback = dispatcher.handleFailure(
    "lone-worker",
    { status: 429, message: "Too many requests" },
    request,
  );

  assert.equal(fallback.decision.status, "no_candidate");
  assert.equal(fallback.nextCandidate, undefined);
  assert.equal(
    fallback.notification,
    "lone-worker 额度用尽，无可用备选通道。",
  );
  assert.ok(fallback.decision.explanation);
  assert.equal(fallback.decision.explanation.reason, "cooling_down");
});

// ============================================================================
// 6. Structured No Candidate Explanations Without Throwing
// ============================================================================

test("No candidate: missing credentials when no candidate provides capability", () => {
  const c1 = makeCandidate({ capabilities: ["text.chat"] });
  const result = selectCandidate([c1], { capability: "code.edit" });

  assert.equal(result.status, "no_candidate");
  assert.ok(result.explanation);
  assert.equal(result.explanation.reason, "missing_credentials");
  assert.equal(result.explanation.missingCapability, "code.edit");
  assert.match(result.explanation.suggestion, /配置相关模型 API Key/);
  assert.match(result.explanation.message, /未找到支持能力/);
});

test("No candidate: main agent cannot do image/video, returns unsupported_capability explanation", () => {
  const mainAgent = makeCandidate({
    id: "main-codex",
    roleHint: "main",
    capabilities: ["text.plan", "image.generate"],
  });

  const result = selectCandidate([mainAgent], { capability: "image.generate" });
  assert.equal(result.status, "no_candidate");
  assert.ok(result.explanation);
  assert.equal(result.explanation.reason, "unsupported_capability");
  assert.match(
    result.explanation.message,
    /主 Agent 不得自己硬扛生图或视频任务/,
  );
  assert.match(result.explanation.suggestion, /添加支持该媒体能力的专用子 Agent/);
});

test("No candidate: all exhausted diagnostics and suggestion", () => {
  const c1 = makeCandidate({
    id: "w1",
    capabilities: ["text.plan"],
    quota: { exhausted: true },
  });
  const c2 = makeCandidate({
    id: "w2",
    capabilities: ["text.plan"],
    quota: { exhausted: true },
  });

  const result = selectCandidate([c1, c2], { capability: "text.plan" });
  assert.equal(result.status, "no_candidate");
  assert.equal(result.explanation?.reason, "all_exhausted");
  assert.match(result.explanation?.message ?? "", /额度均已耗尽/);
  assert.match(result.explanation?.suggestion ?? "", /补充通道额度|更换备用模型/);
});

test("No candidate: all down diagnostics and suggestion", () => {
  const c1 = makeCandidate({
    id: "w1",
    capabilities: ["text.plan"],
    health: "down",
  });

  const result = selectCandidate([c1], { capability: "text.plan" });
  assert.equal(result.status, "no_candidate");
  assert.equal(result.explanation?.reason, "all_down");
  assert.match(result.explanation?.message ?? "", /不可用状态/);
});

// ============================================================================
// 7. Security: Fake Keys and Credentials NEVER Leak
// ============================================================================

test("SECURITY: fake API keys NEVER leak into return values, explanations, notifications, or debug logs", () => {
  const FAKE_KEY = "sk-antigravity-secret-key-12345678";
  const FAKE_GOOGLE_KEY = "AIzaSyD-super-secret-google-cloud-key-999";

  const secretCandidate = makeCandidate({
    id: `agent-with-secret-${FAKE_KEY}`,
    metadata: {
      apiKey: FAKE_KEY,
      rawToken: `Bearer ${FAKE_KEY}`,
      nested: {
        googleKey: FAKE_GOOGLE_KEY,
      },
    },
  });

  const registry = new AgentRegistry([secretCandidate], {
    knownSecrets: [FAKE_KEY, FAKE_GOOGLE_KEY],
  });

  const dispatcher = new Dispatcher({
    registry,
    knownSecrets: [FAKE_KEY, FAKE_GOOGLE_KEY],
  });

  // 1. Check selectNext return value
  const selectResult = dispatcher.selectNext({ capability: "text.plan" });
  const selectJson = JSON.stringify(selectResult);
  assert.equal(selectJson.includes(FAKE_KEY), false);
  assert.equal(selectJson.includes(FAKE_GOOGLE_KEY), false);
  assert.match(selectJson, /\[REDACTED\]/);

  // 2. Check handleFailure notification and result
  const fallbackResult = dispatcher.handleFailure(
    `agent-with-secret-${FAKE_KEY}`,
    {
      status: 429,
      message: `Rate limit on endpoint with key ${FAKE_KEY}`,
    },
    { capability: "text.plan" },
  );

  const fallbackJson = JSON.stringify(fallbackResult);
  assert.equal(fallbackJson.includes(FAKE_KEY), false);
  assert.equal(fallbackResult.notification.includes(FAKE_KEY), false);
  assert.match(fallbackResult.notification, /\[REDACTED\]/);

  // 3. Check explainNoCandidates
  const explanation = explainNoCandidates(
    [secretCandidate],
    `custom-cap-${FAKE_KEY}`,
    { knownSecrets: [FAKE_KEY] },
  );
  const expJson = JSON.stringify(explanation);
  assert.equal(expJson.includes(FAKE_KEY), false);

  // 4. Check dumpSafeDebug
  const debugDump = dispatcher.dumpSafeDebug();
  assert.equal(debugDump.includes(FAKE_KEY), false);
  assert.equal(debugDump.includes(FAKE_GOOGLE_KEY), false);
});

// ============================================================================
// 8. Pure Functions and Helper Coverage
// ============================================================================

test("Pure functions: isMediaCapability correctly classifies media and non-media tasks", () => {
  assert.equal(isMediaCapability("image.generate"), true);
  assert.equal(isMediaCapability("image.outpaint"), true);
  assert.equal(isMediaCapability("video.generate"), true);
  assert.equal(isMediaCapability("audio.tts"), true);
  assert.equal(isMediaCapability("text.plan"), false);
  assert.equal(isMediaCapability("text.chat"), false);
  assert.equal(isMediaCapability("code.edit"), false);
});

test("Pure functions: formatFallbackNotification handles next candidate and empty chain", () => {
  assert.equal(
    formatFallbackNotification("codex", "openai-compat"),
    "codex 额度用尽，已改走 openai-compat。",
  );
  assert.equal(
    formatFallbackNotification("codex"),
    "codex 额度用尽，无可用备选通道。",
  );
});

test("Pure functions: handleDispatchFallback standalone without class instance", () => {
  const registry = new AgentRegistry([
    makeCandidate({ id: "a", capabilities: ["text.plan"] }),
    makeCandidate({ id: "b", capabilities: ["text.plan"] }),
  ]);

  const fallback = handleDispatchFallback(
    registry,
    "a",
    { status: 429, message: "Too Many Requests" },
    { capability: "text.plan" },
  );

  assert.equal(fallback.signal.signalType, "RATE_LIMITED");
  assert.equal(fallback.nextCandidate?.id, "b");
  assert.equal(fallback.notification, "a 额度用尽，已改走 b。");
});

test("Pure functions: isCandidateEligible standalone predicate", () => {
  const c = makeCandidate({
    id: "candidate-eligible-test",
    capabilities: ["text.plan"],
    health: "ok",
    quota: { exhausted: false },
  });

  assert.equal(isCandidateEligible(c, "text.plan"), true);
  assert.equal(isCandidateEligible(c, "image.generate"), false);
  assert.equal(
    isCandidateEligible(c, "text.plan", {
      excludeCandidateIds: ["candidate-eligible-test"],
    }),
    false,
  );
});

test("Factory: createDispatcher instantiates Dispatcher properly", () => {
  const dispatcher = createDispatcher();
  assert.ok(dispatcher instanceof Dispatcher);
  assert.ok(dispatcher.getRegistry() instanceof AgentRegistry);
});
