import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadApiKey } from "../../features/creation/providerCredentials";
import {
  createGoogleInteractions,
  GOOGLE_API_BASE,
} from "../../features/agent/googleInteractions";
import {
  GOOGLE_CREDENTIAL_REF,
  getGoogleCredential,
  readGoogleCliPreference,
  saveGoogleApiKeyConnection,
  writeGoogleCliPreference,
} from "../../features/agent/googleAgentConfig";
import { googleAgentConnection } from "../../features/agent/googleAgentConnection";
import {
  geminiCliStatus,
  geminiCliStatusMessage,
  type GeminiCliStatus,
  GEMINI_BRIDGE_DEFAULT_URL,
  normalizeGeminiBridgeUrl,
} from "../../features/agent/geminiCliAdapter";
import GoogleConnectionActions from "./GoogleConnectionActions";
import {
  GoogleCliSetup,
  GoogleKeySetup,
  GoogleLoginModeChoice,
} from "./GoogleLoginModePanels";
import useSettingsBusy from "./useSettingsBusy";
import { useProviderCredentialState } from "./useProviderCredentialState";
import ProviderCredentialStatus from "./ProviderCredentialStatus";
import { providerSaveErrorMessage } from "../../features/creation/providerSaveRecovery";
export default function GoogleConnectionSettings({
  onFeedback,
  mode = "all",
  active = true,
  onBusyChange,
}: {
  onFeedback: (text: string) => void;
  mode?: "all" | "api-key" | "cli";
  active?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [initialPreference] = useState(readGoogleCliPreference);
  const [key, setKey] = useState("");
  const [cliReport, setCliReport] = useState<GeminiCliStatus>();
  const [loginMode, setLoginMode] = useState(initialPreference.loginMode);
  const [bridgeUrl, setBridgeUrl] = useState(initialPreference.bridgeUrl);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<AbortController | null>(null);
  const effectiveLoginMode =
    mode === "cli" ? "cli" : mode === "api-key" ? "api-key" : loginMode;
  const cli = effectiveLoginMode === "cli";
  const {
    hasStoredKey: stored,
    setHasStoredKey: setStored,
    credentialStatus,
    retryCredentialLoad,
    reflectCommittedCredential,
  } = useProviderCredentialState(
    GOOGLE_API_BASE,
    GOOGLE_CREDENTIAL_REF,
    request,
    active && !cli,
  );
  const modeRef = useRef(mode);
  const activeRef = useRef(active);
  const mounted = useRef(true);
  const agent = useSyncExternalStore(
    googleAgentConnection.subscribe,
    googleAgentConnection.getState,
  );
  const disabled = busy || agent.sending || agent.status === "connecting";
  const operationDisabled =
    disabled ||
    (!cli && (credentialStatus === "loading" || credentialStatus === "error"));
  useSettingsBusy(busy, onBusyChange);
  modeRef.current = mode;
  activeRef.current = active;
  useEffect(() => {
    mounted.current = true;
    setBusy(false);
    if (!active) {
      request.current?.abort("inactive");
      request.current = null;
    } else {
      setStatus("");
      setCliReport(undefined);
      if (mode === "all")
        googleAgentConnection.configure(readGoogleCliPreference());
    }
    return () => {
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [active, mode]);
  function saveCliMode() {
    if (disabled || !activeRef.current) return;
    setBusy(true);
    setStatus("");
    try {
      const normalizedUrl = normalizeGeminiBridgeUrl(bridgeUrl);
      if (!writeGoogleCliPreference(effectiveLoginMode, normalizedUrl)) {
        setStatus("Google 登录偏好未保存，请检查本地存储后重试。");
        return;
      }
      googleAgentConnection.configure({
        loginMode: effectiveLoginMode,
        bridgeUrl: normalizedUrl,
      });
      googleAgentConnection.disconnect();
      window.dispatchEvent(new Event("kk:model-provider-changed"));
      if (mounted.current && activeRef.current) {
        setStatus(
          effectiveLoginMode === "cli"
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
    if (operationDisabled || !activeRef.current || (!key.trim() && !stored))
      return;
    const saveMode = modeRef.current;
    let keyCommitted = false;
    setBusy(true);
    setStatus("");
    try {
      if (key.trim()) await saveGoogleApiKeyConnection(key);
      else {
        await getGoogleCredential();
      }
      if (
        !mounted.current ||
        !activeRef.current ||
        modeRef.current !== saveMode
      )
        return;
      if (!setStored(true)) return;
      keyCommitted = true;
      setKey("");
      if (!writeGoogleCliPreference("api-key", GEMINI_BRIDGE_DEFAULT_URL)) {
        setStatus("Google 密钥已保存，但登录偏好未完成；请重试保存登录方式。");
        return;
      }
      googleAgentConnection.configure({
        loginMode: "api-key",
        bridgeUrl: GEMINI_BRIDGE_DEFAULT_URL,
      });
      googleAgentConnection.disconnect();
      window.dispatchEvent(new Event("kk:model-provider-changed"));
      setStatus("Google 已保存，可在对话的执行方式中选择 Google Gemini。");
      onFeedback("Google 配置已更新。");
    } catch (error) {
      reflectCommittedCredential(error, () => setKey(""));
      if (mounted.current && activeRef.current && modeRef.current === saveMode)
        setStatus(
          keyCommitted
            ? "Google 密钥已保存，但登录偏好未完成；请重试保存登录方式。"
            : providerSaveErrorMessage(
                error,
                "Google 保存失败，原密钥和草稿已保留；请检查系统凭据库和本地存储。",
              ),
        );
    } finally {
      if (mounted.current && activeRef.current && modeRef.current === saveMode)
        setBusy(false);
    }
  }
  async function check() {
    if (operationDisabled || !activeRef.current) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    if (effectiveLoginMode === "cli") {
      setCliReport(undefined);
      setStatus("正在检测本机 Gemini CLI…");
      try {
        const result = await geminiCliStatus({
          baseUrl: bridgeUrl.trim() || GEMINI_BRIDGE_DEFAULT_URL,
          signal: controller.signal,
        });
        if (mounted.current && request.current === controller) {
          setCliReport(result);
          setStatus(geminiCliStatusMessage(result));
        }
      } catch {
        if (mounted.current && request.current === controller)
          setStatus(
            controller.signal.aborted
              ? "检测已取消。"
              : "无法连接 Gemini CLI 桥，请先运行 node scripts/gemini-bridge.mjs 启动本地桥。",
          );
      } finally {
        if (mounted.current && request.current === controller) {
          request.current = null;
          setBusy(false);
        }
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
      if (mounted.current && request.current === controller)
        setStatus(
          `Google 连接成功，读取到 ${models.length} 个 Gemini 模型。生图权限与额度以实际请求为准。`,
        );
    } catch {
      if (mounted.current && request.current === controller)
        setStatus(
          controller.signal.aborted
            ? "Google 连接测试已取消。"
            : "Google 连接测试失败，请检查 Key、网络和项目权限。",
        );
    } finally {
      if (mounted.current && request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section
      className="settings-network-row settings-agent-card"
      aria-label="Google Gemini 配置"
    >
      <h3>
        Google Gemini
        <span className="settings-version-tag">
          {cli ? "仅对话" : "对话与生图"}
        </span>
      </h3>
      {mode === "all" && (
        <GoogleLoginModeChoice
          cli={cli}
          disabled={disabled}
          onChange={setLoginMode}
        />
      )}
      {cli ? (
        <GoogleCliSetup
          bridgeUrl={bridgeUrl}
          report={cliReport}
          onChange={(value) => {
            setCliReport(undefined);
            setBridgeUrl(value);
          }}
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
      {!cli && (
        <ProviderCredentialStatus
          status={credentialStatus}
          onRetry={retryCredentialLoad}
        />
      )}
      <GoogleConnectionActions
        cli={cli}
        disabled={operationDisabled}
        canSave={Boolean(key.trim() || stored)}
        busy={busy}
        hasRequest={Boolean(request.current)}
        onSaveCli={() => saveCliMode()}
        onSaveKey={() => void saveKey()}
        onCheck={() => void check()}
        onCancel={() => request.current?.abort()}
      />
      {status && <p role="status">{status}</p>}
    </section>
  );
}
