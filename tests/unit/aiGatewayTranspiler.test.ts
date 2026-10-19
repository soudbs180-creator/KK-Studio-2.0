import assert from "node:assert/strict";
import test from "node:test";
import {
  createStreamTranspiler,
  transpileAnthropicToOpenAiRequest,
  transpileAnthropicToOpenAiResponse,
  transpileOpenAiToAnthropicRequest,
  transpileOpenAiToAnthropicResponse,
  type AnthropicMessagesRequest,
  type AnthropicMessagesResponse,
  type OpenAIChatChunk,
  type OpenAIChatRequest,
  type OpenAIChatResponse,
  OpenAiToAnthropicStreamState,
  transpileOpenAiChunkToAnthropicEvents,
  AnthropicToOpenAiStreamState,
  transpileAnthropicEventToOpenAiChunks,
} from "../../src/features/ai-gateway/transpiler/index.ts";
import {
  consumeTextEvent,
  type TextProtocolState,
} from "../../src/features/creation/textProtocolEvent.ts";

test("Anthropic -> OpenAI Request: maps system prompt, roles, tools, and thinking", () => {
  const req: AnthropicMessagesRequest = {
    model: "claude-3-7-sonnet",
    max_tokens: 2048,
    system: "You are a helpful coding assistant.",
    thinking: { type: "enabled", budget_tokens: 8192 },
    messages: [
      {
        role: "user",
        content: "What is the weather in Tokyo?",
      },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "I should check the weather in Tokyo." },
          {
            type: "tool_use",
            id: "call_tokyo_1",
            name: "get_weather",
            input: { city: "Tokyo" },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "call_tokyo_1",
            content: "Sunny, 22°C",
          },
          {
            type: "text",
            text: "Now tell me the weather in Osaka.",
          },
        ],
      },
    ],
    tools: [
      {
        name: "get_weather",
        description: "Fetch weather for a city",
        input_schema: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "get_weather" },
  };

  const openAiReq = transpileAnthropicToOpenAiRequest(req);

  assert.equal(openAiReq.model, "claude-3-7-sonnet");
  assert.equal(openAiReq.max_tokens, 2048);
  assert.equal(openAiReq.reasoning_effort, "medium");

  // System message
  assert.equal(openAiReq.messages[0]?.role, "system");
  assert.equal(openAiReq.messages[0]?.content, "You are a helpful coding assistant.");

  // Assistant message with reasoning_content and tool_calls
  const assistantMsg = openAiReq.messages.find((m) => m.role === "assistant");
  assert.ok(assistantMsg);
  assert.equal(assistantMsg.reasoning_content, "I should check the weather in Tokyo.");
  assert.equal(assistantMsg.tool_calls?.length, 1);
  assert.equal(assistantMsg.tool_calls?.[0]?.id, "call_tokyo_1");
  assert.equal(assistantMsg.tool_calls?.[0]?.function.name, "get_weather");
  assert.deepEqual(JSON.parse(assistantMsg.tool_calls?.[0]?.function.arguments ?? "{}"), {
    city: "Tokyo",
  });

  // Tool result message
  const toolMsg = openAiReq.messages.find((m) => m.role === "tool");
  assert.ok(toolMsg);
  assert.equal(toolMsg.tool_call_id, "call_tokyo_1");
  assert.equal(toolMsg.content, "Sunny, 22°C");

  // Tool declaration
  assert.equal(openAiReq.tools?.length, 1);
  assert.equal(openAiReq.tools?.[0]?.function.name, "get_weather");
  assert.deepEqual(openAiReq.tool_choice, {
    type: "function",
    function: { name: "get_weather" },
  });
});

test("OpenAI -> Anthropic Request: extracts system, merges turns, maps images and tool choices", () => {
  const req: OpenAIChatRequest = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "System rule 1" },
      { role: "developer", content: "Developer rule 2" },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this diagram:" },
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" },
          },
        ],
      },
      {
        role: "assistant",
        reasoning_content: "Checking the image properties...",
        content: "I see a diagram.",
        tool_calls: [
          {
            id: "call_img_inspect",
            type: "function",
            function: {
              name: "inspect_image",
              arguments: '{"resolution":"high"}',
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_img_inspect",
        content: '{"width":800,"height":600}',
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "inspect_image",
          description: "Inspect image metrics",
          parameters: { type: "object", properties: { resolution: { type: "string" } } },
        },
      },
    ],
    tool_choice: "required",
    reasoning_effort: "high",
    max_tokens: 4000,
  };

  const anthropicReq = transpileOpenAiToAnthropicRequest(req);

  assert.equal(anthropicReq.model, "gpt-4o");
  assert.equal(anthropicReq.max_tokens, 16384 + 4096); // scaled to exceed budget_tokens
  assert.equal(anthropicReq.system, "System rule 1\n\nDeveloper rule 2");
  assert.deepEqual(anthropicReq.thinking, {
    type: "enabled",
    budget_tokens: 16384,
  });
  assert.deepEqual(anthropicReq.tool_choice, { type: "any" });

  // Check alternating messages
  assert.equal(anthropicReq.messages.length, 3); // user, assistant, user (with tool_result)
  assert.equal(anthropicReq.messages[0]?.role, "user");
  const userContent = anthropicReq.messages[0]?.content as Array<{ type: string; [k: string]: unknown }>;
  assert.equal(userContent[0]?.type, "text");
  assert.equal(userContent[1]?.type, "image");

  const assistantTurn = anthropicReq.messages[1]!;
  assert.equal(assistantTurn.role, "assistant");
  const assistantBlocks = assistantTurn.content as Array<{ type: string; [k: string]: unknown }>;
  assert.equal(assistantBlocks[0]?.type, "thinking");
  assert.equal(assistantBlocks[0]?.thinking, "Checking the image properties...");
  assert.equal(assistantBlocks[1]?.type, "text");
  assert.equal(assistantBlocks[2]?.type, "tool_use");
  assert.equal(assistantBlocks[2]?.name, "inspect_image");

  // Tool result inside follow-up user message
  const finalUserTurn = anthropicReq.messages[2]!;
  assert.equal(finalUserTurn.role, "user");
  const toolResultBlocks = finalUserTurn.content as Array<{ type: string; [k: string]: unknown }>;
  assert.equal(toolResultBlocks[0]?.type, "tool_result");
  assert.equal(toolResultBlocks[0]?.tool_use_id, "call_img_inspect");
});

test("Non-streaming Response Bridge: bidirectional mapping of finish reasons and token usage", () => {
  // Anthropic -> OpenAI
  const anthropicResp: AnthropicMessagesResponse = {
    id: "msg_test_123",
    type: "message",
    role: "assistant",
    model: "claude-3-5-sonnet",
    content: [
      { type: "thinking", thinking: "Step 1 complete" },
      { type: "text", text: "Here is your calculation." },
      {
        type: "tool_use",
        id: "calc_call_1",
        name: "calculate",
        input: { expression: "2+2" },
      },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: {
      input_tokens: 45,
      output_tokens: 18,
      cache_read_input_tokens: 20,
    },
  };

  const openAiResp = transpileAnthropicToOpenAiResponse(anthropicResp);
  assert.equal(openAiResp.id, "chatcmpl-msg_test_123");
  assert.equal(openAiResp.choices[0]?.finish_reason, "tool_calls");
  assert.equal(openAiResp.choices[0]?.message.content, "Here is your calculation.");
  assert.equal(openAiResp.choices[0]?.message.reasoning_content, "Step 1 complete");
  assert.equal(openAiResp.choices[0]?.message.tool_calls?.[0]?.function.name, "calculate");
  assert.equal(openAiResp.usage?.prompt_tokens, 45);
  assert.equal(openAiResp.usage?.completion_tokens, 18);
  assert.equal(openAiResp.usage?.prompt_tokens_details?.cached_tokens, 20);

  // OpenAI -> Anthropic
  const openAiFixture: OpenAIChatResponse = {
    id: "chatcmpl-response-999",
    object: "chat.completion",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          reasoning_content: "Deep thinking on physics problem",
          content: "The answer is 42.",
          tool_calls: [
            {
              id: "call_check_units",
              type: "function",
              function: { name: "verify_units", arguments: '{"unit":"m/s"}' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
      prompt_tokens_details: { cached_tokens: 40 },
    },
  };

  const transpiledAnthropic = transpileOpenAiToAnthropicResponse(openAiFixture);
  assert.equal(transpiledAnthropic.id, "msg_response-999");
  assert.equal(transpiledAnthropic.stop_reason, "tool_use");
  assert.equal(transpiledAnthropic.content[0]?.type, "thinking");
  assert.equal(transpiledAnthropic.content[1]?.type, "text");
  assert.equal(transpiledAnthropic.content[2]?.type, "tool_use");
  assert.equal(transpiledAnthropic.usage.input_tokens, 100);
  assert.equal(transpiledAnthropic.usage.output_tokens, 50);
  assert.equal(transpiledAnthropic.usage.cache_read_input_tokens, 40);
});

test("SSE Streaming State Machine: OpenAI Chunks -> Anthropic Events (Thinking, Text, Tool calls)", () => {
  const state = new OpenAiToAnthropicStreamState("gpt-4o");

  // Chunk 1: Reasoning content
  const chunk1: OpenAIChatChunk = {
    id: "chatcmpl-stream-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: { role: "assistant", reasoning_content: "Thinking begins." },
        finish_reason: null,
      },
    ],
  };

  const evts1 = transpileOpenAiChunkToAnthropicEvents(chunk1, state);
  assert.ok(evts1.some((e) => e.type === "message_start"));
  assert.ok(evts1.some((e) => e.type === "content_block_start" && e.content_block.type === "thinking"));
  assert.ok(evts1.some((e) => e.type === "content_block_delta" && e.delta.type === "thinking_delta"));

  // Chunk 2: Text content (closes thinking block)
  const chunk2: OpenAIChatChunk = {
    id: "chatcmpl-stream-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: { content: "Hello world!" },
        finish_reason: null,
      },
    ],
  };

  const evts2 = transpileOpenAiChunkToAnthropicEvents(chunk2, state);
  assert.ok(evts2.some((e) => e.type === "content_block_stop")); // closed thinking block
  assert.ok(evts2.some((e) => e.type === "content_block_start" && e.content_block.type === "text"));
  assert.ok(evts2.some((e) => e.type === "content_block_delta" && e.delta.type === "text_delta"));

  // Chunk 3: Tool call declaration (closes text block, announces tool_use)
  const chunk3: OpenAIChatChunk = {
    id: "chatcmpl-stream-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "call_fn_1",
              type: "function",
              function: { name: "search_db", arguments: '{"q":' },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };

  const evts3 = transpileOpenAiChunkToAnthropicEvents(chunk3, state);
  assert.ok(evts3.some((e) => e.type === "content_block_stop")); // closed text block
  assert.ok(evts3.some((e) => e.type === "content_block_start" && e.content_block.type === "tool_use"));
  assert.ok(evts3.some((e) => e.type === "content_block_delta" && e.delta.type === "input_json_delta"));

  // Chunk 4: Tool call arguments continuation
  const chunk4: OpenAIChatChunk = {
    id: "chatcmpl-stream-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              function: { arguments: '"kittens"}' },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };

  const evts4 = transpileOpenAiChunkToAnthropicEvents(chunk4, state);
  assert.ok(evts4.some((e) => e.type === "content_block_delta" && e.delta.type === "input_json_delta"));

  // Chunk 5: Finish reason
  const chunk5: OpenAIChatChunk = {
    id: "chatcmpl-stream-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "tool_calls",
      },
    ],
    usage: { prompt_tokens: 30, completion_tokens: 25, total_tokens: 55 },
  };

  const evts5 = transpileOpenAiChunkToAnthropicEvents(chunk5, state);
  const toolBlockStops = evts5.filter((e) => e.type === "content_block_stop");
  assert.equal(toolBlockStops.length, 1); // exactly one content_block_stop, no duplicates
  const msgDelta = evts5.find((e) => e.type === "message_delta");
  assert.ok(msgDelta);
  if (msgDelta.type === "message_delta") {
    assert.equal(msgDelta.delta.stop_reason, "tool_use");
    assert.equal(msgDelta.usage?.output_tokens, 25);
  }
  assert.ok(evts5.some((e) => e.type === "message_stop"));
});

test("SSE Streaming State Machine: Anthropic Events -> OpenAI Chunks", () => {
  const state = new AnthropicToOpenAiStreamState("claude-3-5-sonnet");

  const chunks1 = transpileAnthropicEventToOpenAiChunks(
    {
      type: "message_start",
      message: {
        id: "msg_stream_abc",
        type: "message",
        role: "assistant",
        model: "claude-3-5-sonnet",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 50, output_tokens: 0 },
      },
    },
    state,
  );
  assert.equal(chunks1[0]?.choices[0]?.delta.role, "assistant");

  // Thinking delta
  const chunks2 = transpileAnthropicEventToOpenAiChunks(
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: "Pondering..." },
    },
    state,
  );
  assert.equal(chunks2[0]?.choices[0]?.delta.reasoning_content, "Pondering...");

  // Tool use start
  const chunks3 = transpileAnthropicEventToOpenAiChunks(
    {
      type: "content_block_start",
      index: 1,
      content_block: {
        type: "tool_use",
        id: "call_calc_9",
        name: "calculate",
        input: {},
      },
    },
    state,
  );
  assert.equal(chunks3[0]?.choices[0]?.delta.tool_calls?.[0]?.function?.name, "calculate");

  // Tool use input json delta
  const chunks4 = transpileAnthropicEventToOpenAiChunks(
    {
      type: "content_block_delta",
      index: 1,
      delta: { type: "input_json_delta", partial_json: '{"expr":"1+1"}' },
    },
    state,
  );
  assert.equal(
    chunks4[0]?.choices[0]?.delta.tool_calls?.[0]?.function?.arguments,
    '{"expr":"1+1"}',
  );

  // message_delta
  const chunks5 = transpileAnthropicEventToOpenAiChunks(
    {
      type: "message_delta",
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 42 },
    },
    state,
  );
  assert.equal(chunks5[0]?.choices[0]?.finish_reason, "tool_calls");
  assert.equal(chunks5[0]?.usage?.completion_tokens, 42);
});

test("StreamTranspiler Pipeline: processes wire SSE format line-by-line", () => {
  const transpiler = createStreamTranspiler({
    sourceProtocol: "openai",
    targetProtocol: "anthropic",
  });

  const wireChunk = JSON.stringify({
    id: "chatcmpl-pipe",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [{ index: 0, delta: { content: "Streaming works!" }, finish_reason: null }],
  });

  const line1 = `data: ${wireChunk}`;
  const out1 = transpiler.processLine(line1);
  assert.equal(out1.length, 0); // buffers until empty line

  const out2 = transpiler.processLine(""); // blank line triggers flush
  assert.ok(out2.length > 0);
  assert.ok(out2.some((str) => str.includes("event: content_block_delta")));
  assert.ok(out2.some((str) => str.includes("Streaming works!")));
});

test("Proxy Transpilation Integration: hooks /v1/messages to OpenAI upstream and back", async () => {
  const { createServer } = await import("node:http");
  const { createProxyServer } = await import("../../vendor/canvas-proxy/index.js");

  // Upstream OpenAI server
  const upstreamServer = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const parsed = JSON.parse(body);
      assert.equal(req.url, "/v1/chat/completions");
      assert.equal(parsed.messages[0].role, "system");
      assert.equal(parsed.messages[1].role, "user");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-echo",
          object: "chat.completion",
          created: 1700000000,
          model: "gpt-4o",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Proxy transpiled correctly!" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
        }),
      );
    });
  });

  const upstreamPort = await new Promise<number>((resolve) => {
    upstreamServer.listen(0, "127.0.0.1", () => {
      resolve((upstreamServer.address() as { port: number }).port);
    });
  });

  const proxyServer = createProxyServer();
  const proxyPort = await new Promise<number>((resolve) => {
    proxyServer.listen(0, "127.0.0.1", () => {
      resolve((proxyServer.address() as { port: number }).port);
    });
  });

  try {
    const res = await fetch(`http://127.0.0.1:${proxyPort}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-target-url": `http://127.0.0.1:${upstreamPort}/v1/chat/completions`,
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet",
        max_tokens: 100,
        system: "You are an echo bot.",
        messages: [{ role: "user", content: "Ping" }],
      }),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as {
      type: string;
      role: string;
      content: Array<{ type: string; text?: string }>;
      stop_reason: string;
    };
    assert.equal(data.type, "message");
    assert.equal(data.role, "assistant");
    assert.equal(data.content[0]?.type, "text");
    assert.equal(data.content[0]?.text, "Proxy transpiled correctly!");
    assert.equal(data.stop_reason, "end_turn");
  } finally {
    upstreamServer.close();
    proxyServer.close();
  }
});

test("OpenAI -> Anthropic Request: scales max_tokens when budget_tokens >= max_tokens", () => {
  // 1. low reasoning effort (budget 2048) with default max_tokens (4096)
  const reqLow: OpenAIChatRequest = {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
    reasoning_effort: "low",
  };
  const anthropicLow = transpileOpenAiToAnthropicRequest(reqLow);
  assert.equal(anthropicLow.thinking?.budget_tokens, 2048);
  assert.equal(anthropicLow.max_tokens, 4096);

  // 2. medium reasoning effort (budget 8192) with default max_tokens (4096)
  const reqMed: OpenAIChatRequest = {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
    reasoning_effort: "medium",
  };
  const anthropicMed = transpileOpenAiToAnthropicRequest(reqMed);
  assert.equal(anthropicMed.thinking?.budget_tokens, 8192);
  assert.equal(anthropicMed.max_tokens, 8192 + 4096);

  // 3. high reasoning effort (budget 16384) with explicit smaller max_tokens (1000)
  const reqHigh: OpenAIChatRequest = {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
    reasoning_effort: "high",
    max_tokens: 1000,
  };
  const anthropicHigh = transpileOpenAiToAnthropicRequest(reqHigh);
  assert.equal(anthropicHigh.thinking?.budget_tokens, 16384);
  assert.equal(anthropicHigh.max_tokens, 16384 + 4096);

  // 4. high reasoning effort with larger explicit max_tokens (32000)
  const reqHighLarge: OpenAIChatRequest = {
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
    reasoning_effort: "high",
    max_tokens: 32000,
  };
  const anthropicHighLarge = transpileOpenAiToAnthropicRequest(reqHighLarge);
  assert.equal(anthropicHighLarge.thinking?.budget_tokens, 16384);
  assert.equal(anthropicHighLarge.max_tokens, 32000);
});

test("SSE Streaming: prevents duplicate content_block_stop on multi-tool completion", () => {
  const state = new OpenAiToAnthropicStreamState("gpt-4o");

  // Chunk 1: Tool 0 declaration
  const chunk1: OpenAIChatChunk = {
    id: "chatcmpl-stream-multi",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "call_tool_0",
              type: "function",
              function: { name: "tool_zero", arguments: '{"arg":0}' },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };
  transpileOpenAiChunkToAnthropicEvents(chunk1, state);

  // Chunk 2: Tool 1 declaration (triggers closing tool 0)
  const chunk2: OpenAIChatChunk = {
    id: "chatcmpl-stream-multi",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 1,
              id: "call_tool_1",
              type: "function",
              function: { name: "tool_one", arguments: '{"arg":1}' },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };
  const evts2 = transpileOpenAiChunkToAnthropicEvents(chunk2, state);
  const tool0Stops = evts2.filter(
    (e) => e.type === "content_block_stop" && e.index === 0,
  );
  assert.equal(tool0Stops.length, 1);

  // Chunk 3: finish_reason: tool_calls (must close tool 1, and NOT duplicate tool 0 or tool 1 stop)
  const chunk3: OpenAIChatChunk = {
    id: "chatcmpl-stream-multi",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "tool_calls",
      },
    ],
  };
  const evts3 = transpileOpenAiChunkToAnthropicEvents(chunk3, state);
  const toolStopsChunk3 = evts3.filter((e) => e.type === "content_block_stop");
  assert.equal(toolStopsChunk3.length, 1);
  assert.equal(toolStopsChunk3[0]?.index, 1); // Only tool 1 closed here; tool 0 not duplicated!
});

test("Creation: consumeTextEvent handles finish_reason === 'length' gracefully", () => {
  const state: TextProtocolState = {
    text: "",
    complete: false,
    endTurn: false,
  };

  // Delta chunk with content
  consumeTextEvent(
    {
      id: "chunk-1",
      object: "chat.completion.chunk",
      choices: [
        {
          index: 0,
          delta: { content: "Partial content truncated by max tokens..." },
          finish_reason: null,
        },
      ],
    },
    state,
    "openai",
  );
  assert.equal(state.text, "Partial content truncated by max tokens...");
  assert.equal(state.complete, false);

  // Chunk with finish_reason === "length"
  assert.doesNotThrow(() => {
    consumeTextEvent(
      {
        id: "chunk-2",
        object: "chat.completion.chunk",
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: "length",
          },
        ],
      },
      state,
      "openai",
    );
  });

  assert.equal(state.complete, true);
  assert.equal(state.text, "Partial content truncated by max tokens...");
});

