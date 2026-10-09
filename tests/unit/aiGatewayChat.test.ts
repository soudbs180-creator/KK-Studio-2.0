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
  buildInput,
  buildPrompt,
  chatRequestSchema,
  newCompletionId,
  parseChatRequest,
  toOpenAiError,
} from "../../src/features/ai-gateway/chat.ts";
import { MemoryCredentialStore } from "../../src/features/ai-gateway/credentials.ts";
import { errorClasses } from "../../src/features/ai-gateway/errors.ts";
import {
  extractNormalized,
  Scheduler,
} from "../../src/features/ai-gateway/scheduler.ts";

const capabilities: CapabilityManifest = {
  modalities: ["text"],
  operations: ["generate"],
  maxOutputs: 1,
  async: false,
};

test("prompt flattening keeps system text ahead of the turns", () => {
  const prompt = buildPrompt([
    { role: "system", content: "be brief" },
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
    { role: "user", content: "draw a cat" },
  ]);
  // Role semantics live here so every adapter takes a single prompt string.
  assert.ok(prompt.startsWith("be brief"));
  assert.ok(prompt.includes("draw a cat"));
  assert.ok(prompt.indexOf("hi") < prompt.indexOf("draw a cat"));
  assert.ok(prompt.indexOf("hello") < prompt.indexOf("draw a cat"));
  assert.equal(
    buildPrompt([{ role: "user", content: "only" }]),
    "[User]\nonly",
  );
});

test("the request schema rejects unknown fields and bad roles", () => {
  assert.throws(() =>
    chatRequestSchema.parse({ model: "m", messages: [], nope: 1 }),
  );
  assert.throws(() =>
    chatRequestSchema.parse({
      model: "m",
      messages: [{ role: "x", content: "a" }],
    }),
  );
  assert.throws(() => chatRequestSchema.parse({ model: "m", messages: [] }));
  assert.throws(() =>
    chatRequestSchema.parse({
      model: "m",
      messages: [{ role: "user", content: "a" }],
      stream: "yes",
    }),
  );
});

test("a client cannot smuggle a credential into a prompt", () => {
  // Secrets in prompts end up in vendor logs and on the user's bill.
  assert.throws(
    () =>
      parseChatRequest({
        model: "kk-default",
        messages: [
          { role: "user", content: "Bearer sk-abcdefghijklmnopqrstuvwxyz" },
        ],
      }),
    /credential/i,
  );
  assert.throws(
    () =>
      parseChatRequest({
        model: "kk-default",
        messages: [
          { role: "user", content: "see https://x.io/a?api_key=abcdefghijkl" },
        ],
      }),
    /credential/i,
  );
  assert.throws(() => parseChatRequest("not an object"), /JSON object/);
});

test("buildInput merges both sampling parameters", () => {
  const input = buildInput(
    chatRequestSchema.parse({
      model: "kk-default",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.4,
      max_tokens: 128,
    }),
  );
  // Assigning `extra` twice would let the second branch drop temperature.
  assert.equal(input.extra?.temperature, 0.4);
  assert.equal(input.extra?.maxTokens, 128);
  assert.deepEqual(input.attachments, []);
  const bare = buildInput(
    chatRequestSchema.parse({
      model: "m",
      messages: [{ role: "user", content: "x" }],
    }),
  );
  assert.equal(bare.extra, undefined);
});

test("every error class maps to an OpenAI error type", () => {
  for (const errorClass of errorClasses) {
    const mapped = toOpenAiError({
      errorClass,
      httpStatus: 502,
      retryable: false,
    });
    assert.ok(mapped.body.error.type, `${errorClass} needs an error type`);
    assert.equal(mapped.body.error.code, errorClass);
    assert.equal(mapped.body.kk_meta.errorClass, errorClass);
    assert.equal(mapped.status, 502);
  }
});

test("completion ids look like OpenAI ids and do not repeat", () => {
  assert.match(newCompletionId(), /^chatcmpl-[a-f0-9]{32}$/);
  assert.notEqual(newCompletionId(), newCompletionId());
});

function chatHarness(
  behavior: { ok: boolean; normalized?: object } = { ok: true },
) {
  const offline: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "chatprobe",
    // Mirrors a real adapter: the secret must be resolved before the upstream
    // call, otherwise the credential path is never exercised at all.
    async submit(_context, _input, request) {
      await request.resolveSecret();
      if (!behavior.ok)
        throw Object.assign(new Error("upstream"), {
          normalized: behavior.normalized,
        });
      return {
        kind: "inline",
        assetBase64: Buffer.from("a cat", "utf8").toString("base64"),
        mime: "text/plain",
      };
    },
    // Stubbed explicitly: the inherited implementation would issue a real
    // network call to the vendor endpoint.
    async poll(_context, _providerJobId, request) {
      await request.resolveSecret();
      return { status: "succeeded", assetBase64: "aGk=", mime: "text/plain" };
    },
  };
  const registration: ChannelRegistration = {
    id: "chat-primary",
    adapter: offline,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    credentialRef: "conn.chat",
    capabilities,
    modelMapping: { "kk-default": "ep-20260101abcdef" },
    timeoutMs: 30_000,
  };
  const registry = new ChannelRegistry();
  registry.registerAdapter(offline);
  registry.replace({ registrations: [registration], states: new Map() });
  const scheduler = new Scheduler(registry, {
    random: () => 0,
    now: () => 1_700_000_000_000,
  });
  return {
    scheduler,
    credentials: new MemoryCredentialStore({ "conn.chat": "secret" }),
  };
}

test("credentials reach the vault through the channel reference", async () => {
  const { scheduler, credentials } = chatHarness();
  const seen: Array<string | undefined> = [];
  await scheduler.dispatch({
    model: "kk-default",
    operation: "generate",
    input: { model: "kk-default", prompt: "cat", attachments: [] },
    idempotencyKey: "job-1",
    resolveSecret: async (ref) => {
      seen.push(ref);
      return credentials.read(ref ?? "");
    },
  });
  assert.deepEqual(seen, ["conn.chat"]);
});

test("polling resolves the secret through the credential ref", async () => {
  const { scheduler, credentials } = chatHarness();
  const seen: Array<string | undefined> = [];
  const state = await scheduler.poll("chat-primary", "provider-job-1", {
    idempotencyKey: "job-3",
    resolveSecret: async (ref) => {
      seen.push(ref);
      return credentials.read(ref ?? "");
    },
  });
  assert.equal(state.status, "succeeded");
  // Regression: polling used to pass the channel id where the vault expects a
  // credential ref, so every poll of an async task failed with AUTH_INVALID.
  assert.deepEqual(seen, ["conn.chat"]);
});

test("a failing channel surfaces a normalized error to the caller", async () => {
  const { scheduler, credentials } = chatHarness({
    ok: false,
    normalized: {
      errorClass: "RATE_LIMITED",
      httpStatus: 429,
      retryable: true,
      cooldownMs: 60_000,
    },
  });
  await assert.rejects(
    () =>
      scheduler.dispatch({
        model: "kk-default",
        operation: "generate",
        input: { model: "kk-default", prompt: "cat", attachments: [] },
        idempotencyKey: "job-2",
        resolveSecret: async (ref) => credentials.read(ref ?? ""),
      }),
    (error: unknown) => extractNormalized(error).errorClass === "RATE_LIMITED",
  );
});
