import { isTauri } from "@tauri-apps/api/core";
import { type ModelProviderProfile } from "../../domain/modelProvider";
import ProviderApiKeyField from "./ProviderApiKeyField";
import ProviderPresetSelector from "./ProviderPresetSelector";
import type { CredentialReadState } from "./useProviderCredentialState";
import {
  providerProtocolSchema,
  providerAuthModeSchema,
  providerNeedsKey,
} from "../../domain/providerProtocol.ts";

export default function ProviderProfileFields({
  profile,
  apiKey,
  hasStoredKey,
  credentialStatus,
  onUpdate,
  onUpdateMany,
  onApiKeyChange,
  onOpenGoogle,
}: {
  profile: ModelProviderProfile;
  apiKey: string;
  hasStoredKey: boolean;
  credentialStatus?: CredentialReadState;
  onUpdate: (field: keyof ModelProviderProfile, value: string) => void;
  onUpdateMany: (patch: Partial<ModelProviderProfile>) => void;
  onApiKeyChange: (value: string) => void;
  onOpenGoogle: () => void;
}) {
  return (
    <>
      <ProviderPresetSelector
        onOpenGoogle={onOpenGoogle}
        onSelect={(preset) =>
          onUpdateMany({
            name: preset.name,
            baseUrl: preset.baseUrl,
            protocol: preset.wireProtocol ?? "openai-chat",
            authMode: preset.authMode ?? "api-key",
          })
        }
      />
      <label className="settings-field">
        <span>提供商</span>
        <input
          value={profile.name}
          maxLength={60}
          onChange={(event) => onUpdate("name", event.target.value)}
          placeholder="选填：用于区分供应商"
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
        <span>接口协议</span>
        <select
          value={profile.protocol ?? "openai-chat"}
          onChange={(event) =>
            onUpdateMany({
              protocol: providerProtocolSchema.parse(event.target.value),
            })
          }
        >
          <option value="openai-chat">OpenAI Chat Completions</option>
          <option value="openai-responses">OpenAI Responses</option>
          <option value="anthropic">Anthropic Messages</option>
          <option value="azure-openai">Azure OpenAI v1</option>
          <option value="ollama">Ollama（OpenAI 兼容）</option>
        </select>
      </label>
      <label className="settings-field">
        <span>认证方式</span>
        <select
          value={profile.authMode ?? "api-key"}
          onChange={(event) =>
            onUpdateMany({
              authMode: providerAuthModeSchema.parse(event.target.value),
            })
          }
        >
          <option value="api-key">API Key</option>
          <option
            value="none"
            disabled={
              !["openai-chat", "ollama"].includes(
                profile.protocol ?? "openai-chat",
              )
            }
          >
            本机免密
          </option>
        </select>
      </label>
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
      <label className="settings-field">
        <span>
          {profile.protocol === "azure-openai" ? "部署名称" : "模型名称"}
        </span>
        <input
          value={profile.model}
          maxLength={120}
          onChange={(event) => onUpdate("model", event.target.value)}
          placeholder="输入服务商提供的模型 ID"
        />
      </label>
      <p className="settings-field-help">
        {profile.protocol === "azure-openai"
          ? "使用 Azure /openai/v1 地址和部署名称；模型列表不能代替部署管理。"
          : "模型列表仅检测连接；请使用当前协议支持的文本模型。Responses、Messages、Azure 和 Ollama 当前只用于文案生成。"}
      </p>
    </>
  );
}
