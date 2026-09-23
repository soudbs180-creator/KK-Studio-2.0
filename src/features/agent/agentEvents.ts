/**
 * 本地 Agent SSE 事件解析与规范化。
 *
 * 上游服务端（vendor/canvas-agent）以 `event: <type>` + `data: <JSON>` 推送事件；
 * 本模块把原始事件归一为驱动 UI 的 AgentEvent，并维护会话内消息/活动的增量累加。
 */

import type {
  AgentApprovalRequest,
  AgentChatItem,
  AgentConversationState,
  AgentEvent,
} from "./agentTypes.ts";

export interface AgentSseEvent {
  type: string;
  data: unknown;
}

const ACTIVITY_ITEM_TYPES = new Set([
  "reasoning",
  "plan",
  "mcp_tool_call",
  "command_execution",
  "file_change",
  "dynamic_tool_call",
  "collab_tool_call",
  "web_search",
  "image_view",
  "image_generation",
  "context_compaction",
]);

export function isActivityItemType(type: string): boolean {
  return ACTIVITY_ITEM_TYPES.has(type);
}

/** 把一条原始 SSE 事件解析为规范事件；无法识别的事件返回 null。 */
export function parseAgentSseEvent(
  type: string,
  data: unknown,
): AgentEvent | null {
  if (!data || typeof data !== "object") return null;
  if (type === "hello") {
    const payload = data as {
      conversation?: AgentConversationState;
      workspace?: { activeThreadId?: string };
      codex?: { busy?: boolean };
      pendingApprovals?: AgentApprovalRequest[];
    };
    return {
      kind: "hello",
      conversation: payload.conversation,
      activeThreadId: payload.workspace?.activeThreadId,
      busy: Boolean(payload.codex?.busy),
      pendingApprovals: payload.pendingApprovals ?? [],
    };
  }
  if (type === "agent_error") {
    const payload = data as { message?: string; error?: string };
    return {
      kind: "terminal",
      status: "failed",
      error: payload.message || payload.error || "Agent 执行失败",
    };
  }
  // Codex emits agent_done after turn.completed even on failure; it carries no status.
  if (type === "agent_done") return null;
  if (type === "conversation_changed") {
    const conversation = data as AgentConversationState;
    return conversation && typeof conversation.revision === "number"
      ? { kind: "conversation", conversation }
      : null;
  }
  if (type === "chat_message") {
    const payload = data as { message?: AgentChatItem };
    const message = payload?.message;
    if (!message || !message.id) return null;
    return {
      kind: "message",
      item: {
        ...message,
        role: message.role ?? "user",
        text: message.text ?? "",
        threadId: message.threadId ?? "",
      },
    };
  }
  if (type === "agent_event") {
    const terminal = data as {
      type?: string;
      status?: string;
      error?: string | { message?: string };
    };
    if (terminal.type === "turn.completed") {
      return {
        kind: "terminal",
        status: terminal.status || "completed",
        error:
          typeof terminal.error === "string"
            ? terminal.error
            : terminal.error?.message,
      };
    }
    const payload = data as {
      turnId?: string;
      threadId?: string;
      type?: string;
      item?: {
        id?: string;
        type?: string;
        text?: string;
        delta?: string;
        command?: string;
      };
    };
    const item = payload?.item;
    if (!item?.id || !item.type) return null;
    const phase = parseItemPhase(payload.type);
    if (phase === null) return null;
    if (item.type === "agent_message") {
      return {
        kind: "message",
        item: {
          id: item.id,
          itemId: item.id,
          threadId: payload.threadId,
          turnId: payload.turnId,
          role: "assistant",
          text: item.text ?? "",
          detail: { phase, delta: item.delta ?? "" },
        },
      };
    }
    if (!isActivityItemType(item.type)) return null;
    return {
      kind: "activity",
      turnId: payload.turnId,
      itemType: item.type,
      phase,
      item: {
        id: item.id,
        text: item.text,
        delta: item.delta,
        command: item.command,
      },
    };
  }
  if (type === "codex_approval") {
    const payload = data as Record<string, unknown>;
    const requestId = String(payload.requestId || "");
    if (!requestId) return null;
    return {
      kind: "approval",
      approval: {
        requestId,
        method: String(payload.method || "unknown"),
        threadId: stringOrUndefined(payload.threadId),
        turnId: stringOrUndefined(payload.turnId),
        itemId: stringOrUndefined(payload.itemId),
        reason: stringOrUndefined(payload.reason),
        command: payload.command,
        cwd: stringOrUndefined(payload.cwd),
        permissions: payload.permissions,
      },
    };
  }
  if (type === "codex_approval_resolved") {
    const payload = data as Record<string, unknown>;
    const requestId = String(payload.requestId || "");
    if (!requestId) return null;
    return {
      kind: "approval_resolved",
      requestId,
      decision: String(payload.decision || "cancel"),
    };
  }
  if (type === "tool_call") {
    const payload = data as Record<string, unknown>;
    const requestId = String(payload.requestId || "");
    const name = String(payload.name || "");
    if (!requestId || !name) return null;
    return {
      kind: "tool_call",
      requestId,
      name,
      input: (payload.input ?? {}) as Record<string, unknown>,
    };
  }
  if (type === "agent_bootstrap") {
    const payload = data as {
      type?: string;
      threadId?: string;
      error?: string;
    };
    return {
      kind: "bootstrap",
      type: payload?.type || "",
      threadId: stringOrUndefined(payload?.threadId),
      error: stringOrUndefined(payload?.error),
    };
  }
  if (type === "workspace_changed") {
    const payload = data as { activeThreadId?: string };
    return {
      kind: "workspace",
      activeThreadId: stringOrUndefined(payload?.activeThreadId),
    };
  }
  if (type === "codex_state") {
    const payload = data as { busy?: boolean };
    return { kind: "codex", busy: Boolean(payload?.busy) };
  }
  return null;
}

export function parseAgentSsePayload(payload: unknown): AgentSseEvent | null {
  const record = payload as Record<string, unknown> | null;
  if (!record || typeof record.type !== "string") return null;
  return { type: record.type, data: record.data };
}

function parseItemPhase(
  value?: string,
): "started" | "updated" | "completed" | null {
  if (value === "item.started") return "started";
  if (value === "item.updated") return "updated";
  if (value === "item.completed") return "completed";
  return null;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/** 合并消息：assistant 增量（delta/text）累加到既有条目。 */
export function mergeAgentChatItem(
  current: AgentChatItem | undefined,
  incoming: AgentChatItem,
): AgentChatItem {
  if (!current) {
    const first = incoming.detail as { delta?: string } | undefined;
    return { ...incoming, text: incoming.text || first?.delta || "" };
  }
  if (incoming.role !== "assistant") return incoming;
  const detail = incoming.detail as
    { phase?: string; delta?: string } | undefined;
  const currentDetail = current.detail as { phase?: string } | undefined;
  if (currentDetail?.phase === "completed" && detail?.phase !== "completed")
    return current;
  const text =
    detail?.phase === "updated" && detail.delta
      ? current.text + detail.delta
      : incoming.text || current.text;
  return {
    ...current,
    ...incoming,
    text,
    turnId: incoming.turnId ?? current.turnId,
    id: current.id,
  };
}

/** 把活动条目文本规范化（工具名 + 内容摘要）。 */
export function formatAgentActivity(
  itemType: string,
  item: { text?: string; command?: string; delta?: string },
): string {
  const label = activityLabel(itemType);
  const content = item.text ?? item.command ?? item.delta ?? "";
  const summary = String(content).replace(/\s+/g, " ").slice(0, 120);
  return summary ? `${label} ${summary}` : label;
}

function activityLabel(type: string): string {
  const labels: Record<string, string> = {
    reasoning: "推理",
    plan: "计划",
    mcp_tool_call: "工具调用",
    command_execution: "命令执行",
    file_change: "文件变更",
    dynamic_tool_call: "工具调用",
    collab_tool_call: "协作工具",
    web_search: "网页搜索",
    image_view: "查看图片",
    image_generation: "图片生成",
    context_compaction: "上下文压缩",
  };
  return labels[type] ?? type;
}

export interface AgentPendingApproval {
  approval: AgentApprovalRequest;
  status: "pending";
}
