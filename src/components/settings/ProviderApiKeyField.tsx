export default function ProviderApiKeyField({
  value,
  hasStoredKey,
  onChange,
}: {
  value: string;
  hasStoredKey: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-field">
      <span>API Key</span>
      <input
        type="password"
        value={value}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          hasStoredKey ? "已配置；重新输入可替换" : "仅保留在当前会话内"
        }
      />
    </label>
  );
}
