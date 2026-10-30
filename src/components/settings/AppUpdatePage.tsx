import type { CSSProperties } from "react";
import {
  appPlatform,
  appVersion,
  windowsInstallerFilename,
  windowsInstallerUrl,
} from "../../runtime/appInfo";
import UiIcon from "../UiIcon";
import { SettingsToggle } from "./SettingsControls";
import SettingsExternalLink from "./SettingsExternalLink";

export type UpdateState =
  | "idle"
  | "checking"
  | "up_to_date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

const unavailable =
  "自动更新服务尚未接入；未检查远端版本，也未下载或安装更新。";
const cardStyle: CSSProperties = {
  backgroundColor: "var(--kk-bg-card)",
  border: "1px solid var(--kk-border-default)",
  borderRadius: "var(--kk-radius-lg)",
  padding: "var(--kk-space-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--kk-space-3)",
  minWidth: 0,
};
const helpStyle: CSSProperties = { margin: 0 };
const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--kk-font-body)",
  lineHeight: "var(--kk-line-body)",
};
const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "var(--kk-space-2)",
};

export default function AppUpdatePage() {
  return (
    <section aria-label="软件更新" className="settings-detail-stack">
      <h2 className="settings-page-title" id="settings-section-title">
        软件更新
      </h2>
      <p className="settings-field-help" style={helpStyle}>
        版本、检查、安装策略与累积更新记录
      </p>
      <div className="kk-card-box" style={cardStyle}>
        <div style={rowStyle}>
          <h3 style={headingStyle}>
            {appPlatform()} · 当前版本 {appVersion}
          </h3>
          <button
            type="button"
            className="settings-action secondary"
            disabled
            title={unavailable}
          >
            检查更新
          </button>
        </div>
        <p className="settings-field-help" style={helpStyle}>
          版本来自当前应用构建信息。
        </p>
        <div
          role="status"
          style={{ ...rowStyle, justifyContent: "flex-start" }}
        >
          <UiIcon name="clock" />
          <div>
            <strong>尚未检查更新</strong>
            <p className="settings-field-help" style={helpStyle}>
              {unavailable}
            </p>
          </div>
        </div>
      </div>
      <div className="kk-card-box" style={cardStyle}>
        <h3 style={headingStyle}>当前安装版本包含的更新内容</h3>
        <p className="settings-field-help" style={helpStyle}>
          安装记录尚未接入，不能将示例日志视为本机安装记录。
        </p>
      </div>
      <div
        className="kk-card-box"
        style={{ ...cardStyle, ...rowStyle, flexDirection: "row" }}
      >
        <div>
          <h3 id="automatic-downloads-label" style={headingStyle}>
            自动检查并下载更新
          </h3>
          <p
            id="automatic-downloads-description"
            className="settings-field-help"
            style={helpStyle}
          >
            安装与重启仍须提示确认
          </p>
        </div>
        <SettingsToggle
          id="automatic-downloads"
          checked={false}
          disabledReason={unavailable}
        />
      </div>
      <div style={rowStyle}>
        <SettingsExternalLink
          href={windowsInstallerUrl}
          download={windowsInstallerFilename}
          className="settings-action secondary"
        >
          下载 Windows 安装包
        </SettingsExternalLink>
        <SettingsExternalLink
          href="https://github.com/soudbs180-creator/KK-Studio-2.0/releases"
          className="settings-action secondary"
        >
          查看正式发布记录
        </SettingsExternalLink>
      </div>
      <p className="settings-field-help" style={helpStyle}>
        单个安装包含 Windows Agent 运行资源；安装或更新保留本机项目和配置。
        当前构建尚未发布时，请从正式发布记录选择已有安装包；打开下载链接不代表已安装。
      </p>
    </section>
  );
}
