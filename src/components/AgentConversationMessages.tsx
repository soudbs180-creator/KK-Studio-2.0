import type {
  AgentApprovalDecision,
  AgentChatItem,
  AgentPermissionMode,
  AgentConversationState,
} from "../features/agent/agentTypes.ts";
import { useEffect, useRef, useState } from "react";
import AgentUsageStatus from "./AgentUsageStatus";
import type { AgentUsageWindow } from "../features/agent/agentUsage";
import type { AgentDraftAttachment } from "../features/agent/agentAttachments";
import type { CanvasCollectionItem } from "../domain/canvasItems";

/** 本地 Agent 会话通道（画布旁对话面板与 canvas-agent 的桥）。 */
export interface AgentConversationProps {
  connectionRevision: number;
  conversation: AgentConversationState | null;
  preparing: boolean;
  connected: boolean;
  error?: string | null;
  models: string[];
  usage: AgentUsageWindow[];
  usageError?: string | null;
  onRefreshUsage: () => void;
  onConnect: (fresh?: boolean) => void;
  connecting: boolean;
  sending: boolean;
  activity: string;
  messages: AgentChatItem[];
  pendingApproval: {
    requestId: string;
    method: string;
    command?: unknown;
    reason?: string;
  } | null;
  permissionMode: AgentPermissionMode;
  onPermissionModeChange: (mode: AgentPermissionMode) => void;
  canvasImages?: CanvasCollectionItem[];
  onSend: (
    message: string,
    attachments?: AgentDraftAttachment[],
  ) => Promise<{ ok: boolean; error?: string }>;
  onInterrupt: () => Promise<{ ok: boolean; error?: string }>;
  onDecision: (
    decision: AgentApprovalDecision,
  ) => Promise<{ ok: boolean; error?: string }>;
}

/** Agent 会话消息区：横幅、流式消息、工具活动与权限请求。 */
export default function AgentConversationMessages({
  agent,
  onConfigure,
}: {
  agent: AgentConversationProps;
  onConfigure: () => void;
}) {
  const { messages, sending, connecting, pendingApproval } = agent;
  const revision = useRef(agent.connectionRevision);
  revision.current = agent.connectionRevision;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setBusy(false);
    setError("");
  }, [agent.connectionRevision]);
  async function act(action: () => Promise<{ ok: boolean; error?: string }>) {
    if (busy) return;
    const current = revision.current;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (revision.current === current && !result.ok)
        setError(result.error ?? "操作未成功，请重试。");
    } catch {
      if (revision.current === current)
        setError("操作失败，请检查连接后重试。");
    } finally {
      if (revision.current === current) setBusy(false);
    }
  }
  return (
    <div className="chat-agent-messages" aria-label="本地 Agent 会话">
      {agent.connected && (
        <AgentUsageStatus
          windows={agent.usage}
          error={agent.usageError}
          onRefresh={agent.onRefreshUsage}
        />
      )}
      <p className="chat-agent-banner" role="status">
        {sending
          ? "Agent 正在执行…"
          : connecting
            ? "正在连接本地 Agent…"
            : agent.connected
              ? "Codex 主 Agent · 已连接"
              : "Codex 主 Agent · 未连接"}
        {sending && (
          <button
            type="button"
            className="chat-agent-stop"
            disabled={busy || !agent.connected}
            onClick={() => void act(agent.onInterrupt)}
          >
            停止
          </button>
        )}
      </p>
      {agent.connected && agent.conversation?.status === "warning" && (
        <p role="status">
          可选工具暂不可用：
          {Object.entries(agent.conversation.mcpStatuses)
            .filter(
              ([, tool]) =>
                tool.status === "failed" || tool.status === "cancelled",
            )
            .map(([name]) => name)
            .join("、") || "请检查服务记录"}
        </p>
      )}
      {error && error !== agent.error && (
        <p className="agent-action-error" role="alert">
          {error}
        </p>
      )}
      {messages.length === 0 && (
        <p className="chat-agent-empty">
          {agent.connected
            ? "输入任务，让 Codex 优化提示词、修改画布或调用已配置的图片生成。"
            : "使用已登录的 Codex 账号，无需填写对话 API Key。"}
        </p>
      )}
      {agent.error && (
        <p className="chat-status" role="alert">
          {agent.error}
        </p>
      )}
      <div className="chat-agent-controls">
        <button type="button" onClick={onConfigure}>
          连接设置
        </button>
        <button
          type="button"
          disabled={connecting || sending}
          onClick={() => agent.onConnect()}
        >
          {connecting ? "连接中…" : agent.connected ? "重新连接" : "连接 Codex"}
        </button>
        <button
          type="button"
          disabled={connecting || sending}
          onClick={() => agent.onConnect(true)}
        >
          新建 Agent 会话
        </button>
      </div>
      {messages.map((item) => (
        <div key={item.id} className={`chat-agent-item is-${item.role}`}>
          {item.role === "tool" && (
            <span className="chat-agent-tool-tag">工具</span>
          )}
          <span>{item.text}</span>
        </div>
      ))}
      {pendingApproval && (
        <div
          className="chat-approval"
          role="group"
          aria-label="确认 Agent 权限请求"
        >
          <span>
            Agent 请求执行：{pendingApproval.method}
            {typeof pendingApproval.command === "string"
              ? " — " + pendingApproval.command
              : ""}
          </span>
          {pendingApproval.reason && <p>{pendingApproval.reason}</p>}
          <button
            type="button"
            disabled={busy || !agent.connected}
            onClick={() => void act(() => agent.onDecision("accept"))}
          >
            允许
          </button>
          <button
            type="button"
            disabled={busy || !agent.connected}
            onClick={() => void act(() => agent.onDecision("decline"))}
          >
            拒绝
          </button>
        </div>
      )}
    </div>
  );
}
