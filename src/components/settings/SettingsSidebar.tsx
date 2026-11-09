import UiIcon, { type UiIconName } from "../UiIcon";
import {
  SETTINGS_TIER_LABELS,
  getVisibleSettingsNavGroups,
  type SettingsSection,
} from "./SettingsSectionData";

const SECTION_ICONS: Record<SettingsSection, UiIconName> = {
  general: "settings",
  shortcuts: "keyboard",
  updates: "refresh-cw",
  account: "user-round",
  usage: "wallet-cards",
  providers: "plug",
  memory: "brain",
  extensions: "puzzle",
  network: "globe",
  storage: "database",
  security: "shield-check",
};

export default function SettingsSidebar({
  section,
  busy,
  onSelect,
}: {
  section: SettingsSection;
  busy: boolean;
  onSelect: (section: SettingsSection) => void;
}) {
  const groups = getVisibleSettingsNavGroups();
  return (
    <aside className="settings-sidebar">
      <h1 id="settings-dialog-title">设置</h1>
      <nav className="settings-nav" aria-label="设置分类">
        {groups.map((group) => (
          <div
            key={group.tier}
            className="settings-nav-group"
            data-settings-tier={group.tier}
          >
            {group.label && (
              <div className="settings-nav-group-label">
                {SETTINGS_TIER_LABELS[group.tier]}
              </div>
            )}
            {group.items.map((item) => (
              <button
                key={item.id}
                data-section-id={item.id}
                type="button"
                className={`settings-nav-item${section === item.id ? " is-active" : ""}`}
                aria-current={section === item.id ? "page" : undefined}
                disabled={busy}
                title={busy ? "连接操作进行中，完成后可切换设置" : undefined}
                onClick={() => onSelect(item.id)}
              >
                <span className="settings-nav-icon">
                  <UiIcon name={SECTION_ICONS[item.id]} size={16} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
