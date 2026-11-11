import { isEnabled } from "../../app/featureFlags.ts";

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
    description: "查看与编辑本机本地登录资料，以及本机 Token 用量看板。",
  },
  {
    id: "usage",
    label: "套餐与积分",
    icon: "account",
    description: "本地模式说明、本机用量统计与预算占位（无云端扣费）。",
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

/** Three-tier information architecture for the settings sidebar. */
export type SettingsTier = "essentials" | "advanced" | "experimental";

export const SETTINGS_TIER_LABELS: Record<SettingsTier, string> = {
  essentials: "常用",
  advanced: "高级",
  experimental: "实验",
};

export interface SettingsNavGroup {
  tier: SettingsTier;
  label: string;
  items: SettingsSectionItem[];
}

/** Resolve tier members by their real section ids; never invent a section id. */
function pickSections(...ids: SettingsSection[]): SettingsSectionItem[] {
  return ids.map((id) => {
    const item = SETTINGS_SECTIONS.find((entry) => entry.id === id);
    if (!item) throw new Error(`Unknown settings section: ${id}`);
    return item;
  });
}

/**
 * The 11 flat entries collapse into exactly three groups. Every id from
 * SETTINGS_SECTIONS appears in exactly one group.
 * The four lab panels named in the review (GatewayConsole / LocalHardware /
 * LocalWorkflow / OntologyCertification) are inner panels of the providers and
 * memory pages, not standalone section ids, so they stay where they are mounted.
 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    tier: "essentials",
    label: SETTINGS_TIER_LABELS.essentials,
    items: pickSections(
      "general",
      "providers",
      "storage",
      "updates",
      "account",
    ),
  },
  {
    tier: "advanced",
    label: SETTINGS_TIER_LABELS.advanced,
    items: pickSections("shortcuts", "memory", "extensions", "network"),
  },
  {
    tier: "experimental",
    label: SETTINGS_TIER_LABELS.experimental,
    items: pickSections("security", "usage"),
  },
];

export const DEFAULT_SETTINGS_TIER: SettingsTier = "essentials";
export const DEFAULT_SETTINGS_SECTION: SettingsSection = "general";

/** Which tier owns a section; undefined means the section is not navigable. */
export function getSettingsTier(
  section: SettingsSection,
): SettingsTier | undefined {
  return SETTINGS_NAV_GROUPS.find((group) =>
    group.items.some((item) => item.id === section),
  )?.tier;
}

function sectionVisible(id: SettingsSection): boolean {
  if (id === "account") return isEnabled("accountLocal");
  if (id === "usage") return isEnabled("creditsLocal");
  return true;
}

/** Filter nav by feature flags; local account/credits stay on by default. */
export function getVisibleSettingsNavGroups(
  groups: SettingsNavGroup[] = SETTINGS_NAV_GROUPS,
): SettingsNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => sectionVisible(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}

export interface ResolvedSettingsRoute {
  section: SettingsSection;
  generalDetail?: "updates" | "advanced";
  extensionsTab?: "plugins" | "skills" | "partners";
  modelMethod?: "local";
  unavailableNotice?: string;
}

/**
 * Legacy deep-link ids -> canonical section inside the new three-tier nav.
 * "advanced" is deliberately absent: it is still the general-detail deep link.
 */
export const LEGACY_SETTINGS_ROUTE_ALIASES: Record<string, SettingsSection> = {
  models: "providers",
  data: "storage",
  profile: "account",
  plans: "usage",
  comfy: "providers",
  comfyui: "providers",
  local: "providers",
  partners: "providers",
  codex: "providers",
  mcp: "extensions",
  plugins: "extensions",
  skill: "extensions",
  skills: "extensions",
};

function legacySection(route: string): SettingsSection {
  return LEGACY_SETTINGS_ROUTE_ALIASES[route] ?? DEFAULT_SETTINGS_SECTION;
}

/** Preserve public links and stored IDs while consolidating their visible pages. */
export function resolveSettingsRoute(route: string): ResolvedSettingsRoute {
  const normalized =
    typeof route === "string" ? route.trim().toLowerCase() : "";
  // No deep link (or a wiped stored id) always lands on the essentials tier.
  if (normalized === "" || normalized === "default" || normalized === "home")
    return { section: DEFAULT_SETTINGS_SECTION };
  if (normalized === "advanced")
    return { section: "general", generalDetail: "advanced" };
  if (normalized === "updates") return { section: "updates" };
  if (normalized === "shortcuts") return { section: "shortcuts" };
  if (normalized === "profile" || normalized === "account") {
    if (!isEnabled("accountLocal"))
      return {
        section: DEFAULT_SETTINGS_SECTION,
        unavailableNotice: "个人主页未开放（accountLocal 已关闭）。",
      };
    return { section: "account" };
  }
  if (normalized === "plans" || normalized === "usage") {
    if (!isEnabled("creditsLocal"))
      return {
        section: DEFAULT_SETTINGS_SECTION,
        unavailableNotice: "套餐与积分未开放（creditsLocal 已关闭）。",
      };
    return { section: "usage" };
  }
  if (["comfy", "comfyui", "local"].includes(normalized))
    return { section: legacySection(normalized), modelMethod: "local" };
  if (["partners", "codex"].includes(normalized))
    return { section: legacySection(normalized) };
  if (["mcp", "plugins"].includes(normalized))
    return {
      section: legacySection(normalized),
      extensionsTab: "plugins",
    };
  if (["skill", "skills"].includes(normalized))
    return {
      section: legacySection(normalized),
      extensionsTab: "skills",
    };
  const canonical = LEGACY_SETTINGS_ROUTE_ALIASES[normalized] ?? normalized;
  const section = SETTINGS_SECTIONS.find((item) => item.id === canonical)?.id;
  return { section: section ?? DEFAULT_SETTINGS_SECTION };
}
