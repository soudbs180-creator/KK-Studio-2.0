import { useEffect, useState, useSyncExternalStore } from "react";
import { createAgentApi } from "../../features/agent/agentApi.ts";
import { agentConnection } from "../../features/agent/agentConnection.ts";

type ConnectionState =
  "disconnected" | "loading" | "empty" | "editing" | "saved" | "verified";

/** A bounded text delegation path; Codex remains the primary Agent. */
export default function CodeBuddyConnectionSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const connection = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const [cliPath, setCliPath] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [status, setStatus] = useState<ConnectionState>("disconnected");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = connection.status === "connected";

  useEffect(() => {
    if (!connected) {
      setCliPath("");
      setSavedPath("");
      setStatus("disconnected");
      setModel("");
      setError("");
      return;
    }
    let active = true;
    setStatus("loading");
    setError("");
    const api = createAgentApi({
      endpoint: connection.endpoint,
      token: connection.token,
      clientId: connection.clientId,
    });
    void api
      .codebuddyConfig()
      .then((result) => {
        if (!active) return;
        setCliPath(result.cliPath);
        setSavedPath(result.cliPath);
        setStatus(result.configured ? "saved" : "empty");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setStatus("empty");
        setError(
          cause instanceof Error ? cause.message : "无法读取 CodeBuddy 配置",
        );
      });
    return () => {
      active = false;
    };
  }, [
    connected,
    connection.connectionRevision,
    connection.endpoint,
    connection.token,
    connection.clientId,
  ]);

  function api() {
    return createAgentApi({
      endpoint: connection.endpoint,
      token: connection.token,
      clientId: connection.clientId,
    });
  }

  async function save() {
    if (!connected || busy) return;
    const revision = connection.connectionRevision;
    setBusy(true);
    setError("");
    try {
      const result = await api().saveCodebuddyConfig(cliPath.trim());
      if (agentConnection.getState().connectionRevision !== revision) return;
      setCliPath(result.cliPath);
      setSavedPath(result.cliPath);
      setStatus(result.configured ? "saved" : "empty");
      setModel("");
      onFeedback(
        result.configured
          ? "CodeBuddy 路径已保存，请运行连通测试。"
          : "CodeBuddy 路径已移除。",
      );
    } catch (cause) {
      if (agentConnection.getState().connectionRevision !== revision) return;
      setError(
        cause instanceof Error ? cause.message : "保存 CodeBuddy 路径失败",
      );
    } finally {
      setBusy(false);
    }
  }

  async function probe() {
    if (!connected || busy || !savedPath || cliPath.trim() !== savedPath)
      return;
    const revision = connection.connectionRevision;
    setBusy(true);
    setError("");
    try {
      const result = await api().probeCodebuddy();
      if (agentConnection.getState().connectionRevision !== revision) return;
      setModel(result.model || "");
      setStatus("verified");
      onFeedback("CodeBuddy 连接已验证，可由 Codex 调用短文本委派工具。");
    } catch (cause) {
      if (agentConnection.getState().connectionRevision !== revision) return;
      setStatus("saved");
      setModel("");
      setError(
        cause instanceof Error ? cause.message : "CodeBuddy 连通测试失败",
      );
    } finally {
      setBusy(false);
    }
  }

  const statusText = !connected
    ? "先连接 Codex 主 Agent"
    : status === "loading"
      ? "正在读取本地配置…"
      : status === "verified"
        ? `已验证${model ? ` · ${model}` : ""}`
        : status === "saved"
          ? "已保存，尚未测试"
          : status === "editing"
            ? "路径有修改，保存后才能测试"
            : "尚未配置";

  return (
    <section className="settings-codebuddy-card" aria-label="CodeBuddy 委派">
      <div className="settings-agent-status">
        <span
          className={`settings-status-dot ${status === "verified" ? "is-online" : connected ? "is-pending" : "is-offline"}`}
          aria-hidden="true"
        />
        <h3>
          CodeBuddy 委派<span className="settings-version-tag">可选</span>
        </h3>
      </div>
      <p>
        Codex 可把短文案、标签或摘要交给本机 CodeBuddy
        CLI，设计判断与画布操作仍由 Codex 负责。测试会使用 CodeBuddy 账号额度。
      </p>
      <div className="settings-network-field">
        <label htmlFor="codebuddy-cli-path">CodeBuddy CLI 路径</label>
        <input
          id="codebuddy-cli-path"
          aria-label="CodeBuddy CLI 路径"
          value={cliPath}
          disabled={!connected || busy || status === "loading"}
          onChange={(event) => {
            setCliPath(event.target.value);
            setStatus("editing");
            setError("");
          }}
          placeholder="例如 C:\\WorkBuddy\\resources\\app.asar.unpacked\\cli\\bin\\codebuddy"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action"
          disabled={!connected || busy || status === "loading"}
          onClick={() => void save()}
        >
          保存 CodeBuddy 路径
        </button>
        <button
          type="button"
          className="settings-action"
          disabled={
            !connected || busy || !savedPath || cliPath.trim() !== savedPath
          }
          onClick={() => void probe()}
        >
          测试 CodeBuddy 连接
        </button>
      </div>
      <p
        className="settings-network-activity"
        role="status"
        aria-label="CodeBuddy 状态"
      >
        {statusText}
      </p>
      {error && (
        <p
          className="settings-network-error"
          role="alert"
          aria-label="CodeBuddy 错误"
        >
          {error}
        </p>
      )}
    </section>
  );
}
