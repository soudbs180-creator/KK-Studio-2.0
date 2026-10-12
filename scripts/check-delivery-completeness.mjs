import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  checkChangedPackages,
  LEGACY_EXEMPT_MARKER,
} from "./governance/delivery-completeness.mjs";

const root = process.cwd();
const governanceBase = process.env.GOVERNANCE_BASE || "origin/main";
const issues = [];

let baseSha;
try {
  baseSha = execFileSync(
    "git",
    ["rev-parse", "--verify", `${governanceBase}^{commit}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
} catch {
  console.error(
    `Cannot resolve governance baseline ${governanceBase}. Fetch the required base commit and retry; do not change existing tests to resolve this error.`,
  );
  process.exit(1);
}

let changedPaths = [];
try {
  changedPaths = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--diff-filter=ACDMRT",
      "-z",
      `${baseSha}...HEAD`,
      "--",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  )
    .split("\0")
    .filter(Boolean);
} catch {
  issues.push(`Cannot inspect diff against ${governanceBase}`);
}

const fileExists = (relative) => fs.existsSync(path.join(root, relative));

// 历史遗留包允许显式标注 legacy-incomplete 后保留缺件，不追溯失败。
const isExempt = (packageDir) => {
  const full = path.join(root, packageDir);
  if (!fs.existsSync(full)) return false;
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .some((entry) =>
      fs
        .readFileSync(path.join(full, entry.name), "utf8")
        .includes(LEGACY_EXEMPT_MARKER),
    );
};

issues.push(...checkChangedPackages(changedPaths, fileExists, isExempt));

issues.forEach((issue) => console.error(issue));
console.log(
  `Delivery completeness: ${changedPaths.length} changed paths vs ${governanceBase}, ${issues.length} violations. Historical packages are not retro-failed; annotate ${LEGACY_EXEMPT_MARKER} to keep an incomplete package.`,
);
process.exitCode = issues.length ? 1 : 0;
