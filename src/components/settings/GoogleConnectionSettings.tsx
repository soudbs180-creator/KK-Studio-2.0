import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  loadApiKey,
  saveApiKey,
} from "../../features/creation/providerCredentials";
import {
  readProviderConnections,
  writeProviderConnections,
} from "../../features/creation/providerRegistry";
import {
  createGoogleInteractions,
  GOOGLE_API_BASE,
  GOOGLE_IMAGE_MODEL,
} from "../../features/agent/googleInteractions";
import {
  GOOGLE_CONNECTION_ID,
  GOOGLE_CREDENTIAL_REF,
} from "../../features/agent/googleAgentConfig";
import { googleAgentConnection } from "../../features/agent/googleAgentConnection";

export default function GoogleConnectionSettings({
  onFeedback,
}: {
  onFeedback: (text: string) => void;
}) {
  const [key, setKey] = useState("");
  const [stored, setStored] = useState(false);
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
  async function save() {
    if (disabled || !key.trim()) return;
    setBusy(true);
    setStatus("");
    try {
      await saveApiKey(GOOGLE_API_BASE, key, GOOGLE_CREDENTIAL_REF);
      const connections = readProviderConnections();
      const previous = connections.find(
        (item) => item.id === GOOGLE_CONNECTION_ID,
      );
      if (
        !writeProviderConnections([
          ...connections.filter((item) => item.id !== GOOGLE_CONNECTION_ID),
          {
            id: GOOGLE_CONNECTION_ID,
            provider: "Gemini",
            displayName: "Google Gemini",
            kind: "user_byok",
            baseUrl: GOOGLE_API_BASE,
            credentialRef: GOOGLE_CREDENTIAL_REF,
            model: GOOGLE_IMAGE_MODEL,
            state: "active",
            concurrencyLimit: 1,
            healthRevision: (previous?.healthRevision ?? 0) + 1,
            verificationStatus: "unverified",
            capabilities: {
              modalities: ["image"],
              operations: ["generate", "edit"],
              maxReferences: 6,
              maxOutputs: 1,
              async: false,
            },
          },
        ])
      )
        throw new Error("metadata");
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
  return (
    <section
      className="settings-network-row settings-agent-card"
      aria-label="Google Gemini 配置"
    >
      <h3>
        Google Gemini <span className="settings-version-tag">对话与生图</span>
      </h3>
      <p>
        填写 Google AI Studio API Key 后，在项目对话中选择 Google
        Gemini。生成的图片会自动保存到当前画布。
      </p>
      <div className="settings-network-field">
        <label htmlFor="google-key">Google 密钥</label>
        <input
          id="google-key"
          type="password"
          autoComplete="off"
          value={key}
          disabled={disabled}
          onChange={(event) => setKey(event.target.value)}
          placeholder={
            stored
              ? "已配置；输入新 Key 可替换"
              : "粘贴 Google AI Studio API Key"
          }
        />
      </div>
      <p>
        桌面版保存在系统凭据库；网页版仅保留在本次会话中。Google
        可能保留连续对话记录，具体期限由其项目设置决定。
      </p>
      <div className="settings-network-actions">
        <button
          type="button"
          className="settings-action"
          disabled={disabled || !key.trim()}
          onClick={() => void save()}
        >
          保存 Google
        </button>
        <button
          type="button"
          className="settings-action"
          disabled={disabled || (!key.trim() && !stored)}
          onClick={() => void check()}
        >
          测试 Google 连接
        </button>
        {busy && request.current && (
          <button
            type="button"
            className="settings-action"
            onClick={() => request.current?.abort()}
          >
            取消测试
          </button>
        )}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
        >
          获取 API Key
        </a>
      </div>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
