import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAgentActivity,
  mergeAgentChatItem,
  parseAgentSseEvent,
  parseAgentSsePayload,
} from "../../src/features/agent/agentEvents.ts";
import type { AgentChatItem } from "../../src/features/agent/agentTypes.ts";

/**
 * Agent SSE 事件解析：把 vendor/canvas-agent 的原始事件
 * 归一为驱动 UI 的 AgentEvent（conversation/message/activity/approval/tool_call）。
 */
test("解析 conversation_changed 事件", () => {
  const event = parseAgentSseEvent("conversation_changed", {
    revision: 3,
    conversationId: "conv-1",
    threadId: "thread-1",
    status: "ready",
    mcpStatuses: {},
  });
  assert.equal(event?.kind, "conversation");
  if (event?.kind !== "conversation") return;
  assert.equal(event.conversation.revision, 3);
  assert.equal(event.conversation.status, "ready");
});

test("解析 chat_message 用户回显", () => {
  const event = parseAgentSseEvent("chat_message", {
    turnId: "turn-1",
    message: {
      id: "msg-1",
      itemId: "synthetic:user",
      clientMessageId: "local-1",
      role: "user",
      text: "画一只猫",
    },
  });
  assert.equal(event?.kind, "message");
  if (event?.kind !== "message") return;
  assert.equal(event.item.role, "user");
  assert.equal(event.item.text, "画一只猫");
});

test("解析 agent_event assistant 增量", () => {
  const updated = parseAgentSseEvent("agent_event", {
    turnId: "turn-1",
    type: "item.updated",
    item: { id: "assistant-1", type: "agent_message", delta: "第二段" },
  });
  assert.equal(updated?.kind, "message");
  if (updated?.kind !== "message") return;
  const base: AgentChatItem = {
    id: "assistant-1",
    role: "assistant",
    text: "第一段",
  };
  const merged = mergeAgentChatItem(base, updated.item);
  assert.equal(merged.text, "第一段第二段");
});

test("解析 agent_event 工具活动（command_execution）", () => {
  const event = parseAgentSseEvent("agent_event", {
    turnId: "turn-1",
    type: "item.started",
    item: { id: "cmd-1", type: "command_execution", command: "npm test" },
  });
  assert.equal(event?.kind, "activity");
  if (event?.kind !== "activity") return;
  assert.equal(event.itemType, "command_execution");
  assert.equal(event.phase, "started");
  assert.match(
    formatAgentActivity("command_execution", event.item),
    /命令执行/,
  );
});

test("解析 codex_approval 权限请求", () => {
  const event = parseAgentSseEvent("codex_approval", {
    requestId: "17",
    method: "local_shell_execute",
    command: "rm -rf tmp",
    cwd: "D:/project",
  });
  assert.equal(event?.kind, "approval");
  if (event?.kind !== "approval") return;
  assert.equal(event.approval.requestId, "17");
  assert.equal(event.approval.method, "local_shell_execute");
});

test("解析 tool_call 画布工具请求", () => {
  const event = parseAgentSseEvent("tool_call", {
    requestId: "req-1",
    name: "canvas_apply_ops",
    input: { ops: [{ type: "add_node", nodeType: "text" }] },
  });
  assert.equal(event?.kind, "tool_call");
  if (event?.kind !== "tool_call") return;
  assert.equal(event.requestId, "req-1");
  assert.equal(event.name, "canvas_apply_ops");
});

test("无法识别的事件返回 null", () => {
  assert.equal(parseAgentSseEvent("unknown_event", { x: 1 }), null);
  assert.equal(parseAgentSseEvent("conversation_changed", {}), null);
});

test("解析 SSE 帧（event: type + data: JSON）", () => {
  const frame = parseAgentSsePayload(
    JSON.parse(JSON.stringify({ type: "codex_state", data: { busy: true } })),
  );
  assert.equal(frame?.type, "codex_state");
});
