import assert from "node:assert/strict";
import test from "node:test";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { createAgentApi } from "../../src/features/agent/agentApi.ts";
import {
  mergeAgentChatItem,
  parseAgentSseEvent,
} from "../../src/features/agent/agentEvents.ts";

test("真实 hello 握手携带会话而不是普通 message 包装", () => {
  const parsed = parseAgentSseEvent("hello", {
    conversation: {
      revision: 1,
      conversationId: "c",
      threadId: "",
      status: "idle",
      mcpStatuses: {},
    },
    workspace: { activeThreadId: "" },
  });
  assert.equal(parsed?.kind, "hello");
});

test("assistant final 是权威全文，不重复拼接部分文本", () => {
  const current = { id: "a", role: "assistant" as const, text: "第一段" };
  const final = {
    id: "a",
    role: "assistant" as const,
    text: "第一段第二段",
    detail: { phase: "completed" },
  };
  assert.equal(mergeAgentChatItem(current, final).text, "第一段第二段");
});

test("终态错误能结束回合并显示真实错误", () => {
  const event = parseAgentSseEvent("agent_event", {
    type: "turn.completed",
    status: "failed",
    error: { message: "登录已失效" },
    threadId: "t",
  });
  assert.equal(event?.kind, "terminal");
});

test("Token 仅经请求头传输，不进入 URL", async () => {
  let url = "";
  let headers = new Headers();
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371",
    token: "local-secret",
    clientId: "c",
    fetcher: (async (input, init) => {
      url = String(input);
      headers = new Headers(init?.headers);
      return Response.json({ ok: true });
    }) as typeof fetch,
  });
  await api.activate();
  assert.equal(headers.get("x-canvas-agent-token"), "local-secret");
  assert.equal(url.includes("local-secret"), false);
});

test("旧持久化 Token 被清除，新的 Token 只留在请求内存", () => {
  const values = new Map([["canvas-agent-token", "old-secret"]]);
  const connection = createAgentConnection({
    storage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => {
        values.set(k, v);
      },
      removeItem: (k) => {
        values.delete(k);
      },
    },
  });
  connection.setCredentials("http://127.0.0.1:17371", "new-secret");
  assert.equal(values.has("canvas-agent-token"), false);
  connection.disconnect();
});

test("画布激活 401 必须拒绝，不得吞错", async () => {
  const api = createAgentApi({
    endpoint: "http://127.0.0.1:17371",
    token: "",
    clientId: "c",
    fetcher: (async () =>
      Response.json(
        { error: "invalid token" },
        { status: 401 },
      )) as typeof fetch,
  });
  await assert.rejects(api.activate(), /invalid token/);
});
