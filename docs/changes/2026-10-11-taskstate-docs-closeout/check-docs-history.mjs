import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { checkMarkdownLinks } from "../../../scripts/governance/markdown-links.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../../..");
const sourceCommits = {
  "docs/changes/2026-09-23-input-contract/verification.md":
    "b45c5bc7a180c641dbcc3d127d1106f05174df12",
  "docs/evidence/navigation-review-2026-09-07/review.md":
    "a9db71b342a53f0bb1929f95180396648c09afef",
  "docs/evidence/replan-2026-09-07/review.md":
    "a9db71b342a53f0bb1929f95180396648c09afef",
};
const defaultSourceCommit = "a9db71b342a53f0bb1929f95180396648c09afef";
const archiveFiles = [
  "docs/archive/progress-before-consolidation-2026-09-09.md",
  "docs/archive/progress-before-consolidation-latest.md",
];
const uiFile = "docs/changes/2026-09-16-ui-system-audit/audit.md";
const logFiles = [
  "docs/changes/2026-09-23-input-contract/verification.md",
  "docs/evidence/navigation-review-2026-09-07/review.md",
  "docs/evidence/replan-2026-09-07/review.md",
];
const sourceFiles = [...archiveFiles, uiFile, ...logFiles];
const tracked = new Set(
  execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean),
);
const markdown = unified().use(remarkParse).use(remarkGfm);
const rows = [];
const knownMissing = new Set();

function targets(source) {
  const result = [];
  function visit(node) {
    if (["link", "image", "definition"].includes(node.type))
      result.push({ target: node.url, line: node.position.start.line });
    for (const child of node.children ?? []) visit(child);
  }
  visit(markdown.parse(source));
  return result;
}

for (const file of sourceFiles) {
  const sourceCommit = sourceCommits[file] ?? defaultSourceCommit;
  const original = execFileSync("git", ["show", `${sourceCommit}:${file}`], {
    cwd: root,
    encoding: "utf8",
  }).replaceAll("\r\n", "\n");
  const current = fs
    .readFileSync(path.join(root, file), "utf8")
    .replaceAll("\r\n", "\n");
  let expected = original;
  if (archiveFiles.includes(file))
    expected = original.replaceAll(
      "](evidence/release-2026-09-09/",
      "](../evidence/release-2026-09-09/",
    );
  if (file === uiFile)
    expected = original.replace(
      /\[([^\]]+)\]\((\.\.\/\.\.\/\.\.\/(?:src|scripts)\/[^)]+):(\d+)\)/g,
      "[$1]($2)（历史行号 $3）",
    );
  assert.equal(
    current,
    expected,
    `${file}: historical prose or results changed beyond the approved link repair`,
  );

  for (const { target, line } of targets(original)) {
    let resolution;
    let currentTarget = target;
    if (
      archiveFiles.includes(file) &&
      target.startsWith("evidence/release-2026-09-09/")
    ) {
      resolution = "REPAIRED_ARCHIVE_PATH";
      currentTarget = `../${target}`;
    } else if (file === uiFile && /:\d+$/.test(target)) {
      resolution = "REPAIRED_FILE_ENTRY_HISTORICAL_LINE_RETAINED";
      currentTarget = target.replace(/:\d+$/, "");
    } else if (logFiles.includes(file) && target.endsWith(".log")) {
      resolution = "NOT_VERIFIED_LOG_PROVENANCE";
    } else continue;

    const destination = path.resolve(
      path.dirname(path.join(root, file)),
      currentTarget,
    );
    const repositoryTarget = path
      .relative(root, destination)
      .split(path.sep)
      .join("/");
    const exists = fs.existsSync(destination);
    const isTracked = tracked.has(repositoryTarget);
    if (resolution.startsWith("REPAIRED")) {
      assert(
        exists && isTracked,
        `${file}:${line}: repaired target is not tracked`,
      );
    } else {
      assert(
        !isTracked,
        `${file}:${line}: original log appeared in Git; provenance review required`,
      );
      if (!exists) knownMissing.add(`${file}:${line}: missing link ${target}`);
    }
    rows.push({
      id: `HISTORY-${String(rows.length + 1).padStart(3, "0")}`,
      sourceFile: file,
      historicalLine: line,
      historicalTarget: target,
      currentTarget,
      repositoryTarget,
      resolution,
      existsOnDisk: exists,
      trackedInGit: isTracked,
      recovery: resolution.startsWith("REPAIRED")
        ? "TRACKED_TARGET_VERIFIED"
        : exists
          ? "LOCAL_IGNORED_COPY_WITHOUT_IMMUTABLE_PROVENANCE"
          : "ABSENT_FROM_CURRENT_REPOSITORY_AND_WORKTREE",
    });
  }
}

assert.equal(
  rows.length,
  37,
  "historical inventory must contain all 37 issues",
);
assert.equal(
  rows.filter((row) => row.resolution.startsWith("REPAIRED")).length,
  29,
);
assert.equal(
  rows.filter((row) => row.resolution.startsWith("NOT_VERIFIED")).length,
  8,
);
const issues = checkMarkdownLinks(root, sourceFiles);
assert.deepEqual(
  new Set(issues),
  knownMissing,
  "unexpected historical link failure",
);
const report = {
  taskId: "TASK-DOCS-HISTORY-001",
  auditDate: "2026-10-11",
  sourceCommits: { ...sourceCommits, "archive-and-ui": defaultSourceCommit },
  scope: "The 37 issues from the 2026-09-23 historical Markdown audit only",
  result: "PASS_WITH_DECLARED_EVIDENCE_LIMITATIONS",
  repairedTrackedLinks: 29,
  unverifiedOriginalLogs: 8,
  unexpectedLinkFailures: 0,
  rows,
};
if (process.argv.includes("--write"))
  fs.writeFileSync(
    path.join(directory, "docs-history-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
console.log(
  "Docs history audit: 37 issues classified; 29 tracked links repaired; 8 original logs NOT_VERIFIED; 0 unexpected failures. Historical prose/results preserved.",
);
