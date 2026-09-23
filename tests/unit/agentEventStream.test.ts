import assert from "node:assert/strict";
import test from "node:test";
import { createAgentEventStream } from "../../src/features/agent/agentEventStream.ts";

test("fetch SSE 跨字节解析具名事件且使用头部鉴权", async () => {
  const bytes = new TextEncoder().encode(
    'event: hello\r\ndata: {"text":"中文"}\r\n\r\nevent: agent_event\ndata: {"type":"turn.completed"}\n\n',
  );
  const frames: Array<{ data?: string; type?: string }> = [];
  let authenticated = false;
  const stream = createAgentEventStream(
    "http://127.0.0.1:1/events?clientId=c",
    "private-token",
    (async (_url, init) => {
      authenticated =
        new Headers(init?.headers).get("x-canvas-agent-token") ===
        "private-token";
      return new Response(
        new ReadableStream({
          start(controller) {
            for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
            controller.close();
          },
        }),
      );
    }) as typeof fetch,
  );
  await new Promise<void>((resolve) => {
    stream.onmessage = (frame) => frames.push(frame);
    stream.onerror = () => resolve();
  });
  assert.equal(authenticated, true);
  assert.deepEqual(
    frames.map((x) => x.type),
    ["hello", "agent_event"],
  );
  assert.equal(JSON.parse(frames[0].data!).text, "中文");
});
test("未认证 SSE 返回 401，不能进入 ready", async () => {
  const stream = createAgentEventStream(
    "http://127.0.0.1:1/events",
    "bad",
    (async () => new Response("", { status: 401 })) as typeof fetch,
  );
  const error = await new Promise<Error | undefined>((resolve) => {
    stream.onerror = resolve;
  });
  assert.match(error?.message ?? "", /凭据无效/);
});
