import { useEffect, useState, useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { agentConnection } from "../../features/agent/index.ts";
import {
  readPermissionMode,
  writePermissionMode,
  subscribeAgentPreferences,
} from "../../features/agent/index.ts";
import type { AgentPermissionMode } from "../../features/agent/index.ts";
import { desktopAgentLifecycle } from "../../features/agent/index.ts";
import DesktopAgentControl from "./DesktopAgentControl.tsx";
import BrowserBackendSettings from "./BrowserBackendSettings.tsx";

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
  const desktop = isTauri();
  const lifecycle = useSyncExternalStore(
    desktopAgentLifecycle.subscribe,
    desktopAgentLifecycle.getState,
  );
  const [endpoint, setEndpoint] = useState(state.endpoint);
  const [token, setToken] = useState(state.token);
  const busy =
    state.sending || state.preparing || Boolean(state.pendingApproval);
  const pending =
    state.status === "connecting" || (desktop && lifecycle.pending);
  const ready =
    desktop && !agentConnection.getProjectId() && lifecycle.runtime?.healthy;
  const error = state.error || (desktop ? lifecycle.error : null);
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
      : pending
        ? "is-pending"
        : error
          ? "is-error"
          : ready
            ? "is-online"
            : "is-offline";

  async function handleConnect(manual = false, fresh = false) {
    const current = agentConnection.getState();
    if (
      pending ||
      current.status === "connecting" ||
      current.sending ||
      current.preparing ||
      current.pendingApproval
    )
      return;
    try {
      if (desktop && !manual) await desktopAgentLifecycle.connect(fresh);
      else {
        if (desktop) desktopAgentLifecycle.disconnect();
        agentConnection.setCredentials(endpoint, token);
        await agentConnection.connect(fresh);
      }
      const next = agentConnection.getState();
      onFeedback(
        next.status === "connected"
          ? "已连接 Codex 主 Agent。"
          : next.error || "服务已就绪，打开项目后会自动连接。",
      );
    } catch (reason) {
      onFeedback(reason instanceof Error ? reason.message : String(reason));
    }
  }

  function handleDisconnect() {
    const current = agentConnection.getState();
    if (current.sending || current.preparing || current.pendingApproval) return;
    try {
      if (desktop) desktopAgentLifecycle.disconnect();
      else agentConnection.disconnect();
      onFeedback(
        desktop
          ? "已断开 Codex，自动连接已暂停。点击重新连接可恢复。"
          : "已断开 Codex。",
      );
    } catch (reason) {
      onFeedback(reason instanceof Error ? reason.message : String(reason));
    }
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
          <span className="settings-version-tag">
            {state.status === "connected"
              ? "已连接"
              : pending
                ? "连接中"
                : error
                  ? "连接失败"
                  : ready
                    ? "已就绪"
                    : "未连接"}
          </span>
        </h3>
      </div>
      <p>
        使用本机已登录的 Codex 账号，负责对话、任务规划与画布操作。
        图片任务可使用账号内置能力或你配置的 API。
      </p>
      {ready && (
        <p role="status">
          {lifecycle.automatic
            ? "服务已就绪，打开项目后会自动连接。"
            : "自动连接已暂停。打开项目后点击重新连接。"}
        </p>
      )}
      <details className="model-access-manual">
        <summary>高级连接选项</summary>
        <DesktopAgentControl onFeedback={onFeedback} />
        <div className="settings-network-field">
          <label htmlFor="agent-endpoint">Agent 地址</label>
          <input
            id="agent-endpoint"
            aria-label="Agent 地址"
            value={endpoint}
            disabled={pending || busy || state.status === "connected"}
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
            disabled={pending || busy || state.status === "connected"}
            onChange={(e) => setToken(e.target.value)}
            placeholder="外部服务的本次连接 Token"
          />
        </div>
        {desktop && (
          <div className="settings-network-actions">
            <button
              type="button"
              className="settings-action secondary"
              disabled={pending || busy || state.status === "connected"}
              onClick={() => void handleConnect(true)}
            >
              连接外部服务
            </button>
          </div>
        )}
        <p>新建会话仅用于当前项目，原对话会保留。</p>
        <button
          type="button"
          className="settings-action secondary"
          disabled={pending || busy || !agentConnection.getProjectId()}
          onClick={() => void handleConnect(false, true)}
        >
          新建 Agent 会话
        </button>
      </details>
      <div className="settings-network-field">
        <label htmlFor="agent-permission">权限模式</label>
        <select
          id="agent-permission"
          aria-label="权限模式"
          value={permissionMode}
          disabled={pending || busy}
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
      <p>“每次询问”会在 Agent 执行操作前请求许可，已有连接和对话可持续复用。</p>
      <BrowserBackendSettings onFeedback={onFeedback} />
      {error && (
        <p className="settings-network-error" role="alert">
          {error}
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
            pending ||
            busy ||
            state.status === "connected" ||
            (desktop && lifecycle.runtime?.available === false)
          }
          onClick={() => void handleConnect()}
        >
          {pending
            ? "连接中…"
            : state.status === "connected"
              ? "已连接"
              : desktop
                ? "重新连接"
                : "连接 Agent"}
        </button>
        <button
          type="button"
          className="settings-action secondary"
          disabled={
            (desktop && lifecycle.pending) ||
            busy ||
            (state.status === "disconnected" &&
              (!desktop || !lifecycle.automatic))
          }
          onClick={handleDisconnect}
        >
          断开
        </button>
      </div>
      {busy && <p>请先停止任务或处理待审批操作，再切换连接。</p>}
    </div>
  );
}
