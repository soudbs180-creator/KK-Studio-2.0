import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SettingsNavigationContext } from "./SettingsNavigationContext";
import { useSettingsNavigationBusy } from "./useSettingsBusy";
import {
  CompanionClient,
  companionConnectionState,
  type CompanionConnectionState,
} from "../../features/local-service/index.ts";
import { readCompanionConnection } from "../../features/local-service/index.ts";
import CompanionMigrationActions from "./CompanionMigrationActions.tsx";

const DEFAULT_ENDPOINT = "http://127.0.0.1:4319";
const STATE_LABELS: Record<CompanionConnectionState, string> = {
  unconfigured: "未连接",
  checking: "检查中…",
  connected: "已连接",
  offline: "服务离线",
  unauthenticated: "需要重新配对",
  conflict: "存在版本冲突",
  "migration-required": "需要更新",
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
  const { busy: sharedBusy } = useContext(SettingsNavigationContext);
  const reportBusy = useSettingsNavigationBusy();
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useLayoutEffect(() => reportBusy(busy), [busy, reportBusy]);
  const client = new CompanionClient();

  async function check(): Promise<void> {
    if (inFlight.current || sharedBusy) return;
    inFlight.current = true;
    setBusy(true);
    setState("checking");
    try {
      const result = await client.checkCompanion();
      if (!mounted.current) return;
      setState(result.state);
      setDetail(result.error?.message ?? "");
    } catch (error) {
      if (!mounted.current) return;
      setState("error");
      setDetail(
        error instanceof Error ? error.message : "本机服务检查失败，请重试。",
      );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    void check();
    return () => {
      mounted.current = false;
    };
  }, []);

  async function pair(): Promise<void> {
    if (inFlight.current || sharedBusy) return;
    if (!pairingCode.trim()) {
      onFeedback("请输入本机服务显示的一次性配对码。");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setState("checking");
    setDetail("");
    try {
      await client.pairCompanion(endpoint, pairingCode.trim());
      if (!mounted.current) return;
      setPairingCode("");
      setState("connected");
      onFeedback("本机伴随服务已连接；网页项目将优先保存到本机服务。");
    } catch (error) {
      if (!mounted.current) return;
      setState(
        error instanceof Error &&
          "code" in error &&
          error.code === "PROTOCOL_UNSUPPORTED"
          ? "migration-required"
          : "error",
      );
      setDetail(error instanceof Error ? error.message : "配对失败。");
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function disconnect(): Promise<void> {
    if (inFlight.current || sharedBusy) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await client.disconnectCompanion();
      if (!mounted.current) return;
      setState("unconfigured");
      setDetail("");
      onFeedback("本机伴随服务已断开；网页将恢复使用浏览器本地存储。");
    } catch (error) {
      if (!mounted.current) return;
      setState("unconfigured");
      setDetail(error instanceof Error ? error.message : "断开失败。");
      onFeedback(
        "本机服务未响应，网页已在本机禁用连接；项目可恢复使用浏览器本地存储。",
      );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div
      className="settings-companion-card"
      data-testid="companion-settings"
      aria-busy={busy || sharedBusy}
    >
      {busy && <p role="status">本机服务操作中，请稍候…</p>}
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
          disabled={busy || sharedBusy}
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
          disabled={busy || sharedBusy}
        />
      </label>
      <div className="settings-action-group">
        <button
          type="button"
          className="settings-action"
          onClick={() => void pair()}
          disabled={busy || sharedBusy || !pairingCode.trim()}
        >
          {busy && state === "checking" ? "连接中…" : "连接并配对"}
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void check()}
          disabled={busy || sharedBusy || state === "unconfigured"}
        >
          检查连接
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => void disconnect()}
          disabled={busy || sharedBusy || state === "unconfigured"}
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
          数据不会被自动删除；可在下方手动迁移或恢复备份。
        </p>
      )}
      {state === "connected" && (
        <CompanionMigrationActions client={client} onFeedback={onFeedback} />
      )}
    </div>
  );
}
