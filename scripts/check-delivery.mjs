import { execFileSync } from "node:child_process";
import { checkDeliveryFiles } from "./governance/delivery.mjs";

const args = process.argv.slice(2);
const option = (name) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const base = option("--base");
const head = option("--head") || "HEAD";
const branch = option("--branch") || process.env.HEAD_BRANCH;
if (
  !base ||
  !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(base) ||
  !(head === "HEAD" || /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(head))
) {
  console.error(
    "Usage: node scripts/check-delivery.mjs --base <full SHA> [--head <full SHA>] [--branch <task branch>]",
  );
  process.exit(1);
}
const git = (argv) =>
  execFileSync("git", argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  git(["rev-parse", "--verify", `${base}^{commit}`]);
  git(["rev-parse", "--verify", `${head}^{commit}`]);
  git(["merge-base", "--is-ancestor", base, head]);
  const changed = git([
    "diff",
    "--name-only",
    "--diff-filter=ACDMRT",
    "-z",
    `${base}...${head}`,
    "--",
  ])
    .split("\0")
    .filter(Boolean);
  let headLedger;
  let baseLedger;
  let ledgerError;
  try {
    headLedger = JSON.parse(
      git(["show", `${head}:docs/governance/task-ledger.json`]).trim(),
    );
    baseLedger = JSON.parse(
      git(["show", `${base}:docs/governance/task-ledger.json`]).trim(),
    );
    if (!Array.isArray(headLedger) || !Array.isArray(baseLedger))
      throw new Error("Task ledger must be a top-level array.");
  } catch {
    ledgerError = "Cannot read task ledger at both base and HEAD.";
  }
  const issues = checkDeliveryFiles(
    changed,
    (file) => {
      try {
        git(["cat-file", "-e", `${head}:${file}`]);
        return true;
      } catch {
        return false;
      }
    },
    (file) => {
      try {
        git(["cat-file", "-e", `${base}:${file}`]);
        return true;
      } catch {
        return false;
      }
    },
    { headLedger, baseLedger, branch },
  );
  if (ledgerError) issues.push(ledgerError);
  issues.forEach((issue) => console.error(issue));
  console.log(
    `Delivery: ${changed.length} files; ${issues.length} violations. Structure only; not proof of review quality.`,
  );
  process.exitCode = issues.length ? 1 : 0;
} catch {
  console.error(
    "Cannot resolve delivery revisions. Fetch full history and use current PR base/head SHA.",
  );
  process.exitCode = 1;
}
