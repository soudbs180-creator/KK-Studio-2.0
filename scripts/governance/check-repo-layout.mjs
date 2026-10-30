import fs from "node:fs";
import path from "node:path";
import { git } from "./diff-scope.mjs";

const baselineFile = "config/repo-layout-baseline.json";
const rulesFile = "config/repo-layout-rules.json";

export function collectLayoutViolations(entries, rootFiles) {
  if (
    !Array.isArray(rootFiles) ||
    rootFiles.some((file) => typeof file !== "string" || /[/\\]/.test(file)) ||
    new Set(rootFiles).size !== rootFiles.length
  )
    throw new Error("Invalid repo layout root whitelist");
  const violations = {};
  for (const { file, size } of entries) {
    if (!file.includes("/") && !rootFiles.includes(file))
      violations[`ROOT:${file}`] = 0;
    if (/\.(log|gz|webm|tsbuildinfo|bak|orig|tmp)$/i.test(file))
      violations[`TYPE:${file}`] = 0;
    if (
      file.startsWith("docs/") &&
      /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)$/i.test(file) &&
      size > 200 * 1024
    )
      violations[`IMAGE:${file}`] = size;
    if (
      (/\.test\.ts$/.test(file) && !/^(tests|mobile\/tests)\//.test(file)) ||
      (/\.md$/i.test(file) &&
        !file.startsWith("docs/") &&
        !rootFiles.includes(file) &&
        !/^vendor\/[^/]+\/UPSTREAM\.md$/.test(file)) ||
      /^src\/.*\.(bak|old|orig)$/i.test(file)
    )
      violations[`LOCATION:${file}`] = 0;
    if (/[^\x21-\x7e]/.test(file)) violations[`NAME:${file}`] = 0;
  }
  return Object.fromEntries(
    Object.entries(violations).sort(([a], [b]) => a.localeCompare(b, "en")),
  );
}

function validateViolations(violations) {
  if (
    !violations ||
    typeof violations !== "object" ||
    Array.isArray(violations) ||
    Object.entries(violations).some(
      ([key, size]) =>
        !/^(ROOT|TYPE|IMAGE|LOCATION|NAME):.+$/s.test(key) ||
        !Number.isSafeInteger(size) ||
        size < 0 ||
        (!key.startsWith("IMAGE:") && size !== 0),
    )
  )
    throw new Error("Invalid repo layout violation baseline");
}

export function compareLayoutViolations(current, baseline, previous) {
  for (const value of [current, baseline, previous]) validateViolations(value);
  const issues = [];
  const reductions = [];
  for (const [key, size] of Object.entries(current))
    if (!Object.hasOwn(baseline, key) || size > baseline[key])
      issues.push(
        `${key}: new/growing layout violation; move evidence to container output and register a manifest`,
      );
  for (const [key, size] of Object.entries(baseline)) {
    if (!Object.hasOwn(previous, key) || size > previous[key])
      issues.push(`Layout baseline cannot grow: ${key}`);
    if (!Object.hasOwn(current, key) || current[key] < size)
      reductions.push(key);
  }
  return { issues, reductions };
}

export function revisionLayoutEntries(root, revision) {
  return git(root, ["ls-tree", "-r", "-l", "-z", revision])
    .split("\0")
    .filter(Boolean)
    .flatMap((entry) => {
      const tab = entry.indexOf("\t");
      const header = entry.slice(0, tab);
      if (/^\d+ commit /.test(header)) return [];
      const match = /^\d+ blob [a-f0-9]+ +(\d+)$/.exec(header);
      if (!match) throw new Error("Cannot parse Git tree for repo layout");
      return [{ file: entry.slice(tab + 1), size: Number(match[1]) }];
    });
}

export function checkRepoLayout(root, { baseRef } = {}) {
  baseRef ??= process.env.GOVERNANCE_BASE || "main";
  const baseSha = git(root, [
    "rev-parse",
    "--verify",
    `${baseRef}^{commit}`,
  ]).trim();
  const rules = JSON.parse(fs.readFileSync(path.join(root, rulesFile), "utf8"));
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, baselineFile), "utf8"),
  );
  if (rules.version !== 1 || baseline.version !== 1)
    throw new Error("Unsupported repo layout configuration version");
  let previous;
  if (
    git(root, ["ls-tree", "--name-only", baseSha, "--", baselineFile]).trim()
  ) {
    const previousFile = JSON.parse(
      git(root, ["show", `${baseSha}:${baselineFile}`]),
    );
    if (previousFile.version !== 1 || baseline.commit !== previousFile.commit)
      throw new Error("Repo layout baseline provenance cannot change");
    previous = previousFile.violations;
  } else {
    if (baseline.commit !== baseSha)
      throw new Error("Initial repo layout baseline must match the Git base");
    previous = collectLayoutViolations(
      revisionLayoutEntries(root, baseSha),
      rules.rootFiles,
    );
  }
  const files = new Set(
    git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
      .split("\0")
      .filter(Boolean),
  );
  const entries = [];
  for (const file of files) {
    try {
      const stat = fs.lstatSync(path.join(root, file));
      if (!stat.isDirectory()) entries.push({ file, size: stat.size });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const current = collectLayoutViolations(entries, rules.rootFiles);
  return {
    ...compareLayoutViolations(current, baseline.violations, previous),
    current,
    baseSha,
  };
}
