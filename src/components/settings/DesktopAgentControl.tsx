import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { agentConnection } from "../../features/agent/agentConnection.ts";

interface RuntimeStatus {
  available: boolean;
  running: boolean;
  healthy: boolean;
  endpoint?: string;
  reason?: string;
}

export default function DesktopAgentControl({
  onFeedback,
  onBusyChange,
}: {
  onFeedback: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const desktop = isTauri();
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const connection = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const busy =
    connection.status === "connecting" ||
    connection.sending ||
    connection.preparing ||
    Boolean(connection.pendingApproval);
  const external =
    connection.status === "connected" &&
    connection.endpoint !== runtime?.endpoint;

  useEffect(() => {
    if (!desktop) return;
    let disposed = false;
    async function refresh() {
      const current = revision.current;
      try {
        const result = await invoke<RuntimeStatus>("agent_runtime_status");
        if (!disposed && current === revision.current) setRuntime(result);
      } catch {
        if (!disposed) setError("无法读取桌面服务状态，请重新打开设置。");
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [desktop]);

  async function operate(start: boolean) {
    if (pending || busy || !desktop || (start && external)) return;
    revision.current++;
    setPending(true);
    onBusyChange(true);
    setError("");
    try {
      if (start) {
        const initialRevision = agentConnection.getState().connectionRevision;
        const credentials = await invoke<{ endpoint: string; token: string }>(
          "agent_runtime_start",
        );
        const currentConnection = agentConnection.getState();
        if (
          initialRevision !== currentConnection.connectionRevision ||
          currentConnection.status === "connecting" ||
          (currentConnection.status === "connected" &&
            currentConnection.endpoint !== credentials.endpoint)
        ) {
          onFeedback("桌面服务已启动；连接已在其他入口改变，请重新选择连接。");
        } else {
          agentConnection.setCredentials(
            credentials.endpoint,
            credentials.token,
          );
          await agentConnection.connect();
          const result = agentConnection.getState();
          onFeedback(
            result.status === "connected"
              ? "桌面 Agent 已启动并连接。"
              : result.error || "服务已启动，但连接未完成。",
          );
        }
      } else {
        await invoke("agent_runtime_stop");
        if (agentConnection.getState().endpoint === runtime?.endpoint)
          agentConnection.disconnect();
        onFeedback("本次 KK 托管的 Agent 已停止。");
      }
      setRuntime(await invoke<RuntimeStatus>("agent_runtime_status"));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      onFeedback(message);
    } finally {
      setPending(false);
      onBusyChange(false);
    }
  }

  const status = !desktop
    ? "桌面版可一键启动；浏览器版请连接已运行的本地 Agent。"
    : !runtime
      ? "正在检查桌面服务…"
      : runtime.running
        ? runtime.healthy
          ? "服务运行中"
          : "服务进程未响应"
        : runtime.available
          ? "服务已停止"
          : runtime.reason;
  return (
    <section aria-label="桌面 Agent 服务">
      <p role="status">{status}</p>
      {error && (
        <p className="settings-network-error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action"
          disabled={
            !desktop || !runtime?.available || pending || busy || external
          }
          onClick={() => void operate(true)}
        >
          {pending ? "处理中…" : "启动并连接"}
        </button>
        <button
          type="button"
          className="settings-action"
          disabled={!runtime?.running || pending || busy}
          onClick={() => void operate(false)}
        >
          停止服务
        </button>
      </div>
      {busy && <p>请先在对话中停止任务并核对结果，再停止服务。</p>}
      {external && (
        <p>当前连接的是外部服务。先断开连接，才能切换到桌面托管服务。</p>
      )}
      {runtime?.reason && runtime.available && <p>{runtime.reason}</p>}
    </section>
  );
}
