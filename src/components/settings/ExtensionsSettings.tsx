import { useState } from "react";
import UiIcon from "../UiIcon";
import type { SkillRegistry } from "../../features/skills/skillRegistry";
import McpSettings from "./McpSettings";
import PluginManagerSettings from "./PluginManagerSettings";
import SkillsSettings from "./SkillsSettings";
import AgentConnectionSettings from "./AgentConnectionSettings";

export type ExtensionsTab = "plugins" | "skills" | "partners";

const EXTENSION_TABS: {
  id: ExtensionsTab;
  label: string;
  hint: string;
}[] = [
  { id: "plugins", label: "插件", hint: "MCP" },
  { id: "skills", label: "技能", hint: "Skill" },
  { id: "partners", label: "伙伴", hint: "智能体" },
];

/**
 * 设置中心合并页：插件（MCP）· 技能（Skill）· 伙伴（智能体）。
 * 左侧导航只保留一个入口，进入后右侧顶部用分段控件切换三类能力。
 */
export default function ExtensionsSettings({
  registry,
  onFeedback,
  defaultTab = "plugins",
}: {
  registry: SkillRegistry;
  onFeedback: (message: string) => void;
  defaultTab?: ExtensionsTab;
}) {
  const [tab, setTab] = useState<ExtensionsTab>(defaultTab);

  return (
    <div className="settings-extensions">
      <div
        className="settings-ext-tabs"
        role="tablist"
        aria-label="插件、技能与伙伴"
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
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
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
              {item.id === "skills" ? (
                <img
                  src="/design/figma/composer-puzzle.svg"
                  alt=""
                  width="15"
                  height="15"
                />
              ) : (
                <UiIcon
                  name={item.id === "plugins" ? "plug" : "agent"}
                  size={15}
                />
              )}
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
        {tab === "partners" && (
          <AgentConnectionSettings onFeedback={onFeedback} />
        )}
      </div>
    </div>
  );
}
