import { isTauri } from "@tauri-apps/api/core";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
  type ModelProviderProfile,
} from "../../domain/modelProvider";
import ProviderApiKeyField from "./ProviderApiKeyField";
import type { CredentialReadState } from "./useProviderCredentialState";

export default function ProviderProfileFields({
  profile,
  apiKey,
  hasStoredKey,
  credentialStatus,
  onUpdate,
  onUpdateMany,
  onApiKeyChange,
}: {
  profile: ModelProviderProfile;
  apiKey: string;
  hasStoredKey: boolean;
  credentialStatus?: CredentialReadState;
  onUpdate: (field: keyof ModelProviderProfile, value: string) => void;
  onUpdateMany: (patch: Partial<ModelProviderProfile>) => void;
  onApiKeyChange: (value: string) => void;
}) {
  return (
    <>
      <label className="settings-field">
        <span>预置提供商</span>
        <select
          value=""
          onChange={(event) => {
            const preset = findProviderPreset(event.target.value);
            if (!preset) return;
            onUpdateMany({ name: preset.name, baseUrl: preset.baseUrl });
          }}
        >
          <option value="">选择预置（可选）</option>
          {PROVIDER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
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
          placeholder="https://api.example.com/v1"
          spellCheck={false}
        />
      </label>
      <ProviderApiKeyField
        value={apiKey}
        hasStoredKey={hasStoredKey}
        credentialStatus={credentialStatus}
        onChange={onApiKeyChange}
      />
      <p className="settings-field-help">
        {isTauri()
          ? "密钥保存在系统凭据库；留空可保留已保存的密钥。"
          : "网页密钥仅保留在当前会话内，不会写入浏览器存储；留空可保留本次会话的密钥。"}
      </p>
      <label className="settings-field">
        <span>模型名称</span>
        <input
          value={profile.model}
          maxLength={120}
          onChange={(event) => onUpdate("model", event.target.value)}
          placeholder="输入服务商提供的模型 ID"
        />
      </label>
      <p className="settings-field-help">
        支持 OpenAI 兼容
        API。同一地址使用不同名称可登记独立连接；连接测试不代表已验证图片或视频生成。
      </p>
    </>
  );
}
