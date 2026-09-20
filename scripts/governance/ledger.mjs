import path from "node:path";

export const statuses = new Set([
  "TODO",
  "READY",
  "IN_PROGRESS",
  "PARTIAL",
  "REVIEW",
  "BLOCKED",
  "DONE",
  "REGRESSION",
  "OBSOLETE",
]);

export function validateLedger(tasks) {
  const issues = [];
  if (!Array.isArray(tasks)) return ["Task ledger must be an array"];
  const ids = new Set();
  const activeWorktrees = new Map();
  const activeBranches = new Map();
  for (const task of tasks) {
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      issues.push("Invalid task record");
      continue;
    }
    for (const key of [
      "id",
      "title",
      "goal",
      "scope",
      "owner",
      "branch",
      "worktree",
      "updated",
      "status",
      "verification",
    ])
      if (typeof task[key] !== "string" || !task[key].trim())
        issues.push(`${task.id ?? "?"}: missing ${key}`);
    for (const key of [
      "acceptance",
      "dependencies",
      "affectedModules",
      "evidence",
    ])
      if (
        !Array.isArray(task[key]) ||
        task[key].some((value) => typeof value !== "string" || !value.trim())
      )
        issues.push(`${task.id}: invalid ${key}`);
    if (ids.has(task.id)) issues.push(`Duplicate task ${task.id}`);
    ids.add(task.id);
    if (!statuses.has(task.status)) issues.push(`${task.id}: unknown status`);
    if (
      !["PASS", "FAIL", "PARTIAL", "NOT_VERIFIED"].includes(
        task.verificationResult,
      )
    )
      issues.push(`${task.id}: invalid verification result`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.updated ?? ""))
      issues.push(`${task.id}: invalid update date`);
    if (!task.acceptance?.length || !task.affectedModules?.length)
      issues.push(`${task.id}: missing acceptance/modules`);
    if (
      task.status === "DONE" &&
      (task.verificationResult !== "PASS" ||
        !task.evidence?.length ||
        /\b(?:FAIL(?:ED)?|NOT VERIFIED|pending|BLOCKED|PARTIAL)\b/i.test(
          task.verification ?? "",
        ))
    )
      issues.push(`${task.id}: DONE requires verification evidence`);
    if (
      task.status === "BLOCKED" &&
      (typeof task.blocker !== "string" || !task.blocker.trim())
    )
      issues.push(`${task.id}: BLOCKED requires external condition`);
    if (
      ["IN_PROGRESS", "REVIEW"].includes(task.status) &&
      (task.branch === "unallocated" || task.worktree === "unallocated")
    )
      issues.push(`${task.id}: active task requires branch/worktree`);
    if (
      ["IN_PROGRESS", "REVIEW"].includes(task.status) &&
      typeof task.worktree === "string" &&
      task.worktree !== "unallocated"
    ) {
      const portablePath = task.worktree.replaceAll("\\", "/");
      const windowsPath =
        /^[a-z]:\//i.test(portablePath) || portablePath.startsWith("//");
      if (!windowsPath && !path.posix.isAbsolute(portablePath))
        issues.push(`${task.id}: active worktree must be an absolute path`);
      const worktree = windowsPath
        ? path.win32
            .normalize(portablePath)
            .replaceAll("\\", "/")
            .replace(/\/+$/, "")
            .toLowerCase()
        : path.posix.normalize(portablePath).replace(/\/+$/, "");
      if (activeWorktrees.has(worktree))
        issues.push(
          `${task.id}: active worktree conflicts with ${activeWorktrees.get(worktree)}`,
        );
      activeWorktrees.set(worktree, task.id);
      if (activeBranches.has(task.branch))
        issues.push(
          `${task.id}: active branch conflicts with ${activeBranches.get(task.branch)}`,
        );
      activeBranches.set(task.branch, task.id);
    }
  }
  if (issues.length) return issues;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set();
  function visit(id, stack = new Set()) {
    if (stack.has(id)) {
      issues.push(`Dependency cycle at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    const task = byId.get(id);
    if (!task) {
      issues.push(`Missing dependency ${id}`);
      return;
    }
    const next = new Set(stack).add(id);
    task.dependencies.forEach((dep) => visit(dep, next));
    visited.add(id);
  }
  tasks.forEach((task) => visit(task.id));
  return issues;
}

export function renderLedger(tasks) {
  const cell = (value) =>
    String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "# Task ledger",
    "",
    "Generated from `task-ledger.json` by `npm run governance:write`; do not edit this view directly.",
    "",
    "Historical DONE applies only to the linked verification scope. The full-project objective remains open until every applicable task and integration gate is verified.",
    "",
    "| ID | Title | Status | Dependencies | Owner |",
    "| --- | --- | --- | --- | --- |",
    ...tasks.map(
      (task) =>
        `| ${[task.id, task.title, task.status, task.dependencies.join(", ") || "none", task.owner].map(cell).join(" | ")} |`,
    ),
    "",
    ...tasks.flatMap((task) => [
      `## ${task.id} — ${task.title}`,
      "",
      `- Goal: ${task.goal}`,
      `- Scope: ${task.scope}`,
      `- Acceptance: ${task.acceptance.join("; ")}`,
      `- Branch: \`${task.branch}\``,
      `- Worktree: \`${task.worktree}\``,
      `- Modules: ${task.affectedModules.join(", ")}`,
      `- Verification: ${task.verificationResult} — ${task.verification}`,
      `- Evidence: ${task.evidence.length ? task.evidence.map((file) => `[${file}](../../${file})`).join(", ") : "NOT VERIFIED"}`,
      ...(task.blocker ? [`- External condition: ${task.blocker}`] : []),
      `- Updated: ${task.updated}`,
      "",
    ]),
  ].join("\n");
}
