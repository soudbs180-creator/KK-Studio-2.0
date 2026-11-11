import { isEnabled } from "../app/featureFlags.ts";

export type WorkbenchTab =
  | "queue"
  | "prompt"
  | "generate"
  | "review"
  | "export"
  | "plan";

const CORE_WORKBENCH_TABS: WorkbenchTab[] = [
  "queue",
  "prompt",
  "generate",
  "review",
];

export type ReviewAgentCard = readonly [label: string, detail: string];

const CORE_REVIEW_AGENTS: ReviewAgentCard[] = [
  ["Prompt Compiler", "本地规则编译提示词与参数"],
  ["Reference Analyst", "五类参考用途 · 视觉分析未接入"],
  ["Generation Worker", "按连接提交批量任务"],
  ["Asset Tagger", "归档 SHA-256 与 AI 标签"],
  ["Reviewer", "人工审阅与区域评论"],
];

/** Tabs shown under current feature flags (Planner/Export default hidden). */
export function visibleWorkbenchTabs(
  env?: Record<string, string | undefined>,
): WorkbenchTab[] {
  const tabs = [...CORE_WORKBENCH_TABS];
  if (isEnabled("taskWorkbenchExport", env)) tabs.push("export");
  if (isEnabled("taskWorkbenchPlanner", env)) tabs.push("plan");
  return tabs;
}

export function resolveWorkbenchTab(
  tab: WorkbenchTab,
  env?: Record<string, string | undefined>,
): WorkbenchTab {
  const visible = visibleWorkbenchTabs(env);
  return visible.includes(tab) ? tab : "queue";
}

/** Agent cards shown under current feature flags (Planner/Compositor default hidden). */
export function visibleReviewAgents(
  env?: Record<string, string | undefined>,
): ReviewAgentCard[] {
  const agents: ReviewAgentCard[] = [];
  if (isEnabled("taskWorkbenchPlanner", env)) {
    agents.push(["Planner", "拆解目标与审批边界"]);
  }
  agents.push(...CORE_REVIEW_AGENTS);
  if (isEnabled("taskWorkbenchExport", env)) {
    agents.push(["Compositor / Exporter", "外部导出服务未接入"]);
  }
  return agents;
}
