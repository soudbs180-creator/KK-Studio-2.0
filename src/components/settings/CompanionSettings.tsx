import { useEffect, useState } from "react";
import {
  CompanionClient,
  companionConnectionState,
  type CompanionConnectionState,
} from "../../features/local-service/client.ts";
import { readCompanionConnection } from "../../features/local-service/connection.ts";

const DEFAULT_ENDPOINT = "http://127.0.0.1:4319";
const STATE_LABELS: Record<CompanionConnectionState, string> = {
  unconfigured: "未连接",
  checking: "检查中…",
  connected: "已连接",
  offline: "服务离线",
  unauthenticated: "需要重新配对",
  conflict: "存在版本冲突",
  "migration-required": "协议版本不兼容",
  error: "检查失败",
};

export default function CompanionSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const [endpoint, setEndpoint] = useState(
    () => readCompanionConnection()?.endpoint ?? DEFAULT_ENDPOINT,
  );
  const [pairingCode, setPairingCode] = useState("");
  const [state, setState] = useState<CompanionConnectionState>(() =>
    companionConnectionState(),
  );
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const client = new CompanionClient();

  async function check(): Promise<void> {
    setBusy(true);
    setState("checking");
    const result = await client.checkCompanion();
    setState(result.state);
    setDetail(result.error?.message ?? "");
    setBusy(false);
  }

  useEffect(() => {
    if (state === "checking") void check();
    // The initial state is the only automatic check. Button actions call check explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pair(): Promise<void> {
    if (!pairingCode.trim()) {
      onFeedback("请输入本机服务显示的一次性配对码。");
      return;
    }
    setBusy(true);
    setState("checking");
    setDetail("");
    try {
      await client.pairCompanion(endpoint, pairingCode.trim());
      setPairingCode("");
      setState("connected");
      onFeedback("本机伴随服务已连接；网页项目将优先保存到本机服务。");
    } catch (error) {
      setState(
        error instanceof Error &&
          "code" in error &&
          error.code === "PROTOCOL_UNSUPPORTED"
          ? "migration-required"
          : "error",
      );
      setDetail(error instanceof Error ? error.message : "配对失败。");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(): Promise<void> {
    setBusy(true);
    try {
      await client.disconnectCompanion();
      setState("unconfigured");
      setDetail("");
      onFeedback("本机伴随服务已断开；网页将恢复使用浏览器本地存储。");
    } catch (error) {
      setState("offline");
      setDetail(error instanceof Error ? error.message : "断开失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-companion-card" data-testid="companion-settings">
      <div className="settings-companion-heading">
        <div>
          <h3>网页本机伴随服务</h3>
          <p>
            网页端通过本机服务保存项目和资产。服务只监听本机 loopback
            地址，配对码只在本次连接使用。
          </p>
        </div>
        <span className={`settings-companion-status is-${state}`} role="status">
          {STATE_LABELS[state]}
        </span>
      </div>
      <label className="settings-field" htmlFor="companion-endpoint">
        本机服务地址
        <input
          id="companion-endpoint"
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          placeholder={DEFAULT_ENDPOINT}
          disabled={busy}
          inputMode="url"
          autoComplete="off"
        />
      </label>
      <p className="settings-field-help">
        只接受 http://127.0.0.1 或 localhost 的地址，例如 {DEFAULT_ENDPOINT}。
      </p>
      <label className="settings-field" htmlFor="companion-pairing-code">
        一次性配对码
        <input
          id="companion-pairing-code"
          type="password"
          value={pairingCode}
          onChange={(event) => setPairingCode(event.target.value)}
          placeholder="从本机服务终端复制配对码"
          autoComplete="off"
          disabled={busy}
        />
      </label>
      <div className="settings-action-group">
        <button
          type="button"
          className="settings-action"
          onClick={() => void pair()}
          disabled={busy || !pairingCode.trim()}
        >
          {busy && state === "checking" ? "连接中…" : "连接并配对"}
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void check()}
          disabled={busy || state === "unconfigured"}
        >
          检查连接
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void disconnect()}
          disabled={busy || state === "unconfigured"}
        >
          断开
        </button>
      </div>
      {detail && (
        <p className="settings-network-error" role="alert">
          {detail}
        </p>
      )}
      {state === "connected" && (
        <p className="settings-network-activity" role="status">
          连接正常。原有 IndexedDB
          数据不会被自动删除；迁移和备份将在下一步提供。
        </p>
      )}
    </div>
  );
}
