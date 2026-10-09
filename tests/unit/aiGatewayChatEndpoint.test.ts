import assert from "node:assert/strict";
import test from "node:test";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";
import type { ChannelAdapter } from "../../src/features/ai-gateway/channels/adapter.ts";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";
import type { ChatDeps } from "../../src/features/ai-gateway/chat.ts";
import {
  newCompletionId,
  runChatCompletion,
  toOpenAiError,
} from "../../src/features/ai-gateway/chat.ts";
import { MemoryCredentialStore } from "../../src/features/ai-gateway/credentials.ts";
import type { NormalizedError } from "../../src/features/ai-gateway/errors.ts";
import {
  extractNormalized,
  Scheduler,
} from "../../src/features/ai-gateway/scheduler.ts";

/**
 * Completion-path coverage for the chat endpoint. The generation server needs a
 * database and a worker to boot, so these exercise the module the route calls
 * directly, keeping the focus on completion shape, streaming refusal and the
 * async-channel redirect.
 */

const capabilities: CapabilityManifest = {
  modalities: ["text"],
  operations: ["generate"],
  maxOutputs: 1,
  async: false,
};

function chatDeps(behavior: NormalizedError | null): ChatDeps {
  const adapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "httpprobe",
    async submit() {
      if (behavior)
        throw Object.assign(new Error("upstream"), { normalized: behavior });
      return {
        kind: "inline",
        assetBase64: Buffer.from("a cat", "utf8").toString("base64"),
        mime: "text/plain",
      };
    },
    async poll() {
      return { status: "succeeded", assetBase64: "aGk=", mime: "text/plain" };
    },
  };
  const registration: ChannelRegistration = {
    id: "chat",
    adapter,
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
  registry.registerAdapter(adapter);
  registry.replace({ registrations: [registration], states: new Map() });
  const credentials = new MemoryCredentialStore({ "conn.chat": "secret" });
  return {
    scheduler: new Scheduler(registry, {
      random: () => 0,
      now: () => 1_700_000_000_000,
    }),
    resolveSecret: async (ref) => credentials.read(ref ?? ""),
  };
}

test("a successful completion returns an OpenAI-shaped envelope", async () => {
  const deps = chatDeps(null);
  const request = {
    model: "kk-default",
    messages: [{ role: "user" as const, content: "draw a cat" }],
  };
  const completion = await runChatCompletion(deps, request, "idem-1");
  assert.equal(completion.channelId, "chat");
  assert.equal(completion.text, "a cat");
  assert.match(newCompletionId(), /^chatcmpl-[a-f0-9]{32}$/);
});

test("an upstream failure surfaces as an OpenAI error body", async () => {
  const deps = chatDeps({
    errorClass: "QUOTA_EXHAUSTED",
    httpStatus: 429,
    retryable: true,
    detail: "insufficient balance",
  });
  await assert.rejects(
    () =>
      runChatCompletion(
        deps,
        { model: "kk-default", messages: [{ role: "user", content: "x" }] },
        "idem-2",
      ),
    (error: unknown) => {
      const mapped = toOpenAiError(extractNormalized(error));
      assert.equal(mapped.status, 429);
      assert.equal(mapped.body.error.type, "insufficient_quota");
      assert.equal(mapped.body.error.code, "QUOTA_EXHAUSTED");
      return true;
    },
  );
});

test("streaming is refused with an actionable status rather than a truncated body", async () => {
  const deps = chatDeps(null);
  await assert.rejects(
    () =>
      runChatCompletion(
        deps,
        {
          model: "kk-default",
          messages: [{ role: "user", content: "x" }],
          stream: true,
        },
        "idem-3",
      ),
    (error: unknown) =>
      (error as { normalized?: { httpStatus?: number } }).normalized
        ?.httpStatus === 501,
  );
});

test("an async channel is redirected to the jobs surface", async () => {
  const adapter: ChannelAdapter = {
    ...doubaoAdapter,
    provider: "asyncprobe",
    async submit() {
      return { kind: "submitted", providerJobId: "job-1" };
    },
  };
  const registry = new ChannelRegistry();
  registry.registerAdapter(adapter);
  registry.replace({
    registrations: [
      {
        id: "async",
        adapter,
        kind: "official_api",
        enabled: true,
        priority: 100,
        weight: 10,
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        credentialRef: "conn.async",
        capabilities,
        modelMapping: { "kk-default": "ep-20260101abcdef" },
        timeoutMs: 30_000,
      },
    ],
    states: new Map(),
  });
  const credentials = new MemoryCredentialStore({ "conn.async": "secret" });
  const deps: ChatDeps = {
    scheduler: new Scheduler(registry, {
      random: () => 0,
      now: () => 1_700_000_000_000,
    }),
    resolveSecret: async (ref) => credentials.read(ref ?? ""),
  };
  await assert.rejects(
    () =>
      runChatCompletion(
        deps,
        { model: "kk-default", messages: [{ role: "user", content: "x" }] },
        "idem-4",
      ),
    (error: unknown) =>
      (error as { normalized?: { httpStatus?: number } }).normalized
        ?.httpStatus === 409,
  );
});
