import {
  SETTINGS_NAV_GROUPS,
  type SettingsSection,
} from "./SettingsSectionData";

export default function SettingsSidebar({
  section,
  busy,
  onSelect,
}: {
  section: SettingsSection;
  busy: boolean;
  onSelect: (section: SettingsSection) => void;
}) {
  return (
    <aside className="settings-sidebar">
      <h1 id="settings-dialog-title">设置</h1>
      <nav className="settings-nav" aria-label="设置分类">
        {SETTINGS_NAV_GROUPS.map((group) => (
          <div key={group.label} className="settings-nav-group">
            <div className="settings-nav-group-label">{group.label}</div>
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
                <img
                  className="settings-nav-icon"
                  src={`/design/figma/settings-nav-${item.icon}.svg`}
                  alt=""
                  width="20"
                  height="20"
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
