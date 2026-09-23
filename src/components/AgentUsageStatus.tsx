import type { AgentUsageWindow } from "../features/agent/agentUsage";
export default function AgentUsageStatus({
  windows,
  error,
  onRefresh,
}: {
  windows: AgentUsageWindow[];
  error?: string | null;
  onRefresh: () => void;
}) {
  return (
    <details className="chat-agent-usage">
      <summary>
        Codex 额度
        {windows.length
          ? " · 最低剩余 " +
            Math.min(...windows.map((window) => window.remaining)) +
            "%"
          : " · 未知"}
      </summary>
      <p>账号共享额度，包含其他 Codex 窗口的使用。</p>
      {windows.map((window) => (
        <p key={window.id}>
          {window.label}：剩余 {window.remaining}%
          {window.resetsAt
            ? " · " +
              new Date(window.resetsAt * 1000).toLocaleString() +
              " 重置"
            : ""}
        </p>
      ))}
      {windows.some((window) => window.remaining <= 10) && (
        <p role="alert">额度接近耗尽，请减少批量任务。已耗尽时会阻止新对话。</p>
      )}
      {error && <p role="status">{error}</p>}
      <button type="button" onClick={onRefresh}>
        刷新额度
      </button>
    </details>
  );
}
