import fs from "node:fs";
import path from "node:path";

const DISPLAY_STATUS = new Map([
  ["DONE", "已完成"],
  ["IN_PROGRESS", "进行中"],
  ["PARTIAL", "进行中"],
  ["REVIEW", "进行中"],
  ["TODO", "未完成"],
  ["READY", "未完成"],
  ["BLOCKED", "未完成"],
  ["REGRESSION", "未完成"],
  ["OBSOLETE", "未完成"],
]);

const HIGH_PRIORITY = new Set([
  "TASK-PROV-005",
  "TASK-PROV-006",
  "TASK-WINDOWS-ENTRY-RECOVERY-003",
  "TASK-IMAGE-EDIT-VERIFY-002",
  "TASK-VERIFY-CONCURRENCY-002",
  "TASK-VERIFY-ORIGIN-003",
  "TASK-DOCS-HISTORY-001",
  "TASK-TASKSTATE-002",
]);

export function displayStatusFor(status, verificationResult) {
  if (status === "DONE") return verificationResult === "PASS" ? "已完成" : "未完成";
  return DISPLAY_STATUS.get(status) ?? "未完成";
}

function pathWithForwardSlashes(value) {
  return typeof value === "string" ? value.replaceAll("\\", "/") : value;
}

function defaultPriority(task) {
  if (HIGH_PRIORITY.has(task.id)) return "P1";
  return task.status === "DONE" ? "P3" : "P2";
}

function defaultNextAction(task) {
  if (task.nextAction) return task.nextAction;
  if (task.status === "DONE") return "保留当前证据，合并后按原验收范围回读主线";
  if (task.status === "BLOCKED") return "复核阻塞条件，解除后重新验证并保留原失败证据";
  if (task.branch === "unallocated" || task.worktree === "unallocated")
    return "补充负责人、优先级、分支和下一步验收证据";
  return "按验收条件完成实现、验证、独立审查和文档同步";
}

function ownerRoleFor(owner) {
  return {
    root: "repository-maintainer",
    MainAgent: "repository-maintainer",
    finish_figma_pages: "design-maintainer",
    finish_asset_performance: "performance-maintainer",
  }[owner] ?? (owner ? `task-owner:${owner}` : "unallocated");
}

export function normalizeTask(task, featureIds = []) {
  const normalized = {
    ...task,
    branch: task.branch === "UNASSIGNED" ? "unallocated" : pathWithForwardSlashes(task.branch),
    worktree:
      task.worktree === "UNASSIGNED"
        ? "unallocated"
        : pathWithForwardSlashes(task.worktree),
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
    evidence: Array.isArray(task.evidence) ? task.evidence : [],
    requirementRefs: Array.isArray(task.requirementRefs) && task.requirementRefs.length
      ? task.requirementRefs
      : [`ledger:${task.id}`],
    featureIds: Array.isArray(task.featureIds) ? task.featureIds : featureIds,
    priority: HIGH_PRIORITY.has(task.id) ? "P1" : task.priority || defaultPriority(task),
    priorityRationale:
      task.priorityRationale ||
      (HIGH_PRIORITY.has(task.id)
        ? "当前治理或验证阻断项"
        : task.status === "DONE"
          ? "历史已完成范围"
          : "开放任务默认待治理排序"),
    displayStatus: displayStatusFor(task.status, task.verificationResult),
    nextAction: defaultNextAction(task),
    lastVerified: task.lastVerified || task.updated,
    ownerRole:
      task.ownerRole && !["MainAgent", "finish_figma_pages", "finish_asset_performance"].includes(task.ownerRole)
        ? task.ownerRole
        : ownerRoleFor(task.owner),
  };
  if (normalized.status === "BLOCKED" && !normalized.blocker)
    normalized.blocker = "外部条件需在任务证据中明确";
  return normalized;
}

export function normalizeLedger(tasks, registry = []) {
  const featureMap = new Map();
  for (const feature of registry) {
    for (const taskId of feature.tasks ?? []) {
      const ids = featureMap.get(taskId) ?? [];
      ids.push(feature.id);
      featureMap.set(taskId, ids);
    }
  }
  return tasks.map((task) => normalizeTask(task, featureMap.get(task.id) ?? []));
}

export function writeNormalizedLedger(repoRoot = process.cwd()) {
  const ledgerPath = path.join(repoRoot, "docs/governance/task-ledger.json");
  const registryPath = path.join(repoRoot, "docs/features/features.registry.json");
  const tasks = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const normalized = normalizeLedger(tasks, registry);
  fs.writeFileSync(ledgerPath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

if (process.argv.includes("--write")) {
  const tasks = writeNormalizedLedger();
  console.log(`Normalized ${tasks.length} task records.`);
}
