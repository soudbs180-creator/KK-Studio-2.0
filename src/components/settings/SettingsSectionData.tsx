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
    label: "模型供应商",
    description:
      "添加自定义提供商和模型后，可在对话中选择。自定义模型请求由本机直接发送给提供商。",
  },
  {
    id: "extensions",
    label: "扩展",
    description: "统一管理插件、Skill 和伙伴智能体入口。",
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
