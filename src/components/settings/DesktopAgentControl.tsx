import { useEffect, useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { agentConnection } from "../../features/agent/agentConnection.ts";
import { desktopAgentLifecycle } from "../../features/agent/desktopAgentLifecycle.ts";

export default function DesktopAgentControl({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const desktop = isTauri();
  const { runtime, pending } = useSyncExternalStore(
    desktopAgentLifecycle.subscribe,
    desktopAgentLifecycle.getState,
  );
  const connection = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const busy =
    connection.status === "connecting" ||
    connection.sending ||
    connection.preparing ||
    Boolean(connection.pendingApproval);
  useEffect(() => {
    if (!desktop) return;
    void desktopAgentLifecycle.refresh();
    const timer = window.setInterval(
      () => void desktopAgentLifecycle.refresh(),
      4000,
    );
    return () => window.clearInterval(timer);
  }, [desktop]);

  async function stop() {
    if (pending || busy || !desktop) return;
    try {
      await desktopAgentLifecycle.stop();
      onFeedback("本次 KK 托管的 Agent 已停止，自动连接已暂停。");
    } catch (reason) {
      onFeedback(reason instanceof Error ? reason.message : String(reason));
    }
  }

  const status = !desktop
    ? "浏览器版请连接已运行的本地 Agent。"
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
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action settings-danger-button"
          disabled={!runtime?.running || pending || busy}
          onClick={() => void stop()}
        >
          停止服务
        </button>
      </div>
      {busy && <p>请先在对话中停止任务并核对结果，再停止服务。</p>}
      {runtime?.reason && runtime.available && <p>{runtime.reason}</p>}
    </section>
  );
}
