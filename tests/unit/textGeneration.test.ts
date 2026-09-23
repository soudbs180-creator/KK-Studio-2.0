import assert from "node:assert/strict";
import test from "node:test";
import { readTextStream } from "../../src/features/creation/textGeneration.ts";

const encode = new TextEncoder();
const event = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`;
function response(bytes: Uint8Array, step = 1) {
  let offset = 0;
  return new Response(
    new ReadableStream({
      pull(controller) {
        if (offset >= bytes.length) controller.close();
        else {
          controller.enqueue(bytes.slice(offset, offset + step));
          offset += step;
        }
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}
test("text stream preserves split UTF-8 and emits cumulative text only from valid deltas", async () => {
  const chunks: string[] = [];
  const text = await readTextStream(
    response(encode.encode(event("你好") + event("世界") + "data: [DONE]\n\n")),
    new AbortController().signal,
    (value) => chunks.push(value),
  );
  assert.equal(text, "你好世界");
  assert.deepEqual(chunks, ["你好", "你好世界"]);
});
for (const [label, value] of [
  ["truncated", event("部分")],
  ["malformed", "data: {broken}\n\ndata: [DONE]\n\n"],
  ["empty", "data: [DONE]\n\n"],
  ["error", event("部分") + 'data: {"error":{"message":"private-secret"}}\n\n'],
  ["limit", event("x".repeat(32769)) + "data: [DONE]\n\n"],
  [
    "length finish",
    event("部分") +
      'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
  ],
] as const)
  test(`text stream rejects ${label} without leaking response body`, async () => {
    await assert.rejects(
      readTextStream(
        response(encode.encode(value), 1024),
        new AbortController().signal,
      ),
      (error) =>
        error instanceof Error && !error.message.includes("private-secret"),
    );
  });
test("text stream abort cancels a stalled read", async () => {
  let cancelled = false;
  const abort = new AbortController();
  const pending = readTextStream(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    ),
    abort.signal,
  );
  abort.abort();
  await assert.rejects(pending);
  assert.equal(cancelled, true);
});
