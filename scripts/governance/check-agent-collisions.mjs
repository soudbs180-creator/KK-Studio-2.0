import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const CLAIMS_FILE = path.join(REPO_ROOT, "docs/governance/active-work.json");

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function readClaims() {
  if (!fs.existsSync(CLAIMS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf8"));
    return Array.isArray(parsed.claims) ? parsed.claims : [];
  } catch {
    return [];
  }
}

function getStagedFiles() {
  const status = runGit(["diff", "--name-only", "--cached"]);
  if (!status) return [];
  return status
    .split("\n")
    .map((l) => l.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

export function getDirtyFiles() {
  const status = runGit(["status", "--porcelain"]);
  if (!status) return [];
  return status
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .map((l) => {
      const rawPath = l.length > 3 ? l.slice(3).trim() : "";
      const normalized = rawPath.replace(/\\/g, "/").replace(/^"|"$/g, "");
      if (normalized.includes(" -> ")) {
        return normalized.split(" -> ")[1].trim();
      }
      return normalized;
    })
    .filter(Boolean);
}

export function validateClaimsIntegrity() {
  const claims = readClaims();
  const errors = [];
  const activeStatuses = ["IN_PROGRESS", "PARTIAL"];
  const activeClaims = claims.filter((c) => activeStatuses.includes(c.status));

  // 1. Same-track collision on same feature
  const featureTrackMap = new Map();
  for (const claim of activeClaims) {
    if (!claim.feature) continue;
    const key = `${claim.feature}::${claim.track || "FULL"}`;
    const existing = featureTrackMap.get(key);
    if (existing) {
      errors.push(
        `【同轨冲突】模块 "${claim.feature}" 的 [${claim.track || "FULL"}] 分轨被任务 ${existing.task} (${existing.agent}) 与 ${claim.task} (${claim.agent}) 同时认领！`,
      );
    } else {
      featureTrackMap.set(key, claim);
    }
  }

  // 2. File overlap between any two active claims
  const fileClaimMap = new Map();
  for (const claim of activeClaims) {
    const files = Array.isArray(claim.files) ? claim.files : [];
    for (const file of files) {
      const normalized = file.replace(/\\/g, "/");
      const existing = fileClaimMap.get(normalized);
      if (existing) {
        errors.push(
          `【物理文件冲突】文件 "${normalized}" 同时被 ${existing.task} (${existing.agent}) 与 ${claim.task} (${claim.agent}) 锁定！`,
        );
      } else {
        fileClaimMap.set(normalized, claim);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function checkAgentCommitBoundary(agentName, taskId) {
  const staged = getStagedFiles();
  if (staged.length === 0) {
    return { ok: true, violations: [] };
  }

  const claims = readClaims();
  const myClaim = claims.find(
    (c) =>
      (c.agent.toLowerCase() === agentName.toLowerCase() ||
        (taskId && (c.task === taskId || c.taskId === taskId))) &&
      ["IN_PROGRESS", "PARTIAL"].includes(c.status),
  );

  const violations = [];
  const activeStatuses = ["IN_PROGRESS", "PARTIAL"];
  const otherClaims = claims.filter(
    (c) => c !== myClaim && activeStatuses.includes(c.status),
  );

  const lockedByOthers = new Map();
  for (const other of otherClaims) {
    for (const f of other.files || []) {
      lockedByOthers.set(f.replace(/\\/g, "/"), other);
    }
  }

  for (const file of staged) {
    const foreign = lockedByOthers.get(file);
    if (foreign) {
      violations.push(
        `文件 "${file}" 被 ${foreign.agent} [任务: ${foreign.task}] 锁定，禁止越界提交！`,
      );
    }
  }

  return { ok: violations.length === 0, violations };
}

export function auditWorktreeIsolation() {
  const dirty = getDirtyFiles();
  return { dirtyCount: dirty.length };
}

// CLI entry
const mode = process.argv[2] || "verify";
console.log(`[COLLISION-GUARD] 正在执行多 Agent 协同锁核验 (模式: ${mode})...`);

const integrity = validateClaimsIntegrity();
if (!integrity.ok) {
  console.error("❌ [COLLISION-GUARD] 发现任务锁定义冲突：");
  integrity.errors.forEach((e) => console.error(`  • ${e}`));
  process.exit(1);
}

if (mode === "pre-commit") {
  const currentAgent =
    process.argv[3] || process.env.AGENT_NAME || "Antigravity";
  const taskId = process.argv[4] || process.env.TASK_ID || "";
  const commitCheck = checkAgentCommitBoundary(currentAgent, taskId);
  if (!commitCheck.ok) {
    console.error(
      "❌ [COLLISION-GUARD] 阻断提交：修改了其他 Agent 锁定的受保护文件：",
    );
    commitCheck.violations.forEach((v) => console.error(`  • ${v}`));
    process.exit(1);
  }
} else {
  const { dirtyCount } = auditWorktreeIsolation();
  console.log(`[COLLISION-GUARD] 当前工作区未提交文件共 ${dirtyCount} 项。`);
}

console.log(
  "✅ [COLLISION-GUARD] PASS: 多 Agent 任务锁与正交分轨核验全绿通过。",
);
