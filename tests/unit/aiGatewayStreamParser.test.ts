import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { readChatStream } from "../../src/features/ai-gateway/channels/chatStream.ts";

const encoder = new TextEncoder();
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const delta = (content: string) =>
  frame({ choices: [{ index: 0, delta: { content }, finish_reason: null }] });
const stop = frame({
  choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
});
const done = "data: [DONE]\n\n";
const options = { channelId: "parser-fixture", onTextDelta: () => {} };

function response(value: string | Uint8Array, step = 1024) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let offset = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.length) controller.close();
        else {
          controller.enqueue(bytes.slice(offset, offset + step));
          offset = Math.min(offset + step, bytes.length);
        }
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

function normalized(error: unknown) {
  return (error as { normalized?: Record<string, unknown> }).normalized;
}

test("stream parser preserves split UTF-8, CRLF, multiline data and usage", async () => {
  const chunks: string[] = [];
  const source = response(
    ': heartbeat\r\n\r\ndata: {"choices":\r\ndata: [{"index":0,"delta":{"role":"assistant","content":null}}]}\r\n\r\n' +
      delta("你好🌍").replaceAll("\n", "\r\n") +
      delta("！") +
      stop +
      frame({
        choices: [],
        usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
      }) +
      done,
    1,
  );
  const result = await readChatStream(source, {
    ...options,
    onTextDelta: (text) => {
      chunks.push(text);
    },
  });
  assert.deepEqual(chunks, ["你好🌍", "！"]);
  assert.deepEqual(result, {
    kind: "text",
    text: "你好🌍！",
    usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
  });
  assert.equal(source.body!.locked, false);
});

test("stop waits for DONE and retains the following usage chunk", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let first!: () => void;
  const seen = new Promise<void>((resolve) => {
    first = resolve;
  });
  const source = new Response(
    new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
        controller.enqueue(encoder.encode(delta("first") + stop));
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
  let settled = false;
  const pending = readChatStream(source, { ...options, onTextDelta: first });
  void pending.then(
    () => (settled = true),
    () => (settled = true),
  );
  await seen;
  await setImmediate();
  assert.equal(settled, false);
  controller.enqueue(
    encoder.encode(frame({ choices: [], usage: { total_tokens: 7 } }) + done),
  );
  controller.close();
  assert.equal((await pending).usage?.totalTokens, 7);
});

for (const [name, choice] of [
  ["array delta", { index: 0, delta: [], finish_reason: "stop" }],
  [
    "array message",
    { index: 0, delta: {}, message: [], finish_reason: "stop" },
  ],
] as const) {
  test(`a ${name} cannot terminate an otherwise valid text stream`, async () => {
    await assert.rejects(
      readChatStream(
        response(delta("ok") + frame({ choices: [choice] }) + done),
        options,
      ),
    );
  });
}

for (const [name, suffix] of [
  ["error-typed DONE", "event: error\ndata: [DONE]\n\n"],
  ["empty error event", "event: error\n\n" + done],
] as const) {
  test(`${name} outranks a prior normal stop`, async () => {
    await assert.rejects(
      readChatStream(response(delta("ok") + stop + suffix), options),
    );
  });
}

test("later empty or partial usage retains previously supplied token counts", async () => {
  const result = await readChatStream(
    response(
      delta("ok") +
        stop +
        frame({ choices: [], usage: { prompt_tokens: 2, total_tokens: 5 } }) +
        frame({ choices: [], usage: {} }) +
        frame({ choices: [], usage: { completion_tokens: 3 } }) +
        done,
    ),
    options,
  );
  assert.deepEqual(result.usage, {
    promptTokens: 2,
    completionTokens: 3,
    totalTokens: 5,
  });
});

for (const [name, wire] of [
  ["truncated text", delta("partial")],
  ["stop without DONE", delta("partial") + stop],
  ["DONE without stop", delta("partial") + done],
  ["empty text", stop + done],
  ["malformed JSON", "data: {broken}\n\n" + done],
  ["tool delta", frame({ choices: [{ delta: { tool_calls: [] } }] }) + done],
  ["text after stop", delta("first") + stop + delta("late") + done],
  ["non-SSE body", "plain JSON"],
  ["event limit", ":" + "x".repeat(65536) + "\n\n"],
  ["text limit", delta("x".repeat(32769)) + stop + done],
  [
    "wire limit",
    (":" + "x".repeat(60000) + "\n\n").repeat(35) + delta("text") + stop + done,
  ],
] as const) {
  test(`stream parser rejects ${name} without leaking upstream content`, async () => {
    const source = response(wire);
    await assert.rejects(
      readChatStream(source, options),
      (error: unknown) =>
        normalized(error)?.errorClass === "UPSTREAM_ERROR" &&
        normalized(error)?.retryable === false &&
        !String(error).includes("partial"),
    );
    assert.equal(source.body!.locked, false);
  });
}

test("stream parser gracefully accepts length finish without throwing", async () => {
  const source = response(
    delta("partial content") +
      frame({ choices: [{ delta: {}, finish_reason: "length" }] }) +
      done,
  );
  const result = await readChatStream(source, options);
  assert.equal(result.text, "partial content");
});

test("stream parser rejects invalid UTF-8", async () => {
  await assert.rejects(
    readChatStream(response(new Uint8Array([0xc3, 0x28])), options),
    (error: unknown) => normalized(error)?.errorClass === "UPSTREAM_ERROR",
  );
});

test("a non-SSE response is rejected and its body is cancelled", async () => {
  let cancelled = false;
  const source = new Response(
    new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  await assert.rejects(readChatStream(source, options));
  assert.equal(cancelled, true);
  assert.equal(source.body!.locked, false);
});

for (const [name, payload] of [
  ["refusal", { choices: [{ delta: { refusal: "private-upstream" } }] }],
  [
    "content filter",
    { choices: [{ delta: {}, finish_reason: "content_filter" }] },
  ],
  [
    "policy error",
    { error: { code: "content_filter", message: "private-upstream" } },
  ],
] as const) {
  test(`stream parser preserves nonretryable ${name} classification`, async () => {
    await assert.rejects(
      readChatStream(response(frame(payload)), options),
      (error: unknown) => {
        assert.equal(normalized(error)?.errorClass, "CONTENT_BLOCKED");
        assert.equal(normalized(error)?.retryable, false);
        assert.equal(normalized(error)?.channelId, "parser-fixture");
        assert.equal(JSON.stringify(error).includes("private-upstream"), false);
        return true;
      },
    );
  });
}

test("a rate-limit SSE error retains its retryable classification safely", async () => {
  await assert.rejects(
    readChatStream(
      response(
        frame({
          error: { status: 429, message: "rate limit private-upstream" },
        }),
      ),
      options,
    ),
    (error: unknown) =>
      normalized(error)?.errorClass === "RATE_LIMITED" &&
      normalized(error)?.retryable === true &&
      !JSON.stringify(error).includes("private-upstream"),
  );
});

test(
  "abort cancels a stalled read and releases its reader",
  { timeout: 2000 },
  async () => {
    let cancelled = false;
    const source = new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
    const abort = new AbortController();
    const reason = new Error("synthetic cancellation");
    const pending = readChatStream(source, {
      ...options,
      signal: abort.signal,
    });
    abort.abort(reason);
    await assert.rejects(pending, (error: unknown) => error === reason);
    assert.equal(cancelled, true);
    assert.equal(source.body!.locked, false);
  },
);

test(
  "abort interrupts an awaited delta callback and discards queued deltas",
  { timeout: 2000 },
  async () => {
    const abort = new AbortController();
    let first!: () => void;
    const seen = new Promise<void>((resolve) => {
      first = resolve;
    });
    const chunks: string[] = [];
    const source = response(delta("first") + delta("late") + stop + done);
    const pending = readChatStream(source, {
      ...options,
      signal: abort.signal,
      onTextDelta: (text) => {
        chunks.push(text);
        first();
        return new Promise<void>(() => {});
      },
    });
    await seen;
    abort.abort();
    await assert.rejects(
      pending,
      (error: unknown) => error === abort.signal.reason,
    );
    assert.deepEqual(chunks, ["first"]);
    assert.equal(source.body!.locked, false);
  },
);

test("a callback that cancels and rejects cannot leave an unhandled rejection", async () => {
  const abort = new AbortController();
  const reason = new Error("synthetic cancellation");
  await assert.rejects(
    readChatStream(response(delta("first") + stop + done), {
      ...options,
      signal: abort.signal,
      onTextDelta: () => {
        abort.abort(reason);
        return Promise.reject(new Error("private-upstream"));
      },
    }),
    (error: unknown) => error === reason,
  );
  await setImmediate();
});

test("a reader transport fault remains retryable without exposing its message", async () => {
  const source = new Response(
    new ReadableStream({
      start(controller) {
        controller.error(new Error("private-upstream"));
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
  await assert.rejects(
    readChatStream(source, options),
    (error: unknown) =>
      normalized(error)?.errorClass === "TIMEOUT" &&
      normalized(error)?.retryable === true &&
      !JSON.stringify(error).includes("private-upstream"),
  );
  assert.equal(source.body!.locked, false);
});
