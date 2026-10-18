import {
  appPlatform,
  appVersion,
  windowsInstallerFilename,
  windowsInstallerUrl,
} from "../../runtime/appInfo";
import { SettingRow } from "./SettingsControls";
import SettingsExternalLink from "./SettingsExternalLink";

export default function AppUpdateSettings() {
  return (
    <section aria-label="软件更新" className="settings-general-section">
      <SettingRow
        id="app-update"
        title="软件更新"
        description={`${appPlatform()} · 当前版本 ${appVersion}`}
      >
        <SettingsExternalLink
          href={windowsInstallerUrl}
          className="settings-action secondary"
          download={windowsInstallerFilename}
        >
          下载 Windows 安装包
        </SettingsExternalLink>
      </SettingRow>
      <p className="settings-field-help settings-unavailable-note">
        单个安装包含 Windows Agent 运行资源；安装或更新保留本机项目和配置。
      </p>
    </section>
  );
}
