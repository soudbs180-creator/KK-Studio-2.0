import type { ModelProviderProfile } from "../../domain/modelProvider";
import ProviderApiKeyField from "./ProviderApiKeyField";

export default function ProviderProfileFields({
  profile,
  apiKey,
  hasStoredKey,
  onUpdate,
  onApiKeyChange,
}: {
  profile: ModelProviderProfile;
  apiKey: string;
  hasStoredKey: boolean;
  onUpdate: (field: keyof ModelProviderProfile, value: string) => void;
  onApiKeyChange: (value: string) => void;
}) {
  return (
    <>
      <label className="settings-field">
        <span>供应商名称</span>
        <input
          value={profile.name}
          maxLength={60}
          onChange={(event) => onUpdate("name", event.target.value)}
          placeholder="例如：OpenAI 兼容 API"
        />
      </label>
      <label className="settings-field">
        <span>API Base URL</span>
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
        onChange={onApiKeyChange}
      />
      <label className="settings-field">
        <span>默认模型</span>
        <input
          value={profile.model}
          maxLength={120}
          onChange={(event) => onUpdate("model", event.target.value)}
          placeholder="例如：gpt-image-1（可留空）"
        />
      </label>
      <p className="settings-field-help">
        支持 OpenAI 兼容
        API。同一地址使用不同名称可登记独立连接。桌面密钥保存在系统凭据库，网页仅保留在当前会话内；连接测试不代表已验证图片或视频生成。
      </p>
    </>
  );
}
