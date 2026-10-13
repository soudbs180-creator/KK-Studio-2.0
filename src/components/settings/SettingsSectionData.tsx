export type SettingsSection =
  | "general"
  | "account"
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

/** Desktop is a continuous rail; the same list becomes the mobile bottom slider. */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "设置",
    items: SETTINGS_SECTIONS,
  },
];
