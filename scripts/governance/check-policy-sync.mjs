import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const MEMORY_CONTRACT = "docs/MEMORY-CONTRACT.md";

export const REQUIRED_MEMORY_SYNC = Object.freeze({
  data: "docs/architecture/DATA-STORAGE.md",
  featureCard: "docs/features/feat-020-memory.md",
  featureRegistry: "docs/features/features.registry.json",
  governance: "docs/MEMORY-GOVERNANCE.md",
});

const MEMORY_IMPLEMENTATION =
  /^(?:src\/features\/memory\/|src-tauri\/src\/(?:main\.rs|storage_paths\.rs|.*memory))/i;
const MEMORY_TEST =
  /^(?:tests\/(?:unit|browser)\/.*memory|src-tauri\/src\/main\.rs$)/i;

/**
 * Return policy-sync violations for a git changed-path list.
 * This pure function is intentionally exported so unit tests can exercise the
 * contract without creating commits or depending on a particular repository.
 */
export function checkMemoryContractSync(changedPaths) {
  const paths = new Set(changedPaths.map((path) => path.replaceAll("\\", "/")));
  if (!paths.has(MEMORY_CONTRACT)) return [];

  const issues = [];
  for (const [label, path] of Object.entries(REQUIRED_MEMORY_SYNC)) {
    if (!paths.has(path))
      issues.push(`MEMORY-CONTRACT sync missing ${label}: ${path}`);
  }
  if (![...paths].some((path) => MEMORY_IMPLEMENTATION.test(path))) {
    issues.push(
      "MEMORY-CONTRACT sync missing relevant implementation change under src/features/memory/ or src-tauri/src/",
    );
  }
  if (![...paths].some((path) => MEMORY_TEST.test(path))) {
    issues.push(
      "MEMORY-CONTRACT sync missing relevant memory test under tests/*memory* or the Tauri memory test module",
    );
  }
  return issues;
}

function parseOption(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

export function parseArgs(args) {
  const base = parseOption(args, "--base");
  const head = parseOption(args, "--head") || "HEAD";
  if (
    !base ||
    !/^[a-f0-9]{40,64}$/i.test(base) ||
    !(head === "HEAD" || /^[a-f0-9]{40,64}$/i.test(head))
  ) {
    throw new Error(
      "Usage: node scripts/governance/check-policy-sync.mjs --base <full-base-sha> [--head <full-head-sha>]",
    );
  }
  return { base, head };
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function changedPathsAgainst(base, head = "HEAD") {
  git(["rev-parse", "--verify", `${base}^{commit}`]);
  git(["rev-parse", "--verify", `${head}^{commit}`]);
  git(["merge-base", "--is-ancestor", base, head]);
  return git([
    "diff",
    "--name-only",
    "--diff-filter=ACDMRT",
    "-z",
    `${base}...${head}`,
    "--",
  ])
    .split("\0")
    .filter(Boolean);
}

export function runPolicySync({ base, head = "HEAD" }) {
  return checkMemoryContractSync(changedPathsAgainst(base, head));
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const issues = runPolicySync(options);
    if (issues.length) {
      issues.forEach((issue) => console.error(issue));
      console.error("Policy sync: FAILED");
      process.exitCode = 1;
      return;
    }
    console.log("Policy sync: PASS");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
