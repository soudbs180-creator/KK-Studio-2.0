import assert from "node:assert/strict";
import test from "node:test";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";
import {
  alreadyNormalized,
  normalizeUnknownFailure,
  type ChannelAdapter,
  type ChannelContext,
} from "../../src/features/ai-gateway/channels/adapter.ts";
import {
  ARK_BASE_URL,
  doubaoAdapter,
  isArkEndpointId,
} from "../../src/features/ai-gateway/channels/doubao.ts";
import {
  ChannelRegistry,
  supportsOperation,
} from "../../src/features/ai-gateway/channels/registry.ts";
import { normalizeHttpFailure } from "../../src/features/ai-gateway/errors.ts";

const capabilities: CapabilityManifest = {
  modalities: ["image"],
  operations: ["generate"],
  maxOutputs: 1,
  async: false,
};

function contextFor(modelMapping: Record<string, string>): ChannelContext {
  return {
    channelId: "chan",
    baseUrl: ARK_BASE_URL,
    capabilities,
    modelMapping,
    timeoutMs: 30_000,
  };
}

test("only real endpoint ids are accepted, never bare model names", () => {
  assert.ok(isArkEndpointId("ep-20260101abcdef"));
  assert.equal(isArkEndpointId("doubao-pro-32k"), false);
  assert.equal(isArkEndpointId("ep-"), false);
  // A bare model name yields 404 upstream, which would otherwise be classified
  // as a stale endpoint and rotate healthy accounts chasing a config mistake.
  assert.throws(
    () =>
      doubaoAdapter.resolveModel(
        contextFor({ "kk-default": "doubao-pro-32k" }),
        "kk-default",
      ),
    /not an Ark endpoint id/,
  );
  assert.throws(
    () => doubaoAdapter.resolveModel(contextFor({}), "kk-default"),
    /No Ark endpoint mapped/,
  );
});

test("Ark chat operation calls the OpenAI-compatible chat endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "hello from Ark" } }],
        usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const result = await doubaoAdapter.submit(
      {
        ...contextFor({ "kk-default": "ep-20260101abcdef" }),
        capabilities: {
          modalities: ["text"],
          operations: ["chat"],
          async: false,
        },
      },
      {
        operation: "chat",
        model: "kk-default",
        prompt: "say hello",
        attachments: [],
      },
      { idempotencyKey: "ark-chat", resolveSecret: async () => "secret" },
    );
    assert.deepEqual(result, {
      kind: "text",
      text: "hello from Ark",
      usage: { promptTokens: 4, completionTokens: 3, totalTokens: 7 },
    });
    assert.equal(requestUrl, `${ARK_BASE_URL}/chat/completions`);
    assert.deepEqual(requestBody, {
      model: "ep-20260101abcdef",
      messages: [{ role: "user", content: "say hello" }],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ark chat rejects a successful response with no assistant text", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ choices: [{ message: {} }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  try {
    await assert.rejects(
      () =>
        doubaoAdapter.submit(
          {
            ...contextFor({ "kk-default": "ep-20260101abcdef" }),
            capabilities: {
              modalities: ["text"],
              operations: ["chat"],
              async: false,
            },
          },
          {
            operation: "chat",
            model: "kk-default",
            prompt: "say hello",
            attachments: [],
          },
          { idempotencyKey: "ark-chat-empty", resolveSecret: async () => "secret" },
        ),
      (error: unknown) =>
        (error as { normalized?: { errorClass?: string } }).normalized
          ?.errorClass === "UPSTREAM_ERROR",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("content policy refusals outrank the shared 400 status", () => {
  // Ark reports a content rejection as 400, the same status as a malformed
  // parameter, so only the body can tell them apart.
  const blocked = normalizeHttpFailure({
    status: 400,
    signalText: "InputTextSensitiveContentDetected: content policy violation",
  });
  assert.equal(blocked.errorClass, "CONTENT_BLOCKED");
  assert.equal(blocked.retryable, false);
  const badParam = normalizeHttpFailure({
    status: 400,
    signalText: "missing field: prompt",
  });
  assert.equal(badParam.errorClass, "BAD_REQUEST");
  assert.equal(badParam.retryable, false);
});

test("quota and rate limit are separated by cooldown length", () => {
  const quota = normalizeHttpFailure({
    status: 429,
    signalText: "insufficient balance",
  });
  assert.equal(quota.errorClass, "QUOTA_EXHAUSTED");
  assert.ok((quota.cooldownMs ?? 0) >= 6 * 60 * 60 * 1000, "quota needs hours");
  const throttled = normalizeHttpFailure({
    status: 429,
    signalText: "rate limit exceeded",
  });
  assert.equal(throttled.errorClass, "RATE_LIMITED");
  assert.ok((throttled.cooldownMs ?? 0) <= 60_000, "throttling needs a minute");
});

test("a vendor retry-after hint wins over our default cooldown", () => {
  const mapped = normalizeHttpFailure({
    status: 429,
    // Ark nests the hint inside the `error` envelope, not at the top level.
    body: { error: { message: "rate limit exceeded", retry_after: 12 } },
  });
  assert.equal(mapped.errorClass, "RATE_LIMITED");
  assert.equal(mapped.cooldownMs, 12_000);
  const millis = normalizeHttpFailure({
    status: 429,
    body: { error: { message: "rate limit exceeded", retryAfterMs: 2500 } },
  });
  assert.equal(millis.cooldownMs, 2500);
});

test("unmapped 4xx stays non-retryable and unmapped 5xx retries", () => {
  assert.equal(
    normalizeHttpFailure({ status: 418, signalText: "" }).retryable,
    false,
  );
  assert.equal(
    normalizeHttpFailure({ status: 503, signalText: "" }).retryable,
    true,
  );
});

test("alreadyNormalized preserves a classification made deeper in the stack", () => {
  const authInvalid = {
    errorClass: "AUTH_INVALID",
    httpStatus: 401,
    retryable: false,
  } as const;
  const wrapped = Object.assign(new Error("missing credential"), {
    normalized: authInvalid,
  });
  // A flattened catch in probe() would otherwise report TIMEOUT and the
  // account would never be quarantined.
  assert.deepEqual(alreadyNormalized(wrapped), authInvalid);
  assert.equal(alreadyNormalized(new Error("plain")), undefined);
  assert.equal(
    alreadyNormalized({ normalized: { errorClass: "X" } }),
    undefined,
  );
  assert.equal(
    normalizeUnknownFailure(new Error("boom")).errorClass,
    "TIMEOUT",
  );
});

test("a synchronous adapter refuses async polling instead of looping", async () => {
  await assert.rejects(
    () =>
      doubaoAdapter.poll(
        contextFor({ "kk-default": "ep-20260101abcdef" }),
        "job-1",
        {
          idempotencyKey: "k",
          resolveSecret: async () => "secret",
        },
      ),
    (error: unknown) =>
      (error as { normalized?: { errorClass?: string } }).normalized
        ?.errorClass === "BAD_REQUEST",
  );
});

test("registry refuses duplicate adapters and unknown providers", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  assert.throws(
    () => registry.registerAdapter(doubaoAdapter),
    /already registered/,
  );
  const rogue: ChannelAdapter = { ...doubaoAdapter, provider: "rogue" };
  assert.throws(
    () =>
      registry.replace({
        registrations: [
          {
            id: "c1",
            adapter: rogue,
            kind: "official_api",
            enabled: true,
            priority: 1,
            weight: 1,
            baseUrl: ARK_BASE_URL,
            capabilities,
            modelMapping: { "kk-default": "ep-20260101abcdef" },
            timeoutMs: 1000,
          },
        ],
        states: new Map(),
      }),
    /Unregistered adapter/,
  );
});

test("candidate filtering honours model, operation and channel state", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  const base = {
    adapter: doubaoAdapter,
    kind: "official_api" as const,
    enabled: true,
    capabilities,
    modelMapping: { "kk-default": "ep-20260101abcdef" },
    timeoutMs: 1000,
  };
  registry.replace({
    registrations: [
      { ...base, id: "ok", priority: 10, weight: 5, baseUrl: ARK_BASE_URL },
      {
        ...base,
        id: "other-model",
        priority: 99,
        weight: 99,
        baseUrl: ARK_BASE_URL,
        modelMapping: { "kk-other": "ep-20260101abcdef" },
      },
      {
        ...base,
        id: "off",
        priority: 99,
        weight: 99,
        baseUrl: ARK_BASE_URL,
        enabled: false,
      },
    ],
    states: new Map([["ok", "quarantined"]]),
  });
  assert.deepEqual(registry.candidates("kk-default", "generate"), []);
  registry.replace({
    registrations: [
      { ...base, id: "ok", priority: 10, weight: 5, baseUrl: ARK_BASE_URL },
      {
        ...base,
        id: "disabled",
        priority: 99,
        weight: 99,
        baseUrl: ARK_BASE_URL,
      },
    ],
    states: new Map([["disabled", "disabled"]]),
  });
  assert.deepEqual(
    registry
      .candidates("kk-default", "generate")
      .map((entry) => entry.channelId),
    ["ok"],
  );
  // An unmapped operation must not silently fall back to a generate channel.
  assert.deepEqual(registry.candidates("kk-default", "inpaint"), []);
  assert.equal(supportsOperation(capabilities, "generate"), true);
  assert.equal(supportsOperation(capabilities, "video"), false);
});

test("public model projection omits channel secrets and quarantined models", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  const base = {
    adapter: doubaoAdapter,
    kind: "official_api" as const,
    enabled: true,
    priority: 10,
    weight: 1,
    baseUrl: "https://secret.example.test/api/v3",
    credentialRef: "vault-ref",
    capabilities,
    modelMapping: { "kk-default": "ep-private-endpoint" },
    timeoutMs: 1000,
  };
  registry.replace({
    registrations: [
      { ...base, id: "visible" },
      { ...base, id: "hidden", modelMapping: { "kk-hidden": "ep-hidden" } },
    ],
    states: new Map([["hidden", "quarantined"]]),
  });
  assert.deepEqual(registry.publicModels(), [
    {
      id: "kk-default",
      owned_by: "doubao",
      capabilities: {
        modalities: ["image"],
        operations: ["generate"],
        maxOutputs: 1,
        async: false,
      },
    },
  ]);
  assert.equal(JSON.stringify(registry.publicModels()).includes("vault-ref"), false);
  assert.equal(JSON.stringify(registry.publicModels()).includes("ep-private"), false);
});

test("credentialRefFor resolves the vault reference, not the channel id", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  registry.replace({
    registrations: [
      {
        id: "chan-1",
        adapter: doubaoAdapter,
        kind: "official_api",
        enabled: true,
        priority: 1,
        weight: 1,
        baseUrl: ARK_BASE_URL,
        credentialRef: "conn.primary",
        capabilities,
        modelMapping: { "kk-default": "ep-20260101abcdef" },
        timeoutMs: 1000,
      },
    ],
    states: new Map(),
  });
  // Conflating the two would make the vault look up a key named "chan-1".
  assert.equal(registry.credentialRefFor("chan-1"), "conn.primary");
  assert.equal(registry.credentialRefFor("missing"), undefined);
});

test("tiers order by descending priority for deterministic failover", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  const make = (id: string, priority: number, weight: number) => ({
    id,
    adapter: doubaoAdapter,
    kind: "official_api" as const,
    enabled: true,
    priority,
    weight,
    baseUrl: ARK_BASE_URL,
    capabilities,
    modelMapping: { "kk-default": "ep-20260101abcdef" },
    timeoutMs: 1000,
  });
  registry.replace({
    registrations: [
      make("top", 100, 5),
      make("mid", 50, 5),
      make("low", 10, 5),
    ],
    states: new Map(),
  });
  const tiers = registry.tiers(registry.candidates("kk-default", "generate"));
  // Each attempt steps down one tier, so a retry never reuses the failing account.
  assert.deepEqual(
    tiers.map((tier) => tier.map((entry) => entry.channelId)),
    [["top"], ["mid"], ["low"]],
  );
});
