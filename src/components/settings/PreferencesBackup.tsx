import {
  serializeSettings,
  type SettingsPreferences,
} from "../../domain/settings";

export default function PreferencesBackup({
  preferences,
  onFeedback,
}: {
  preferences: SettingsPreferences;
  onFeedback: (message: string) => void;
}) {
  function exportPreferences(): void {
    const url = URL.createObjectURL(
      new Blob([serializeSettings(preferences)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "kk-studio-preferences.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onFeedback("已导出非敏感偏好；文件不包含账号、密钥、项目或资产。");
  }
  return (
    <details className="settings-disclosure">
      <summary>偏好备份</summary>
      <div className="settings-detail-stack">
        <p className="settings-section-intro">
          仅导出主题、布局等非敏感偏好。项目与原件通过项目包单独备份。
        </p>
        <button
          type="button"
          className="settings-action secondary"
          onClick={exportPreferences}
        >
          导出偏好备份
        </button>
      </div>
    </details>
  );
}
