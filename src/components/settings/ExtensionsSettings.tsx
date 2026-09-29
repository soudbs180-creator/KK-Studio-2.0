import { useState } from "react";
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
  icon: string;
}[] = [
  {
    id: "plugins",
    label: "插件",
    hint: "MCP",
    icon: "/design/figma/settings-nav-mcp.svg",
  },
  {
    id: "skills",
    label: "技能",
    hint: "Skill",
    icon: "/design/figma/settings-nav-skills.svg",
  },
  {
    id: "partners",
    label: "伙伴",
    hint: "智能体",
    icon: "/design/figma/settings-nav-account.svg",
  },
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
        {EXTENSION_TABS.map((item) => {
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`settings-ext-tab${tab === item.id ? " is-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <img src={item.icon} alt="" aria-hidden="true" />
              <span>{item.label}</span>
              <span className="settings-ext-tab-hint">{item.hint}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
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
