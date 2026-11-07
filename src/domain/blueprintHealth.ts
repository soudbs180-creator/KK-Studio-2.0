/** Floorplan drill-down, audience view, recent-work mark and health findings. */

export type BlueprintAudience = "plain" | "developer";

export interface BlueprintModule {
  id: string;
  title: string;
  summary: string;
  developer: string;
  parentId?: string;
  collapsed?: boolean;
  recentReason?: string;
  exposesSecret?: boolean;
  authenticated?: boolean;
  connected?: boolean;
}

export interface BlueprintFinding {
  id: string;
  moduleId: string;
  kind: "secret" | "auth" | "orphan";
  message: string;
  repairPrompt: string;
}

export function visibleModules(
  modules: readonly BlueprintModule[],
): BlueprintModule[] {
  const collapsed = new Set(
    modules.filter((module) => module.collapsed).map((module) => module.id),
  );
  return modules.filter((module) => {
    let parent = module.parentId;
    while (parent) {
      if (collapsed.has(parent)) return false;
      parent = modules.find((item) => item.id === parent)?.parentId;
    }
    return true;
  });
}

export function toggleModule(
  modules: readonly BlueprintModule[],
  id: string,
): BlueprintModule[] {
  return modules.map((module) =>
    module.id === id ? { ...module, collapsed: !module.collapsed } : module,
  );
}

export function moduleCopy(
  module: BlueprintModule,
  audience: BlueprintAudience,
): string {
  return audience === "developer" ? module.developer : module.summary;
}

export function blueprintHealth(
  modules: readonly BlueprintModule[],
): BlueprintFinding[] {
  const findings: BlueprintFinding[] = [];
  for (const module of modules) {
    if (module.exposesSecret)
      findings.push({
        id: `${module.id}:secret`,
        moduleId: module.id,
        kind: "secret",
        message: `${module.title} 的说明里出现了密钥`,
        repairPrompt: `移除 ${module.title} 中的明文密钥，改为凭证引用。`,
      });
    if (module.authenticated === false)
      findings.push({
        id: `${module.id}:auth`,
        moduleId: module.id,
        kind: "auth",
        message: `${module.title} 缺少鉴权`,
        repairPrompt: `为 ${module.title} 补上鉴权，未授权请求必须失败。`,
      });
    if (module.connected === false)
      findings.push({
        id: `${module.id}:orphan`,
        moduleId: module.id,
        kind: "orphan",
        message: `${module.title} 没有连接`,
        repairPrompt: `把 ${module.title} 连到它的上游或下游，或说明它为什么独立存在。`,
      });
  }
  return findings;
}

export interface BlueprintWalkStep {
  id: string;
  index: number;
  title: string;
  reason: string;
}

/** Match a question against module titles, summaries and developer notes. */
export function askTheMap(
  modules: readonly BlueprintModule[],
  query: string,
): BlueprintWalkStep[] {
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1);
  if (!words.length) return [];
  return modules
    .filter((module) => {
      const haystack =
        `${module.title} ${module.summary} ${module.developer}`.toLowerCase();
      return words.some((word) => haystack.includes(word));
    })
    .slice(0, 8)
    .map((module, index) => ({
      id: module.id,
      index: index + 1,
      title: module.title,
      reason: module.summary,
    }));
}
