export type SettingsSection =
  | "general"
  | "account"
  | "usage"
  | "shortcuts"
  | "memory"
  | "providers"
  | "extensions"
  | "network"
  | "storage"
  | "security";

export interface SettingsSectionItem {
  id: SettingsSection;
  label: string;
  icon: string;
  description?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "general", label: "通用", icon: "general" },
  { id: "account", label: "个人主页", icon: "account" },
  { id: "usage", label: "套餐与积分", icon: "account" },
  { id: "shortcuts", label: "快捷键", icon: "advanced" },
  { id: "memory", label: "记忆", icon: "memory" },
  {
    id: "providers",
    label: "模型接入",
    icon: "providers",
    description: "管理模型账号、API 与本地模型服务。",
  },
  {
    id: "extensions",
    label: "扩展",
    icon: "mcp",
    description: "管理 Skill、插件、MCP 工具和协作角色。",
  },
  { id: "network", label: "网络", icon: "network" },
  { id: "storage", label: "数据管理", icon: "storage" },
  { id: "security", label: "安全中心", icon: "advanced" },
];

export interface SettingsNavGroup {
  label: string;
  items: SettingsSectionItem[];
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  { label: "设置", items: SETTINGS_SECTIONS.slice(0, 4) },
  { label: "功能", items: SETTINGS_SECTIONS.slice(4, 8) },
  { label: "数据与安全", items: SETTINGS_SECTIONS.slice(8) },
];

export interface ResolvedSettingsRoute {
  section: SettingsSection;
  generalDetail?: "updates" | "advanced";
  extensionsTab?: "plugins" | "skills" | "partners";
  modelMethod?: "local";
}

/** Preserve public links and stored IDs while consolidating their visible pages. */
export function resolveSettingsRoute(route: string): ResolvedSettingsRoute {
  if (route === "updates" || route === "advanced")
    return { section: "general", generalDetail: route };
  if (["comfy", "comfyui", "local"].includes(route))
    return { section: "providers", modelMethod: "local" };
  if (["partners", "codex"].includes(route)) return { section: "providers" };
  if (["mcp", "plugins"].includes(route))
    return { section: "extensions", extensionsTab: "plugins" };
  if (["skill", "skills"].includes(route))
    return { section: "extensions", extensionsTab: "skills" };
  const section = SETTINGS_SECTIONS.find((item) => item.id === route)?.id;
  return { section: section ?? "general" };
}
