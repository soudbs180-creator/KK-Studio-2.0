import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { generateText } from "../../src/features/creation/textGeneration.ts";
import { setSessionApiKey } from "../../src/features/creation/providerCredentials.ts";
import { discoverProviderModels } from "../../src/integrations/providerModelDiscovery.ts";
import type { ProviderProtocol } from "../../src/domain/providerProtocol.ts";

const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const text = "实际 HTTP 夹具 🌿";
function body(protocol: ProviderProtocol) {
  if (protocol === "openai-responses")
    return (
      frame({
        type: "response.output_text.delta",
        item_id: "fixture-item",
        output_index: 0,
        content_index: 0,
        delta: text,
      }) +
      frame({
        type: "response.completed",
        response: {
          id: "fixture-response",
          status: "completed",
          output: [
            {
              id: "fixture-item",
              type: "message",
              status: "completed",
              role: "assistant",
              content: [{ type: "output_text", text }],
            },
          ],
        },
      })
    );
  if (protocol === "anthropic")
    return [
      {
        type: "message_start",
        message: { id: "fixture-message", role: "assistant", content: [] },
      },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
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
      .map(frame)
      .join("");
  return frame({
    choices: [{ delta: { content: text }, finish_reason: "stop" }],
  });
}
for (const protocol of [
  "openai-chat",
  "openai-responses",
  "anthropic",
  "azure-openai",
  "ollama",
] as const)
  test(`${protocol} uses real HTTP discovery and generation with isolated request identity`, async (t) => {
    const online = Object.getOwnPropertyDescriptor(navigator, "onLine");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: protocol !== "ollama",
    });
    t.after(() => {
      if (online) Object.defineProperty(navigator, "onLine", online);
      else Reflect.deleteProperty(navigator, "onLine");
    });
    const requests: Array<{
      url: string;
      method: string;
      headers: Record<string, unknown>;
      body: Record<string, unknown>;
    }> = [];
    const server = createServer(async (req, res) => {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      requests.push({
        url: req.url!,
        method: req.method!,
        headers: req.headers,
        body: raw ? JSON.parse(raw) : {},
      });
      if (req.method === "GET") {
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            data: [{ id: "deployment-fixture" }],
            has_more: false,
          }),
        );
      } else {
        res.setHeader("content-type", "text/event-stream");
        res.end(body(protocol));
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = (server.address() as { port: number }).port;
    const baseUrl = `http://127.0.0.1:${port}/${protocol === "azure-openai" ? "openai/v1" : "v1"}`;
    const authMode =
      protocol === "ollama" ? ("none" as const) : ("api-key" as const);
    setSessionApiKey("synthetic-fixture", baseUrl, "fixture-account");
    try {
      assert.equal(
        (
          await discoverProviderModels(
            { baseUrl, protocol, authMode },
            "synthetic-fixture",
            new AbortController().signal,
          )
        )[0].id,
        "deployment-fixture",
      );
      let persisted = false,
        starts = 0;
      const result = await generateText({
        providerBaseUrl: baseUrl,
        protocol,
        authMode,
        credentialRef: "fixture-account",
        model: "deployment-fixture",
        prompt: "保持原文",
        idempotencyKey: "frozen-request",
        signal: new AbortController().signal,
        beforeRequest: () => {
          persisted = true;
        },
        onRequestStart: () => {
          assert.equal(persisted, true);
          starts++;
        },
      });
      assert.equal(result, text);
      assert.equal(starts, 1);
      assert.equal(requests.length, 2);
      assert.equal(requests[0].method, "GET");
      assert.equal(
        requests[0].url,
        baseUrl.slice(baseUrl.indexOf("/", 7)) + "/models",
      );
      const request = requests[1];
      assert.equal(request.method, "POST");
      assert.equal(request.body.model, "deployment-fixture");
      assert.equal(request.headers["idempotency-key"], "frozen-request");
      assert.equal(request.headers.cookie, undefined);
      if (protocol === "ollama")
        assert.equal(request.headers.authorization, undefined);
      else if (protocol === "anthropic") {
        assert.equal(request.headers["x-api-key"], "synthetic-fixture");
        assert.equal(request.headers["anthropic-version"], "2023-06-01");
        assert.equal(request.body.max_tokens, 4096);
      } else if (protocol === "azure-openai")
        assert.equal(request.headers["api-key"], "synthetic-fixture");
      else
        assert.equal(request.headers.authorization, "Bearer synthetic-fixture");
      if (protocol === "openai-responses") {
        assert.equal(request.body.store, false);
        assert.deepEqual(request.body.input, [
          { role: "user", content: "保持原文" },
        ]);
      }
    } finally {
      setSessionApiKey("", baseUrl, "fixture-account");
      server.closeAllConnections();
      server.close();
      await once(server, "close");
    }
  });

test("Anthropic discovery follows bounded opaque cursors and rejects a cursor loop", async () => {
  const urls: string[] = [];
  const server = createServer((req, res) => {
    urls.push(req.url!);
    res.end(
      JSON.stringify({
        data: [{ id: "model-fixture" }],
        has_more: true,
        last_id: "same-cursor",
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await assert.rejects(
      discoverProviderModels(
        {
          baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`,
          protocol: "anthropic",
        },
        "synthetic",
        new AbortController().signal,
      ),
    );
    assert.deepEqual(urls, ["/v1/models", "/v1/models?after_id=same-cursor"]);
  } finally {
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});
