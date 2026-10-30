import { useContext, useEffect, useRef, useState } from "react";
import { SettingsNavigationContext } from "./SettingsNavigationContext";
import { useSettingsNavigationBusy } from "./useSettingsBusy";
import type { McpServerConfig, McpTool } from "../../features/mcp/index.ts";

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
  onCallTool,
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
  onCallTool: (
    tool: McpTool,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}) {
  const { busy } = useContext(SettingsNavigationContext);
  return (
    <article className="settings-mcp-server">
      <header>
        <div className="settings-mcp-server-copy">
          <strong title={server.name}>{server.name}</strong>
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
              disabled={busy}
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
              disabled={busy}
              onClick={onConnect}
            >
              连接
            </button>
          )}
          <button
            type="button"
            className="settings-action secondary"
            disabled={busy}
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
            disabled={busy}
            onClick={onToggleTools}
          >
            {expanded ? "收起工具详情" : "查看工具详情"}
          </button>
          <div
            hidden={!expanded}
            style={{ display: expanded ? undefined : "none" }}
            className="settings-mcp-tools"
            role="list"
            aria-label={`${server.name}工具`}
          >
            {tools.map((tool) => (
              <McpToolCall key={tool.name} tool={tool} onCall={onCallTool} />
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function McpToolCall({
  tool,
  onCall,
}: {
  tool: McpTool;
  onCall: (
    tool: McpTool,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}) {
  const [input, setInput] = useState("{}");
  const [result, setResult] = useState("");
  const [calling, setCalling] = useState(false);
  const { busy } = useContext(SettingsNavigationContext);
  const setBusy = useSettingsNavigationBusy();
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      if (request.current) {
        request.current.abort("unmounted");
        setBusy(false);
      }
    },
    [setBusy],
  );
  async function call(): Promise<void> {
    if (calling || busy || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setCalling(true);
    setBusy(true);
    setResult("");
    try {
      const parsed: unknown = JSON.parse(input);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("参数必须是 JSON 对象。");
      setResult(
        JSON.stringify(
          await onCall(
            tool,
            parsed as Record<string, unknown>,
            controller.signal,
          ),
          null,
          2,
        ),
      );
    } catch (error) {
      setResult(
        controller.signal.aborted
          ? "已停止等待；本次工具请求可能已在远端执行，请核对结果后再调用。"
          : error instanceof Error
            ? error.message
            : "工具调用失败，请先核对远端结果后再重试。",
      );
    } finally {
      request.current = null;
      setCalling(false);
      setBusy(false);
    }
  }
  return (
    <div className="settings-mcp-tool" role="listitem">
      <strong>{tool.title || tool.name}</strong>
      <code>{tool.name}</code>
      <p>{tool.description || "服务器未提供工具说明。"}</p>
      <details>
        <summary>inputSchema</summary>
        <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
      </details>
      <label className="settings-mcp-tool-input">
        调用参数（JSON）
        <textarea
          aria-label={`${tool.name} 调用参数`}
          disabled={busy || calling}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
        />
      </label>
      <button
        type="button"
        className="settings-action"
        disabled={busy || calling}
        onClick={() => void call()}
      >
        {calling ? "调用中…" : "调用工具（需确认）"}
      </button>
      {calling && (
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => request.current?.abort("user")}
        >
          停止等待工具结果
        </button>
      )}
      {result && (
        <pre className="settings-mcp-tool-result" role="status">
          {result}
        </pre>
      )}
    </div>
  );
}
