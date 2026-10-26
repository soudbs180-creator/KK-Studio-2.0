export type SettingsSection =
  | "general"
  | "shortcuts"
  | "updates"
  | "account"
  | "usage"
  | "providers"
  | "memory"
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
  {
    id: "general",
    label: "通用设置",
    icon: "general",
    description: "应用显示语言、主题外观、强调色与基础偏好设置。",
  },
  {
    id: "shortcuts",
    label: "快捷键管理",
    icon: "advanced",
    description: "浏览常用快捷键、录入自定义组合键与防冲突校验。",
  },
  {
    id: "updates",
    label: "软件更新",
    icon: "updates",
    description: "检查新版本、浏览发布更新日志与自动升级偏好。",
  },
  {
    id: "account",
    label: "个人主页",
    icon: "account",
    description: "查看账号信息与模型 Token 用量看板。",
  },
  {
    id: "usage",
    label: "套餐与积分",
    icon: "account",
    description: "查看当前模式、积分与账单明细。",
  },
  {
    id: "providers",
    label: "模型接入",
    icon: "providers",
    description: "管理官方 API、中转站、CLI 与本地模型。",
  },
  {
    id: "memory",
    label: "记忆管理",
    icon: "memory",
    description: "管理应用智能上下文与持久记忆。",
  },
  {
    id: "extensions",
    label: "扩展与 MCP",
    icon: "mcp",
    description: "管理 Skill、插件与外部 MCP 工具。",
  },
  {
    id: "network",
    label: "网络与代理",
    icon: "network",
    description: "配置网络代理与本地伴随服务。",
  },
  {
    id: "storage",
    label: "数据管理",
    icon: "storage",
    description: "本地数据存储、原件管理与项目备份恢复。",
  },
  {
    id: "security",
    label: "安全中心",
    icon: "advanced",
    description: "系统凭据库、密钥隔离与环境安全性。",
  },
];

export interface SettingsNavGroup {
  label: string;
  items: SettingsSectionItem[];
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: "软件系统",
    items: [SETTINGS_SECTIONS[0], SETTINGS_SECTIONS[1], SETTINGS_SECTIONS[2]],
  },
  {
    label: "账号与用量",
    items: [SETTINGS_SECTIONS[3], SETTINGS_SECTIONS[4]],
  },
  {
    label: "核心功能",
    items: [
      SETTINGS_SECTIONS[5],
      SETTINGS_SECTIONS[6],
      SETTINGS_SECTIONS[7],
      SETTINGS_SECTIONS[8],
    ],
  },
  {
    label: "安全与数据",
    items: [SETTINGS_SECTIONS[9], SETTINGS_SECTIONS[10]],
  },
];

export interface ResolvedSettingsRoute {
  section: SettingsSection;
  generalDetail?: "updates" | "advanced";
  extensionsTab?: "plugins" | "skills" | "partners";
  modelMethod?: "local";
}

/** Preserve public links and stored IDs while consolidating their visible pages. */
export function resolveSettingsRoute(route: string): ResolvedSettingsRoute {
  if (route === "updates") return { section: "updates" };
  if (route === "shortcuts") return { section: "shortcuts" };
  if (route === "advanced")
    return { section: "general", generalDetail: "advanced" };
  if (route === "profile") return { section: "account" };
  if (route === "plans") return { section: "usage" };
  if (route === "models") return { section: "providers" };
  if (route === "data") return { section: "storage" };
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
