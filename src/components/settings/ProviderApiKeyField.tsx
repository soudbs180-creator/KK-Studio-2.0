import { useId, useState } from "react";
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
  const inputId = useId();
  return (
    <div className="settings-field">
      <label htmlFor={inputId}>API Key</label>
      <div className="settings-key-input">
        <input
          id={inputId}
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
          aria-label={visible ? "隐藏密钥" : "显示密钥"}
          onClick={() => setVisible((shown) => !shown)}
        >
          <UiIcon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
    </div>
  );
}
