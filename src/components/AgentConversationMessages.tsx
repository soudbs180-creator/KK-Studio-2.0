import type {
  AgentApprovalDecision,
  AgentChatItem,
  AgentPermissionMode,
  AgentConversationState,
} from "../features/agent/index.ts";
import { useEffect, useRef, useState } from "react";
import AgentUsageStatus from "./AgentUsageStatus";
import AgentMessageGroup from "./AgentMessageGroup.tsx";
import type { AgentUsageWindow } from "../features/agent/index.ts";
import type { AgentDraftAttachment } from "../features/agent/index.ts";
import type { CanvasCollectionItem } from "../domain/canvasItems";
import type { ModelSelection } from "../domain/modelSelection";

/** 本地 Agent 会话通道（画布旁对话面板与 canvas-agent 的桥）。 */
export interface AgentConversationProps {
  onRewind?: (messageId: string) => Promise<void>;
  displayName?: string;
  intro?: string;
  hideUsage?: boolean;
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
  freshDisabledReason?: string;
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
    selection?: ModelSelection,
  ) => Promise<{ ok: boolean; error?: string }>;
  onInterrupt: () => Promise<{ ok: boolean; error?: string }>;
  onDecision: (
    decision: AgentApprovalDecision,
  ) => Promise<{ ok: boolean; error?: string }>;
}

function formatAgentBannerText(agent: AgentConversationProps): string {
  if (agent.pendingApproval) return "Agent 等待确认…";
  if (agent.sending) {
    return agent.activity.includes("已请求停止")
      ? agent.activity
      : "Agent 正在执行…";
  }
  if (agent.connecting) return `正在连接${agent.displayName ?? "本地 Agent"}…`;
  const title = agent.displayName ?? "Codex 主 Agent";
  return agent.connected ? `${title} · 已连接` : `${title} · 未连接`;
}

/** Agent 会话消息区：横幅、流式消息、工具活动与权限请求。 */
export default function AgentConversationMessages({
  agent,
  onConfigure,
  onPreviewImage,
  onSetReference,
}: {
  agent: AgentConversationProps;
  onConfigure: () => void;
  onPreviewImage?: (src: string, prompt?: string) => void;
  onSetReference?: (src: string) => void;
}) {
  const { messages, sending, connecting, pendingApproval } = agent;
  const groups = messages.reduce<AgentChatItem[][]>((result, item) => {
    const previous = result.at(-1);
    const last = previous?.at(-1);
    if (
      item.role === "tool" &&
      last?.role === "tool" &&
      item.threadId === last.threadId &&
      item.turnId === last.turnId
    )
      previous!.push(item);
    else result.push([item]);
    return result;
  }, []);
  const connectionBusy =
    connecting || agent.preparing || sending || Boolean(pendingApproval);
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
      {agent.connected && !agent.hideUsage && (
        <AgentUsageStatus
          windows={agent.usage}
          error={agent.usageError}
          onRefresh={agent.onRefreshUsage}
        />
      )}
      <p
        className={`chat-agent-banner${agent.connected ? " is-connected" : ""}`}
        role="status"
      >
        {formatAgentBannerText(agent)}
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
        <p className="chat-agent-warning" role="status">
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
          {agent.intro ??
            (agent.connected
              ? "输入任务，让 Codex 优化提示词、修改画布或调用已配置的图片生成。"
              : "使用已登录的 Codex 账号，无需填写对话 API Key。")}
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
          className="ui-button is-primary"
          disabled={connectionBusy || agent.connected}
          onClick={() => agent.onConnect()}
        >
          {connecting
            ? "连接中…"
            : agent.connected
              ? "已连接"
              : `连接 ${agent.displayName ?? "Codex"}`}
        </button>
        <details className="chat-agent-advanced">
          <summary>高级会话操作</summary>
          <p>{agent.freshDisabledReason ?? "新建后将切换当前项目的会话。"}</p>
          <button
            type="button"
            disabled={connectionBusy || Boolean(agent.freshDisabledReason)}
            title={agent.freshDisabledReason}
            onClick={() => agent.onConnect(true)}
          >
            新建 Agent 会话
          </button>
        </details>
        {connectionBusy && <p>请先停止任务或处理待审批操作，再切换连接。</p>}
      </div>
      {groups.map((items) => (
        <AgentMessageGroup
          onRewind={agent.onRewind}
          disabled={connectionBusy}
          key={items[0].id}
          items={items}
          onPreviewImage={onPreviewImage}
          onSetReference={onSetReference}
        />
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
