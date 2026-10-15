import { useContext, useState } from "react";
import { SettingsNavigationContext } from "./SettingsNavigationContext";
import type { SkillRegistry } from "../../features/skills/skillRegistry";
import McpSettings from "./McpSettings";
import PluginManagerSettings from "./PluginManagerSettings";
import SkillsSettings from "./SkillsSettings";
import PartnerRoles from "../../features/partners/PartnerRoles";

export type ExtensionsTab = "plugins" | "skills" | "partners";

const EXTENSION_TABS: {
  id: ExtensionsTab;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    id: "skills",
    label: "Skill",
    hint: "指令",
    icon: "/design/figma/settings-nav-skills.svg",
  },
  {
    id: "plugins",
    label: "MCP",
    hint: "工具",
    icon: "/design/figma/settings-nav-mcp.svg",
  },
  {
    id: "partners",
    label: "协作伙伴",
    hint: "角色",
    icon: "/design/figma/settings-nav-account.svg",
  },
];

/**
 * Extensions describe instructions, tools and specialist roles, not model connections.
 * Skill/MCP 深链接共享同一组件，页内分段控件支持键盘切换。
 */
export default function ExtensionsSettings({
  registry,
  onFeedback,
  defaultTab = "skills",
}: {
  registry: SkillRegistry;
  onFeedback: (message: string) => void;
  defaultTab?: ExtensionsTab;
}) {
  const [tab, setTab] = useState<ExtensionsTab>(defaultTab);
  const { busy } = useContext(SettingsNavigationContext);

  return (
    <div className="settings-extensions">
      <div
        className="settings-ext-tabs"
        role="tablist"
        aria-label="Skill、MCP 与协作伙伴"
      >
        {EXTENSION_TABS.map((item, index) => {
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`settings-ext-tab-${item.id}`}
              aria-controls="settings-ext-panel"
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              className={`settings-ext-tab${tab === item.id ? " is-active" : ""}`}
              disabled={busy}
              title={busy ? "扩展操作进行中，完成后可切换" : undefined}
              onClick={() => {
                if (!busy) setTab(item.id);
              }}
              onKeyDown={(event) => {
                if (busy) return;
                const count = EXTENSION_TABS.length;
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? count - 1
                      : event.key === "ArrowRight"
                        ? (index + 1) % count
                        : event.key === "ArrowLeft"
                          ? (index + count - 1) % count
                          : -1;
                if (next < 0) return;
                event.preventDefault();
                event.stopPropagation();
                setTab(EXTENSION_TABS[next].id);
                const buttons =
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    "[role='tab']",
                  );
                buttons?.item(next)?.focus();
              }}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
              <span>{item.label}</span>
              <span className="settings-ext-tab-hint">{item.hint}</span>
            </button>
          );
        })}
      </div>

      <div
        id="settings-ext-panel"
        role="tabpanel"
        aria-labelledby={`settings-ext-tab-${tab}`}
      >
        {tab === "plugins" && (
          <div className="settings-detail-stack">
            <McpSettings onFeedback={onFeedback} />
            <h3 className="settings-detail-label">画布插件</h3>
            <p className="settings-network-activity">
              在画布「添加节点 › 插件」中使用已启用插件；下方管理画布扩展。
            </p>
            <PluginManagerSettings onFeedback={onFeedback} />
          </div>
        )}
        {tab === "skills" && <SkillsSettings registry={registry} />}
        {tab === "partners" && <PartnerRoles onStatus={onFeedback} />}
      </div>
    </div>
  );
}
