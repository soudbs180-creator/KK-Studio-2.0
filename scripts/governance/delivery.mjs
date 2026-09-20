import path from "node:path";

const REQUIRED_ARTIFACTS = [
  "intent.md",
  "spec.md",
  "plan.md",
  "verification.md",
  "review.md",
];
const FORBIDDEN_DIRECTORY =
  /(^|\/)(?:\.git|node_modules|dist|target|test-results|\.tmp|\.worktrees|coverage|\.cache|\.vite|playwright-report|blob-report|artifacts|build)(\/|$)/i;
const FORBIDDEN_SECRET =
  /(^|\/)(?:\.env(?:\..*)?|id_rsa(?:\..*)?|credentials(?:\.[^/]*)?|service-account(?:\.[^/]*)?|secrets?(?:\.[^/]*)?|.*\.(?:pem|key|p12|pfx|jks|keystore|secret))$/i;
const FORBIDDEN_BINARY = /\.(?:exe|msi|dmg|pkg|appimage|deb|rpm)$/i;
const PACKAGE_NAME = /^\d{4}-\d{2}-\d{2}-[^/]+$/;

function invalidPath(file) {
  return (
    !file ||
    file.includes("\\") ||
    file.includes("\0") ||
    path.isAbsolute(file) ||
    /^[a-z]:/i.test(file) ||
    file.split("/").some((part) => part === "" || part === "." || part === "..")
  );
}

function forbiddenPath(file) {
  if (FORBIDDEN_DIRECTORY.test(file) || FORBIDDEN_BINARY.test(file))
    return true;
  return FORBIDDEN_SECRET.test(file) && !/(^|\/)\.env\.example$/i.test(file);
}

export function checkDeliveryFiles(
  changed,
  exists,
  baseExists = () => false,
  { headLedger, baseLedger, branch } = {},
) {
  const issues = [];
  const normalized = [...new Set(changed)];
  for (const file of normalized)
    if (invalidPath(file)) issues.push(`Invalid delivery path: ${file}`);
  const packages = [
    ...new Set(
      normalized
        .map((file) => file.match(/^docs\/changes\/([^/]+)\//)?.[1])
        .filter(Boolean),
    ),
  ];
  if (!packages.length)
    issues.push("Change requires a dated docs/changes package.");
  for (const name of packages)
    if (!PACKAGE_NAME.test(name))
      issues.push(
        `Invalid change package name: ${name}. Use YYYY-MM-DD-<slug>.`,
      );
  const newPackages = packages.filter(
    (name) => !baseExists(`docs/changes/${name}`),
  );
  if (!newPackages.length)
    issues.push(
      "Every delivery must add a new dated change package; historical packages cannot be the sole review evidence.",
    );
  for (const name of packages) {
    const prefix = `docs/changes/${name}/`;
    const isNew = newPackages.includes(name);
    if (isNew) {
      for (const requiredUpdate of REQUIRED_ARTIFACTS)
        if (!normalized.includes(`${prefix}${requiredUpdate}`))
          issues.push(`New change package ${name} must add ${requiredUpdate}.`);
    }
    if (isNew) {
      const missing = REQUIRED_ARTIFACTS.filter(
        (file) => !exists(`${prefix}${file}`),
      );
      if (missing.length)
        issues.push(
          `Change package ${name} is incomplete at HEAD; missing: ${missing.join(", ")}.`,
        );
    }
  }
  if (headLedger && baseLedger) {
    const headTasks = Array.isArray(headLedger) ? headLedger : headLedger.tasks;
    const baseTasks = Array.isArray(baseLedger) ? baseLedger : baseLedger.tasks;
    const previous = new Map(
      (Array.isArray(baseTasks) ? baseTasks : []).map((task) => [
        task.id,
        JSON.stringify(task),
      ]),
    );
    for (const name of newPackages) {
      const evidence = `docs/changes/${name}/verification.md`;
      const bound = (Array.isArray(headTasks) ? headTasks : []).some((task) => {
        if (!task || !task.id || previous.get(task.id) === JSON.stringify(task))
          return false;
        if (!Array.isArray(task.evidence) || !task.evidence.includes(evidence))
          return false;
        return !branch || task.branch === branch;
      });
      if (!bound)
        issues.push(
          `New change package ${name} must be bound to a changed task-ledger record${branch ? ` on branch ${branch}` : ""}.`,
        );
    }
  } else if (headLedger || baseLedger) {
    issues.push(
      "Cannot compare the authoritative task ledger at base and HEAD.",
    );
  }
  if (!normalized.includes("docs/PROGRESS.md") || !exists("docs/PROGRESS.md"))
    issues.push("Update docs/PROGRESS.md.");
  if (
    !normalized.includes("docs/governance/task-ledger.json") ||
    !exists("docs/governance/task-ledger.json")
  )
    issues.push("Update the authoritative task ledger.");
  for (const file of normalized) {
    if (!exists(file)) continue;
    if (forbiddenPath(file)) issues.push(`Forbidden delivery path: ${file}`);
    if (
      /(^|\/)(pnpm-lock\.yaml|pnpm-workspace\.yaml|yarn\.lock|bun\.lockb?)$/i.test(
        file,
      )
    )
      issues.push(`Only package-lock.json is supported: ${file}`);
  }
  return issues;
}
