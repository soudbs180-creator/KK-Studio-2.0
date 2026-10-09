import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const STATIC_GENERATED = [
  "node_modules",
  "dist",
  "test-results",
  "src-tauri/target",
  "src-tauri/agent-runtime",
  "vendor/canvas-agent/dist",
  "vendor/canvas-agent/node_modules",
];

const PROTECTED_EVIDENCE_SEGMENTS = new Set(["evidence", "recovery", "archive", ".verification", "output"]);

function slash(value) {
  return String(value).replaceAll("\\", "/");
}

function absolute(value) {
  return path.resolve(String(value));
}

function normalizeForComparison(value) {
  const normalized = slash(absolute(value)).replace(/\/+$/, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

/** Return true only when candidate is contained by root, including on Windows. */
export function isContainedPath(root, candidate) {
  const parent = normalizeForComparison(root);
  const child = normalizeForComparison(candidate);
  if (parent === child) return false;
  const relative = path.relative(parent, child);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function nearestExistingPath(candidate) {
  let current = absolute(candidate);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

function realPath(candidate) {
  const existing = nearestExistingPath(candidate);
  if (!existing) return null;
  const resolved = fs.realpathSync.native(existing);
  const rest = path.relative(existing, absolute(candidate));
  return rest ? path.join(resolved, rest) : resolved;
}

function hasSymlinkOrReparse(candidate) {
  if (!fs.existsSync(candidate)) return false;
  const pending = [candidate];
  while (pending.length) {
    const current = pending.pop();
    let stat;
    try { stat = fs.lstatSync(current); } catch { return true; }
    if (stat.isSymbolicLink()) return true;
    if (!stat.isDirectory()) continue;
    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) pending.push(path.join(current, entry.name));
    } catch { return true; }
  }
  return false;
}

function isEvidencePath(candidate) {
  return slash(candidate).split("/").some((segment) => PROTECTED_EVIDENCE_SEGMENTS.has(segment.toLowerCase()) || /evidence/i.test(segment));
}

export function generatedPathCandidates(worktreeRoot) {
  const root = slash(worktreeRoot).replace(/\/+$/, "");
  return STATIC_GENERATED.map((item) => `${root}/${item}`);
}

function allGeneratedPaths(worktreeRoot) {
  const paths = generatedPathCandidates(worktreeRoot);
  const pluginRoot = path.join(worktreeRoot, "vendor/canvas-plugins");
  if (fs.existsSync(pluginRoot) && fs.statSync(pluginRoot).isDirectory()) {
    for (const entry of fs.readdirSync(pluginRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      paths.push(path.join(pluginRoot, entry.name, "dist"));
      paths.push(path.join(pluginRoot, entry.name, "node_modules"));
    }
  }
  return paths;
}

/** Compatibility helper retained for existing governance tests; fail closed for protected worktrees. */
export function canPruneWorktree(state) {
  return Boolean(state?.exists && state.dirty === 0 && state.primary !== true && state.current !== true && state.external !== true && state.locked !== true && state.inWorkspace !== false);
}

export function canPruneGeneratedContent(state) {
  return Boolean(state?.exists && state.inWorkspace === true && state.primary !== true && state.current !== true && state.dirty === 0 && state.locked !== true && state.evidence !== true && state.active !== true);
}

export function assessGeneratedCandidate({ path: candidate, worktreeRoot, tracked = false, ignored = false, locked = false, submodule = false, evidence = false }) {
  const reasons = [];
  const exists = Boolean(candidate && fs.existsSync(candidate));
  if (!exists) reasons.push("MISSING");
  if (!worktreeRoot || !candidate || !isContainedPath(worktreeRoot, candidate)) reasons.push("OUTSIDE_WORKTREE");
  const realRoot = worktreeRoot && realPath(worktreeRoot);
  const realCandidate = candidate && realPath(candidate);
  if (!realRoot || !realCandidate || !isContainedPath(realRoot, realCandidate)) reasons.push("REALPATH_ESCAPE");
  if (exists && hasSymlinkOrReparse(candidate)) reasons.push("SYMLINK_OR_REPARSE");
  if (tracked) reasons.push("TRACKED_CONTENT");
  if (submodule) reasons.push("SUBMODULE_CONTENT");
  if (locked) reasons.push("LOCKED");
  if (ignored && (evidence || isEvidencePath(candidate))) reasons.push("IGNORED_EVIDENCE");
  return { allowed: reasons.length === 0, reasons, path: candidate };
}

export function assessWorktreeRemoval(state) {
  const reasons = [];
  if (!state?.exists) reasons.push("MISSING");
  if (!state?.inWorkspace) reasons.push("EXTERNAL_WORKTREE");
  if (state.primary || state.current) reasons.push(state.primary ? "PRIMARY_WORKTREE" : "CURRENT_WORKTREE");
  if (state.dirty !== 0) reasons.push("DIRTY_WORKTREE");
  if (state.locked) reasons.push("LOCKED_WORKTREE");
  if (state.active) reasons.push("ACTIVE_TASK");
  const statuses = Array.isArray(state.taskStatuses) ? state.taskStatuses : [];
  if (statuses.length === 0 || statuses.some((status) => status !== "DONE")) reasons.push("TASK_NOT_DONE");
  if (!state.reachableFromMain && !state.bundleVerified) reasons.push("COMMIT_NOT_RECOVERABLE");
  return { allowed: reasons.length === 0, reasons };
}

function hashBuffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Build a deterministic SHA inventory before anything is removed. */
export function buildRecoveryInventory(root) {
  const base = absolute(root);
  const files = [];
  const visit = (current) => {
    const stat = fs.lstatSync(current);
    const relativePath = slash(path.relative(base, current));
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(current);
      files.push({ path: relativePath, kind: "symlink", target, sha256: hashBuffer(`symlink:${target}`) });
      return;
    }
    if (!stat.isDirectory()) {
      files.push({ path: relativePath, kind: "file", bytes: stat.size, sha256: hashBuffer(fs.readFileSync(current)) });
      return;
    }
    for (const entry of fs.readdirSync(current).sort((a, b) => a.localeCompare(b))) visit(path.join(current, entry));
  };
  if (fs.existsSync(base)) visit(base);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { root: slash(base), files, digest: hashBuffer(JSON.stringify(files)) };
}

export function verifyRecoveryBundle(bundlePath, repoRoot = process.cwd()) {
  if (!bundlePath || !fs.existsSync(bundlePath) || !fs.statSync(bundlePath).isFile()) return false;
  try { execFileSync("git", ["bundle", "verify", bundlePath], { cwd: repoRoot, encoding: "utf8", stdio: "pipe" }); return true; } catch { return false; }
}

function readTaskLedger(repoRoot) {
  const ledgerPath = path.join(repoRoot, "docs/governance/task-ledger.json");
  if (!fs.existsSync(ledgerPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.tasks ?? [];
}

function ledgerStatuses(repoRoot) {
  const statuses = new Map();
  for (const task of readTaskLedger(repoRoot)) {
    if (!task?.branch || !task?.status) continue;
    const branch = String(task.branch).replace(/^refs\/heads\//, "");
    const list = statuses.get(branch) ?? [];
    list.push(String(task.status));
    statuses.set(branch, list);
  }
  return statuses;
}

function git(repoRoot, args, options = {}) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: "pipe", ...options });
}

function worktreeStatus(worktreePath) {
  try {
    const status = git(worktreePath, ["status", "--short", "--untracked-files=normal"]);
    return status.split(/\r?\n/).filter(Boolean).length;
  } catch {
    return null;
  }
}

function parseWorktrees(repoRoot) {
  return git(repoRoot, ["worktree", "list", "--porcelain"])
    .split(/\r?\n(?=worktree )/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\r?\n/);
      const get = (prefix) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null;
      const worktreePath = get("worktree ");
      const status = worktreePath ? worktreeStatus(worktreePath) : null;
      return {
        path: worktreePath ? slash(worktreePath) : null,
        head: get("HEAD "),
        branch: get("branch ")?.replace(/^refs\/heads\//, "") ?? null,
        exists: Boolean(worktreePath && fs.existsSync(worktreePath)),
        dirty: status,
        locked: lines.some((line) => line === "locked" || line.startsWith("locked ")) || hasWorktreeLock(worktreePath),
        prunable: lines.some((line) => line.startsWith("prunable")),
      };
    });
}

function hasWorktreeLock(worktreePath) {
  if (!worktreePath) return false;
  const gitMarker = path.join(worktreePath, ".git");
  try {
    if (fs.existsSync(gitMarker) && fs.statSync(gitMarker).isFile()) {
      const marker = fs.readFileSync(gitMarker, "utf8").trim();
      const metadata = marker.replace(/^gitdir:\s*/i, "");
      return ["locked", "index.lock", "HEAD.lock"].some((name) => fs.existsSync(path.join(metadata, name)));
    }
  } catch { return true; }
  return ["index.lock", "HEAD.lock"].some((name) => fs.existsSync(path.join(worktreePath, ".git", name)));
}

function workspaceRootFor(repoRoot) {
  if (process.env.KK_WORKSPACE_ROOT) return absolute(process.env.KK_WORKSPACE_ROOT);
  let current = absolute(repoRoot);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "KK-Studio-2.0")) && fs.existsSync(path.join(current, ".worktrees"))) return current;
    current = path.dirname(current);
  }
  return path.dirname(absolute(repoRoot));
}

function reachableFromMain(repoRoot, head) {
  if (!head) return false;
  const mainRef = ["origin/main", "main"].find((ref) => {
    try { git(repoRoot, ["rev-parse", "--verify", ref]); return true; } catch { return false; }
  });
  if (!mainRef) return false;
  try { git(repoRoot, ["merge-base", "--is-ancestor", head, mainRef]); return true; } catch { return false; }
}

function isIgnored(repoRoot, candidate) {
  try { git(repoRoot, ["check-ignore", "-q", "--", candidate]); return true; } catch { return false; }
}

function hasTrackedContent(repoRoot, worktreeRoot, candidate) {
  try {
    const relative = path.relative(worktreeRoot, candidate);
    return Boolean(git(repoRoot, ["ls-files", "--", relative]).trim());
  } catch { return true; }
}

function hasSubmoduleContent(repoRoot, worktreeRoot, candidate) {
  try {
    let current = candidate;
    while (isContainedPath(worktreeRoot, current)) {
      const relative = path.relative(worktreeRoot, current);
      const stage = git(repoRoot, ["ls-files", "--stage", "--", relative]).trim();
      if (stage.split(/\r?\n/).some((line) => line.startsWith("160000 "))) return true;
      current = path.dirname(current);
    }
  } catch { return true; }
  return false;
}

export function buildReclamationManifest(repoRoot = process.cwd()) {
  const workspaceRoot = workspaceRootFor(repoRoot);
  const primary = absolute(path.join(workspaceRoot, "KK-Studio-2.0"));
  const currentWorktree = realPath(repoRoot) ?? absolute(repoRoot);
  const allowedRoot = absolute(process.env.KK_WORKTREE_ROOT || path.join(workspaceRoot, ".worktrees"));
  const statuses = ledgerStatuses(primary);
  const worktrees = parseWorktrees(repoRoot);
  const entries = worktrees.map((worktree) => {
    const pathValue = worktree.path ? absolute(worktree.path) : null;
    const resolvedWorktree = pathValue && realPath(pathValue);
    const inWorkspace = Boolean(pathValue && isContainedPath(allowedRoot, pathValue) && resolvedWorktree && isContainedPath(allowedRoot, resolvedWorktree));
    const isPrimary = Boolean(pathValue && normalizeForComparison(pathValue) === normalizeForComparison(primary));
    const isCurrent = Boolean(pathValue && normalizeForComparison(realPath(pathValue) ?? pathValue) === normalizeForComparison(currentWorktree));
    const taskStatuses = worktree.branch ? statuses.get(worktree.branch) ?? [] : [];
    const active = taskStatuses.length > 0 && taskStatuses.some((status) => status !== "DONE");
    const reachable = reachableFromMain(repoRoot, worktree.head);
    const removal = assessWorktreeRemoval({ ...worktree, inWorkspace, primary: isPrimary, current: isCurrent, active, taskStatuses, reachableFromMain: reachable });
    const generated = pathValue && worktree.exists && inWorkspace
      ? allGeneratedPaths(pathValue).filter((candidate) => fs.existsSync(candidate)).map((candidate) => {
          const ignored = isIgnored(repoRoot, candidate);
          const tracked = hasTrackedContent(repoRoot, pathValue, candidate);
          const submodule = hasSubmoduleContent(repoRoot, pathValue, candidate);
          const evidence = isEvidencePath(candidate);
          return { path: slash(candidate), ignored, tracked, submodule, evidence, assessment: assessGeneratedCandidate({ path: candidate, worktreeRoot: pathValue, tracked, ignored, locked: worktree.locked, submodule, evidence }) };
        })
      : [];
    return { ...worktree, path: pathValue ? slash(pathValue) : null, inWorkspace, primary: isPrimary, current: isCurrent, external: !inWorkspace, taskStatuses, active, reachableFromMain: reachable, generatedPaths: generated, removal, action: removal.allowed ? "REMOVE_CLEAN_COMPLETED_WORKTREE" : active || isCurrent || isPrimary || !inWorkspace ? "PROTECT" : "PROTECT_WORKTREE" };
  });
  const candidates = entries.flatMap((entry) => entry.generatedPaths
    .filter((candidate) => canPruneGeneratedContent({ ...entry, evidence: candidate.evidence, active: entry.active }))
    .filter((candidate) => candidate.assessment.allowed)
    .map((candidate) => ({ id: hashBuffer(`${candidate.path}:${entry.head}`).slice(0, 16), path: candidate.path, action: "PRUNE_GENERATED", worktreePath: entry.path, ignored: candidate.ignored, tracked: candidate.tracked, submodule: candidate.submodule, evidence: candidate.evidence, sourceInventory: null, requiresRecoveryManifest: true })));
  return { schemaVersion: 2, planId: crypto.randomUUID(), generatedAt: new Date().toISOString(), immutable: false, workspaceRoot: slash(workspaceRoot), allowedWorktreeRoot: slash(allowedRoot), primaryRepository: slash(primary), currentWorktree: slash(currentWorktree), applyPerformed: false, worktrees: entries, candidates, summary: { total: entries.length, cleanInWorkspace: entries.filter((item) => item.inWorkspace && !item.primary && item.dirty === 0).length, dirtyInWorkspace: entries.filter((item) => item.inWorkspace && item.dirty > 0).length, generatedDirectories: candidates.length, cleanCompletedWorktrees: entries.filter((item) => item.removal.allowed).length } };
}

export function validateApprovedCandidates(plan, approvedCandidates) {
  if (!plan || plan.immutable !== true || !Array.isArray(approvedCandidates) || approvedCandidates.length === 0) return { ok: false, reason: "IMMUTABLE_PLAN_AND_EXPLICIT_APPROVAL_REQUIRED" };
  const byId = new Map((plan.candidates ?? []).map((candidate) => [candidate.id, candidate]));
  const candidates = approvedCandidates.map((id) => byId.get(id));
  if (candidates.some((candidate) => !candidate)) return { ok: false, reason: "UNKNOWN_CANDIDATE" };
  return { ok: true, candidates };
}

export function writeImmutablePlan(plan, outputDirectory, { approvedWorktrees = [] } = {}) {
  const targetDirectory = outputDirectory ?? path.join(process.cwd(), "docs/governance");
  fs.mkdirSync(targetDirectory, { recursive: true });
  const candidates = (plan.candidates ?? []).map((candidate) => ({
    ...candidate,
    sourceInventory: candidate.sourceInventory ?? (fs.existsSync(candidate.path) ? buildRecoveryInventory(candidate.path) : null),
  }));
  const selectedWorktrees = new Set(approvedWorktrees);
  const worktrees = (plan.worktrees ?? []).map((worktree) => selectedWorktrees.has(worktree.path) && fs.existsSync(worktree.path)
    ? { ...worktree, sourceInventory: worktree.sourceInventory ?? buildRecoveryInventory(worktree.path) }
    : worktree);
  const immutablePlan = { ...plan, candidates, worktrees, immutable: true, writtenAt: new Date().toISOString() };
  const destination = path.join(targetDirectory, `worktree-reclamation-plan-${immutablePlan.planId}.json`);
  const handle = fs.openSync(destination, "wx");
  try { fs.writeFileSync(handle, `${JSON.stringify(immutablePlan, null, 2)}\n`, "utf8"); } finally { fs.closeSync(handle); }
  return destination;
}

export function writeAuditPointer(plan, planPath, outputDirectory) {
  const targetDirectory = outputDirectory ?? path.dirname(planPath);
  const pointerPath = path.join(targetDirectory, "worktree-reclamation.json");
  const pointer = {
    schemaVersion: 2,
    generatedAt: plan.generatedAt,
    planId: plan.planId,
    immutablePlan: slash(path.relative(targetDirectory, planPath)),
    summary: plan.summary,
    note: "Stable pointer only; immutable plans are never overwritten.",
  };
  fs.writeFileSync(pointerPath, `${JSON.stringify(pointer, null, 2)}\n`, "utf8");
  return pointerPath;
}

function inventoryMatches(candidate) {
  if (!candidate.sourceInventory || !fs.existsSync(candidate.path)) return false;
  return buildRecoveryInventory(candidate.path).digest === candidate.sourceInventory.digest;
}

/** Apply only explicitly approved candidates after rechecking containment and source hashes. */
export function applyReclamationPlan(plan, { approvedCandidates, approvedWorktrees = [], repoRoot = process.cwd() } = {}) {
  const approval = validateApprovedCandidates(plan, approvedCandidates);
  if (!approval.ok) throw new Error(approval.reason);
  const removed = [];
  const failed = [];
  for (const candidate of approval.candidates) {
    const worktreeRoot = candidate.worktreePath ?? path.dirname(candidate.path);
    const plannedWorktree = (plan.worktrees ?? []).find((item) => normalizeForComparison(item.path) === normalizeForComparison(worktreeRoot));
    const currentState = plannedWorktree && {
      ...plannedWorktree,
      inWorkspace: isContainedPath(plan.allowedWorktreeRoot, worktreeRoot),
      primary: normalizeForComparison(worktreeRoot) === normalizeForComparison(plan.primaryRepository),
      current: normalizeForComparison(realPath(worktreeRoot) ?? worktreeRoot) === normalizeForComparison(plan.currentWorktree),
      dirty: worktreeStatus(worktreeRoot),
      locked: hasWorktreeLock(worktreeRoot),
      reachableFromMain: reachableFromMain(repoRoot, plannedWorktree.head),
    };
    const tracked = candidate.tracked === true || hasTrackedContent(repoRoot, worktreeRoot, candidate.path);
    const submodule = candidate.submodule === true || hasSubmoduleContent(repoRoot, worktreeRoot, candidate.path);
    const assessment = assessGeneratedCandidate({ path: candidate.path, worktreeRoot, tracked, submodule, ignored: candidate.ignored === true, evidence: candidate.evidence === true });
    const realAllowedRoot = plan.allowedWorktreeRoot && realPath(plan.allowedWorktreeRoot);
    const realCandidate = realPath(candidate.path);
    const realPathSafe = Boolean(realAllowedRoot && realCandidate && isContainedPath(realAllowedRoot, realCandidate));
    if (!currentState || !canPruneGeneratedContent(currentState) || !plan.allowedWorktreeRoot || !isContainedPath(plan.allowedWorktreeRoot, candidate.path) || !realPathSafe || !assessment.allowed || !inventoryMatches(candidate)) {
      failed.push({ path: candidate.path, reason: !currentState ? "UNKNOWN_WORKTREE" : !canPruneGeneratedContent(currentState) ? "WORKTREE_STATE_CHANGED" : !plan.allowedWorktreeRoot || !isContainedPath(plan.allowedWorktreeRoot, candidate.path) || !realPathSafe ? "OUTSIDE_ALLOWED_ROOT" : !assessment.allowed ? assessment.reasons.join(",") : "SOURCE_HASH_CHANGED" });
      continue;
    }
    try { fs.rmSync(candidate.path, { recursive: true, force: false }); removed.push(candidate.path); } catch (error) { failed.push({ path: candidate.path, reason: error.code ?? error.message }); }
  }
  const removedWorktrees = [];
  for (const worktree of plan.worktrees ?? []) {
    if (!approvedWorktrees.includes(worktree.path)) continue;
    const liveWorktree = {
      ...worktree,
      inWorkspace: Boolean(plan.allowedWorktreeRoot && isContainedPath(plan.allowedWorktreeRoot, worktree.path) && realPath(worktree.path) && isContainedPath(plan.allowedWorktreeRoot, realPath(worktree.path))),
      primary: normalizeForComparison(worktree.path) === normalizeForComparison(plan.primaryRepository),
      current: normalizeForComparison(realPath(worktree.path) ?? worktree.path) === normalizeForComparison(plan.currentWorktree),
      dirty: worktreeStatus(worktree.path),
      locked: hasWorktreeLock(worktree.path),
      reachableFromMain: reachableFromMain(repoRoot, worktree.head),
      bundleVerified: worktree.bundleVerified === true || verifyRecoveryBundle(worktree.recoveryBundle, repoRoot),
    };
    const check = assessWorktreeRemoval(liveWorktree);
    if (!check.allowed || !worktree.sourceInventory || !inventoryMatches({ path: worktree.path, sourceInventory: worktree.sourceInventory })) {
      failed.push({ path: worktree.path, reason: check.reasons?.join(",") || "SOURCE_HASH_CHANGED" });
      continue;
    }
    try {
      execFileSync("git", ["worktree", "remove", "--", worktree.path], { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
      removedWorktrees.push(worktree.path);
    } catch (error) {
      failed.push({ path: worktree.path, reason: error.stderr?.toString?.() || error.code || error.message });
    }
  }
  return { removed, failed, removedWorktrees, appliedAt: new Date().toISOString() };
}

export function writeApplyResult(result, plan, outputDirectory) {
  const targetDirectory = outputDirectory ?? path.join(process.cwd(), "docs/governance");
  fs.mkdirSync(targetDirectory, { recursive: true });
  const destination = path.join(targetDirectory, `worktree-reclamation-result-${plan.planId}-${Date.now()}.json`);
  const payload = { schemaVersion: 1, planId: plan.planId, ...result };
  const handle = fs.openSync(destination, "wx");
  try { fs.writeFileSync(handle, `${JSON.stringify(payload, null, 2)}\n`, "utf8"); } finally { fs.closeSync(handle); }
  return destination;
}

const invokedDirectly = process.argv[1]?.replaceAll("\\", "/").endsWith("/worktree-reclaim.mjs");
if (invokedDirectly) {
  try {
    const repoRoot = process.cwd();
    const outputDirectory = path.join(repoRoot, "docs/governance");
    if (!process.argv.includes("--apply")) {
      const plan = buildReclamationManifest(repoRoot);
      const planPath = writeImmutablePlan(plan, outputDirectory);
      writeAuditPointer(plan, planPath, outputDirectory);
      console.log(`Worktree reclamation audit written to ${planPath}; no files were removed.`);
    } else {
      const planArg = process.argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length);
      const approvals = process.argv.find((arg) => arg.startsWith("--approve="))?.slice("--approve=".length).split(",").filter(Boolean);
      if (!planArg || !approvals?.length) throw new Error("--apply requires --plan=<immutable plan> and --approve=<candidate ids>");
      const plan = JSON.parse(fs.readFileSync(planArg, "utf8"));
      const result = applyReclamationPlan(plan, { approvedCandidates: approvals });
      const resultPath = writeApplyResult(result, plan, outputDirectory);
      console.log(`Removed ${result.removed.length} generated directories; ${result.failed.length} candidates were retained. Result: ${resultPath}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
