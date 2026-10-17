import { appPlatform, appVersion } from "../../runtime/appInfo";
import { SettingRow } from "./SettingsControls";

export default function AppUpdateSettings() {
  return (
    <section aria-label="软件更新" className="settings-general-section">
      <SettingRow
        id="app-update"
        title="软件更新"
        description={`${appPlatform()} · 当前版本 ${appVersion}`}
      >
        <button
          type="button"
          className="settings-action secondary"
          disabled
          title="更新与官方客户端下载信息尚未接入"
        >
          服务未接入
        </button>
      </SettingRow>
      <p className="settings-field-help settings-unavailable-note">
        更新与官方客户端下载信息尚未接入；此处不表示当前版本已是最新。
      </p>
    </section>
  );
}
