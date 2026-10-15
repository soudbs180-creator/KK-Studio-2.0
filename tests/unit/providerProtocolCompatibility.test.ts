import test from "node:test";
import assert from "node:assert/strict";
import {
  providerProtocolSchema,
  providerAuthModeSchema,
  buildTextRequest,
  isProviderAuthAllowed,
  supportsProviderImages,
} from "../../src/domain/providerProtocol.ts";

test("saved Cherry protocol aliases normalize without dropping main protocols", () => {
  assert.equal(
    providerProtocolSchema.parse("openai-compatible"),
    "openai-chat",
  );
  assert.equal(providerProtocolSchema.parse("anthropic-messages"), "anthropic");
  assert.equal(providerAuthModeSchema.parse("api_key"), "api-key");
  for (const protocol of [
    "openai-chat",
    "openai-responses",
    "anthropic",
    "azure-openai",
    "ollama",
    "gemini",
  ])
    assert.equal(providerProtocolSchema.parse(protocol), protocol);
  assert.equal(providerProtocolSchema.safeParse(null).success, false);
});

test("all text protocols preserve the frozen route history and system instruction", () => {
  const messages = [
    { role: "system" as const, content: "guide" },
    { role: "user" as const, content: "first" },
    { role: "assistant" as const, content: "answer" },
    { role: "user" as const, content: "next" },
  ];
  const route = {
    baseUrl: "https://provider.test/v1",
    model: "model",
    prompt: "next",
    idempotencyKey: "request",
    messages,
  };
  assert.deepEqual(
    buildTextRequest({ ...route, protocol: "openai-chat" }, "key").body
      .messages,
    messages,
  );
  const responses = buildTextRequest(
    { ...route, protocol: "openai-responses" },
    "key",
  );
  assert.deepEqual(responses.body.input, messages);
  assert.equal(responses.body.store, false);
  const anthropic = buildTextRequest(
    { ...route, protocol: "anthropic" },
    "key",
  );
  assert.equal(anthropic.body.system, "guide");
  assert.deepEqual(anthropic.body.messages, messages.slice(1));
  const gemini = buildTextRequest({ ...route, protocol: "gemini" }, "key");
  assert.match(gemini.url, /\/models\/model:streamGenerateContent\?alt=sse$/);
  assert.deepEqual(gemini.body.systemInstruction, {
    parts: [{ text: "guide" }],
  });
  assert.deepEqual(gemini.body.contents, [
    { role: "user", parts: [{ text: "first" }] },
    { role: "model", parts: [{ text: "answer" }] },
    { role: "user", parts: [{ text: "next" }] },
  ]);
  assert.equal(gemini.headers["x-goog-api-key"], "key");
  assert.equal(
    anthropic.headers["anthropic-dangerous-direct-browser-access"],
    "true",
  );
});

test("protocol merge preserves strict keyless and image boundaries", () => {
  assert.equal(
    isProviderAuthAllowed({ baseUrl: "http://127.1/v1", authMode: "none" }),
    false,
  );
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1/v1",
      protocol: "ollama",
      authMode: "none",
    }),
    true,
  );
  assert.equal(
    isProviderAuthAllowed({
      baseUrl: "http://127.0.0.1/v1",
      protocol: "gemini",
      authMode: "none",
    }),
    false,
  );
  for (const protocol of [
    "openai-responses",
    "anthropic",
    "azure-openai",
    "ollama",
    "gemini",
  ] as const)
    assert.equal(supportsProviderImages({ protocol }), false);
});

test("multiple system instructions keep their paragraph separator", () => {
  const request = buildTextRequest(
    {
      baseUrl: "https://provider.test/v1",
      protocol: "anthropic",
      model: "model",
      prompt: "next",
      idempotencyKey: "request",
      messages: [
        { role: "system", content: "first" },
        { role: "system", content: "second" },
        { role: "user", content: "next" },
      ],
    },
    "key",
  );
  assert.equal(request.body.system, "first\n\nsecond");
});
