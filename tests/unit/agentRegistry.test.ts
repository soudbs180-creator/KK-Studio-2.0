/**
 * Unit tests for KK Studio Agent Registry (Task 1.10).
 *
 * Verifies:
 * 1. Filtering candidates with QuotaState exhausted.
 * 2. Automatic and manual recovery when resetAt expires (resetAt <= now).
 * 3. Multi-dimensional filtering (capability, cooldown, health, roleHint, costTier).
 * 4. Fake API keys and secrets NEVER leak into return values, metadata, or debug logs.
 * 5. Registry CRUD and state transition safeguards.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentRegistry,
  createAgentRegistry,
  filterCandidates,
  isCandidateAvailable,
  sanitizeCandidate,
} from "../../src/features/agent-dispatch/agentRegistry.ts";
import type {
  DispatchCandidate,
  QuotaSignal,
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

test("AgentRegistry: registers, retrieves, and unregisters candidates", () => {
  const registry = new AgentRegistry();
  assert.equal(registry.size, 0);

  const c1 = makeCandidate({ id: "agent-1", capabilities: ["text.plan"] });
  const c2 = makeCandidate({ id: "agent-2", capabilities: ["image.generate"] });

  registry.register(c1);
  registry.register(c2);

  assert.equal(registry.size, 2);
  assert.equal(registry.has("agent-1"), true);
  assert.equal(registry.has("agent-2"), true);
  assert.equal(registry.has("agent-3"), false);

  const retrieved = registry.get("agent-1");
  assert.ok(retrieved);
  assert.equal(retrieved.id, "agent-1");
  assert.deepEqual(retrieved.capabilities, ["text.plan"]);

  // Unregister
  assert.equal(registry.unregister("agent-1"), true);
  assert.equal(registry.size, 1);
  assert.equal(registry.has("agent-1"), false);
  assert.equal(registry.unregister("non-existent"), false);

  // Clear
  registry.clear();
  assert.equal(registry.size, 0);
});

test("AgentRegistry: candidate isolation prevents external mutation", () => {
  const original = makeCandidate({
    id: "isolated-agent",
    capabilities: ["text.plan"],
    quota: { exhausted: false },
  });

  const registry = new AgentRegistry([original]);

  // Mutating original outside should not corrupt registry
  original.capabilities.push("malicious.mutation");
  original.quota.exhausted = true;

  const fromRegistry = registry.get("isolated-agent");
  assert.ok(fromRegistry);
  assert.equal(fromRegistry.capabilities.includes("malicious.mutation"), false);
  assert.equal(fromRegistry.quota.exhausted, false);

  // Mutating retrieved object should not corrupt registry
  fromRegistry.quota.exhausted = true;
  const retrievedAgain = registry.get("isolated-agent");
  assert.ok(retrievedAgain);
  assert.equal(retrievedAgain.quota.exhausted, false);
});

test("AgentRegistry: candidate list filters out QuotaState exhausted by default", () => {
  const now = 1_700_000_000_000;
  const registry = createAgentRegistry(
    [
      makeCandidate({
        id: "active-agent",
        capabilities: ["text.plan"],
        quota: { exhausted: false },
      }),
      makeCandidate({
        id: "exhausted-no-reset",
        capabilities: ["text.plan"],
        quota: { exhausted: true },
      }),
      makeCandidate({
        id: "exhausted-future-reset",
        capabilities: ["text.plan"],
        quota: { exhausted: true, resetAt: now + 60_000 },
      }),
    ],
    { now: () => now },
  );

  const available = registry.getAvailableCandidates({ now });
  assert.equal(available.length, 1);
  assert.equal(available[0].id, "active-agent");

  // If includeExhausted is explicitly requested, all 3 are returned
  const allIncludingExhausted = registry.getAvailableCandidates({
    includeExhausted: true,
    now,
  });
  assert.equal(allIncludingExhausted.length, 3);
});

test("AgentRegistry: resetAt recovery automatically unlocks candidate when time arrives", () => {
  const baseTime = 1_700_000_000_000;
  const resetTimestamp = baseTime + 30_000; // 30 seconds later

  const registry = new AgentRegistry(
    [
      makeCandidate({
        id: "auto-recovering-agent",
        capabilities: ["text.plan"],
        quota: { exhausted: true, resetAt: resetTimestamp },
        health: "degraded",
      }),
    ],
    { now: () => baseTime },
  );

  // 1. Before resetAt -> candidate is filtered out
  const beforeReset = registry.getAvailableCandidates({
    now: baseTime + 10_000,
  });
  assert.equal(beforeReset.length, 0);

  // 2. Exactly at resetAt -> candidate is recovered and returned
  const atReset = registry.getAvailableCandidates({ now: resetTimestamp });
  assert.equal(atReset.length, 1);
  assert.equal(atReset[0].id, "auto-recovering-agent");
  assert.equal(atReset[0].quota.exhausted, false);
  assert.equal(atReset[0].health, "ok");

  // 3. After resetAt -> candidate remains available
  const afterReset = registry.getAvailableCandidates({
    now: resetTimestamp + 5_000,
  });
  assert.equal(afterReset.length, 1);
  assert.equal(afterReset[0].id, "auto-recovering-agent");
});

test("AgentRegistry: sweepExpiredResets sweeps and recovers candidates", () => {
  const now = 2_000_000;
  const registry = new AgentRegistry(
    [
      makeCandidate({
        id: "cand-expired-1",
        quota: { exhausted: true, resetAt: now - 500 },
        health: "degraded",
      }),
      makeCandidate({
        id: "cand-expired-2",
        quota: { exhausted: true, resetAt: now },
        health: "degraded",
      }),
      makeCandidate({
        id: "cand-future",
        quota: { exhausted: true, resetAt: now + 500 },
        health: "degraded",
      }),
      makeCandidate({
        id: "cand-active",
        quota: { exhausted: false },
        health: "ok",
      }),
    ],
    { now: () => now },
  );

  const recovered = registry.sweepExpiredResets(now);
  assert.equal(recovered.length, 2);
  const recoveredIds = recovered.map((c) => c.id).sort();
  assert.deepEqual(recoveredIds, ["cand-expired-1", "cand-expired-2"]);

  // In registry, cand-future is still exhausted, while others are active
  const futureCand = registry.get("cand-future");
  assert.ok(futureCand);
  assert.equal(futureCand.quota.exhausted, true);

  const active1 = registry.get("cand-expired-1");
  assert.ok(active1);
  assert.equal(active1.quota.exhausted, false);
  assert.equal(active1.health, "ok");
});

test("AgentRegistry: markExhausted and manual recoverExhausted", () => {
  const baseTime = 1_000_000;
  const registry = new AgentRegistry([
    makeCandidate({
      id: "worker-a",
      quota: { exhausted: false },
      health: "ok",
    }),
  ]);

  // Mark exhausted with resetAt
  const marked = registry.markExhausted("worker-a", {
    resetAt: baseTime + 10_000,
    cooldownMs: 5_000,
    now: baseTime,
  });
  assert.ok(marked);
  assert.equal(marked.quota.exhausted, true);
  assert.equal(marked.quota.resetAt, baseTime + 10_000);
  assert.equal(marked.quota.cooldownUntil, baseTime + 5_000);
  assert.equal(marked.health, "degraded");

  // Verify candidate is unavailable
  const candidatesBefore = registry.getAvailableCandidates({ now: baseTime });
  assert.equal(candidatesBefore.length, 0);

  // Manually recover exhausted early (e.g. user refreshed or added credits)
  const recovered = registry.recoverExhausted("worker-a", {
    now: baseTime + 6_000,
  });
  assert.ok(recovered);
  assert.equal(recovered.quota.exhausted, false);
  assert.equal(recovered.quota.resetAt, undefined);
  assert.equal(recovered.health, "ok");

  // Candidate is available again
  const candidatesAfter = registry.getAvailableCandidates({
    now: baseTime + 6_000,
  });
  assert.equal(candidatesAfter.length, 1);
});

test("AgentRegistry: multi-dimensional candidate filtering", () => {
  const now = 5_000_000;
  const registry = new AgentRegistry([
    makeCandidate({
      id: "planner-codex",
      kind: "codex",
      roleHint: "main",
      capabilities: ["text.plan", "text.chat"],
      costTier: "premium",
      health: "ok",
    }),
    makeCandidate({
      id: "worker-ollama",
      kind: "ollama",
      roleHint: "worker",
      capabilities: ["text.chat", "code.edit"],
      costTier: "free",
      health: "ok",
    }),
    makeCandidate({
      id: "artist-comfy",
      kind: "comfy",
      roleHint: "specialist",
      capabilities: ["image.generate", "image.outpaint"],
      costTier: "free",
      health: "ok",
    }),
    makeCandidate({
      id: "down-worker",
      kind: "openai-compat",
      capabilities: ["text.plan"],
      health: "down",
    }),
    makeCandidate({
      id: "cooling-worker",
      kind: "openai-compat",
      capabilities: ["text.plan"],
      quota: { exhausted: false, cooldownUntil: now + 50_000 },
      health: "ok",
    }),
  ]);

  // 1. Filter by single capability string shorthand
  const planners = registry.getAvailableCandidates("text.plan", { now });
  assert.equal(planners.length, 1);
  assert.equal(planners[0].id, "planner-codex");

  // 2. Filter by artist capability
  const artists = registry.getAvailableCandidates("image.generate", { now });
  assert.equal(artists.length, 1);
  assert.equal(artists[0].id, "artist-comfy");

  // 3. Filter by roleHint
  const workers = registry.getAvailableCandidates({ roleHint: "worker", now });
  assert.equal(workers.length, 1);
  assert.equal(workers[0].id, "worker-ollama");

  // 4. Filter by costTier
  const freeAgents = registry.getAvailableCandidates({ costTier: "free", now });
  assert.equal(freeAgents.length, 2);
  const freeIds = freeAgents.map((a) => a.id).sort();
  assert.deepEqual(freeIds, ["artist-comfy", "worker-ollama"]);

  // 5. Down and cooling down are excluded by default
  const allAvailable = registry.getAvailableCandidates({ now });
  assert.equal(allAvailable.length, 3);

  // 6. Explicitly include down and cooling down
  const includingAll = registry.getAvailableCandidates({
    includeDown: true,
    includeCoolingDown: true,
    now,
  });
  assert.equal(includingAll.length, 5);
});

test("AgentRegistry: updates health, quota, cooldown, and records signals", () => {
  const now = 100_000;
  const registry = new AgentRegistry([
    makeCandidate({ id: "agent-x", health: "ok", quota: { exhausted: false } }),
  ]);

  // Update health
  registry.updateHealth("agent-x", "degraded");
  assert.equal(registry.get("agent-x")?.health, "degraded");

  // Apply cooldown
  registry.applyCooldown("agent-x", 10_000, { now });
  assert.equal(registry.get("agent-x")?.quota.cooldownUntil, 110_000);

  // Clear cooldown
  registry.clearCooldown("agent-x");
  assert.equal(registry.get("agent-x")?.quota.cooldownUntil, undefined);

  // Update quota
  registry.updateQuota("agent-x", { remaining: 42 });
  assert.equal(registry.get("agent-x")?.quota.remaining, 42);

  // Record QuotaSignal
  const rateLimitSignal: QuotaSignal = {
    signalType: "RATE_LIMITED",
    retryable: true,
    cooldownMs: 20_000,
    httpStatus: 429,
  };
  registry.recordSignal("agent-x", rateLimitSignal, { now });
  assert.equal(registry.get("agent-x")?.quota.cooldownUntil, 120_000);
});

test("SECURITY: fake API keys and secrets NEVER leak into return values, metadata, or logs", () => {
  const FAKE_OPENAI_KEY = "sk-proj-test123456789012345678901234567890";
  const FAKE_GOOGLE_KEY = "AIzaSyD-TestFakeKey9876543210123456789";
  const FAKE_BEARER_TOKEN = "bearer test-token-secret-xyz-999";
  const CUSTOM_KEYWORD_SECRET = "custom_super_secret_password_phrase";

  const candidateWithSecrets = makeCandidate({
    id: `candidate-${FAKE_OPENAI_KEY}`,
    runtimeRef: `ref-${FAKE_GOOGLE_KEY}`,
    capabilities: ["text.plan", `cap-${CUSTOM_KEYWORD_SECRET}`],
    metadata: {
      apiKey: FAKE_OPENAI_KEY,
      googleKey: FAKE_GOOGLE_KEY,
      nested: {
        authHeader: FAKE_BEARER_TOKEN,
        secretPhrase: CUSTOM_KEYWORD_SECRET,
      },
      list: [FAKE_OPENAI_KEY, "normal-value"],
    },
  });

  const registry = new AgentRegistry([candidateWithSecrets], {
    knownSecrets: [CUSTOM_KEYWORD_SECRET, FAKE_OPENAI_KEY],
  });

  // 1. Candidate retrieved via get() has all secrets redacted
  const retrieved = registry.get(`candidate-${FAKE_OPENAI_KEY}`);
  assert.ok(retrieved);

  // The id, runtimeRef, capabilities, and metadata MUST NOT contain raw secrets
  const retrievedJson = JSON.stringify(retrieved);
  assert.equal(retrievedJson.includes(FAKE_OPENAI_KEY), false);
  assert.equal(retrievedJson.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(retrievedJson.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(retrievedJson.includes(CUSTOM_KEYWORD_SECRET), false);
  assert.ok(retrievedJson.includes("[REDACTED]"));

  // 2. getAvailableCandidates() returns sanitized candidates
  const available = registry.getAvailableCandidates();
  assert.equal(available.length, 1);
  const availableJson = JSON.stringify(available);
  assert.equal(availableJson.includes(FAKE_OPENAI_KEY), false);
  assert.equal(availableJson.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(availableJson.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(availableJson.includes(CUSTOM_KEYWORD_SECRET), false);

  // 3. dumpSafeDebug() string contains zero raw secrets
  const debugString = registry.dumpSafeDebug();
  assert.equal(debugString.includes(FAKE_OPENAI_KEY), false);
  assert.equal(debugString.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(debugString.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(debugString.includes(CUSTOM_KEYWORD_SECRET), false);
  assert.ok(debugString.includes("[REDACTED]"));

  // 4. Standalone sanitizeCandidate helper verification
  const sanitizedDirect = sanitizeCandidate(candidateWithSecrets, [
    CUSTOM_KEYWORD_SECRET,
    FAKE_OPENAI_KEY,
  ]);
  const directJson = JSON.stringify(sanitizedDirect);
  assert.equal(directJson.includes(FAKE_OPENAI_KEY), false);
  assert.equal(directJson.includes(FAKE_GOOGLE_KEY), false);
  assert.equal(directJson.includes(FAKE_BEARER_TOKEN), false);
  assert.equal(directJson.includes(CUSTOM_KEYWORD_SECRET), false);
});

test("Pure functions: isCandidateAvailable and filterCandidates work standalone", () => {
  const now = 100_000;
  const candExhausted = makeCandidate({
    id: "cand-exhausted",
    quota: { exhausted: true, resetAt: now + 5_000 },
  });
  const candRecovered = makeCandidate({
    id: "cand-recovered",
    quota: { exhausted: true, resetAt: now - 1 },
  });
  const candCooling = makeCandidate({
    id: "cand-cooling",
    quota: { exhausted: false, cooldownUntil: now + 1_000 },
  });
  const candDown = makeCandidate({
    id: "cand-down",
    health: "down",
  });
  const candNormal = makeCandidate({
    id: "cand-normal",
    capabilities: ["image.generate"],
  });

  // isCandidateAvailable
  assert.equal(isCandidateAvailable(candExhausted, { now }), false);
  assert.equal(isCandidateAvailable(candRecovered, { now }), true);
  assert.equal(isCandidateAvailable(candCooling, { now }), false);
  assert.equal(isCandidateAvailable(candDown, { now }), false);
  assert.equal(isCandidateAvailable(candNormal, { now }), true);
  assert.equal(
    isCandidateAvailable(candNormal, { now, capability: "text.plan" }),
    false,
  );
  assert.equal(
    isCandidateAvailable(candNormal, { now, capability: "image.generate" }),
    true,
  );

  // filterCandidates
  const all = [candExhausted, candRecovered, candCooling, candDown, candNormal];
  const filtered = filterCandidates(all, { now });
  assert.equal(filtered.length, 2);
  const ids = filtered.map((c) => c.id).sort();
  assert.deepEqual(ids, ["cand-normal", "cand-recovered"]);
});
