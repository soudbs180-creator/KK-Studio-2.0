import { useId, useState } from "react";
import UiIcon from "../UiIcon";
import type { CredentialReadState } from "./useProviderCredentialState";

export default function ProviderApiKeyField({
  value,
  hasStoredKey,
  onChange,
  credentialStatus,
}: {
  value: string;
  hasStoredKey: boolean;
  onChange: (value: string) => void;
  credentialStatus?: CredentialReadState;
}) {
  const [visible, setVisible] = useState(false);
  const [pasteFeedback, setPasteFeedback] = useState<string>("");
  const inputId = useId();

  async function handlePaste(): Promise<void> {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (trimmed) {
          onChange(trimmed);
          setPasteFeedback("已粘贴");
          window.setTimeout(() => setPasteFeedback(""), 1500);
          return;
        }
      }
      setPasteFeedback("剪贴板为空");
      window.setTimeout(() => setPasteFeedback(""), 1500);
    } catch {
      setPasteFeedback("读取剪贴板失败，请手动粘贴");
      window.setTimeout(() => setPasteFeedback(""), 2000);
    }
  }

  return (
    <div className="settings-field provider-api-key-field">
      <div className="provider-api-key-header">
        <label htmlFor={inputId}>API Key</label>
        {pasteFeedback && (
          <span className="provider-paste-feedback" role="status">
            {pasteFeedback}
          </span>
        )}
      </div>
      <div className="settings-key-input">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            credentialStatus === "loading"
              ? "正在读取已保存的密钥…"
              : credentialStatus === "error"
                ? "密钥状态未知，请重试读取"
                : hasStoredKey
                  ? "已配置；重新输入可替换"
                  : "输入你的 API Key"
          }
        />
        <button
          type="button"
          className="settings-key-action settings-key-paste"
          title="从剪贴板粘贴"
          aria-label="从剪贴板粘贴"
          onClick={() => void handlePaste()}
        >
          <UiIcon name="copy" size={16} />
          <span className="settings-key-action-text">粘贴</span>
        </button>
        <button
          type="button"
          className="settings-key-action settings-key-eye"
          aria-label={visible ? "隐藏密钥" : "显示密钥"}
          title={visible ? "隐藏密钥" : "显示密钥"}
          onClick={() => setVisible((shown) => !shown)}
        >
          <UiIcon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
      <div className="provider-key-security-note" role="note">
        <span className="security-icon" aria-hidden="true">
          🛡️
        </span>
        <span className="security-text">
          <strong>硬件级安全加密</strong>：您的 API Key
          将直接加密写入本地操作系统凭据库（Windows 凭据管理器 / macOS Keychain
          / Linux
          SecretService），绝不上传至任何云端，亦不会随项目快照写入仓库。
        </span>
      </div>
    </div>
  );
}
