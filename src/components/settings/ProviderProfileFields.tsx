import { isTauri } from "@tauri-apps/api/core";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
  type ModelProviderProfile,
  isStrictLoopbackProviderUrl,
} from "../../domain/modelProvider";
import ProviderApiKeyField from "./ProviderApiKeyField";

export default function ProviderProfileFields({
  profile,
  apiKey,
  hasStoredKey,
  onUpdate,
  onUpdateMany,
  onApiKeyChange,
}: {
  profile: ModelProviderProfile;
  apiKey: string;
  hasStoredKey: boolean;
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
            onUpdateMany({
              name: preset.name,
              baseUrl: preset.baseUrl,
              protocol: preset.protocol,
              authMode: preset.authMode,
            });
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
      <label className="settings-field">
        <span>接口协议</span>
        <select
          aria-label="接口协议"
          value={profile.protocol ?? "openai-compatible"}
          onChange={(event) => onUpdate("protocol", event.target.value)}
        >
          <option value="openai-compatible">OpenAI 兼容</option>
          <option value="anthropic-messages">Anthropic Messages</option>
          <option value="gemini">Google Gemini</option>
        </select>
      </label>
      <label className="settings-field">
        <span>认证方式</span>
        <select
          aria-label="认证方式"
          value={profile.authMode ?? "api_key"}
          onChange={(event) => onUpdate("authMode", event.target.value)}
        >
          <option value="api_key">API Key</option>
          <option
            value="none"
            disabled={!isStrictLoopbackProviderUrl(profile.baseUrl)}
          >
            本机免密接口
          </option>
        </select>
      </label>
      {profile.authMode !== "none" && (
        <ProviderApiKeyField
          value={apiKey}
          hasStoredKey={hasStoredKey}
          onChange={onApiKeyChange}
        />
      )}
      <p className="settings-field-help">
        {profile.authMode === "none"
          ? "仅连接本机回环接口；请先自行启动 Ollama 或 LM Studio 并加载模型。启用服务端认证后，请改选 API Key。"
          : isTauri()
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
        预置仅填写接口配置，不安装软件或模型。云 API
        可能由服务商计费；不会自动请求。连接测试不代表已验证生成能力。
      </p>
    </>
  );
}
