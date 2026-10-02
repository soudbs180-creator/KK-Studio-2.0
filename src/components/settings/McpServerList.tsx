import type { McpServerConfig, McpTool } from "../../features/mcp/mcpClient";
import McpServerCard from "./McpServerCard";

export type McpConnectionState =
  "disconnected" | "connecting" | "connected" | "error";

export default function McpServerList({
  servers,
  tools,
  states,
  errors,
  expanded,
  onConnect,
  onCancel,
  onDisconnect,
  onRemove,
  onToggleTools,
  onCallTool,
}: {
  servers: McpServerConfig[];
  tools: Record<string, McpTool[]>;
  states: Record<string, McpConnectionState>;
  errors: Record<string, string>;
  expanded: string | null;
  onConnect: (server: McpServerConfig) => void;
  onCancel: (server: McpServerConfig) => void;
  onDisconnect: (server: McpServerConfig) => void;
  onRemove: (server: McpServerConfig) => void;
  onToggleTools: (server: McpServerConfig) => void;
  onCallTool: (
    server: McpServerConfig,
    tool: McpTool,
    arguments_: Record<string, unknown>,
  ) => Promise<unknown>;
}) {
  return (
    <section className="settings-mcp-list" aria-label="MCP服务器列表">
      <h3>已保存的服务器</h3>
      {servers.length === 0 ? (
        <div className="settings-empty-state">
          <strong>暂无 MCP 服务器</strong>
          <p>保存一个 HTTP/HTTPS endpoint 后，可以连接并查看真实工具。</p>
        </div>
      ) : (
        servers.map((server) => (
          <McpServerCard
            key={server.id}
            server={server}
            state={states[server.id] ?? "disconnected"}
            tools={tools[server.id] ?? []}
            error={errors[server.id]}
            expanded={expanded === server.id}
            onConnect={() => onConnect(server)}
            onCancel={() => onCancel(server)}
            onDisconnect={() => onDisconnect(server)}
            onRemove={() => onRemove(server)}
            onToggleTools={() => onToggleTools(server)}
            onCallTool={(tool, arguments_) =>
              onCallTool(server, tool, arguments_)
            }
          />
        ))
      )}
    </section>
  );
}
