import { useState, type SyntheticEvent } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { type ModelProviderProfile } from "../../domain/modelProvider";
import type { ProviderPreset } from "../../domain/providerPresets";
import ProviderApiKeyField from "./ProviderApiKeyField";
import ProviderPresetSelector from "./ProviderPresetSelector";
import type { CredentialReadState } from "./useProviderCredentialState";
import { providerNeedsKey } from "../../domain/providerProtocol.ts";

/** 官方预设默认收起；空 Base URL 的网关/中转才默认展开。 */
export function shouldExpandCustomRelay(
  preset: Pick<ProviderPreset, "category" | "baseUrl">,
  scope?: "official" | "relay" | "local",
): boolean {
  if (preset.category === "官方") return false;
  if (!preset.baseUrl.trim()) return true;
  return scope === "relay" && preset.category === "网关";
}

export default function ProviderProfileFields({
  profile,
  apiKey,
  hasStoredKey,
  credentialStatus,
  onUpdate,
  onUpdateMany,
  onApiKeyChange,
  onOpenGoogle,
  scope,
}: {
  profile: ModelProviderProfile;
  apiKey: string;
  hasStoredKey: boolean;
  credentialStatus?: CredentialReadState;
  onUpdate: (field: keyof ModelProviderProfile, value: string) => void;
  onUpdateMany: (patch: Partial<ModelProviderProfile>) => void;
  onApiKeyChange: (value: string) => void;
  onOpenGoogle: () => void;
  scope?: "official" | "relay" | "local";
}) {
  const [customRelayOpen, setCustomRelayOpen] = useState(
    () => scope === "relay" && !profile.baseUrl.trim(),
  );

  function handleCustomToggle(event: SyntheticEvent<HTMLDetailsElement>): void {
    setCustomRelayOpen(event.currentTarget.open);
  }

  return (
    <>
      <ProviderPresetSelector
        localOnly={scope === "local"}
        onOpenGoogle={onOpenGoogle}
        onSelect={(preset) => {
          onUpdateMany({
            name: preset.name,
            baseUrl: preset.baseUrl,
            protocol: preset.wireProtocol ?? "openai-chat",
            authMode: preset.authMode ?? "api-key",
          });
          setCustomRelayOpen(shouldExpandCustomRelay(preset, scope));
        }}
      />
      {providerNeedsKey(profile) && (
        <ProviderApiKeyField
          value={apiKey}
          hasStoredKey={hasStoredKey}
          credentialStatus={credentialStatus}
          onChange={onApiKeyChange}
        />
      )}
      <p className="settings-field-help">
        {!providerNeedsKey(profile)
          ? "免密仅用于 localhost、127.0.0.1 或 ::1 的 Chat/Ollama 服务；原密钥保留。"
          : isTauri()
            ? "密钥保存在系统凭据库；留空可保留已保存的密钥。"
            : "网页密钥仅保留在当前会话内，不会写入浏览器存储；留空可保留本次会话的密钥。"}
      </p>
      <details
        className="settings-usage-guide"
        open={customRelayOpen}
        onToggle={handleCustomToggle}
      >
        <summary>
          <span className="settings-usage-guide-toggle">
            <span className="settings-usage-guide-expand">
              展开自定义中转站或自建模型地址
            </span>
            <span className="settings-usage-guide-collapse">
              收起自定义中转站或自建模型地址
            </span>
          </span>
        </summary>
        <label className="settings-field">
          <span>提供商</span>
          <input
            value={profile.name}
            required
            maxLength={60}
            onChange={(event) => onUpdate("name", event.target.value)}
            placeholder="跟随预设自动填充，一般无需修改"
          />
        </label>
        <label className="settings-field">
          <span>接口地址</span>
          <input
            type="url"
            value={profile.baseUrl}
            onChange={(event) => onUpdate("baseUrl", event.target.value)}
            placeholder={
              profile.protocol === "azure-openai"
                ? "https://你的资源.openai.azure.com/openai/v1"
                : "https://api.example.com/v1"
            }
            spellCheck={false}
          />
        </label>
        <label className="settings-field">
          <span>
            {profile.protocol === "azure-openai" ? "部署名称" : "模型名称"}
          </span>
          <input
            value={profile.model}
            maxLength={120}
            onChange={(event) => onUpdate("model", event.target.value)}
            placeholder="连通成功后可从模型目录点选；也可在此手填"
          />
        </label>
        <p className="settings-field-help">
          协议与认证方式已由预设自动填入，无需手动选择。官方预设请优先只填
          API Key 后保存并测试。
        </p>
      </details>
    </>
  );
}
