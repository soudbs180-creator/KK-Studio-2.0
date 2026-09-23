import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadApiKey } from "../../features/creation/providerCredentials";
import {
  createGoogleInteractions,
  GOOGLE_API_BASE,
} from "../../features/agent/googleInteractions";
import {
  GOOGLE_CREDENTIAL_REF,
  readGoogleCliPreference,
  saveGoogleApiKeyConnection,
  writeGoogleCliPreference,
} from "../../features/agent/googleAgentConfig";
import { googleAgentConnection } from "../../features/agent/googleAgentConnection";
import {
  geminiCliStatus,
  GEMINI_BRIDGE_DEFAULT_URL,
  normalizeGeminiBridgeUrl,
} from "../../features/agent/geminiCliAdapter";
import { GoogleCliSetup, GoogleKeySetup } from "./GoogleLoginModePanels";

export default function GoogleConnectionSettings({
  onFeedback,
}: {
  onFeedback: (text: string) => void;
}) {
  const [key, setKey] = useState("");
  const [stored, setStored] = useState(false);
  const [loginMode, setLoginMode] = useState<"api-key" | "cli">("api-key");
  const [bridgeUrl, setBridgeUrl] = useState(GEMINI_BRIDGE_DEFAULT_URL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const agent = useSyncExternalStore(
    googleAgentConnection.subscribe,
    googleAgentConnection.getState,
  );
  const disabled = busy || agent.sending || agent.status === "connecting";
  useEffect(() => {
    mounted.current = true;
    const preference = readGoogleCliPreference();
    setLoginMode(preference.loginMode);
    setBridgeUrl(preference.bridgeUrl);
    googleAgentConnection.configure(preference);
    void loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF)
      .then((value) => {
        if (mounted.current) setStored(Boolean(value));
      })
      .catch(() => undefined);
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  function saveCliMode() {
    if (disabled) return;
    setBusy(true);
    setStatus("");
    try {
      const normalizedUrl = normalizeGeminiBridgeUrl(bridgeUrl);
      writeGoogleCliPreference(loginMode, normalizedUrl);
      googleAgentConnection.configure({ loginMode, bridgeUrl: normalizedUrl });
      googleAgentConnection.disconnect();
      window.dispatchEvent(new Event("kk:model-provider-changed"));
      if (mounted.current) {
        setStatus(
          loginMode === "cli"
            ? "已切换为 Gemini CLI 登录方式；连接前请确认桥已启动且已登录。"
            : "已切换为 API Key 登录方式；请填写 Key 并保存。",
        );
        onFeedback("Google 登录方式已更新。");
      }
    } catch {
      if (mounted.current)
        setStatus("Gemini CLI 桥地址必须是本机 http://127.0.0.1 端口。");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function saveKey() {
    if (disabled || !key.trim()) return;
    setBusy(true);
    setStatus("");
    try {
      await saveGoogleApiKeyConnection(key);
      googleAgentConnection.configure({
        loginMode: "api-key",
        bridgeUrl: GEMINI_BRIDGE_DEFAULT_URL,
      });
      googleAgentConnection.disconnect();
      window.dispatchEvent(new Event("kk:model-provider-changed"));
      if (mounted.current) {
        setStored(true);
        setKey("");
        setStatus("Google 已保存，可在对话的执行方式中选择 Google Gemini。");
        onFeedback("Google 配置已更新。");
      }
    } catch {
      if (mounted.current)
        setStatus("Google 保存失败，请检查系统凭据库和本地存储。");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function check() {
    if (disabled) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    if (loginMode === "cli") {
      setStatus("正在检测本机 Gemini CLI…");
      try {
        const result = await geminiCliStatus({
          baseUrl: bridgeUrl.trim() || GEMINI_BRIDGE_DEFAULT_URL,
          signal: controller.signal,
        });
        if (mounted.current) {
          if (!result.installed)
            setStatus(
              "未安装 Gemini CLI。请先在终端运行 npm install -g @google/gemini-cli。",
            );
          else if (!result.login)
            setStatus(
              "Gemini CLI 已安装但未登录。请在终端运行 gemini，选择 Login with Google 完成登录。",
            );
          else
            setStatus(
              `Gemini CLI 已就绪（${result.version ?? "未知版本"}），可连接使用。`,
            );
        }
      } catch {
        if (mounted.current)
          setStatus(
            controller.signal.aborted
              ? "检测已取消。"
              : "无法连接 Gemini CLI 桥，请先运行 node scripts/gemini-bridge.mjs 启动本地桥。",
          );
      } finally {
        if (mounted.current) setBusy(false);
      }
      return;
    }
    setStatus("正在连接 Google…");
    try {
      const apiKey =
        key.trim() ||
        (await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF));
      controller.signal.throwIfAborted();
      const models = await createGoogleInteractions({ apiKey }).models(
        AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      );
      if (mounted.current)
        setStatus(
          `Google 连接成功，读取到 ${models.length} 个 Gemini 模型。生图权限与额度以实际请求为准。`,
        );
    } catch {
      if (mounted.current)
        setStatus(
          controller.signal.aborted
            ? "Google 连接测试已取消。"
            : "Google 连接测试失败，请检查 Key、网络和项目权限。",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const cli = loginMode === "cli";
  return (
    <section
      className="settings-network-row settings-agent-card"
      aria-label="Google Gemini 配置"
    >
      <h3>
        Google Gemini <span className="settings-version-tag">对话与生图</span>
      </h3>
      <fieldset className="settings-login-modes">
        <legend>登录方式</legend>
        <label className="settings-radio">
          <input
            type="radio"
            name="google-login-mode"
            value="api-key"
            checked={!cli}
            disabled={disabled}
            onChange={() => setLoginMode("api-key")}
          />
          密钥登录（对话与生图）
        </label>
        <label className="settings-radio">
          <input
            type="radio"
            name="google-login-mode"
            value="cli"
            checked={cli}
            disabled={disabled}
            onChange={() => setLoginMode("cli")}
          />
          Gemini CLI 账号（Google 登录，免 Key，仅对话）
        </label>
      </fieldset>
      {cli ? (
        <GoogleCliSetup
          bridgeUrl={bridgeUrl}
          onChange={setBridgeUrl}
          disabled={disabled}
        />
      ) : (
        <GoogleKeySetup
          apiKey={key}
          onChange={setKey}
          disabled={disabled}
          stored={stored}
        />
      )}
      <div className="settings-network-actions">
        {cli ? (
          <button
            type="button"
            className="settings-action"
            disabled={disabled}
            onClick={() => void saveCliMode()}
          >
            保存登录方式
          </button>
        ) : (
          <button
            type="button"
            className="settings-action"
            disabled={disabled || !key.trim()}
            onClick={() => void saveKey()}
          >
            保存 Google
          </button>
        )}
        <button
          type="button"
          className="settings-action"
          disabled={disabled || (!cli && !key.trim() && !stored)}
          onClick={() => void check()}
        >
          {cli ? "检测 Gemini CLI" : "测试 Google 连接"}
        </button>
        {busy && request.current && (
          <button
            type="button"
            className="settings-action"
            onClick={() => request.current?.abort()}
          >
            取消检测
          </button>
        )}
        {!cli && (
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            获取 API Key
          </a>
        )}
      </div>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
