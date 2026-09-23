export type SettingsSection =
  | "general"
  | "account"
  | "storage"
  | "network"
  | "memory"
  | "providers"
  | "skills"
  | "mcp"
  | "plugins"
  | "comfy"
  | "advanced"
  | "updates";

export const SETTINGS_SECTIONS: {
  id: SettingsSection;
  label: string;
  offset: number;
}[] = [
  { id: "general", label: "通用", offset: 0 },
  { id: "account", label: "账号管理", offset: 53 },
  { id: "storage", label: "储存", offset: 104 },
  { id: "network", label: "网络", offset: 156 },
  { id: "memory", label: "记忆", offset: 209 },
  { id: "providers", label: "模型供应商", offset: 263 },
  { id: "skills", label: "Skill", offset: 318 },
  { id: "mcp", label: "MCP", offset: 373 },
  { id: "plugins", label: "插件", offset: 424 },
  { id: "comfy", label: "Comfy UI", offset: 473 },
  { id: "advanced", label: "高级", offset: 525 },
  { id: "updates", label: "软件更新", offset: 577 },
];
