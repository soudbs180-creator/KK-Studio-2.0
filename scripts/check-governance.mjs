import fs from "node:fs";
import path from "node:path";
import { validateLedger, renderLedger } from "./governance/ledger.mjs";
import { checkImportBoundaries } from "./governance/import-boundaries.mjs";

const issues = [];
const root = process.cwd();
for (const file of [
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
])
  if (fs.existsSync(file))
    issues.push(`Only npm/package-lock.json is supported; disposition ${file}`);
for (const file of [
  "AGENTS.md",
  "CONTRIBUTING.md",
  ".github/workflows/quality.yml",
  "docs/governance/PROJECT_STATE.md",
  "docs/governance/SPEC_BASELINE.md",
  "docs/governance/AI_HANDOFF.md",
])
  if (!fs.existsSync(file)) issues.push(`Missing governance source ${file}`);
if (
  !fs.readFileSync(".gitignore", "utf8").split(/\r?\n/).includes(".worktrees/")
)
  issues.push(".worktrees/ must be ignored");
const tasks = JSON.parse(
  fs.readFileSync("docs/governance/task-ledger.json", "utf8"),
);
issues.push(...validateLedger(tasks));
if (!issues.length) {
  const output = renderLedger(tasks);
  const file = "docs/governance/TASK_LEDGER.md";
  if (process.argv.includes("--write")) fs.writeFileSync(file, output);
  else if (
    !fs.existsSync(file) ||
    fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n") !== output
  )
    issues.push("Stale task view: run npm run governance:write");
  for (const task of tasks)
    for (const file of task.evidence)
      if (!fs.existsSync(file))
        issues.push(`${task.id}: missing evidence ${file}`);
}

// Parse imports/re-exports/dynamic imports so multiline formatting cannot evade boundaries.
function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
for (const file of walk("src").filter((name) => /\.tsx?$/.test(name)))
  issues.push(
    ...checkImportBoundaries(file, fs.readFileSync(file, "utf8"), root),
  );
issues.forEach((issue) => console.error(issue));
console.log(
  `Governance: ${Array.isArray(tasks) ? tasks.length : 0} tasks, ${issues.length} violations.`,
);
process.exitCode = issues.length ? 1 : 0;
