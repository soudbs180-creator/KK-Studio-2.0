export type SettingsSection =
  | "general"
  | "account"
  | "usage"
  | "storage"
  | "network"
  | "memory"
  | "providers"
  | "skill"
  | "mcp"
  | "partners"
  | "extensions"
  | "comfy"
  | "advanced"
  | "updates";

export interface SettingsSectionItem {
  id: SettingsSection;
  label: string;
  /** 页面标题下方的说明文案。 */
  description?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "general", label: "通用" },
  { id: "account", label: "账号管理" },
  {
    id: "usage",
    label: "使用记录",
    description: "查看本机项目、成功结果和已报告的消耗。",
  },
  { id: "storage", label: "储存" },
  { id: "network", label: "网络" },
  { id: "memory", label: "记忆" },
  {
    id: "providers",
    label: "模型接入",
    description: "连接 Codex 主 Agent，或配置模型账号与 API。",
  },
  {
    id: "extensions",
    label: "扩展",
    description: "选择 Skill、MCP 工具和承担专项任务的协作伙伴。",
  },
  { id: "comfy", label: "Comfy UI" },
  { id: "advanced", label: "高级" },
  { id: "updates", label: "软件更新" },
];

export interface SettingsNavGroup {
  label: string;
  items: SettingsSectionItem[];
}

/** Stable section IDs preserve deep links; groups explain their purpose. */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "个人与外观",
    items: SETTINGS_SECTIONS.filter(({ id }) =>
      ["general", "account", "usage"].includes(id),
    ),
  },
  {
    label: "模型与工具",
    items: SETTINGS_SECTIONS.filter(({ id }) =>
      ["providers", "extensions", "comfy"].includes(id),
    ),
  },
  {
    label: "数据与隐私",
    items: SETTINGS_SECTIONS.filter(({ id }) =>
      ["storage", "network", "memory"].includes(id),
    ),
  },
  {
    label: "应用",
    items: SETTINGS_SECTIONS.filter(({ id }) =>
      ["advanced", "updates"].includes(id),
    ),
  },
];
