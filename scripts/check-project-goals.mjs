import fs from "node:fs";

const file = "docs/governance/PROJECT_GOALS.md";
const requiredHeadings = [
  "## 建设目标",
  "## 范围与非目标",
  "## 核心用户路径与完成标准",
  "## 代码与数据规范",
  "## UI 规范",
  "## 链路与状态规范",
  "## 质量与交付门禁",
  "## 当前优先级与状态口径",
  "## 假设与未决项",
];
const requiredTerms = [
  "task-ledger.json",
  "features.registry.json",
  "docs/UI_INDEX.md",
  "loading",
  "success",
  "error",
  "cancel",
  "offline",
  "unknown",
  "npm run verify",
  "DONE",
  "PARTIAL",
  "TODO",
  "BLOCKED",
];
const issues = [];

if (!fs.existsSync(file)) {
  issues.push(`Missing project goals source ${file}`);
} else {
  const content = fs.readFileSync(file, "utf8");
  for (const heading of requiredHeadings)
    if (!content.includes(heading))
      issues.push(`Project goals missing ${heading}`);
  for (const term of requiredTerms)
    if (!content.includes(term))
      issues.push(`Project goals missing required term ${term}`);
}

const ledgerFile = "docs/governance/task-ledger.json";
if (!fs.existsSync(ledgerFile)) {
  issues.push(`Missing task ledger ${ledgerFile}`);
} else {
  const tasks = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  const task = tasks.find((item) => item.id === "TASK-GOV-GOALS-001");
  if (!task) issues.push("Project goals must be tracked by TASK-GOV-GOALS-001");
  else if (task.status !== "DONE")
    issues.push(
      "TASK-GOV-GOALS-001 must be DONE after its gate is implemented",
    );
}

for (const issue of issues) console.error(issue);
console.log(`Project goals: ${issues.length ? "invalid" : "valid"}.`);
process.exitCode = issues.length ? 1 : 0;
