import type { SettingsPreferences } from "../../domain/settings";
import { SETTINGS_SECTIONS, type SettingsSection } from "./SettingsSectionData";
import ConnectionSettings from "./ConnectionSettings";
import ProjectPackageActions from "../../features/projects/ProjectPackageActions";
import type { SaveState } from "../../features/creation/useCreationStorage";
import type { CreationProject } from "../../features/creation/model";
import PlansSettings from "./PlansSettings";
import StorageOverview from "./StorageOverview";
import PreferencesBackup from "./PreferencesBackup";
import type { SkillRegistry } from "../../features/skills/skillRegistry";
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
  registry,
  extensionsTab,
  initialModelMethod,
  workflows,
}: SettingsSectionsProps) {
  const item = SETTINGS_SECTIONS.find((entry) => entry.id === section);
  return (
    <div hidden={!active}>
      {active && (
        <h2 className="settings-page-title" id="settings-section-title">
          {item?.label}
        </h2>
      )}
      {item?.description && (
        <p className="settings-section-intro settings-page-description">
          {item.description}
        </p>
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
