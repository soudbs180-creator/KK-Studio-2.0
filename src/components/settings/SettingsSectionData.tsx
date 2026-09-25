export type SettingsSection =
  | "general"
  | "account"
  | "storage"
  | "network"
  | "memory"
  | "providers"
  | "extensions"
  | "comfy"
  | "advanced"
  | "updates";

export interface SettingsSectionItem {
  id: SettingsSection;
  label: string;
  offset: number;
  /** 页面标题下方的说明文案，参考图二「模型接入」样式。 */
  description?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "general", label: "通用", offset: 0 },
  { id: "account", label: "账号管理", offset: 53 },
  {
    id: "providers",
    label: "模型接入",
    offset: 263,
    description:
      "添加自定义提供商和模型后，可在对话中选择。自定义模型请求由本机直接发送给提供商。",
  },
  {
    id: "extensions",
    label: "插件·技能·伙伴",
    offset: 318,
    description:
      "插件（MCP）连接外部工具，技能（Skill）提供指令模板，伙伴（智能体）负责执行与操作画布。",
  },
  { id: "memory", label: "记忆", offset: 209 },
  { id: "comfy", label: "Comfy UI", offset: 373 },
  { id: "storage", label: "储存", offset: 104 },
  { id: "network", label: "网络", offset: 156 },
  { id: "advanced", label: "高级", offset: 424 },
  { id: "updates", label: "软件更新", offset: 476 },
];

export interface SettingsNavGroup {
  label: string;
  items: SettingsSectionItem[];
}

/** 侧栏分组，参考竞品设置：按 设置 / 功能 / 数据与安全 / 系统 归类。 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "设置",
    items: SETTINGS_SECTIONS.filter((s) =>
      ["general", "account"].includes(s.id),
    ),
  },
  {
    label: "功能",
    items: SETTINGS_SECTIONS.filter((s) =>
      ["providers", "extensions", "comfy", "memory"].includes(s.id),
    ),
  },
  {
    label: "数据与安全",
    items: SETTINGS_SECTIONS.filter((s) =>
      ["storage", "network"].includes(s.id),
    ),
  },
  {
    label: "系统",
    items: SETTINGS_SECTIONS.filter((s) =>
      ["advanced", "updates"].includes(s.id),
    ),
  },
];
