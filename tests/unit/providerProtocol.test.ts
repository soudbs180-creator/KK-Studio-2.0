import assert from "node:assert/strict";
import test from "node:test";
import {
  modelProviderSchema,
  parseModelProvider,
} from "../../src/domain/modelProvider.ts";
import { readTextStream } from "../../src/features/creation/textGeneration.ts";
import {
  newModelProfileConnection,
  writeProviderConnections,
  mergeProviderConnection,
} from "../../src/features/creation/providerRegistry.ts";
import { assertSubmissionConnection } from "../../src/features/creation/providerSubmission.ts";
import { resolveModelProviderConnection } from "../../src/components/settings/modelProviderSettingsState.ts";

const legacy = {
  version: 1,
  name: "旧账号",
  baseUrl: "https://api.example.com/v1",
  model: "text-model",
};
test("legacy provider profiles retain absent routing fields and account identity", () => {
  assert.deepEqual(parseModelProvider(JSON.stringify(legacy)).profile, legacy);
});
test("saved protocol changes preserve the account but invalidate a frozen task and image routing", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  try {
    const first = newModelProfileConnection({
      ...legacy,
      version: 1,
      protocol: "openai-responses",
    });
    assert.equal(first.protocol, "openai-responses");
    assert.deepEqual(first.capabilities.modalities, ["text"]);
    const changed = resolveModelProviderConnection(
      { ...legacy, version: 1, connectionId: first.id, protocol: "anthropic" },
      first.credentialRef!,
      [first],
    );
    assert.equal(changed.id, first.id);
    assert.equal(changed.credentialRef, first.credentialRef);
    assert.equal(changed.protocol, "anthropic");
    const prior = {
      ...first,
      verificationStatus: "verified" as const,
      lastSuccessfulGenerationAt: "2026-10-01T00:00:00Z",
      healthRevision: 1,
    };
    const committed = mergeProviderConnection(changed, [prior])[0];
    assert.equal(committed.verificationStatus, "unverified");
    assert.equal(committed.lastSuccessfulGenerationAt, undefined);
    assert.equal(committed.healthRevision, 2);
    writeProviderConnections([changed]);
    const binding = {
      id: first.id,
      baseUrl: first.baseUrl,
      credentialRef: first.credentialRef,
      protocol: first.protocol,
      referenceCount: 0,
      kind: "text" as const,
      model: first.model,
    };
    assert.throws(() => assertSubmissionConnection(binding), /协议|身份/);
    assert.equal(
      assertSubmissionConnection({ ...binding, protocol: "anthropic" }).id,
      first.id,
    );
    assert.throws(
      () =>
        assertSubmissionConnection({
          ...binding,
          protocol: "anthropic",
          kind: "image",
        }),
      /支持/,
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("local keyless LM Studio remains text-only for a manually configured model", () => {
  const value = newModelProfileConnection({
    version: 1,
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "gemma3",
    protocol: "openai-chat",
    authMode: "none",
  });
  assert.deepEqual(value.capabilities.modalities, ["text"]);
  assert.deepEqual(value.capabilities.operations, ["generate"]);
});
test("Chat accepts the standard null initial delta and rejects another choice index", async () => {
  const start = frame({
    choices: [
      {
        index: 0,
        delta: { role: "assistant", content: null },
        finish_reason: null,
      },
    ],
  });
  const end = frame({
    choices: [{ index: 0, delta: { content: "正文" }, finish_reason: "stop" }],
  });
  assert.equal(
    await readTextStream(stream(start + end), new AbortController().signal),
    "正文",
  );
  await assert.rejects(
    readTextStream(
      stream(
        frame({
          choices: [
            { index: 7, delta: { content: "其他输出" }, finish_reason: "stop" },
          ],
        }),
      ),
      new AbortController().signal,
    ),
  );
});
for (const protocol of [
  "openai-chat",
  "openai-responses",
  "anthropic",
  "azure-openai",
  "ollama",
] as const)
  test(`provider preserves explicit ${protocol} instead of routing it as Chat`, () => {
    const profile = modelProviderSchema.parse({
      ...legacy,
      baseUrl:
        protocol === "azure-openai"
          ? "https://resource.openai.azure.com/openai/v1"
          : legacy.baseUrl,
      protocol,
      authMode: "api-key",
    });
    assert.equal(profile.protocol, protocol);
    assert.equal(profile.authMode, "api-key");
  });
test("no-key authentication is limited to local Chat/Ollama and rejects remote or foreign protocols", () => {
  assert.equal(
    modelProviderSchema.safeParse({
      ...legacy,
      protocol: "ollama",
      authMode: "none",
    }).success,
    false,
  );
  assert.equal(
    modelProviderSchema.safeParse({
      ...legacy,
      baseUrl: "http://127.0.0.1:11434/v1",
      protocol: "anthropic",
      authMode: "none",
    }).success,
    false,
  );
  assert.equal(
    modelProviderSchema.safeParse({
      ...legacy,
      baseUrl: "http://127.0.0.1:11434/v1",
      protocol: "ollama",
      authMode: "none",
    }).success,
    true,
  );
  assert.equal(
    modelProviderSchema.safeParse({ ...legacy, protocol: "unknown-protocol" })
      .success,
    false,
  );
});
test("text requests use the selected protocol, actual deployment ID and exact auth header", async () => {
  const { buildTextRequest } =
    await import("../../src/domain/providerProtocol.ts");
  const key = "synthetic-key";
  const base = {
    baseUrl: legacy.baseUrl,
    model: "deployment-name",
    prompt: "保留原文",
    idempotencyKey: "request-1",
  };
  const responses = buildTextRequest(
    { ...base, protocol: "openai-responses" },
    key,
  );
  assert.equal(responses.url, legacy.baseUrl + "/responses");
  assert.equal(responses.headers.Authorization, "Bearer " + key);
  assert.deepEqual(responses.body, {
    model: "deployment-name",
    input: [{ role: "user", content: "保留原文" }],
    stream: true,
    store: false,
  });
  const anthropic = buildTextRequest({ ...base, protocol: "anthropic" }, key);
  assert.equal(anthropic.url, legacy.baseUrl + "/messages");
  assert.equal(anthropic.headers["x-api-key"], key);
  assert.equal(anthropic.headers["anthropic-version"], "2023-06-01");
  assert.equal(anthropic.headers.Authorization, undefined);
  const azure = buildTextRequest(
    {
      ...base,
      baseUrl: "https://resource.openai.azure.com/openai/v1",
      protocol: "azure-openai",
    },
    key,
  );
  assert.equal(azure.headers["api-key"], key);
  assert.equal(azure.headers.Authorization, undefined);
  assert.equal(azure.body.model, "deployment-name");
  const local = buildTextRequest(
    {
      ...base,
      baseUrl: "http://127.0.0.1:11434/v1",
      protocol: "ollama",
      authMode: "none",
    },
    "",
  );
  assert.equal(local.url, "http://127.0.0.1:11434/v1/chat/completions");
  assert.equal(local.headers.Authorization, undefined);
});
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const stream = (data: string) =>
  new Response(data, { headers: { "content-type": "text/event-stream" } });
const responseDelta = (text: string, id = "msg-fixture") =>
  frame({
    type: "response.output_text.delta",
    item_id: id,
    output_index: 0,
    content_index: 0,
    delta: text,
  });
const responseEnd = (text: string, id = "msg-fixture") =>
  frame({
    type: "response.completed",
    response: {
      id: "resp-fixture",
      status: "completed",
      output: [
        {
          type: "message",
          id,
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text }],
        },
      ],
    },
  });
test("Responses verifies terminal identity and text while rejecting failed/incomplete/tool output", async () => {
  const delta = responseDelta("你好");
  const read = (data: string) =>
    readTextStream(
      stream(data),
      new AbortController().signal,
      undefined,
      "openai-responses",
    );
  assert.equal(await read(delta + responseEnd("你好")), "你好");
  for (const end of [
    "response.failed",
    "response.incomplete",
    "response.function_call_arguments.delta",
  ])
    await assert.rejects(
      read(delta + frame({ type: end, message: "synthetic-private" })),
      (error: Error) => !error.message.includes("synthetic-private"),
    );
  await assert.rejects(read(delta));
  await assert.rejects(read(delta + responseEnd("你好", "other-item")));
  await assert.rejects(read(delta + responseEnd("不同正文")));
  await assert.rejects(
    read(delta + responseEnd("你好") + "event: error\ndata: {}\n\n"),
  );
  await assert.rejects(read(delta + responseEnd("你好") + 'data: {"type":'));
  await assert.rejects(
    read("event: response.incomplete\n" + responseEnd("你好")),
  );
});
const messageStart = frame({
  type: "message_start",
  message: { id: "msg-fixture", role: "assistant", content: [] },
});
const blockStart = frame({
  type: "content_block_start",
  index: 0,
  content_block: { type: "text", text: "" },
});
const messageDelta = frame({
  type: "content_block_delta",
  index: 0,
  delta: { type: "text_delta", text: "回答" },
});
const blockStop = frame({ type: "content_block_stop", index: 0 });
const messageStop =
  frame({ type: "message_delta", delta: { stop_reason: "end_turn" } }) +
  frame({ type: "message_stop" });
test("Anthropic requires ordered closed blocks, end_turn and message_stop", async () => {
  const read = (data: string) =>
    readTextStream(
      stream(data),
      new AbortController().signal,
      undefined,
      "anthropic",
    );
  assert.equal(
    await read(
      messageStart + blockStart + messageDelta + blockStop + messageStop,
    ),
    "回答",
  );
  for (const bad of [
    messageDelta + messageStop,
    messageStart + blockStart + messageDelta + messageStop,
    messageStart +
      blockStart +
      messageDelta +
      blockStop +
      frame({ type: "message_delta", delta: { stop_reason: "max_tokens" } }),
    messageStart +
      frame({
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use" },
      }),
  ])
    await assert.rejects(read(bad));
});
