import assert from "node:assert/strict";
import test from "node:test";
import {
  findProviderPreset,
  modelProviderSchema,
  parseModelProvider,
} from "../../src/domain/modelProvider.ts";
import { connectionFromModelProfile } from "../../src/features/creation/providerRegistry.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";
import { checkModelProvider } from "../../src/integrations/modelProvider.ts";
import {
  generateText,
  readTextStream,
} from "../../src/features/creation/textGeneration.ts";
import { providerRequestHeaders } from "../../src/integrations/providerTextProtocol.ts";

const base = {
  version: 1,
  name: "Local",
  model: "exact-model",
  baseUrl: "http://127.0.0.1:11434/v1",
};
const signal = () => new AbortController().signal;
const sse = (value: string) =>
  new Response(value, { headers: { "content-type": "text/event-stream" } });
const openai =
  'data: {"choices":[{"delta":{"content":"local answer"},"finish_reason":null}]}\n\ndata: [DONE]\n\n';
const anthropicStream = (text: string, initial = "") =>
  [
    {
      type: "message_start",
      message: { id: "m", role: "assistant", content: [] },
    },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: initial },
    },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" } },
    { type: "message_stop" },
  ]
    .map((frame) => "data: " + JSON.stringify(frame) + "\n\n")
    .join("");

test("a single-output text request rejects another output index or multiple choices", async () => {
  for (const choices of [
    [{ index: 1, delta: { content: "wrong" }, finish_reason: "stop" }],
    [
      { index: 0, delta: { content: "a" }, finish_reason: "stop" },
      { index: 1, delta: { content: "b" }, finish_reason: "stop" },
    ],
  ]) {
    await assert.rejects(
      readTextStream(
        sse(`data: ${JSON.stringify({ choices })}\n\ndata: [DONE]\n\n`),
        signal(),
      ),
    );
  }
});
Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
const options = (providerBaseUrl = base.baseUrl) => ({
  prompt: "hello",
  model: "exact-model",
  providerBaseUrl,
  idempotencyKey: "operation-one",
  signal: signal(),
  beforeRequest() {},
  onRequestStart() {},
});

test("explicit loopback authentication and protocol survive profile and registry mapping", () => {
  const profile = modelProviderSchema.parse({
    ...base,
    protocol: "openai-chat",
    authMode: "none",
  });
  assert.equal(profile.authMode, "none");
  const connection = connectionFromModelProfile(profile);
  assert.equal(connection.authMode, "none");
  assert.equal(connection.protocol, "openai-chat");
  assert.equal(
    connection.id,
    connectionFromModelProfile(modelProviderSchema.parse(base)).id,
  );
});

test("remote and noncanonical hosts cannot opt into keyless authentication", () => {
  for (const baseUrl of [
    "https://api.example.test/v1",
    "http://127.1:11434/v1",
    "http://2130706433:11434/v1",
    "http://localhost.example.test/v1",
  ]) {
    assert.equal(
      modelProviderSchema.safeParse({ ...base, baseUrl, authMode: "none" })
        .success,
      false,
      baseUrl,
    );
  }
  for (const baseUrl of [
    "http://localhost:11434/v1",
    "http://[::1]:11434/v1",
  ]) {
    assert.equal(
      modelProviderSchema.safeParse({ ...base, baseUrl, authMode: "none" })
        .success,
      true,
    );
  }
});

test("legacy profiles retain their stored object without adding defaults", () => {
  assert.deepEqual(parseModelProvider(JSON.stringify(base)).profile, base);
});

test("keyless local Anthropic is rejected before exposing a key", () => {
  assert.throws(() =>
    providerRequestHeaders(base.baseUrl, "", {
      protocol: "anthropic",
      authMode: "none",
    }),
  );
});

test("Ollama and LM Studio presets select only an explicit local OpenAI-compatible interface", () => {
  for (const id of ["ollama", "lm-studio"]) {
    const preset = findProviderPreset(id);
    assert.ok(preset);
    assert.equal(
      preset.wireProtocol ?? "openai-chat",
      id === "ollama" ? "ollama" : "openai-chat",
    );
    assert.equal(preset.authMode, "none");
  }
});

test("local discovery and generation omit authentication rather than using a fake key", async (t) => {
  const requests: Array<{ url: string; headers: Headers; body?: string }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: URL | string, init?: RequestInit) => {
      requests.push({
        url: String(url),
        headers: new Headers(init?.headers),
        body: init?.body as string,
      });
      return init?.method === "GET"
        ? Response.json({ data: [{ id: "exact-model" }] })
        : sse(openai);
    },
  );
  await checkModelProvider(base.baseUrl, "", signal(), { authMode: "none" });
  assert.equal(
    await generateText({ ...options(), authMode: "none" }),
    "local answer",
  );
  assert.equal(requests[0].url, base.baseUrl + "/models");
  assert.equal(requests[1].url, base.baseUrl + "/chat/completions");
  assert.equal(
    requests.every((request) => !request.headers.has("authorization")),
    true,
  );
  assert.deepEqual(JSON.parse(requests[1].body!), {
    model: "exact-model",
    messages: [{ role: "user", content: "hello" }],
    stream: true,
  });
});

test("an empty key never silently enables local or remote requests", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return sse(openai);
  });
  await assert.rejects(generateText(options()));
  await assert.rejects(checkModelProvider(base.baseUrl, "", signal()));
  await assert.rejects(
    generateText({
      ...options("https://api.example.test/v1"),
      authMode: "none",
    }),
  );
  assert.equal(requests, 0);
});

test("Anthropic discovery and Messages use native headers and preserve multi-turn content", async (t) => {
  const url = "https://api.anthropic.test/v1";
  setSessionApiKey("fixture-key", url);
  const requests: Array<{ url: string; headers: Headers; body?: string }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: URL | string, init?: RequestInit) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: init?.body as string,
      });
      return init?.method === "GET"
        ? Response.json({ data: [{ id: "claude-exact" }], has_more: false })
        : sse(anthropicStream("你好"));
    },
  );
  const models = await checkModelProvider(url, "fixture-key", signal(), {
    protocol: "anthropic",
  });
  assert.equal(models[0].id, "claude-exact");
  const messages = [
    { role: "system" as const, content: "assistant instructions" },
    { role: "user" as const, content: "previous" },
    { role: "assistant" as const, content: "answer" },
    { role: "user" as const, content: "hello" },
  ];
  assert.equal(
    await generateText({
      ...options(url),
      protocol: "anthropic",
      messages,
    }),
    "你好",
  );
  assert.equal(requests[1].url, url + "/messages");
  assert.equal(requests[1].headers.get("x-api-key"), "fixture-key");
  assert.equal(requests[1].headers.get("anthropic-version"), "2023-06-01");
  for (const request of requests)
    assert.equal(
      request.headers.get("anthropic-dangerous-direct-browser-access"),
      "true",
    );
  assert.equal(requests[1].headers.has("authorization"), false);
  const body = JSON.parse(requests[1].body!);
  assert.equal(body.system, "assistant instructions");
  assert.deepEqual(body.messages, messages.slice(1));
  assert.equal(body.max_tokens, 4096);
});

test("Gemini discovery and SSE use model resources and header-only credentials", async (t) => {
  const url = "https://gemini.example.test/v1beta";
  setSessionApiKey("fixture-google", url);
  const requests: Array<{ url: string; headers: Headers; body?: string }> = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: URL | string, init?: RequestInit) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: init?.body as string,
      });
      return init?.method === "GET"
        ? Response.json({
            models: [
              {
                name: "models/gemini-exact",
                supportedGenerationMethods: ["generateContent"],
              },
              {
                name: "models/embed",
                supportedGenerationMethods: ["embedContent"],
              },
            ],
          })
        : sse(
            'data: {"candidates":[{"content":{"parts":[{"text":"你好"}]}}]}\n\ndata: {"candidates":[{"finishReason":"STOP"}]}\n\n',
          );
    },
  );
  const models = await checkModelProvider(url, "fixture-google", signal(), {
    protocol: "gemini",
  });
  assert.equal(models[0].id, "gemini-exact");
  assert.equal(models[0].kind, "text");
  assert.equal(models[1].kind, "unknown");
  assert.equal(
    await generateText({
      ...options(url),
      model: "models/gemini-exact",
      protocol: "gemini",
    }),
    "你好",
  );
  assert.equal(
    requests[1].url,
    url + "/models/gemini-exact:streamGenerateContent?alt=sse",
  );
  assert.equal(requests[1].headers.get("x-goog-api-key"), "fixture-google");
  assert.equal(requests[1].url.includes("fixture-google"), false);
  assert.deepEqual(JSON.parse(requests[1].body!).contents, [
    { role: "user", parts: [{ text: "hello" }] },
  ]);
});

for (const status of [401, 429])
  test(`HTTP ${status} is not retried and does not leak the response body`, async (t) => {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      return new Response("private-secret", {
        status,
        headers: { "retry-after": "10" },
      });
    });
    await assert.rejects(
      generateText({ ...options(), authMode: "none" }),
      (error: unknown) =>
        error instanceof Error && !error.message.includes("private-secret"),
    );
    assert.equal(calls, 1);
  });

for (const protocol of ["anthropic", "gemini"] as const)
  test(`${protocol} requires an actual success terminal and rejects tool/error/oversized output`, async () => {
    const payloads =
      protocol === "gemini"
        ? [
            'data: {"candidates":[{"content":{"parts":[{"text":"partial"}]}}]}\n\n',
            'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"tool"}}]},"finishReason":"STOP"}]}\n\n',
            'data: {"error":{"message":"private-secret"}}\n\n',
            `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "x".repeat(32769) }] }, finishReason: "STOP" }] })}\n\n`,
          ]
        : [
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"partial"}}\n\n',
            'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\ndata: {"type":"message_stop"}\n\n',
            'event: error\ndata: {"error":{"message":"private-secret"}}\n\n',
            `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "x".repeat(32769) } })}\n\n`,
          ];
    for (const value of payloads)
      await assert.rejects(
        readTextStream(sse(value), signal(), undefined, protocol),
      );
  });

test("a text submission freezes its model and messages before reading credentials", async (t) => {
  const url = "https://snapshot.example.test/v1";
  setSessionApiKey("fixture", url);
  let body: Record<string, unknown> = {};
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return sse(openai);
    },
  );
  const messages = [{ role: "user" as const, content: "frozen" }];
  const input = { ...options(url), messages };
  const pending = generateText(input);
  input.model = "new-model";
  messages[0].content = "new draft";
  await pending;
  assert.equal(body.model, "exact-model");
  assert.deepEqual(body.messages, [{ role: "user", content: "frozen" }]);
});

test("Anthropic includes text from content-block start as well as deltas", async () => {
  const body = anthropicStream(" second", "first");
  assert.equal(
    await readTextStream(sse(body), signal(), undefined, "anthropic"),
    "first second",
  );
});

for (const protocol of ["openai-chat", "anthropic", "gemini"] as const) {
  test(`${protocol} preserves UTF-8 splits and cancels the source at terminal`, async () => {
    const source =
      protocol === "openai-chat"
        ? openai.replace("local answer", "你好🌏")
        : protocol === "gemini"
          ? 'data: {"candidates":[{"content":{"parts":[{"text":"你好🌏"}]},"finishReason":"STOP"}]}\n\n'
          : anthropicStream("你好🌏");
    const bytes = new TextEncoder().encode(source);
    let offset = 0;
    let cancelled = false;
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          if (offset < bytes.length)
            controller.enqueue(bytes.slice(offset, ++offset));
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
    assert.equal(
      await readTextStream(response, signal(), undefined, protocol),
      "你好🌏",
    );
    assert.equal(cancelled, true);
  });
  test(`${protocol} aborts a stalled stream and enforces a 2 MiB wire limit`, async () => {
    const controller = new AbortController();
    let cancelled = false;
    const pending = readTextStream(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
      controller.signal,
      undefined,
      protocol,
    );
    controller.abort("stopped");
    await assert.rejects(pending, (error: unknown) => error === "stopped");
    assert.equal(cancelled, true);
    const comment = ":" + "x".repeat(63000) + "\n\n";
    await assert.rejects(
      readTextStream(sse(comment.repeat(34)), signal(), undefined, protocol),
    );
  });
}

test("native discovery follows bounded pages without changing host or authentication", async (t) => {
  for (const protocol of ["anthropic", "gemini"] as const) {
    const requests: string[] = [];
    t.mock.method(globalThis, "fetch", async (input: unknown) => {
      requests.push(String(input));
      const first = requests.length === 1;
      return Response.json(
        protocol === "gemini"
          ? {
              models: [
                {
                  name: first ? "models/one" : "models/two",
                  supportedGenerationMethods: ["generateContent"],
                },
              ],
              ...(first ? { nextPageToken: "token & value" } : {}),
            }
          : {
              data: [{ id: first ? "one" : "two" }],
              has_more: first,
              last_id: first ? "one" : "two",
            },
      );
    });
    const list = await checkModelProvider(
      "https://native.example.test/v1",
      "fixture",
      signal(),
      { protocol },
    );
    assert.deepEqual(
      list.map((model) => model.id),
      ["one", "two"],
    );
    assert.equal(
      new URL(requests[1]).searchParams.get(
        protocol === "gemini" ? "pageToken" : "after_id",
      ),
      protocol === "gemini" ? "token & value" : "one",
    );
    t.mock.restoreAll();
  }
});

test("discovery cannot hang after cancellation or loop forever on repeated page tokens", async (t) => {
  const abort = new AbortController();
  let cancelled = false;
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
      ),
  );
  const pending = checkModelProvider(base.baseUrl, "", abort.signal, {
    authMode: "none",
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  abort.abort("cancel-discovery");
  await assert.rejects(
    pending,
    (error: unknown) => error === "cancel-discovery",
  );
  assert.equal(cancelled, true);
  t.mock.restoreAll();
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({
      models: [{ name: "models/one" }],
      nextPageToken: "repeat",
    });
  });
  await assert.rejects(
    checkModelProvider(
      "https://native.example.test/v1beta",
      "fixture",
      signal(),
      { protocol: "gemini" },
    ),
  );
  assert.equal(calls, 2);
});
