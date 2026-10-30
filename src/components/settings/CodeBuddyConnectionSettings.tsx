import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createAgentApi } from "../../features/agent/index.ts";
import { agentConnection } from "../../features/agent/index.ts";
import { confirmAction } from "../../runtime/confirmAction";
import useSettingsBusy from "./useSettingsBusy";

type ConnectionState =
  | "disconnected"
  | "loading"
  | "load-error"
  | "empty"
  | "editing"
  | "saved"
  | "verified"
  | "cancelled";

/** A bounded text delegation path; Codex remains the primary Agent. */
export default function CodeBuddyConnectionSettings({
  onFeedback,
  onBusyChange,
}: {
  onFeedback: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
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
  useSettingsBusy(busy, onBusyChange);
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const probeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      probeRequest.current?.abort();
    };
  }, []);
  const connected = connection.status === "connected";
  const configReady =
    connected && loadedRevision === connection.connectionRevision;

  useEffect(() => {
    probeRequest.current?.abort();
    probeRequest.current = null;
    setBusy(false);
    setLoadedRevision(null);
    if (!connected) {
      setCliPath("");
      setSavedPath("");
      setStatus("disconnected");
      setModel("");
      setError("");
      return;
    }
    let active = true;
    const controller = new AbortController();
    setStatus("loading");
    setError("");
    const api = createAgentApi({
      endpoint: connection.endpoint,
      token: connection.token,
      clientId: connection.clientId,
      signal: controller.signal,
    });
    void api
      .codebuddyConfig()
      .then((result) => {
        if (!active) return;
        setCliPath(result.cliPath);
        setSavedPath(result.cliPath);
        setStatus(result.configured ? "saved" : "empty");
        setLoadedRevision(connection.connectionRevision);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setStatus("load-error");
        setLoadedRevision(null);
        setError(
          cause instanceof Error ? cause.message : "无法读取 CodeBuddy 配置",
        );
      });
    return () => {
      active = false;
      controller.abort();
      probeRequest.current?.abort();
    };
  }, [
    connected,
    connection.connectionRevision,
    connection.endpoint,
    connection.token,
    connection.clientId,
    loadAttempt,
  ]);

  function api(signal?: AbortSignal) {
    return createAgentApi({
      endpoint: connection.endpoint,
      token: connection.token,
      clientId: connection.clientId,
      signal,
    });
  }

  async function save() {
    if (!configReady || busy) return;
    const revision = connection.connectionRevision;
    const current = () =>
      mounted.current &&
      agentConnection.getState().status === "connected" &&
      agentConnection.getState().connectionRevision === revision;
    setBusy(true);
    setError("");
    try {
      if (!cliPath.trim() && savedPath) {
        const confirmed = await confirmAction(
          "确认移除已保存的 CodeBuddy 路径？移除后 CodeBuddy 委派将不可用。",
        );
        if (!current()) return;
        if (!confirmed) {
          setCliPath(savedPath);
          setStatus("saved");
          return;
        }
      }
      const result = await api().saveCodebuddyConfig(cliPath.trim());
      if (!current()) return;
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
      if (!current()) return;
      setError(
        cause instanceof Error ? cause.message : "保存 CodeBuddy 路径失败",
      );
    } finally {
      if (current()) setBusy(false);
    }
  }

  async function probe() {
    if (!configReady || busy || !savedPath || cliPath.trim() !== savedPath)
      return;
    const revision = connection.connectionRevision;
    const controller = new AbortController();
    probeRequest.current = controller;
    setBusy(true);
    setStatus("saved");
    setModel("");
    setError("");
    try {
      const result = await api(controller.signal).probeCodebuddy();
      controller.signal.throwIfAborted();
      if (
        !mounted.current ||
        agentConnection.getState().connectionRevision !== revision
      )
        return;
      setModel(result.model || "");
      setStatus("verified");
      onFeedback("CodeBuddy 连接已验证，可由 Codex 调用短文本委派工具。");
    } catch (cause) {
      if (
        !mounted.current ||
        agentConnection.getState().connectionRevision !== revision
      )
        return;
      if (controller.signal.aborted) setStatus("cancelled");
      else {
        setStatus("saved");
        setError(
          cause instanceof Error ? cause.message : "CodeBuddy 连通测试失败",
        );
      }
    } finally {
      if (probeRequest.current === controller) {
        probeRequest.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  }

  function statusText() {
    if (!connected) return "先连接 Codex 主 Agent";
    if (status === "load-error")
      return "无法读取配置；原设置保留，重试成功后才能保存。";
    if (busy && probeRequest.current)
      return "正在测试 CodeBuddy 连接（会使用账号额度）…";
    if (status === "cancelled") return "连通测试已取消，已保存路径保留。";
    if (!configReady || status === "loading") return "正在读取本地配置…";
    if (status === "verified") return `已验证${model ? ` · ${model}` : ""}`;
    if (status === "saved") return "已保存，尚未测试";
    if (status === "editing") return "路径有修改，保存后才能测试";
    return "尚未配置";
  }

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
          disabled={!configReady || busy || status === "loading"}
          onChange={(event) => {
            setCliPath(event.target.value);
            setStatus("editing");
            setError("");
          }}
          placeholder="选择完整安装的 CodeBuddy CLI 脚本绝对路径"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action"
          disabled={!configReady || busy || status === "loading"}
          onClick={() => void save()}
        >
          保存 CodeBuddy 路径
        </button>
        <button
          type="button"
          className="settings-action"
          disabled={
            !configReady || busy || !savedPath || cliPath.trim() !== savedPath
          }
          onClick={() => void probe()}
        >
          测试 CodeBuddy 连接
        </button>
        {busy && probeRequest.current && (
          <button
            type="button"
            className="settings-action secondary"
            onClick={() => probeRequest.current?.abort()}
          >
            取消 CodeBuddy 测试
          </button>
        )}
        {status === "load-error" && (
          <button
            type="button"
            className="settings-action secondary"
            onClick={() => setLoadAttempt((value) => value + 1)}
          >
            重试读取 CodeBuddy 配置
          </button>
        )}
      </div>
      <p
        className="settings-network-activity"
        role="status"
        aria-label="CodeBuddy 状态"
      >
        {statusText()}
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
