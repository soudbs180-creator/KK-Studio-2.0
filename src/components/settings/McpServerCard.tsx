import type { McpServerConfig, McpTool } from "../../features/mcp/mcpClient";

export default function McpServerCard({
  server,
  state,
  tools,
  error,
  expanded,
  onConnect,
  onCancel,
  onDisconnect,
  onRemove,
  onToggleTools,
}: {
  server: McpServerConfig;
  state: "disconnected" | "connecting" | "connected" | "error";
  tools: McpTool[];
  error?: string;
  expanded: boolean;
  onConnect: () => void;
  onCancel: () => void;
  onDisconnect: () => void;
  onRemove: () => void;
  onToggleTools: () => void;
}) {
  return (
    <article className="settings-mcp-server">
      <header>
        <div className="settings-mcp-server-copy">
          <strong>{server.name}</strong>
          <code>{server.endpoint}</code>
          <span>
            {state === "connected"
              ? `已连接 · ${tools.length} 个工具`
              : state === "connecting"
                ? "连接中…"
                : state === "error"
                  ? "连接失败"
                  : "未连接"}
          </span>
        </div>
        <div className="settings-mcp-server-actions">
          {state === "connected" ? (
            <button
              type="button"
              className="settings-action secondary"
              onClick={onDisconnect}
            >
              断开
            </button>
          ) : state === "connecting" ? (
            <button
              type="button"
              className="settings-action secondary"
              onClick={onCancel}
            >
              取消
            </button>
          ) : (
            <button
              type="button"
              className="settings-action"
              onClick={onConnect}
            >
              连接
            </button>
          )}
          <button
            type="button"
            className="settings-action secondary"
            onClick={onRemove}
          >
            移除
          </button>
        </div>
      </header>
      {error && (
        <p className="settings-mcp-error" role="alert">
          {error}
        </p>
      )}
      {state === "connected" && (
        <>
          <button
            type="button"
            className="settings-mcp-tools-toggle"
            aria-expanded={expanded}
            onClick={onToggleTools}
          >
            {expanded ? "收起工具详情" : "查看工具详情"}
          </button>
          {expanded && (
            <div
              className="settings-mcp-tools"
              role="list"
              aria-label={`${server.name}工具`}
            >
              {tools.map((tool) => (
                <div
                  className="settings-mcp-tool"
                  role="listitem"
                  key={tool.name}
                >
                  <strong>{tool.title || tool.name}</strong>
                  <code>{tool.name}</code>
                  <p>{tool.description || "服务器未提供工具说明。"}</p>
                  <details>
                    <summary>inputSchema</summary>
                    <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}
