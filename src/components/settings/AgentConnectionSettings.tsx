import { useEffect, useState, useSyncExternalStore } from "react";
import { agentConnection } from "../../features/agent/agentConnection.ts";
import {
  readPermissionMode,
  writePermissionMode,
  subscribeAgentPreferences,
} from "../../features/agent/agentConnection.ts";
import type { AgentPermissionMode } from "../../features/agent/agentTypes.ts";
import DesktopAgentControl from "./DesktopAgentControl.tsx";
import CodeBuddyConnectionSettings from "./CodeBuddyConnectionSettings.tsx";

const PERMISSION_LABELS: Record<AgentPermissionMode, string> = {
  request: "每次询问",
  automatic: "自动允许安全操作",
  full: "全部放行",
};

/**
 * 本地 Agent（canvas-agent）连接卡片。
 * 连接后可在对话面板选择默认/Codex，让 Agent 读取并操作画布。
 */
export default function AgentConnectionSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const state = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const [endpoint, setEndpoint] = useState(state.endpoint);
  const [token, setToken] = useState(state.token);
  const [runtimePending, setRuntimePending] = useState(false);
  const permissionMode = useSyncExternalStore(
    subscribeAgentPreferences,
    readPermissionMode,
  );

  useEffect(() => {
    setEndpoint(state.endpoint);
    setToken(state.token);
  }, [state.endpoint, state.token]);

  const statusClass =
    state.status === "connected"
      ? "is-online"
      : state.status === "connecting"
        ? "is-pending"
        : state.status === "error"
          ? "is-error"
          : "is-offline";

  async function handleConnect() {
    agentConnection.setCredentials(endpoint, token);
    await agentConnection.connect();
    const next = agentConnection.getState();
    onFeedback(
      next.status === "connected"
        ? "已连接本地 Agent，可在对话模型菜单选择默认或 Codex。"
        : next.error || "连接失败，请确认已运行 npm run agent。",
    );
  }

  return (
    <div className="settings-network-row settings-agent-card">
      <div className="settings-agent-status">
        <span
          className={"settings-status-dot " + statusClass}
          aria-hidden="true"
        />
        <h3>
          Codex 主 Agent
          <span className="settings-version-tag">本地连接</span>
        </h3>
      </div>
      <p>
        使用 Codex 已登录账号完成对话，无需对话 API Key。主 Agent
        可操作画布并调用 KK 已配置的生成服务。选择 Codex
        图片入口使用账号内置生图；选择 API 使用对应供应商连接。
      </p>
      <DesktopAgentControl
        onFeedback={onFeedback}
        onBusyChange={setRuntimePending}
      />
      <div className="settings-network-field">
        <label htmlFor="agent-endpoint">Agent 地址</label>
        <input
          id="agent-endpoint"
          aria-label="Agent 地址"
          value={endpoint}
          disabled={
            runtimePending ||
            state.status === "connecting" ||
            state.status === "connected"
          }
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="http://127.0.0.1:17371"
        />
      </div>
      <div className="settings-network-field">
        <label htmlFor="agent-token">本地连接 Token（仅本次会话）</label>
        <input
          id="agent-token"
          type="password"
          autoComplete="off"
          aria-label="连接 Token"
          value={token}
          disabled={
            runtimePending ||
            state.status === "connecting" ||
            state.status === "connected"
          }
          onChange={(e) => setToken(e.target.value)}
          placeholder="外部服务的本次连接 Token"
        />
      </div>
      <div className="settings-network-field">
        <label htmlFor="agent-permission">权限模式</label>
        <select
          id="agent-permission"
          aria-label="权限模式"
          value={permissionMode}
          onChange={(e) => {
            const mode = e.target.value as AgentPermissionMode;
            writePermissionMode(mode);
            onFeedback("权限模式已更新：" + PERMISSION_LABELS[mode] + "。");
          }}
        >
          {(["request", "automatic", "full"] as AgentPermissionMode[]).map(
            (mode) => (
              <option key={mode} value={mode}>
                {PERMISSION_LABELS[mode]}
              </option>
            ),
          )}
        </select>
      </div>
      {state.status === "error" && state.error && (
        <p className="settings-network-error" role="alert">
          {state.error}
        </p>
      )}
      {state.activity && state.status !== "error" && (
        <p className="settings-network-activity" role="status">
          {state.activity}
        </p>
      )}
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action"
          disabled={
            runtimePending ||
            state.status === "connecting" ||
            state.status === "connected"
          }
          onClick={() => void handleConnect()}
        >
          {state.status === "connecting"
            ? "连接中…"
            : state.status === "connected"
              ? "已连接"
              : "连接 Agent"}
        </button>
        <button
          type="button"
          className="settings-action"
          disabled={runtimePending || state.status === "disconnected"}
          onClick={() => {
            agentConnection.disconnect();
            onFeedback(
              "已断开 Codex。需要直接生成时，请在对话面板切换执行方式。",
            );
          }}
        >
          断开
        </button>
      </div>
      <p className="settings-network-code">
        本地开发可用 npm run dev:agent 一起启动 KK 与 Codex 连接服务。
      </p>
      <CodeBuddyConnectionSettings onFeedback={onFeedback} />
    </div>
  );
}
