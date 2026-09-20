import { useRef, useState } from "react";
import {
  McpHttpClient,
  McpServerRegistry,
  type McpServerConfig,
  type McpTool,
} from "../../features/mcp/mcpClient";
import McpServerCard from "./McpServerCard";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export default function McpSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const registry = useRef(new McpServerRegistry()).current;
  const clients = useRef(new Map<string, McpHttpClient>()).current;
  const connectionControllers = useRef(
    new Map<string, AbortController>(),
  ).current;
  const [servers, setServers] = useState<McpServerConfig[]>(() =>
    registry.list(),
  );
  const [tools, setTools] = useState<Record<string, McpTool[]>>({});
  const [states, setStates] = useState<Record<string, ConnectionState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [formError, setFormError] = useState("");

  function updateServerList(): void {
    setServers(registry.list());
  }

  function addServer(): void {
    try {
      const id = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
      if (!id) throw new Error("请填写服务器名称。");
      registry.add({
        id,
        name: name.trim(),
        transport: "streamable_http",
        endpoint: endpoint.trim(),
        enabled: true,
      });
      setName("");
      setEndpoint("");
      setFormError("");
      updateServerList();
      onFeedback("MCP 服务器已保存；尚未连接或调用工具。");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "MCP 服务器设置无效。",
      );
    }
  }

  async function connectServer(server: McpServerConfig): Promise<void> {
    connectionControllers.get(server.id)?.abort();
    const prior = clients.get(server.id);
    if (prior) await prior.disconnect();
    const client = new McpHttpClient(server);
    const controller = new AbortController();
    clients.set(server.id, client);
    connectionControllers.set(server.id, controller);
    setStates((current) => ({ ...current, [server.id]: "connecting" }));
    setErrors((current) => ({ ...current, [server.id]: "" }));
    try {
      const discovered = await client.connect(controller.signal);
      if (clients.get(server.id) !== client) return;
      setTools((current) => ({ ...current, [server.id]: discovered }));
      setStates((current) => ({ ...current, [server.id]: "connected" }));
      onFeedback(`已连接 ${server.name}，发现 ${discovered.length} 个工具。`);
    } catch (error) {
      if (clients.get(server.id) === client) clients.delete(server.id);
      if (connectionControllers.get(server.id) === controller) {
        setStates((current) => ({
          ...current,
          [server.id]: controller.signal.aborted ? "disconnected" : "error",
        }));
        if (!controller.signal.aborted)
          setErrors((current) => ({
            ...current,
            [server.id]:
              error instanceof Error ? error.message : "MCP 连接失败。",
          }));
      }
    } finally {
      if (connectionControllers.get(server.id) === controller)
        connectionControllers.delete(server.id);
    }
  }

  async function cancelConnection(server: McpServerConfig): Promise<void> {
    const controller = connectionControllers.get(server.id);
    controller?.abort();
    connectionControllers.delete(server.id);
    await clients.get(server.id)?.disconnect(controller?.signal);
    clients.delete(server.id);
    setStates((current) => ({ ...current, [server.id]: "disconnected" }));
    onFeedback(`${server.name} 已取消连接。`);
  }

  async function disconnectServer(server: McpServerConfig): Promise<void> {
    connectionControllers.get(server.id)?.abort();
    connectionControllers.delete(server.id);
    await clients.get(server.id)?.disconnect();
    clients.delete(server.id);
    setTools((current) => ({ ...current, [server.id]: [] }));
    setStates((current) => ({ ...current, [server.id]: "disconnected" }));
    onFeedback(`${server.name} 已断开。`);
  }

  function removeServer(server: McpServerConfig): void {
    void disconnectServer(server);
    try {
      registry.remove(server.id);
      updateServerList();
      onFeedback(`${server.name} 已移除。`);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [server.id]: error instanceof Error ? error.message : "移除失败。",
      }));
    }
  }

  return (
    <div className="settings-mcp">
      <p className="settings-section-intro">
        连接遵循 MCP Streamable
        HTTP（2025-11-25）握手与工具发现协议。地址只保存名称和
        endpoint，不保存密钥、OAuth token 或会话 ID。
      </p>
      <div className="settings-connection-note">
        <span className="settings-status-dot" aria-hidden="true" />
        <div>
          <strong>当前只支持真实工具发现</strong>
          <p>
            连接后会执行 initialize → initialized →
            tools/list，并显示服务器返回的 inputSchema。stdio、OAuth 和 Agent
            自动调用仍为 Prototype。
          </p>
        </div>
      </div>
      <section className="settings-mcp-add" aria-labelledby="mcp-add-title">
        <h3 id="mcp-add-title">添加 MCP 服务器</h3>
        <label className="settings-field">
          名称
          <input
            aria-label="MCP服务器名称"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：本地工具"
          />
        </label>
        <label className="settings-field">
          Streamable HTTP 地址
          <input
            aria-label="MCP地址"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="https://example.com/mcp 或 http://127.0.0.1:3000/mcp"
            inputMode="url"
          />
        </label>
        {formError && (
          <p className="settings-mcp-error" role="alert">
            {formError}
          </p>
        )}
        <button
          type="button"
          className="settings-action"
          disabled={!name.trim() || !endpoint.trim()}
          onClick={addServer}
        >
          保存服务器
        </button>
      </section>
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
              onConnect={() => void connectServer(server)}
              onCancel={() => void cancelConnection(server)}
              onDisconnect={() => void disconnectServer(server)}
              onRemove={() => removeServer(server)}
              onToggleTools={() =>
                setExpanded(expanded === server.id ? null : server.id)
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
