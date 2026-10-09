import assert from "node:assert/strict";
import test from "node:test";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";
import type { ChannelAdapter } from "../../src/features/ai-gateway/channels/adapter.ts";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";
import type { NormalizedError } from "../../src/features/ai-gateway/errors.ts";
import { extractNormalized, Scheduler } from "../../src/features/ai-gateway/scheduler.ts";

const capabilities: CapabilityManifest = {
  modalities: ["image"],
  operations: ["generate"],
  maxOutputs: 1,
  async: false,
};

const FIXED_NOW = 1_700_000_000_000;

/** In-memory adapter: no inherited method may reach the network. */
const offlineAdapter: ChannelAdapter = {
  ...doubaoAdapter,
  provider: "offline",
  async submit() {
    return { kind: "inline", assetBase64: "aGk=", mime: "text/plain" };
  },
  async poll() {
    return { status: "succeeded", assetBase64: "aGk=", mime: "text/plain" };
  },
};

const request = {
  model: "kk-default",
  operation: "generate",
  input: { model: "kk-default", prompt: "a cat", attachments: [] },
  idempotencyKey: "job-1",
  resolveSecret: async () => "secret",
};

/** Deterministic defaults: weighted random plus wall clock cause flaky tests. */
function schedulerWith(registrations: ChannelRegistration[]): Scheduler {
  const registry = new ChannelRegistry();
  for (const adapter of new Set(registrations.map((entry) => entry.adapter)))
    registry.registerAdapter(adapter);
  registry.replace({ registrations, states: new Map() });
  return new Scheduler(registry, { random: () => 0, now: () => FIXED_NOW });
}

function registration(
  id: string,
  overrides: Partial<ChannelRegistration> = {},
): ChannelRegistration {
  return {
    id,
    adapter: offlineAdapter,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    credentialRef: `conn.${id}`,
    capabilities,
    modelMapping: { "kk-default": "ep-20260101abcdef" },
    timeoutMs: 30_000,
    ...overrides,
  };
}

/** Adapter whose submit outcome is scripted, with a call counter. */
function scriptedAdapter(
  provider: string,
  behavior: Array<{ ok: boolean; normalized?: NormalizedError }>,
): { adapter: ChannelAdapter; calls: () => number } {
  let calls = 0;
  const adapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider,
    async submit() {
      const index = calls++;
      const step = behavior[Math.min(index, behavior.length - 1)]!;
      if (step.ok) return { kind: "inline", assetBase64: "aGk=", mime: "text/plain" };
      throw Object.assign(new Error(step.normalized?.errorClass ?? "fail"), {
        normalized: step.normalized,
      });
    },
    async poll() {
      return { status: "succeeded", assetBase64: "aGk=", mime: "text/plain" };
    },
  };
  return { adapter, calls: () => calls };
}

const rateLimited: NormalizedError = {
  errorClass: "RATE_LIMITED",
  httpStatus: 429,
  retryable: true,
  cooldownMs: 60_000,
};

test("a successful dispatch reports the channel that served it", async () => {
  const scheduler = schedulerWith([registration("a")]);
  const outcome = await scheduler.dispatch(request);
  assert.equal(outcome.kind, "inline");
  assert.equal(outcome.channelId, "a");
});

test("a retryable failure moves to the next tier, never the same account", async () => {
  const failing = scriptedAdapter("failprov", [{ ok: false, normalized: rateLimited }]);
  const scheduler = schedulerWith([
    // Distinct tiers so the attempt order is deterministic.
    registration("bad", { adapter: failing.adapter, priority: 100 }),
    registration("good", { priority: 50 }),
  ]);
  const outcome = await scheduler.dispatch(request);
  assert.equal(outcome.channelId, "good");
  assert.equal(failing.calls(), 1, "the failing account must be tried exactly once");
});

test("a non-retryable error aborts the whole dispatch", async () => {
  // Content policy describes the prompt, not the account: another account would
  // reject it identically while piling up risk signals on the platform.
  const blocked = scriptedAdapter("blockprov", [
    {
      ok: false,
      normalized: {
        errorClass: "CONTENT_BLOCKED",
        httpStatus: 400,
        retryable: false,
      },
    },
  ]);
  const healthy = scriptedAdapter("healthyprov", [{ ok: true }]);
  const scheduler = schedulerWith([
    registration("blocked", { adapter: blocked.adapter, priority: 100 }),
    registration("healthy", { adapter: healthy.adapter, priority: 50 }),
  ]);
  await assert.rejects(
    () => scheduler.dispatch(request),
    (error: unknown) => extractNormalized(error).errorClass === "CONTENT_BLOCKED",
  );
  assert.equal(healthy.calls(), 0, "a rejected prompt must not reach other accounts");
});

test("nothing is retried once the first chunk reached the client", async () => {
  let started = false;
  const adapter: ChannelAdapter = {
    ...offlineAdapter,
    provider: "streamprov",
    async submit() {
      started = true;
      throw Object.assign(new Error("late failure"), {
        normalized: { errorClass: "UPSTREAM_ERROR", httpStatus: 502, retryable: true },
      });
    },
  };
  const fallback = scriptedAdapter("fallbackprov", [{ ok: true }]);
  const scheduler = schedulerWith([
    registration("a", { adapter, priority: 100 }),
    registration("b", { adapter: fallback.adapter, priority: 50 }),
  ]);
  await assert.rejects(
    () => scheduler.dispatch({ ...request, streamStarted: () => started }),
    (error: unknown) => extractNormalized(error).errorClass === "UPSTREAM_ERROR",
  );
  assert.equal(fallback.calls(), 0, "retrying would duplicate output the client already has");
});

test("a sticky session stays on its account across turns", async () => {
  const scheduler = schedulerWith([
    registration("a", { priority: 100 }),
    registration("b", { priority: 50 }),
  ]);
  const first = await scheduler.dispatch({ ...request, sessionId: "s1" });
  const second = await scheduler.dispatch({ ...request, sessionId: "s1" });
  assert.equal(first.channelId, second.channelId);
});

test("a failing pinned account is released so the conversation cannot stall", async () => {
  let failNext = false;
  const flaky: ChannelAdapter = {
    ...offlineAdapter,
    provider: "flakyprov",
    async submit() {
      if (failNext)
        throw Object.assign(new Error("down"), {
          normalized: { errorClass: "UPSTREAM_ERROR", httpStatus: 502, retryable: true, cooldownMs: 0 },
        });
      return { kind: "inline", assetBase64: "aGk=", mime: "text/plain" };
    },
  };
  const scheduler = schedulerWith([
    registration("a", { adapter: flaky, priority: 100 }),
    registration("b", { priority: 50 }),
  ]);
  const first = await scheduler.dispatch({ ...request, sessionId: "s2" });
  assert.equal(first.channelId, "a");
  failNext = true;
  const second = await scheduler.dispatch({ ...request, sessionId: "s2" });
  // Losing context is acceptable; a dead conversation is not.
  assert.equal(second.channelId, "b");
});

test("an account in cooldown is skipped until it recovers", async () => {
  const scheduler = schedulerWith([
    registration("bad", {
      adapter: scriptedAdapter("coolprov", [{ ok: false, normalized: rateLimited }]).adapter,
      priority: 100,
    }),
    registration("good", { priority: 50 }),
  ]);
  await scheduler.dispatch(request);
  assert.equal(scheduler.health().isAvailable("bad"), false);
  assert.equal(scheduler.health().isAvailable("good"), true);
  scheduler.health().reset("bad");
  assert.equal(scheduler.health().isAvailable("bad"), true);
});

test("a vendor cooldown hint outranks locally computed backoff", async () => {
  const scheduler = schedulerWith([
    registration("only", {
      adapter: scriptedAdapter("quotaprov", [
        {
          ok: false,
          normalized: {
            errorClass: "QUOTA_EXHAUSTED",
            httpStatus: 429,
            retryable: true,
            cooldownMs: 6 * 60 * 60 * 1000,
          },
        },
      ]).adapter,
    }),
  ]);
  await assert.rejects(() => scheduler.dispatch(request));
  const state = scheduler.health().state("only");
  // Six hours, not the 2s our own backoff would have chosen.
  assert.equal(state.cooldownUntil - FIXED_NOW, 6 * 60 * 60 * 1000);
});

test("repeated failures quarantine an account", async () => {
  const scheduler = schedulerWith([
    registration("bad", {
      adapter: scriptedAdapter("alwaysprov", [
        { ok: false, normalized: { errorClass: "UPSTREAM_ERROR", httpStatus: 502, retryable: true, cooldownMs: 0 } },
      ]).adapter,
      priority: 100,
    }),
    registration("good", { priority: 50 }),
  ]);
  for (let i = 0; i < 6; i += 1) await scheduler.dispatch(request);
  assert.equal(scheduler.health().state("bad").quarantined, true);
  assert.equal(scheduler.health().isAvailable("bad"), false);
});

test("success clears the accumulated failure state", async () => {
  const scheduler = schedulerWith([registration("a")]);
  await scheduler.dispatch({ ...request, idempotencyKey: "warm" });
  assert.equal(scheduler.health().state("a").consecutiveFailures, 0);
});

test("an unservable model rejects with NO_CHANNEL_AVAILABLE", async () => {
  const scheduler = schedulerWith([registration("a")]);
  await assert.rejects(
    () => scheduler.dispatch({ ...request, model: "kk-unknown" }),
    (error: unknown) => extractNormalized(error).errorClass === "NO_CHANNEL_AVAILABLE",
  );
});

test("polling an unknown channel is a routing error, not a transient 503", async () => {
  const scheduler = schedulerWith([registration("a")]);
  await assert.rejects(
    () =>
      scheduler.poll("nope", "job", {
        idempotencyKey: "k",
        resolveSecret: async () => "secret",
      }),
    (error: unknown) => extractNormalized(error).errorClass === "NO_CHANNEL_AVAILABLE",
  );
});

test("polling resolves the secret through the credential reference", async () => {
  const seen: Array<unknown> = [];
  const adapter: ChannelAdapter = {
    ...offlineAdapter,
    provider: "pollprov",
    async poll(_context, _job, ctx) {
      seen.push(await ctx.resolveSecret());
      return { status: "succeeded", assetBase64: "aGk=", mime: "text/plain" };
    },
  };
  const scheduler = schedulerWith([
    registration("chan", { adapter, credentialRef: "conn.chan" }),
  ]);
  const state = await scheduler.poll("chan", "provider-job-1", {
    idempotencyKey: "k",
    resolveSecret: async (ref) => {
      seen.push(ref);
      return ref ? `secret-for-${ref}` : undefined;
    },
  });
  assert.equal(state.status, "succeeded");
  // Regression: polling used to pass the channel id where the vault expects a
  // credential ref, so every poll of an async task failed with AUTH_INVALID.
  assert.deepEqual(seen, ["conn.chan", "secret-for-conn.chan"]);
});

test("the attempt plan steps down tiers and stops at the last one", async () => {
  const scheduler = schedulerWith([
    registration("top", { priority: 100 }),
    registration("mid", { priority: 50 }),
  ]);
  assert.equal(scheduler.plan("kk-default", "generate", 0)[0]!.channelId, "top");
  assert.equal(scheduler.plan("kk-default", "generate", 1)[0]!.channelId, "mid");
  // A single-account setup must still be able to retry its own account.
  assert.equal(scheduler.plan("kk-default", "generate", 9)[0]!.channelId, "mid");
  assert.deepEqual(scheduler.plan("kk-none", "generate", 0), []);
});

test("extractNormalized always yields a usable classification", () => {
  assert.equal(extractNormalized(new Error("plain")).errorClass, "UPSTREAM_ERROR");
  assert.equal(extractNormalized("string").errorClass, "UPSTREAM_ERROR");
  assert.equal(
    extractNormalized(Object.assign(new Error("x"), { normalized: rateLimited })).errorClass,
    "RATE_LIMITED",
  );
});
