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
  offset: number;
  /** 页面标题下方的说明文案。 */
  description?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "general", label: "通用", offset: 0 },
  { id: "account", label: "账号管理", offset: 53 },
  { id: "storage", label: "储存", offset: 106 },
  { id: "network", label: "网络", offset: 159 },
  { id: "memory", label: "记忆", offset: 209 },
  {
    id: "providers",
    label: "模型供应商",
    offset: 265,
    description:
      "添加自定义提供商和模型后，可在对话中选择。自定义模型请求由本机直接发送给提供商。",
  },
  { id: "skill", label: "Skill", offset: 318 },
  { id: "mcp", label: "MCP", offset: 371 },
  { id: "comfy", label: "Comfy UI", offset: 424 },
  { id: "advanced", label: "高级", offset: 477 },
  { id: "updates", label: "软件更新", offset: 530 },
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
