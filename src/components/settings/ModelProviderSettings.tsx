import { useEffect, useRef, useState } from "react";
import { checkModelProvider } from "../../integrations/modelProvider";
import {
  deleteApiKey,
  credentialId,
  loadApiKey,
  saveApiKey,
} from "../../features/creation/providerCredentials";
import {
  DEFAULT_MODEL_PROVIDER,
  MODEL_PROVIDER_STORAGE_KEY,
  modelProviderSchema,
  parseModelProvider,
  serializeModelProvider,
  type ModelProviderProfile,
} from "../../domain/modelProvider";
import ProviderConnectionStatus from "./ProviderConnectionStatus";
import ProviderConnectionList from "./ProviderConnectionList";
import ProviderProfileFields from "./ProviderProfileFields";
import ProviderSettingsActions from "./ProviderSettingsActions";
import {
  addProviderConnection,
  connectionFromModelProfile,
  markProviderConnectionUnverified,
  readProviderConnections,
} from "../../features/creation/providerRegistry";
import type { ProviderConnection } from "../../domain/providerConnections";

type ConnectionState =
  | { kind: "idle"; message: string }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "cancelled"; message: string }
  | { kind: "offline"; message: string };

function readProfile(): ModelProviderProfile {
  try {
    return parseModelProvider(
      window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
    ).profile;
  } catch {
    return { ...DEFAULT_MODEL_PROVIDER };
  }
}

export default function ModelProviderSettings({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const [profile, setProfile] = useState(readProfile);
  const [apiKey, setApiKey] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [credentialRef, setCredentialRef] = useState(() =>
    credentialId(readProfile().baseUrl, readProfile().name),
  );
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState(readProviderConnections);
  const [connection, setConnection] = useState<ConnectionState>({
    kind: "idle",
    message: "填写 API 地址后可保存；测试连接仅在你点击时发起。",
  });
  const requestRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      requestRef.current?.abort("closed");
      requestRef.current = null;
    },
    [],
  );
  useEffect(() => {
    let active = true;
    void loadApiKey(profile.baseUrl, credentialRef)
      .then((value) => {
        if (active) setHasStoredKey(Boolean(value));
      })
      .catch(() => {
        if (active) setHasStoredKey(false);
      });
    return () => {
      active = false;
    };
  }, [profile.baseUrl, credentialRef]);

  function cancelRequest(): void {
    requestRef.current?.abort("user");
    requestRef.current = null;
  }

  function update(field: keyof ModelProviderProfile, value: string): void {
    cancelRequest();
    const nextProfile = { ...profile, [field]: value };
    if (field === "baseUrl" || field === "name") {
      setApiKey("");
      setCredentialRef(credentialId(nextProfile.baseUrl, nextProfile.name));
    }
    setProfile(nextProfile);
    setConnection({ kind: "idle", message: "有尚未测试的更改。" });
  }

  function validate(): ModelProviderProfile | null {
    const result = modelProviderSchema.safeParse(profile);
    if (result.success) return result.data;
    setConnection({
      kind: "error",
      message: result.error.issues[0]?.message ?? "请检查供应商配置。",
    });
    return null;
  }

  async function save(): Promise<void> {
    cancelRequest();
    const valid = validate();
    if (!valid) return;
    setSaving(true);
    try {
      const savedConnection = connectionFromModelProfile(valid);
      if (apiKey.trim()) {
        await saveApiKey(valid.baseUrl, apiKey, credentialRef);
        markProviderConnectionUnverified(savedConnection.id);
        setHasStoredKey(true);
      }
      window.localStorage.setItem(
        MODEL_PROVIDER_STORAGE_KEY,
        serializeModelProvider(valid),
      );
      setProfile(valid);
      setConnections(addProviderConnection(savedConnection));
      setConnection({
        kind: "idle",
        message: "连接信息已保存。API Key 不会写入浏览器存储或项目快照。",
      });
      window.dispatchEvent(new CustomEvent("kk:model-provider-changed"));
      onFeedback(
        "模型供应商连接信息已保存；API Key 未写入浏览器存储或项目快照。",
      );
    } catch {
      setConnection({
        kind: "error",
        message: "无法保存连接信息或系统凭据，请检查权限后重试。",
      });
    } finally {
      setSaving(false);
    }
  }

  function selectConnection(connection: ProviderConnection): void {
    if (!connection.baseUrl) return;
    cancelRequest();
    setProfile({
      version: 1,
      name: connection.provider,
      baseUrl: connection.baseUrl,
      model: connection.model ?? "",
    });
    setCredentialRef(
      connection.credentialRef ??
        credentialId(connection.baseUrl, connection.provider),
    );
    setApiKey("");
    setConnection({
      kind: "idle",
      message: "已切换连接；请测试或保存后使用。",
    });
  }

  async function clearKey(): Promise<void> {
    cancelRequest();
    setSaving(true);
    try {
      await deleteApiKey(profile.baseUrl, credentialRef);
      markProviderConnectionUnverified(connectionFromModelProfile(profile).id);
      setApiKey("");
      setHasStoredKey(false);
      setConnection({ kind: "idle", message: "已清除当前供应商的密钥。" });
    } catch {
      setConnection({
        kind: "error",
        message: "无法清除系统凭据，请稍后重试。",
      });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(): Promise<void> {
    if (requestRef.current) return;
    const valid = validate();
    if (!valid) return;
    if (!navigator.onLine) {
      setConnection({
        kind: "offline",
        message: "设备处于离线状态，请联网后重试。",
      });
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setConnection({ kind: "loading", message: "正在请求模型列表…" });
    const timeout = window.setTimeout(
      () => controller.abort("timeout"),
      10_000,
    );
    try {
      const key =
        apiKey.trim() || (await loadApiKey(valid.baseUrl, credentialRef));
      await checkModelProvider(valid.baseUrl, key, controller.signal);
      if (requestRef.current !== controller) return;
      setConnection({
        kind: "success",
        message: "连接成功，模型列表接口可以访问。",
      });
    } catch (error) {
      if (requestRef.current !== controller) return;
      if (controller.signal.aborted) {
        setConnection({
          kind: "cancelled",
          message:
            controller.signal.reason === "timeout"
              ? "连接超时，已取消请求。"
              : "已取消连接测试。",
        });
      } else {
        setConnection({
          kind: navigator.onLine ? "error" : "offline",
          message: navigator.onLine
            ? error instanceof TypeError
              ? "无法连接，请检查地址、网络和服务的跨域访问设置。"
              : error instanceof Error
                ? error.message
                : "连接失败，请重试。"
            : "网络已断开，请恢复后重试。",
        });
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  return (
    <form
      className="provider-form"
      onSubmit={(event) => event.preventDefault()}
    >
      <ProviderConnectionStatus
        kind={connection.kind}
        message={connection.message}
      />
      <ProviderProfileFields
        profile={profile}
        apiKey={apiKey}
        hasStoredKey={hasStoredKey}
        onUpdate={update}
        onApiKeyChange={(value) => {
          cancelRequest();
          setApiKey(value);
          setConnection({
            kind: "idle",
            message: "密钥已更改，请重新测试连接。",
          });
        }}
      />
      <ProviderConnectionList
        connections={connections}
        activeBaseUrl={profile.baseUrl}
        activeCredentialRef={credentialRef}
        onSelect={selectConnection}
      />
      <ProviderSettingsActions
        saving={saving}
        hasKey={Boolean(hasStoredKey || apiKey)}
        testing={connection.kind === "loading"}
        onSave={() => void save()}
        onClear={() => void clearKey()}
        onTest={() => void testConnection()}
        onCancel={() => {
          cancelRequest();
          setConnection({ kind: "cancelled", message: "已取消连接测试。" });
        }}
      />
    </form>
  );
}
