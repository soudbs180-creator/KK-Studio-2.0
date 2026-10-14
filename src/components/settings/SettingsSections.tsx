import { appPlatform } from "../../runtime/appInfo";
import { useState } from "react";
import { serializeSettings } from "../../domain/settings";
import type { SettingsPreferences } from "../../domain/settings";

import { SETTINGS_SECTIONS } from "./SettingsSectionData";
import type { SettingsSection } from "./SettingsSectionData";
import ConnectionSettings from "./ConnectionSettings";
import ProjectPackageActions from "../../features/projects/ProjectPackageActions";
import type { SaveState } from "../../features/creation/useCreationStorage";
import type { CreationProject } from "../../features/creation/model";
import UsageSettings from "./UsageSettings";
import StorageOverview from "./StorageOverview";
import type { SkillRegistry } from "../../features/skills/skillRegistry";
import ExtensionsSettings, { type ExtensionsTab } from "./ExtensionsSettings";
import CompanionSettings from "./CompanionSettings";
export { SETTINGS_SECTIONS } from "./SettingsSectionData";
export type { SettingsSection } from "./SettingsSectionData";

interface SettingsSectionsProps {
  section: SettingsSection;
  active?: boolean;
  preferences: SettingsPreferences;
  onReset: () => void;
  onFeedback: (message: string) => void;
  saveState: SaveState;
  revision: number;
  projects: readonly CreationProject[];
  registry: SkillRegistry;
  extensionsTab?: ExtensionsTab;
}

export default function SettingsSections({
  section,
  active: isActive = true,
  preferences,
  onReset,
  onFeedback,
  saveState,
  revision,
  projects,
  registry,
  extensionsTab,
}: SettingsSectionsProps) {
  const [confirmReset, setConfirmReset] = useState(false);
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

  const active = SETTINGS_SECTIONS.find((item) => item.id === section);
  // SettingsPanel resolves legacy deep links before this renderer. Keeping a
  // single section here prevents the rail and page from drifting apart.
  const extensionsSection = section === "extensions";
  const defaultExtensionTab = extensionsTab;

  return (
    <div hidden={!isActive}>
      <h2
        className="settings-page-title"
        id={isActive ? "settings-section-title" : undefined}
      >
        {active?.label}
      </h2>
      {active?.description && (
        <p className="settings-section-intro settings-page-description">
          {active.description}
        </p>
      )}
      <div className="settings-section-body">
        {extensionsSection && (
          <ExtensionsSettings
            registry={registry}
            onFeedback={onFeedback}
            defaultTab={defaultExtensionTab}
          />
        )}
        {!extensionsSection && (
          <ConnectionSettings
            section={section}
            active={isActive}
            onFeedback={onFeedback}
          />
        )}

        {section === "usage" && (
          <UsageSettings projects={projects} saveState={saveState} />
        )}

        {section === "storage" && (
          <>
            <StorageOverview projects={projects} saveState={saveState} />
            <h3 className="settings-detail-label">偏好备份</h3>
            <p className="settings-section-intro">
              在当前设备保存主题、布局等非敏感偏好。
            </p>
            <div className="settings-info-row">
              <span>偏好保存位置</span>
              <strong>{appPlatform()} · 本机</strong>
            </div>
            <div className="settings-info-row">
              <span>导出内容</span>
              <strong>通用设置</strong>
            </div>
            <button
              type="button"
              className="settings-action"
              onClick={exportPreferences}
            >
              导出偏好备份
            </button>
            <p className="settings-section-intro">
              项目和资产单独保存在本机，不包含在偏好备份里。浏览器版暂不支持指定资产目录。
            </p>
            <ProjectPackageActions saveState={saveState} revision={revision} />
            <h3 className="settings-detail-label">网页本机伴随服务</h3>
            <CompanionSettings onFeedback={onFeedback} />
          </>
        )}

        {section === "advanced" && (
          <>
            <p className="settings-section-intro">
              管理当前设备的界面偏好。项目和资产不会受影响。
            </p>
            <div className="settings-info-row">
              <span>运行平台</span>
              <strong>{appPlatform()} · 本地优先</strong>
            </div>
            <button
              type="button"
              className="settings-action"
              onClick={exportPreferences}
            >
              导出偏好备份
            </button>
            <div className="settings-reset-card">
              <h3>恢复默认偏好</h3>
              <p>仅重置主题、强调色、浮岛布局和水印偏好，保留项目和资产。</p>
              {confirmReset ? (
                <div className="settings-action-group">
                  <button
                    type="button"
                    className="settings-action"
                    onClick={() => {
                      onReset();
                      setConfirmReset(false);
                    }}
                  >
                    确认恢复
                  </button>
                  <button
                    type="button"
                    className="settings-action secondary"
                    onClick={() => setConfirmReset(false)}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="settings-action secondary"
                  onClick={() => setConfirmReset(true)}
                >
                  恢复默认偏好
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
