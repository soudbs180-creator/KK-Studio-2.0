import type { SettingsPreferences } from "../../domain/settings";
import {
  SETTINGS_SECTIONS,
  getSettingsTier,
  type SettingsSection,
} from "./SettingsSectionData";
import ConnectionSettings from "./ConnectionSettings";
import { ProjectPackageActions as ProjectPackageActions } from "../../features/projects/index.ts";
import type { SaveState } from "../../features/creation/index.ts";
import type { CreationProject } from "../../features/creation/index.ts";
import PlansSettings from "./PlansSettings";
import StorageOverview from "./StorageOverview";
import PreferencesBackup from "./PreferencesBackup";
import type { SkillRegistry } from "../../features/skills/index.ts";
import ExtensionsSettings, { type ExtensionsTab } from "./ExtensionsSettings";
import ShortcutsPanel from "../ShortcutsPanel";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";
export { SETTINGS_SECTIONS } from "./SettingsSectionData";
export type { SettingsSection } from "./SettingsSectionData";

interface SettingsSectionsProps {
  section: SettingsSection;
  active?: boolean;
  preferences: SettingsPreferences;
  onFeedback: (message: string) => void;
  saveState: SaveState;
  revision: number;
  projects: readonly CreationProject[];
  activeProject?: CreationProject;
  registry: SkillRegistry;
  extensionsTab?: ExtensionsTab;
  initialModelMethod?: "local";
  workflows: LocalWorkflowAccess;
}

export default function SettingsSections({
  section,
  active = true,
  preferences,
  onFeedback,
  saveState,
  revision,
  projects,
  activeProject,
  registry,
  extensionsTab,
  initialModelMethod,
  workflows,
}: SettingsSectionsProps) {
  const item = SETTINGS_SECTIONS.find((entry) => entry.id === section);
  return (
    <div hidden={!active} data-settings-tier={getSettingsTier(section)}>
      {active && (
        <h2 className="settings-page-title" id="settings-section-title">
          {item?.label}
        </h2>
      )}
      {section === "network" ? (
        <details className="settings-usage-guide" data-figma-node="214:703">
          <summary>
            <span>使用说明</span>
            <span className="settings-usage-guide-toggle">
              <span className="settings-usage-guide-expand">
                查看详细使用方法
              </span>
              <span className="settings-usage-guide-collapse">
                收起详细使用方法
              </span>
            </span>
          </summary>
          <p>{item?.description}</p>
        </details>
      ) : (
        item?.description && (
          <p className="settings-section-intro settings-page-description">
            {item.description}
          </p>
        )
      )}
      <div className="settings-section-body">
        {section === "extensions" ? (
          <ExtensionsSettings
            registry={registry}
            onFeedback={onFeedback}
            defaultTab={extensionsTab}
          />
        ) : (
          <ConnectionSettings
            section={section}
            active={active}
            onFeedback={onFeedback}
            initialModelMethod={initialModelMethod}
            workflows={workflows}
            activeProject={activeProject}
          />
        )}
        {section === "usage" && (
          <PlansSettings projects={projects} saveState={saveState} />
        )}
        {section === "shortcuts" && <ShortcutsPanel embedded />}
        {section === "storage" && (
          <div className="settings-detail-stack">
            <StorageOverview projects={projects} saveState={saveState} />
            <h3 className="settings-detail-label">项目备份与恢复</h3>
            <ProjectPackageActions saveState={saveState} revision={revision} />
            <PreferencesBackup
              preferences={preferences}
              onFeedback={onFeedback}
            />
          </div>
        )}
      </div>
    </div>
  );
}
