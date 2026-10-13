import { useRef, useState } from "react";
import { checkModelProvider } from "../../integrations/modelProvider";
import {
  credentialId,
  loadApiKey,
} from "../../features/creation/providerCredentials";
import { isStrictLoopbackProviderUrl } from "../../domain/modelProvider";
import ProviderConnectionStatus from "./ProviderConnectionStatus";
import ProviderConnectionList from "./ProviderConnectionList";
import ProviderProfileFields from "./ProviderProfileFields";
import ProviderSettingsActions from "./ProviderSettingsActions";
import ProviderModelCatalog from "./ProviderModelCatalog";
import { saveModelCatalog } from "../../features/models/modelCatalog";
import { readProviderConnections } from "../../features/creation/providerRegistry";
import {
  persistModelProviderSettings,
  clearModelProviderKey,
} from "./persistModelProviderSettings";
import type { ProviderConnection } from "../../domain/providerConnections";
import { useProviderCredentialState } from "./useProviderCredentialState";
import {
  resolveModelProviderConnection,
  modelProfileFromConnection,
  requiresModelProviderSelection,
  validateModelProviderProfile,
  type ConnectionState,
} from "./modelProviderSettingsState";
import useScopedModelProviderDraft, {
  readModelProviderDraft,
} from "./useScopedModelProviderDraft";

export default function ModelProviderSettings({
  onFeedback,
  scope = "official",
  active = true,
  onBusyChange,
}: {
  onFeedback: (message: string) => void;
  scope?: "official" | "relay";
  active?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [initial] = useState(readModelProviderDraft);
  const [profile, setProfile] = useState(initial.profile);
  const [apiKey, setApiKey] = useState("");
  const [credentialRef, setCredentialRef] = useState(initial.credentialRef);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState(readProviderConnections);
  const [connection, setConnection] = useState<ConnectionState>({
    kind: "idle",
    message: "填写 API 地址后可保存；测试连接仅在你点击时发起。",
  });
  const requestRef = useRef<AbortController | null>(null);
  const { hasStoredKey, setHasStoredKey } = useProviderCredentialState(
    profile.baseUrl,
    credentialRef,
    requestRef,
    active &&
      profile.authMode !== "none" &&
      !requiresModelProviderSelection(profile, connections),
  );
  function cancelRequest(): void {
    requestRef.current?.abort("user");
    requestRef.current = null;
  }
  const { updateProfile: updateMany, updateApiKey } =
    useScopedModelProviderDraft({
      scope,
      profile,
      apiKey,
      credentialRef,
      active,
      saving,
      onBusyChange,
      cancelRequest,
      setProfile,
      setApiKey,
      setCredentialRef,
      setConnection,
    });
  const validate = () =>
    validateModelProviderProfile(profile, setConnection, connections);
  async function save(): Promise<void> {
    if (!active || saving) return;
    cancelRequest();
    const valid = validate();
    if (!valid) return;
    setSaving(true);
    try {
      const savedConnection = resolveModelProviderConnection(
        valid,
        credentialRef,
        connections,
      );
      valid.connectionId = savedConnection.id;
      const next = await persistModelProviderSettings(
        valid,
        savedConnection,
        apiKey,
        credentialRef,
      );
      if (valid.authMode !== "none" && apiKey.trim()) setHasStoredKey(true);
      setProfile(valid);
      setConnections(next);
      setConnection({
        kind: "idle",
        message: "连接信息已保存。API Key 不会写入浏览器存储或项目快照。",
      });
      window.dispatchEvent(new CustomEvent("kk:model-provider-changed"));
      onFeedback(
        "模型接入连接信息已保存；API Key 未写入浏览器存储或项目快照。",
      );
    } catch {
      setConnections(readProviderConnections());
      setConnection({
        kind: "error",
        message: "无法保存连接信息或系统凭据，请检查权限后重试。",
      });
    } finally {
      setSaving(false);
    }
  }
  function selectConnection(connection: ProviderConnection): void {
    if (saving || !connection.baseUrl) return;
    cancelRequest();
    setProfile(modelProfileFromConnection(connection));
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
    if (!active || saving) return;
    if (!validate()) return;
    cancelRequest();
    setSaving(true);
    try {
      await clearModelProviderKey(
        profile.baseUrl,
        credentialRef,
        resolveModelProviderConnection(profile, credentialRef, connections).id,
      );
      setConnections(readProviderConnections());
      setApiKey("");
      setHasStoredKey(false);
      setConnection({ kind: "idle", message: "已清除当前供应商的密钥。" });
    } catch {
      setConnections(readProviderConnections());
      setConnection({
        kind: "error",
        message: "无法清除系统凭据，请稍后重试。",
      });
    } finally {
      setSaving(false);
    }
  }
  async function testConnection(): Promise<void> {
    if (!active || saving || requestRef.current) return;
    const valid = validate();
    if (!valid) return;
    if (!navigator.onLine && !isStrictLoopbackProviderUrl(valid.baseUrl)) {
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
        valid.authMode === "none"
          ? ""
          : apiKey.trim() || (await loadApiKey(valid.baseUrl, credentialRef));
      if (requestRef.current !== controller) return;
      const models = await checkModelProvider(
        valid.baseUrl,
        key,
        controller.signal,
        valid,
      );
      if (requestRef.current !== controller) return;
      saveModelCatalog(
        resolveModelProviderConnection(valid, credentialRef, connections),
        models,
      );
      setConnection({
        kind: "success",
        message: `连接成功，已刷新 ${models.length} 个模型；这不代表全部生成能力已验证。`,
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
      <fieldset
        disabled={saving}
        className="provider-edit-fields"
        aria-label="API 连接信息"
      >
        <ProviderProfileFields
          profile={profile}
          apiKey={apiKey}
          hasStoredKey={hasStoredKey}
          onUpdate={(field, value) => updateMany({ [field]: value })}
          onUpdateMany={updateMany}
          onApiKeyChange={updateApiKey}
        />
        <ProviderConnectionList
          connections={connections}
          activeBaseUrl={profile.baseUrl}
          activeCredentialRef={credentialRef}
          activeConnectionId={profile.connectionId}
          onSelect={selectConnection}
        />
        <ProviderModelCatalog
          connection={resolveModelProviderConnection(
            profile,
            credentialRef,
            connections,
          )}
          profile={profile}
          onSelect={(model) => updateMany({ model })}
          onRefresh={() => void testConnection()}
          loading={connection.kind === "loading"}
        />
      </fieldset>
      <ProviderSettingsActions
        saving={saving}
        hasKey={profile.authMode !== "none" && Boolean(hasStoredKey || apiKey)}
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
