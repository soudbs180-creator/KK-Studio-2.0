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
  "AI_RULES.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
  ".cursor/rules/project.mdc",
  ".github/CODEOWNERS",
  ".githooks/pre-push",
  "docs/engineering/BRANCH-POLICY.md",
  "docs/engineering/PROMPTING.md",
  "docs/engineering/AI-EVALS.md",
  "CONTRIBUTING.md",
  ".github/workflows/quality.yml",
  "docs/governance/PROJECT_STATE.md",
  "docs/governance/SPEC_BASELINE.md",
  "docs/governance/AI_HANDOFF.md",
])
  if (!fs.existsSync(file)) issues.push(`Missing governance source ${file}`);
for (const file of [
  "CLAUDE.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
  ".cursor/rules/project.mdc",
])
  if (fs.existsSync(file)) {
    const entry = fs.readFileSync(file, "utf8");
    if (!entry.includes("AGENTS.md") || !entry.includes("AI_RULES.md"))
      issues.push(`AI entry ${file} must route to AGENTS.md and AI_RULES.md`);
  }
if (
  !fs.readFileSync(".gitignore", "utf8").split(/\r?\n/).includes(".worktrees/")
)
  issues.push(".worktrees/ must be ignored");
const evalFile = "tests/evals/agent-contract.json";
if (!fs.existsSync(evalFile)) issues.push("Missing agent contract scenarios");
else {
  const cases = JSON.parse(fs.readFileSync(evalFile, "utf8"));
  if (
    !Array.isArray(cases) ||
    cases.length < 1 ||
    cases.some((item) =>
      ["id", "prompt", "expected", "forbidden"].some(
        (key) => typeof item[key] !== "string" || !item[key].trim(),
      ),
    ) ||
    new Set(cases.map((item) => item.id)).size !== cases.length
  )
    issues.push(
      "Agent scenarios require unique IDs, prompts, expected and forbidden behavior; this only validates structure.",
    );
}
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
// Catch the previous hard-coded output pattern before tests overwrite history.
for (const file of [...walk("tests/browser"), "playwright.config.ts"])
  if (/\.[cm]?tsx?$/.test(file)) {
    const source = fs.readFileSync(file, "utf8");
    if (/["'`]docs\/evidence\//.test(source))
      issues.push(
        `${file}: browser output must use test-results, not historical docs/evidence paths.`,
      );
  }
issues.forEach((issue) => console.error(issue));
console.log(
  `Governance: ${Array.isArray(tasks) ? tasks.length : 0} tasks, ${issues.length} violations.`,
);
process.exitCode = issues.length ? 1 : 0;
