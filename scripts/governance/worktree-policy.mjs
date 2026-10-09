import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const DEFAULT_WORKTREE_POLICY = Object.freeze({
  allowedRoot: "D:/kk-studio/.worktrees",
  maxActiveWorktrees: 4,
  maxGeneratedBytes: 20 * 1024 ** 3,
  generatedDirectories: ["node_modules", "dist", "test-results", "src-tauri/target", "src-tauri/agent-runtime"],
});

function slash(value) { return String(value).replaceAll("\\", "/"); }

function contained(root, candidate) {
  const fold = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  const parent = fold(path.resolve(root));
  const child = fold(path.resolve(candidate));
  const relative = path.relative(parent, child);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function loadWorktreePolicy(overrides = {}) {
  const maxActive = overrides.maxActiveWorktrees ?? Number(process.env.KK_MAX_ACTIVE_WORKTREES || DEFAULT_WORKTREE_POLICY.maxActiveWorktrees);
  const maxGenerated = overrides.maxGeneratedBytes ?? Number(process.env.KK_MAX_GENERATED_BYTES || DEFAULT_WORKTREE_POLICY.maxGeneratedBytes);
  const allowedRoot = overrides.allowedRoot ?? process.env.KK_WORKTREE_ROOT ?? DEFAULT_WORKTREE_POLICY.allowedRoot;
  if (!Number.isSafeInteger(maxActive) || maxActive < 1) throw new Error("maxActiveWorktrees must be a positive integer");
  if (!Number.isFinite(maxGenerated) || maxGenerated < 0) throw new Error("maxGeneratedBytes must be non-negative");
  return { ...DEFAULT_WORKTREE_POLICY, ...overrides, allowedRoot: slash(allowedRoot), maxActiveWorktrees: maxActive, maxGeneratedBytes: maxGenerated };
}

function byteSize(root) {
  if (!fs.existsSync(root)) return 0;
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) return 0;
  if (!stat.isDirectory()) return stat.size;
  return fs.readdirSync(root).reduce((total, entry) => total + byteSize(path.join(root, entry)), 0);
}

export function measureGeneratedBytes(worktreeRoot, generatedDirectories = DEFAULT_WORKTREE_POLICY.generatedDirectories) {
  return generatedDirectories.reduce((total, relative) => total + byteSize(path.join(worktreeRoot, relative)), 0);
}

function normalizeBranch(branch) { return String(branch ?? "").replace(/^refs\/heads\//, ""); }

export function checkWorktreeCreation({ policy = loadWorktreePolicy(), activeWorktrees = [], generatedBytes: suppliedGeneratedBytes, requestedBranch, requestedPath } = {}) {
  const branch = normalizeBranch(requestedBranch);
  const existing = activeWorktrees.find((item) => normalizeBranch(item.branch) === branch && item.path);
  if (existing) return { allowed: true, action: "REUSE_EXISTING_BRANCH", path: existing.path, branch };
  if (!branch) return { allowed: false, reason: "BRANCH_REQUIRED", branch };
  if (requestedPath && !contained(policy.allowedRoot, requestedPath)) return { allowed: false, reason: "WORKTREE_PATH_OUTSIDE_ALLOWED_ROOT", branch };
  const generatedBytes = suppliedGeneratedBytes ?? activeWorktrees.reduce((total, item) => total + (item.path && contained(policy.allowedRoot, item.path) ? measureGeneratedBytes(item.path, policy.generatedDirectories) : 0), 0);
  const activeCount = activeWorktrees.filter((item) => item.exists !== false && item.primary !== true && item.path && contained(policy.allowedRoot, item.path)).length;
  if (activeCount >= policy.maxActiveWorktrees) return { allowed: false, reason: `ACTIVE_WORKTREE_BUDGET_EXCEEDED (${activeCount}/${policy.maxActiveWorktrees})`, branch, activeCount, generatedBytes };
  if (generatedBytes >= policy.maxGeneratedBytes) return { allowed: false, reason: `GENERATED_STORAGE_BUDGET_EXCEEDED (${generatedBytes}/${policy.maxGeneratedBytes})`, branch, activeCount, generatedBytes };
  return { allowed: true, action: "CREATE_WORKTREE", branch, activeCount, generatedBytes };
}

export function assertWorktreeCreationAllowed(options) {
  const result = checkWorktreeCreation(options);
  if (!result.allowed) {
    const error = new Error(result.reason);
    error.code = "WORKTREE_BUDGET_DENIED";
    throw error;
  }
  return result;
}

function gitWorktrees(repoRoot) {
  try {
    return execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: repoRoot, encoding: "utf8" })
      .split(/\r?\n(?=worktree )/).filter(Boolean).map((block) => {
        const lines = block.split(/\r?\n/);
        const get = (prefix) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null;
        return { path: get("worktree "), branch: get("branch "), exists: Boolean(get("worktree ") && fs.existsSync(get("worktree "))) };
      });
  } catch { return []; }
}

const invokedDirectly = process.argv[1]?.replaceAll("\\", "/").endsWith("/worktree-policy.mjs");
if (invokedDirectly && process.argv.includes("--check-create")) {
  const repoRoot = process.cwd();
  const branch = process.argv.find((arg) => arg.startsWith("--branch="))?.slice("--branch=".length);
  const policy = loadWorktreePolicy();
  const active = gitWorktrees(repoRoot);
  const generatedBytes = active.reduce((total, item) => total + (item.path && contained(policy.allowedRoot, item.path) ? measureGeneratedBytes(item.path, policy.generatedDirectories) : 0), 0);
  const result = checkWorktreeCreation({ policy, activeWorktrees: active, generatedBytes, requestedBranch: branch });
  console.log(JSON.stringify(result, null, 2));
  if (!result.allowed) process.exitCode = 1;
}
