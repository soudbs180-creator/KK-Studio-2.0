import { useEffect, useRef, useState } from "react";
import {
  McpHttpClient,
  McpServerRegistry,
  type McpServerConfig,
  type McpTool,
} from "../../features/mcp/mcpClient";
import McpServerCard from "./McpServerCard";
import { z } from "zod";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export default function McpSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const [registry] = useState(() => new McpServerRegistry());
  const clients = useRef(new Map<string, McpHttpClient>()).current;
  const connectionControllers = useRef(
    new Map<string, AbortController>(),
  ).current;
  const mounted = useRef(true);
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

  useEffect(() => {
    mounted.current = true;
    if (registry.persistenceWarning) setFormError(registry.persistenceWarning);
    return () => {
      mounted.current = false;
      for (const controller of connectionControllers.values())
        controller.abort();
      for (const client of clients.values()) void client.disconnect();
      connectionControllers.clear();
      clients.clear();
    };
  }, [clients, connectionControllers, registry]);

  function updateServerList(): void {
    setServers(registry.list());
  }

  function addServer(): void {
    try {
      if (!name.trim()) throw new Error("请填写服务器名称。");
      registry.add({
        id: crypto.randomUUID(),
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
        error instanceof z.ZodError
          ? error.issues.map((issue) => issue.message).join("；")
          : error instanceof Error
            ? error.message
            : "MCP 服务器设置无效。",
      );
    }
  }

  async function connectServer(server: McpServerConfig): Promise<void> {
    connectionControllers.get(server.id)?.abort();
    const prior = clients.get(server.id);
    if (prior) void prior.disconnect();
    const client = new McpHttpClient(server);
    const controller = new AbortController();
    clients.set(server.id, client);
    connectionControllers.set(server.id, controller);
    setStates((current) => ({ ...current, [server.id]: "connecting" }));
    setErrors((current) => ({ ...current, [server.id]: "" }));
    setTools((current) => ({ ...current, [server.id]: [] }));
    try {
      const discovered = await client.connect(controller.signal);
      if (!mounted.current || clients.get(server.id) !== client) {
        void client.disconnect();
        return;
      }
      setTools((current) => ({ ...current, [server.id]: discovered }));
      setStates((current) => ({ ...current, [server.id]: "connected" }));
      onFeedback(`已连接 ${server.name}，发现 ${discovered.length} 个工具。`);
    } catch (error) {
      if (!mounted.current) return;
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

  function cancelConnection(server: McpServerConfig): void {
    releaseServer(server);
    onFeedback(`${server.name} 已取消连接。`);
  }

  function releaseServer(server: McpServerConfig): void {
    connectionControllers.get(server.id)?.abort();
    connectionControllers.delete(server.id);
    const client = clients.get(server.id);
    clients.delete(server.id);
    if (client) void client.disconnect();
    setTools((current) => ({ ...current, [server.id]: [] }));
    setStates((current) => ({ ...current, [server.id]: "disconnected" }));
  }

  function disconnectServer(server: McpServerConfig): void {
    releaseServer(server);
    onFeedback(`${server.name} 已断开。`);
  }

  function removeServer(server: McpServerConfig): void {
    try {
      registry.remove(server.id);
      releaseServer(server);
      updateServerList();
      onFeedback(`${server.name} 已移除。`);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [server.id]: error instanceof Error ? error.message : "移除失败。",
      }));
    }
  }

  async function callTool(
    server: McpServerConfig,
    tool: McpTool,
    arguments_: Record<string, unknown>,
  ): Promise<unknown> {
    if (
      !window.confirm(`确认向 ${server.name} 发送工具 ${tool.name} 的参数吗？`)
    )
      throw new Error("工具调用已取消。");
    const client = clients.get(server.id);
    if (!client) throw new Error("MCP 服务器尚未连接。");
    const result = await client.callTool(tool.name, arguments_, true);
    onFeedback(`已调用 ${server.name} · ${tool.name}。`);
    return result;
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
          <strong>支持工具发现和手动确认调用</strong>
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
              onCallTool={(tool, arguments_) =>
                callTool(server, tool, arguments_)
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
