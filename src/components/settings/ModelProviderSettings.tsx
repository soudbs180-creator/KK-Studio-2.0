import { useRef, useState } from "react";
import { testProviderConnection } from "./testProviderConnection";
import { credentialId } from "../../features/creation/providerCredentials";
import {
  clearProviderConnectionKey,
  providerSaveErrorMessage,
  saveProviderConnection,
} from "../../features/creation/providerSaveRecovery";
import ProviderConnectionStatus from "./ProviderConnectionStatus";
import ProviderConnectionList from "./ProviderConnectionList";
import ProviderProfileFields from "./ProviderProfileFields";
import ProviderSettingsActions from "./ProviderSettingsActions";
import ProviderModelCatalog from "./ProviderModelCatalog";
import { readProviderConnections } from "../../features/creation/providerRegistry";
import type { ProviderConnection } from "../../domain/providerConnections";
import { providerNeedsKey } from "../../domain/providerProtocol.ts";
import { useProviderCredentialState } from "./useProviderCredentialState";
import ProviderCredentialStatus from "./ProviderCredentialStatus";
import {
  resolveModelProviderConnection,
  validateModelProviderProfile,
  type ConnectionState,
} from "./modelProviderSettingsState";
import useScopedModelProviderDraft, {
  readModelProviderDraft,
} from "./useScopedModelProviderDraft";
import { isLocalProviderUrl } from "../../domain/providerUrl";
export default function ModelProviderSettings({
  onFeedback,
  scope = "official",
  active = true,
  onBusyChange,
  onOpenGoogle,
}: {
  onFeedback: (message: string) => void;
  scope?: "official" | "relay" | "local";
  active?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onOpenGoogle: () => void;
}) {
  const [initial] = useState(() => readModelProviderDraft(scope));
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
  const {
    hasStoredKey,
    setHasStoredKey,
    credentialStatus,
    retryCredentialLoad,
    reflectCommittedCredential,
  } = useProviderCredentialState(
    profile.baseUrl,
    credentialRef,
    requestRef,
    providerNeedsKey(profile),
  );
  const credentialBlocked =
    credentialStatus === "loading" || credentialStatus === "error";
  function cancelRequest(): void {
    requestRef.current?.abort("user");
    requestRef.current = null;
  }
  const updateMany = useScopedModelProviderDraft({
    scope,
    profile,
    apiKey,
    credentialRef,
    active,
    saving,
    testing: connection.kind === "loading",
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
    if (!active || saving || credentialBlocked) return;
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
      const next = await saveProviderConnection(
        savedConnection,
        providerNeedsKey(valid) ? apiKey : "",
        valid,
      );
      if (apiKey.trim()) setHasStoredKey(true);
      setApiKey("");
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
    } catch (error) {
      reflectCommittedCredential(error, () => setApiKey(""));
      setConnection({
        kind: "error",
        message: providerSaveErrorMessage(
          error,
          "无法保存连接信息或系统凭据，原密钥和草稿已保留；请检查权限后重试。",
        ),
      });
    } finally {
      setSaving(false);
    }
  }
  function selectConnection(connection: ProviderConnection): void {
    if (saving || !connection.baseUrl) return;
    cancelRequest();
    setProfile({
      version: 1,
      connectionId: connection.id,
      name: connection.provider,
      baseUrl: connection.baseUrl,
      model: connection.model ?? "",
      protocol: connection.protocol,
      authMode: connection.authMode,
    });
    setCredentialRef(
      connection.credentialRef ??
        credentialId(connection.baseUrl, connection.provider),
    );
    setApiKey("");
    setConnection({
      kind: "idle",
      message: "已选中连接供编辑；保存后生效。",
    });
  }
  async function clearKey(): Promise<void> {
    if (!active || saving || credentialBlocked) return;
    if (!validate()) return;
    cancelRequest();
    setSaving(true);
    try {
      const next = await clearProviderConnectionKey(
        resolveModelProviderConnection(profile, credentialRef, connections),
      );
      setConnections(next);
      setApiKey("");
      setHasStoredKey(false);
      setConnection({ kind: "idle", message: "已清除当前供应商的密钥。" });
    } catch (error) {
      reflectCommittedCredential(error, () => setApiKey(""));
      setConnection({
        kind: "error",
        message: providerSaveErrorMessage(
          error,
          "无法清除系统凭据，请稍后重试。",
        ),
      });
    } finally {
      setSaving(false);
    }
  }
  async function testConnection(): Promise<void> {
    if (!active || saving || credentialBlocked || requestRef.current) return;
    const valid = validate();
    if (valid)
      await testProviderConnection({
        valid,
        apiKey,
        credentialRef,
        connections,
        requestRef,
        setConnection,
        onFeedback,
      });
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
      <ProviderCredentialStatus
        status={credentialStatus}
        onRetry={retryCredentialLoad}
      />
      <fieldset
        disabled={saving}
        className="provider-edit-fields"
        aria-label="API 连接信息"
      >
        <div className="provider-connection-editor">
          <ProviderProfileFields
            scope={scope}
            onOpenGoogle={onOpenGoogle}
            profile={profile}
            apiKey={apiKey}
            hasStoredKey={hasStoredKey}
            credentialStatus={credentialStatus}
            onUpdate={(field, value) => updateMany({ [field]: value })}
            onUpdateMany={updateMany}
            onApiKeyChange={(value) => {
              if (saving) return;
              cancelRequest();
              setApiKey(value);
              setConnection({
                kind: "idle",
                message: "密钥已更改，请重新测试连接。",
              });
            }}
          />
          <ProviderSettingsActions
            saving={saving || credentialBlocked}
            hasKey={
              providerNeedsKey(profile) && Boolean(hasStoredKey || apiKey)
            }
            testing={connection.kind === "loading"}
            onSave={() => void save()}
            onClear={() => void clearKey()}
            onTest={() => void testConnection()}
            onCancel={() => {
              requestRef.current?.abort("user");
              setConnection({ kind: "loading", message: "正在取消连接测试…" });
            }}
          />
        </div>
        <ProviderConnectionList
          connections={
            scope === "local"
              ? connections.filter(
                  (item) =>
                    item.kind === "user_byok" &&
                    item.baseUrl &&
                    isLocalProviderUrl(item.baseUrl),
                )
              : connections
          }
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
          loading={connection.kind === "loading"}
        />
      </fieldset>
    </form>
  );
}
