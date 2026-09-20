export default function ProviderSettingsActions({
  saving,
  hasKey,
  testing,
  onSave,
  onClear,
  onTest,
  onCancel,
}: {
  saving: boolean;
  hasKey: boolean;
  testing: boolean;
  onSave: () => void;
  onClear: () => void;
  onTest: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="settings-action-group">
      <button
        type="button"
        className="settings-action"
        onClick={onSave}
        disabled={saving}
      >
        保存供应商
      </button>
      {hasKey && (
        <button
          type="button"
          className="settings-action secondary"
          onClick={onClear}
          disabled={saving}
        >
          清除密钥
        </button>
      )}
      {testing ? (
        <button
          type="button"
          className="settings-action secondary"
          onClick={onCancel}
        >
          取消测试
        </button>
      ) : (
        <button
          type="button"
          className="settings-action secondary"
          onClick={onTest}
        >
          测试连接
        </button>
      )}
    </div>
  );
}
