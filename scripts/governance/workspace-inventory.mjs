import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const GENERATED_DIRS = new Set([
  "node_modules",
  "dist",
  "target",
  "test-results",
  "agent-runtime",
]);

export function classifyWorkspacePath(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const first = normalized.split("/")[0];
  if (normalized === "KK-Studio-2.0") return "PRIMARY_REPOSITORY";
  if (first === ".worktrees") return "ACTIVE_WORKTREE_ROOT";
  if (first === "output" || first === ".verification") return "EVIDENCE_CANDIDATE";
  if (first === ".tmp") return "TEMPORARY_CANDIDATE";
  if (first === ".tools") return "REGENERABLE_CACHE";
  if (first === "ai_group_chat_study") return "INDEPENDENT_PROJECT";
  if (/login|session|credential|token|secret|qr/i.test(normalized))
    return "QUARANTINE_REVIEW";
  if (/^_?\.?(tmp|scan|token)|\.log$/i.test(first) || /^\./.test(first))
    return "ROOT_SCRATCH_CANDIDATE";
  return "REVIEW_REQUIRED";
}

function actionFor(kind) {
  return {
    PRIMARY_REPOSITORY: "KEEP_PRIMARY",
    ACTIVE_WORKTREE_ROOT: "KEEP_GIT_LINKED",
    EVIDENCE_CANDIDATE: "MANIFEST_THEN_ARCHIVE",
    REGENERABLE_CACHE: "MANIFEST_THEN_CLEAN",
    TEMPORARY_CANDIDATE: "MANIFEST_THEN_CLEAN",
    INDEPENDENT_PROJECT: "KEEP_SEPARATE_PROJECT",
    QUARANTINE_REVIEW: "QUARANTINE_NO_GIT",
    ROOT_SCRATCH_CANDIDATE: "MANIFEST_THEN_CLEAN",
    REVIEW_REQUIRED: "REVIEW_REQUIRED",
  }[kind];
}

function fileDigest(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > 50 * 1024 * 1024) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function directoryFingerprint(directoryPath) {
  const entries = fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .map((entry) => {
      const child = path.join(directoryPath, entry.name);
      const stat = fs.lstatSync(child);
      return {
        name: entry.name,
        type: entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : "file",
        bytes: entry.isDirectory() ? null : stat.size,
        modified: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

function sensitivityFor(kind) {
  if (kind === "QUARANTINE_REVIEW") return "SENSITIVE_REVIEW";
  if (kind === "EVIDENCE_CANDIDATE") return "EVIDENCE_READ_ONLY";
  if (kind === "TEMPORARY_CANDIDATE" || kind === "REGENERABLE_CACHE") return "REGENERABLE";
  if (kind === "INDEPENDENT_PROJECT") return "SEPARATE_PROJECT";
  if (kind === "PRIMARY_REPOSITORY" || kind === "ACTIVE_WORKTREE_ROOT") return "SOURCE_TREE";
  return "REVIEW_REQUIRED";
}

function ownerFor(kind) {
  return {
    PRIMARY_REPOSITORY: "repository-maintainer",
    ACTIVE_WORKTREE_ROOT: "task-owner",
    EVIDENCE_CANDIDATE: "evidence-maintainer",
    REGENERABLE_CACHE: "workspace-maintainer",
    TEMPORARY_CANDIDATE: "workspace-maintainer",
    INDEPENDENT_PROJECT: "independent-project-owner",
    QUARANTINE_REVIEW: "security-reviewer",
    ROOT_SCRATCH_CANDIDATE: "workspace-maintainer",
    REVIEW_REQUIRED: "governance-maintainer",
  }[kind];
}

export function workspaceEntry(entryPath, metadata = {}) {
  const normalized = entryPath.replaceAll("\\", "/");
  const workspaceRoot = process.env.KK_WORKSPACE_ROOT?.replaceAll("\\", "/") || "D:/kk-studio";
  const relative = normalized.startsWith(`${workspaceRoot}/`)
    ? normalized.slice(workspaceRoot.length + 1)
    : normalized;
  const kind = classifyWorkspacePath(relative);
  return {
    path: normalized,
    relativePath: relative,
    kind,
    action: actionFor(kind),
    deletable: false,
    sensitivity: sensitivityFor(kind),
    owner: ownerFor(kind),
    ...metadata,
  };
}

function gitWorktrees(repoRoot) {
  const output = execFileSync("git", ["worktree", "list", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n(?=worktree )/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\r?\n/);
      const get = (prefix) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null;
      return { path: get("worktree "), head: get("HEAD "), branch: get("branch ") };
    });
}

function resolveWorkspaceRoot(repoRoot) {
  if (process.env.KK_WORKSPACE_ROOT) return process.env.KK_WORKSPACE_ROOT;
  let current = path.resolve(repoRoot);
  while (current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, "KK-Studio-2.0")) &&
      fs.existsSync(path.join(current, ".worktrees"))
    )
      return current;
    current = path.dirname(current);
  }
  return path.dirname(repoRoot);
}

export function buildWorkspaceManifest(repoRoot = process.cwd(), workspaceRoot = resolveWorkspaceRoot(repoRoot)) {
  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
  const knownWorktrees = new Set(
    gitWorktrees(repoRoot).map((item) => item.path?.replaceAll("\\", "/").toLowerCase()),
  );
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(workspaceRoot, entry.name);
    const stat = fs.statSync(absolute);
    const metadata = {
      kindOnDisk: entry.isDirectory() ? "directory" : "file",
      bytes: stat.size,
      modified: stat.mtime.toISOString(),
      sha256: entry.isDirectory() ? directoryFingerprint(absolute) : fileDigest(absolute),
      shaMode: entry.isDirectory() ? "top-level-directory-metadata" : "exact-or-null-over-50MiB",
      sizeMode: entry.isDirectory() ? "filesystem-entry-metadata" : "exact-or-null-over-50MiB",
      gitOwnership: entry.name === "KK-Studio-2.0"
        ? "PRIMARY_REPOSITORY"
        : entry.name === ".worktrees"
          ? "WORKTREE_CONTAINER"
          : knownWorktrees.has(absolute.replaceAll("\\", "/").toLowerCase())
            ? "REGISTERED_WORKTREE"
            : entry.name === "ai_group_chat_study"
              ? "INDEPENDENT_GIT_PROJECT"
              : "NOT_GIT_ROOT",
    };
    result.push(workspaceEntry(absolute, metadata));
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    primaryRepository: path.join(workspaceRoot, "KK-Studio-2.0").replaceAll("\\", "/"),
    destructiveActionsPerformed: false,
    entries: result.sort((a, b) => a.path.localeCompare(b.path)),
    gitWorktrees: gitWorktrees(repoRoot),
  };
}

export function writeWorkspaceManifest(repoRoot = process.cwd()) {
  const manifest = buildWorkspaceManifest(repoRoot);
  const output = path.join(repoRoot, "docs/governance/workspace-inventory.json");
  fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv.includes("--write")) {
  const manifest = writeWorkspaceManifest();
  console.log(`Inventoried ${manifest.entries.length} workspace entries and ${manifest.gitWorktrees.length} worktrees.`);
}
