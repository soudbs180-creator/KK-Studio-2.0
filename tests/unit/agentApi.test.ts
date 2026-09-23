import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentApiError,
  createAgentApi,
} from "../../src/features/agent/agentApi.ts";
import type { CanvasAgentSnapshot } from "../../src/features/agent/agentTypes.ts";

/**
 * Agent HTTP 客户端：token 注入、端点路径、错误码。
 * 对照上游 web/src/services/api/canvas-agent.ts（fetch 可注入）。
 */
function stubFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>,
) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return handler(url, init);
  }) as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const snapshot: CanvasAgentSnapshot = {
  projectId: "p1",
  title: "t",
  nodes: [],
  connections: [],
  selectedNodeIds: [],
  viewport: { x: 0, y: 0, scale: 1 },
};

test("所有请求带 token 与 clientId", async () => {
  const urls: string[] = [];
  const fetchImpl = stubFetch(async (url) => {
    urls.push(url);
    if (url.endsWith("/config")) return jsonResponse(200, { ok: true });
    return jsonResponse(200, { ok: true });
  });
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371/",
    token: "abc",
    clientId: "client-1",
    fetcher: fetchImpl,
  });
  await api.discover();
  await api.postState(snapshot);
  assert.ok(urls[0].includes("http://127.0.0.1:17371/config"));
  assert.ok(urls[1].includes("/canvas/state"));
  assert.ok(!urls[1].includes("token="));
  assert.ok(urls[1].includes("clientId=client-1"));
});

test("postState 携带 hasCanvas 快照", async () => {
  let body: string | undefined;
  const fetchImpl = stubFetch(async (_url, init) => {
    body = typeof init?.body === "string" ? init.body : undefined;
    return jsonResponse(200, { ok: true });
  });
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371",
    token: "t",
    clientId: "c",
    fetcher: fetchImpl,
  });
  await api.postState(snapshot);
  assert.ok(body);
  assert.ok(JSON.parse(body as string).hasCanvas);
  assert.deepEqual(JSON.parse(body as string).viewport, { x: 0, y: 0, k: 1 });
});

test("postTurn 提交对话并返回 threadId", async () => {
  const fetchImpl = stubFetch(async () =>
    jsonResponse(200, { ok: true, threadId: "thread-9" }),
  );
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371",
    token: "t",
    clientId: "c",
    fetcher: fetchImpl,
  });
  const result = await api.postTurn({
    prompt: "画一只猫",
    messageText: "画一只猫",
    messageId: "m1",
    clientId: "c",
    permissionMode: "request",
  });
  assert.equal(result.threadId, "thread-9");
});

test("非 2xx 抛出 AgentApiError 并保留 code", async () => {
  const fetchImpl = stubFetch(async () =>
    jsonResponse(409, {
      error: "会话版本冲突",
      code: "CONVERSATION_STALE",
      state: {
        revision: 4,
        status: "ready",
        conversationId: "c1",
        threadId: "t1",
      },
    }),
  );
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371",
    token: "t",
    clientId: "c",
    fetcher: fetchImpl,
  });
  try {
    await api.postTurn({
      prompt: "x",
      messageText: "x",
      messageId: "m1",
      clientId: "c",
      permissionMode: "request",
    });
    assert.fail("应抛出 AgentApiError");
  } catch (error) {
    assert.ok(error instanceof AgentApiError);
    assert.equal(error.status, 409);
    assert.equal(error.response.code, "CONVERSATION_STALE");
  }
});

test("resolveApproval / interrupt 发送正确端点", async () => {
  const calls: Array<[string, string | undefined]> = [];
  const fetchImpl = stubFetch(async (url, init) => {
    calls.push([url, typeof init?.body === "string" ? init.body : undefined]);
    return jsonResponse(200, { ok: true });
  });
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371",
    token: "t",
    clientId: "c",
    fetcher: fetchImpl,
  });
  await api.resolveApproval("17", "accept");
  await api.interrupt("thread-1");
  assert.ok(calls[0][0].includes("/agent/codex/approval"));
  assert.match(calls[0][1] ?? "", /"decision":"accept"/);
  assert.ok(calls[1][0].includes("/agent/codex/interrupt"));
  assert.match(calls[1][1] ?? "", /"threadId":"thread-1"/);
});
