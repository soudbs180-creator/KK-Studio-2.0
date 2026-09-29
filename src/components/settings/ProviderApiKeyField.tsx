import { useState } from "react";
import UiIcon from "../UiIcon";

export default function ProviderApiKeyField({
  value,
  hasStoredKey,
  onChange,
}: {
  value: string;
  hasStoredKey: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="settings-field">
      <span>API Key</span>
      <div className="settings-key-input">
        <input
          type={visible ? "text" : "password"}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            hasStoredKey ? "已配置；重新输入可替换" : "输入你的 API Key"
          }
        />
        <button
          type="button"
          className="settings-key-eye"
          aria-label={visible ? "隐藏 API Key" : "显示 API Key"}
          onClick={() => setVisible((shown) => !shown)}
        >
          <UiIcon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
    </label>
  );
}
