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
  AgentActivityDetail,
  AgentActivityItem,
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

function parseAgentSubEvent(data: Record<string, unknown>): AgentEvent | null {
  const threadId = stringOrUndefined(data.threadId ?? data.thread_id);
  const turnId = stringOrUndefined(data.turnId ?? data.turn_id);
  const terminal = data as {
    type?: string;
    status?: string;
    error?: string | { message?: string };
  };
  if (terminal.type === "turn.completed") {
    return {
      kind: "terminal",
      threadId,
      turnId,
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
    item?: AgentActivityItem & { type?: string };
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
        threadId,
        turnId,
        role: "assistant",
        text: item.text ?? "",
        detail: { phase, delta: item.delta ?? "" },
      },
    };
  }
  if (!isActivityItemType(item.type)) return null;
  return {
    kind: "activity",
    threadId,
    turnId,
    itemType: item.type,
    phase,
    item: {
      id: item.id,
      text: item.text,
      delta: item.delta,
      command: item.command,
      cwd: item.cwd,
      aggregatedOutput: item.aggregatedOutput,
      exitCode: item.exitCode,
      status: item.status,
      success: item.success,
      error: item.error,
      summary: item.summary,
    },
  };
}

function parseApprovalSseEvent(
  type: string,
  payload: Record<string, unknown>,
): AgentEvent | null {
  if (type === "codex_approval") {
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
    const requestId = String(payload.requestId || "");
    if (!requestId) return null;
    return {
      kind: "approval_resolved",
      requestId,
      decision: String(payload.decision || "cancel"),
    };
  }
  return null;
}

function parseControlOrToolSseEvent(
  type: string,
  payload: Record<string, unknown>,
): AgentEvent | null {
  if (type === "tool_call") {
    const requestId = String(payload.requestId || "");
    const name = String(payload.name || "");
    if (!requestId || !name) return null;
    return {
      kind: "tool_call",
      ...(typeof payload.threadId === "string"
        ? { threadId: payload.threadId }
        : {}),
      ...(typeof payload.turnId === "string" ? { turnId: payload.turnId } : {}),
      requestId,
      name,
      input: (payload.input ?? {}) as Record<string, unknown>,
    };
  }
  if (type === "agent_bootstrap") {
    const bootstrap = payload as {
      type?: string;
      threadId?: string;
      error?: string;
    };
    return {
      kind: "bootstrap",
      type: bootstrap?.type || "",
      threadId: stringOrUndefined(bootstrap?.threadId),
      error: stringOrUndefined(bootstrap?.error),
    };
  }
  if (type === "workspace_changed") {
    const workspace = payload as { activeThreadId?: string };
    return {
      kind: "workspace",
      activeThreadId: stringOrUndefined(workspace?.activeThreadId),
    };
  }
  if (type === "codex_state") {
    const codex = payload as { busy?: boolean };
    return { kind: "codex", busy: Boolean(codex?.busy) };
  }
  return null;
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
    return parseAgentSubEvent(data as Record<string, unknown>);
  }
  const record = data as Record<string, unknown>;
  return (
    parseApprovalSseEvent(type, record) ??
    parseControlOrToolSseEvent(type, record)
  );
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
  if (incoming.role === "tool" && incoming.detail) {
    const detail = incoming.detail as AgentActivityDetail;
    const previous = current?.detail as AgentActivityDetail | undefined;
    if (
      current?.activityItems &&
      incoming.itemId &&
      current.activityItems[incoming.itemId] !== undefined
    ) {
      if (isAgentActivitySettled(previous)) return current;
      const text =
        detail.phase === "updated" && detail.delta
          ? current.activityItems[incoming.itemId] + detail.delta
          : incoming.text || current.activityItems[incoming.itemId];
      const activityItems = {
        ...current.activityItems,
        [incoming.itemId]: text,
      };
      return {
        ...current,
        activityItems,
        text: Object.values(activityItems).join("\n\n"),
      };
    }
    if (isAgentActivitySettled(previous) && detail.phase !== "completed")
      return current!;
    const patch = Object.fromEntries(
      Object.entries(detail).filter(([, value]) => value !== undefined),
    );
    const merged = { ...previous, ...patch } as AgentActivityDetail;
    const outputDelta = detail.kind === "command" || detail.kind === "tool";
    if (detail.phase === "updated" && detail.delta && outputDelta)
      merged.output = (previous?.output ?? "") + detail.delta;
    return {
      ...current,
      ...incoming,
      id: current?.id ?? incoming.id,
      text:
        detail.phase === "updated" && detail.delta && !outputDelta
          ? (current?.text ?? "") + detail.delta
          : incoming.text || current?.text || "",
      detail: merged,
    };
  }
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

export function isAgentActivitySettled(detail?: AgentActivityDetail): boolean {
  return Boolean(
    detail?.phase === "completed" ||
    (!detail?.phase &&
      [
        "completed",
        "succeeded",
        "success",
        "failed",
        "error",
        "interrupted",
        "cancelled",
      ].includes(detail?.status ?? "")),
  );
}

/** 完成 phase 只表示活动结束，成功必须有明确结果证据。 */
export function agentActivityState(item: AgentChatItem): {
  label: string;
  tone:
    "running" | "success" | "failure" | "interrupted" | "complete" | "unknown";
} {
  const detail = item.detail as AgentActivityDetail | undefined;
  if (!detail) return { label: "结果未报告", tone: "unknown" };
  const rowExit = Array.isArray(detail.rows)
    ? detail.rows.find((row) => row?.label === "退出状态")?.value
    : undefined;
  const exitCode = Number.isInteger(detail.exitCode)
    ? detail.exitCode
    : typeof rowExit === "string" && /^-?\d+$/.test(rowExit)
      ? Number(rowExit)
      : undefined;
  if (
    detail.error ||
    detail.success === false ||
    ["failed", "error"].includes(detail.status ?? "") ||
    (exitCode !== undefined && exitCode !== 0)
  )
    return { label: "失败", tone: "failure" };
  if (
    ["interrupted", "cancelled", "canceled"].includes(detail.status ?? "") ||
    (!isAgentActivitySettled(detail) &&
      ["interrupted", "cancelled", "canceled"].includes(
        detail.turnStatus ?? "",
      ))
  )
    return { label: "已中断", tone: "interrupted" };
  if (
    exitCode === 0 ||
    detail.success === true ||
    ["success", "succeeded"].includes(detail.status ?? "")
  )
    return { label: "成功", tone: "success" };
  if (isAgentActivitySettled(detail))
    return {
      label: detail.kind === "command" ? "已执行 · 结果未报告" : "已执行",
      tone: "complete",
    };
  if (detail.turnStatus)
    return { label: "本轮已结束 · 结果未报告", tone: "unknown" };
  if (
    detail.phase ||
    ["inProgress", "in_progress", "running", "started", "pending"].includes(
      detail.status ?? "",
    )
  )
    return { label: "执行中", tone: "running" };
  return { label: "结果未报告", tone: "unknown" };
}

/** 实时事件与持久历史沿用相同的 kind/status/rows/output 展示字段。 */
export function agentActivityMessage(
  event: Extract<AgentEvent, { kind: "activity" }>,
  activeThreadId?: string,
): AgentChatItem {
  const { item, itemType, phase } = event;
  const threadId = event.threadId ?? activeThreadId;
  const kinds: Record<string, string> = {
    command_execution: "command",
    reasoning: "reasoning",
    plan: "plan",
    file_change: "file",
    web_search: "search",
    image_view: "image",
    image_generation: "image",
    context_compaction: "context",
  };
  return {
    id: "activity:" + JSON.stringify([threadId, event.turnId, item.id]),
    itemId: item.id,
    threadId,
    turnId: event.turnId,
    role: "tool",
    title: activityLabel(itemType),
    text:
      stringOrUndefined(item.command) ??
      stringOrUndefined(item.text) ??
      activitySummary(item.summary),
    detail: {
      kind: kinds[itemType] ?? "tool",
      itemType,
      phase,
      status: stringOrUndefined(item.status),
      command: stringOrUndefined(item.command),
      cwd: stringOrUndefined(item.cwd),
      delta: stringOrUndefined(item.delta),
      output:
        typeof item.aggregatedOutput === "string"
          ? item.aggregatedOutput
          : undefined,
      exitCode: Number.isInteger(item.exitCode) ? item.exitCode : undefined,
      success: typeof item.success === "boolean" ? item.success : undefined,
      error: stringOrUndefined(
        typeof item.error === "string" ? item.error : item.error?.message,
      ),
    } satisfies AgentActivityDetail,
  };
}

function activitySummary(summary: unknown): string {
  if (typeof summary === "string") return summary;
  if (!Array.isArray(summary)) return "";
  return summary
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("\n");
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
