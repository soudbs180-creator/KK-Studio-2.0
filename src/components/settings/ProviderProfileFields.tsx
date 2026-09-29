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
        onChange={onApiKeyChange}
      />
      <p className="settings-field-help">
        密钥保存在本机。留空可保留已保存的密钥。
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
        支持 OpenAI 兼容 API。同一地址使用不同名称可登记独立连接；连接测试不代表已验证图片或视频生成。
      </p>
    </>
  );
}
