import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const CLAIMS_FILE = path.join(REPO_ROOT, "docs/governance/active-work.json");
const MEMLOG_FILE = path.join(REPO_ROOT, "docs/governance/ai-memory/memlog.md");

function runGit(args, cwd = REPO_ROOT) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function getWorktrees() {
  const output = runGit(["worktree", "list", "--porcelain"]);
  if (!output) return [];
  const entries = [];
  let current = {};
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.worktree) entries.push(current);
      current = {};
      continue;
    }
    const [key, ...rest] = trimmed.split(" ");
    const val = rest.join(" ");
    if (key === "worktree") current.worktree = val;
    else if (key === "HEAD") current.head = val;
    else if (key === "branch") current.branch = val.replace("refs/heads/", "");
  }
  if (current.worktree) entries.push(current);
  return entries;
}

function getWorktreeChanges(wtPath) {
  const status = runGit(["status", "--short"], wtPath);
  if (!status) return [];
  return status
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/\s+/);
      const code = parts[0];
      const file = parts.slice(1).join(" ");
      return { code, file };
    });
}

function readClaims() {
  if (!fs.existsSync(CLAIMS_FILE)) return { claims: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(CLAIMS_FILE, "utf8"));
    return Array.isArray(parsed.claims) ? parsed : { claims: [] };
  } catch {
    return { claims: [] };
  }
}

function writeClaims(data) {
  fs.mkdirSync(path.dirname(CLAIMS_FILE), { recursive: true });
  fs.writeFileSync(CLAIMS_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function appendMemlog(title, items, agent = "AIG Relay Engine") {
  if (!fs.existsSync(MEMLOG_FILE)) return;
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const block = `\n## [${timeStr}] ${title}\n- **执行 Agent**：${agent}\n${items.map((it) => `- ${it}`).join("\n")}\n`;
  const content = fs.readFileSync(MEMLOG_FILE, "utf8");
  const dividerIdx = content.indexOf("\n---\n");
  if (dividerIdx !== -1) {
    const head = content.slice(0, dividerIdx + 5);
    const rest = content.slice(dividerIdx + 5);
    fs.writeFileSync(MEMLOG_FILE, head + block + rest, "utf8");
  } else {
    fs.appendFileSync(MEMLOG_FILE, block, "utf8");
  }
}

function getLatestMemlogHandoff() {
  if (!fs.existsSync(MEMLOG_FILE)) return "暂无交接记录";
  const content = fs.readFileSync(MEMLOG_FILE, "utf8");
  const match = content.match(
    /##\s+\[(.*?)\]\s+(.*?)\n([\s\S]*?)(?=\n##\s+\[|\n---|$)/,
  );
  if (!match) return "暂无交接记录";
  const [, time, title, body] = match;
  const agentMatch = body.match(/- \*\*执行 Agent\*\*：(.*)/);
  const agent = agentMatch ? agentMatch[1].trim() : "未知 Agent";
  return `[${time}] ${title} (由 ${agent} 交付)`;
}

export function showRadar() {
  console.log(
    "================================================================================",
  );
  console.log(
    "           🛰️  KK Studio 多 Agent 实时协同雷达 (MULTI-AGENT RADAR)           ",
  );
  console.log(
    "================================================================================",
  );

  // 1. Latest Completed Handoff
  console.log(`📌 最新交接基线: ${getLatestMemlogHandoff()}`);
  console.log(
    "--------------------------------------------------------------------------------",
  );

  // 2. Active Claims & Dual-Track Status
  const { claims } = readClaims();
  const activeClaims = claims.filter((c) => c.status !== "DONE");
  const pausedClaims = claims.filter((c) =>
    ["PAUSED_QUOTA", "PAUSED_CONTEXT", "READY_FOR_PICKUP"].includes(c.status),
  );

  if (activeClaims.length > 0) {
    console.log("🔒 当前活跃任务分轨锁 (Active Claims):");
    activeClaims.forEach((c) => {
      const trackTag = c.track ? `[分轨: ${c.track}]` : "[分轨: FULL]";
      const statusTag = c.status ? `[状态: ${c.status}]` : "[状态: IN_PROGRESS]";
      const featureTag = c.feature ? `(模块: ${c.feature})` : "";
      console.log(
        `  • ${trackTag} ${statusTag} [${c.agent || "Agent"}] 任务: ${c.task || c.taskId} ${featureTag}`,
      );
      if (c.progress) {
        console.log(`    进度: ${c.progress}`);
      }
      if (c.files && c.files.length > 0) {
        console.log(`    锁定文件: ${c.files.join(", ")}`);
      }
    });
  } else {
    console.log("🔒 当前活跃任务分轨锁: (暂无显式占位锁)");
  }
  console.log(
    "--------------------------------------------------------------------------------",
  );

  // 3. Paused / Relay-Ready Tasks
  if (pausedClaims.length > 0) {
    console.log("⏸️  待接力任务断点池 (Awaiting Autonomous Relay):");
    pausedClaims.forEach((c) => {
      console.log(
        `  👉 【可接力】任务: ${c.task || c.taskId} | 原负责人: ${c.agent} | 状态: ${c.status}`,
      );
      if (c.breakpoint?.reason) {
        console.log(`     暂停原因: ${c.breakpoint.reason}`);
      }
      if (c.breakpoint?.pending && c.breakpoint.pending.length > 0) {
        console.log(
          `     接力待办: ${c.breakpoint.pending.join(" | ")}`,
        );
      }
      if (c.breakpoint?.testCmd) {
        console.log(`     验证命令: ${c.breakpoint.testCmd}`);
      }
      console.log(
        `     💡 接力指引: node scripts/governance/agent-radar.mjs pickup ${c.task || c.taskId}`,
      );
    });
    console.log(
      "--------------------------------------------------------------------------------",
    );
  }

  // 4. Live Worktrees & Dirty Changes
  const worktrees = getWorktrees();
  console.log(`🌲 检测到 ${worktrees.length} 个活跃工作树 (Worktrees):`);
  const fileToWorktrees = new Map();

  worktrees.forEach((wt, idx) => {
    const isRoot = path.resolve(wt.worktree) === path.resolve(REPO_ROOT);
    const tag = isRoot ? "[主仓工作树 MAIN]" : "[任务隔离工作树]";
    console.log(`\n  ${idx + 1}. ${tag} ${wt.worktree}`);
    console.log(
      `     分支: ${wt.branch || "detached"} (HEAD: ${wt.head?.slice(0, 8)})`,
    );

    const changes = getWorktreeChanges(wt.worktree);
    if (changes.length === 0) {
      console.log("     改动状态: 干净 (Clean)");
    } else {
      console.log(`     正在编辑的未提交文件 (${changes.length} 项):`);
      changes.slice(0, 8).forEach((ch) => {
        console.log(`       • [${ch.code}] ${ch.file}`);
        const list = fileToWorktrees.get(ch.file) || [];
        list.push(wt.worktree);
        fileToWorktrees.set(ch.file, list);
      });
      if (changes.length > 8) {
        console.log(`       ... 还有 ${changes.length - 8} 个文件未列出`);
      }
    }
  });

  // 5. Dual-Track Orthogonality & Collision Analysis
  console.log(
    "\n--------------------------------------------------------------------------------",
  );

  // Check Orthogonal Concurrency (same feature, different tracks)
  const featureToTracks = new Map();
  activeClaims.forEach((c) => {
    if (c.feature && c.status === "IN_PROGRESS") {
      const list = featureToTracks.get(c.feature) || [];
      list.push(c);
      featureToTracks.set(c.feature, list);
    }
  });

  let orthogonalActive = false;
  for (const [feat, claimsOnFeat] of featureToTracks.entries()) {
    if (claimsOnFeat.length > 1) {
      const tracks = new Set(claimsOnFeat.map((c) => c.track));
      if (tracks.size === claimsOnFeat.length) {
        orthogonalActive = true;
        console.log(
          `✨ 【正交双轨协同 Dual-Track Active】模块 "${feat}": 存在正交并发协作:`,
        );
        claimsOnFeat.forEach((c) => {
          console.log(`     -> [${c.track} 轨] ${c.agent} 推进任务 ${c.task || c.taskId}`);
        });
        console.log("     说明: 视觉呈现轨与业务功能轨正交隔离，允许无害并发！");
      }
    }
  }

  // Check File Collisions
  let collisionCount = 0;
  for (const [file, wts] of fileToWorktrees.entries()) {
    if (wts.length > 1) {
      collisionCount++;
      console.log(`⚠️  【冲突预警】文件 "${file}" 被多个工作树同时修改:`);
      wts.forEach((w) => console.log(`      -> ${w}`));
    }
  }

  if (collisionCount === 0) {
    if (orthogonalActive) {
      console.log("✅ 多 Agent 协同状态: 运行中 (分轨正交协作，0 文件冲突)");
    } else {
      console.log("✅ 多 Agent 文件冲突检测: 无冲突 (0 Collisions)");
    }
  } else {
    console.log(
      `❌ 警告: 发现 ${collisionCount} 处并发文件修改冲突！请立即停手协同！`,
    );
  }
  console.log(
    "================================================================================",
  );
}

function claimTask(agent, task, options = {}) {
  const data = readClaims();
  const track = (options.track || "FULL").toUpperCase();
  const feature = options.feature || "";
  const files = Array.isArray(options.files) ? options.files : [];

  // Check for same-track collision on same feature
  if (feature) {
    const trackConflict = data.claims.find(
      (c) =>
        c.task !== task &&
        c.feature === feature &&
        c.track === track &&
        c.status === "IN_PROGRESS",
    );
    if (trackConflict) {
      console.error(
        `❌ [CLAIM REJECTED] 模块 "${feature}" 的 [${track}] 分轨已被任务 ${trackConflict.task} (${trackConflict.agent}) 占用！`,
      );
      process.exit(1);
    }
  }

  // Check file collisions
  if (files.length > 0) {
    const fileConflict = data.claims.find(
      (c) =>
        c.task !== task &&
        c.status === "IN_PROGRESS" &&
        c.files?.some((f) => files.includes(f)),
    );
    if (fileConflict) {
      console.error(
        `❌ [CLAIM REJECTED] 文件已被任务 ${fileConflict.task} (${fileConflict.agent}) 锁定！`,
      );
      process.exit(1);
    }
  }

  const existingIndex = data.claims.findIndex(
    (c) => (c.task || c.taskId) === task,
  );
  const now = new Date().toISOString();
  const entry = {
    agent,
    task,
    taskId: task,
    track,
    feature,
    status: "IN_PROGRESS",
    files,
    worktree: REPO_ROOT,
    startedAt: existingIndex >= 0 ? data.claims[existingIndex].startedAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) data.claims[existingIndex] = entry;
  else data.claims.push(entry);
  writeClaims(data);

  console.log(
    `✅ [CLAIM SUCCESS] ${agent} 成功认领任务 ${task} [分轨: ${track}]${feature ? ` (模块: ${feature})` : ""}`,
  );
  if (files.length > 0) console.log(`   锁定文件: ${files.join(", ")}`);
}

function pauseTask(task, options = {}) {
  const data = readClaims();
  const entry = data.claims.find((c) => (c.task || c.taskId) === task);
  if (!entry) {
    console.error(`❌ 未找到任务 ${task} 的认领记录，无法暂停。`);
    process.exit(1);
  }

  const reasonType = (options.reason || "PAUSED_QUOTA").toUpperCase();
  entry.status = reasonType.includes("CONTEXT")
    ? "PAUSED_CONTEXT"
    : "PAUSED_QUOTA";
  entry.updatedAt = new Date().toISOString();
  entry.progress = options.progress || entry.progress || "任务阶段性推进";
  entry.breakpoint = {
    reason: options.reasonDetail || `${entry.status}: 达到单次会话额度/上下文边界`,
    pending: options.pending ? options.pending.split(/[,|;]/).map((s) => s.trim()) : [],
    testCmd: options.testCmd || "npm run test:fast && npm run rules:check",
  };

  writeClaims(data);

  // Append checkpoint note to memlog.md
  appendMemlog(
    `${task} 断点挂起留痕 (等待接力)`,
    [
      `**状态**：${entry.status}`,
      `**原因**：${entry.breakpoint.reason}`,
      `**已完成进展**：${entry.progress}`,
      `**后续接力待办**：${entry.breakpoint.pending.join("；") || "依断点继续执行验证并交付"}`,
      `**快速验证命令**：\`${entry.breakpoint.testCmd}\``,
    ],
    entry.agent,
  );

  console.log(
    `⏸️  [PAUSE RECORDED] 任务 ${task} 已记录断点 [${entry.status}]，已在 memlog.md 自动追加接力记录！`,
  );
}

function pickupTask(taskArg, agent = "Antigravity") {
  const data = readClaims();
  let targetTask = taskArg;

  if (!targetTask) {
    // Find the first paused or ready_for_pickup task
    const candidate = data.claims.find((c) =>
      ["PAUSED_QUOTA", "PAUSED_CONTEXT", "READY_FOR_PICKUP"].includes(c.status),
    );
    if (!candidate) {
      console.log("ℹ️ 当前没有处于挂起或待接力状态的任务。");
      return;
    }
    targetTask = candidate.task || candidate.taskId;
  }

  const entry = data.claims.find((c) => (c.task || c.taskId) === targetTask);
  if (!entry) {
    console.error(`❌ 未找到任务 ${targetTask} 的记录。`);
    process.exit(1);
  }

  const prevAgent = entry.agent;
  const prevStatus = entry.status;
  entry.agent = agent;
  entry.status = "IN_PROGRESS";
  entry.updatedAt = new Date().toISOString();
  writeClaims(data);

  // Append pickup note to memlog.md
  appendMemlog(
    `${targetTask} 任务接力激活`,
    [
      `**接力 Agent**：${agent} (从 ${prevAgent} 的 ${prevStatus} 断点无缝续做)`,
      `**先前进展**：${entry.progress || "未提供"}`,
      `**接力待办**：${entry.breakpoint?.pending?.join("；") || "继续推进并完成门禁验证"}`,
      `**建议验证命令**：\`${entry.breakpoint?.testCmd || "npm run test:fast"}\``,
    ],
    agent,
  );

  console.log(
    `🤝 [PICKUP SUCCESS] ${agent} 已成功从 ${prevAgent} 手中接力任务 ${targetTask}！`,
  );
  console.log(`   先前进展: ${entry.progress || "无"}`);
  if (entry.breakpoint?.pending) {
    console.log(`   待办项: ${entry.breakpoint.pending.join(" | ")}`);
  }
  if (entry.breakpoint?.testCmd) {
    console.log(`   验证命令: ${entry.breakpoint.testCmd}`);
  }
}

function releaseTask(task) {
  const data = readClaims();
  const before = data.claims.length;
  data.claims = data.claims.filter((c) => (c.task || c.taskId) !== task);
  writeClaims(data);
  if (data.claims.length < before) {
    console.log(
      `✅ [RELEASE SUCCESS] 任务 ${task} 活跃锁已释放。请确保已在 memlog.md 追加最终交付思维！`,
    );
  } else {
    console.log(`ℹ️ 任务 ${task} 未在锁表中。`);
  }
}

function pruneMergedBranches() {
  console.log("🧹 正在检查并收敛已合入 main 的陈旧分支与工作树...");
  runGit(["worktree", "prune"]);
  console.log("  • 已执行 git worktree prune 清理孤立工作树元数据。");

  const mergedOutput = runGit(["branch", "--merged", "main"]);
  const branches = mergedOutput
    .split("\n")
    .map((b) => b.trim().replace(/^\*\s*/, ""))
    .filter(Boolean)
    .filter((b) => b !== "main" && b !== "master");

  if (branches.length === 0) {
    console.log("  • 没有发现需要收敛的已合入分支，分支环境非常干净！");
    return;
  }

  let deletedCount = 0;
  for (const b of branches) {
    try {
      runGit(["branch", "-d", b]);
      console.log(`  ✓ 成功收敛删除已合入分支: ${b}`);
      deletedCount++;
    } catch {
      console.warn(`  ! 分支 ${b} 暂未删除`);
    }
  }
  console.log(`\n🎉 收敛完成：共清理 ${deletedCount} 个已合入任务分支，当前仅保留主干！`);
}

// CLI Routing
const [cmd, ...args] = process.argv.slice(2);
if (!cmd || cmd === "status" || cmd === "scan") {
  showRadar();
} else if (cmd === "claim") {
  const agent = args[0];
  const task = args[1];
  if (!agent || !task) {
    console.error(
      "用法: node agent-radar.mjs claim <agent-name> <task-id> [--track=UI|LOGIC] [--feature=name] [files...]",
    );
    process.exit(1);
  }
  const opts = { track: "FULL", feature: "", files: [] };
  args.slice(2).forEach((arg) => {
    if (arg.startsWith("--track=")) opts.track = arg.split("=")[1];
    else if (arg.startsWith("--feature=")) opts.feature = arg.split("=")[1];
    else opts.files.push(arg);
  });
  claimTask(agent, task, opts);
} else if (cmd === "pause") {
  const task = args[0];
  if (!task) {
    console.error("用法: node agent-radar.mjs pause <task-id> [--reason=QUOTA|CONTEXT] [--pending=items] [--progress=summary]");
    process.exit(1);
  }
  const opts = { reason: "PAUSED_QUOTA", pending: "", progress: "", reasonDetail: "", testCmd: "" };
  args.slice(1).forEach((arg) => {
    if (arg.startsWith("--reason=")) opts.reason = arg.split("=")[1];
    else if (arg.startsWith("--pending=")) opts.pending = arg.split("=")[1];
    else if (arg.startsWith("--progress=")) opts.progress = arg.split("=")[1];
    else if (arg.startsWith("--detail=")) opts.reasonDetail = arg.split("=")[1];
    else if (arg.startsWith("--test=")) opts.testCmd = arg.split("=")[1];
  });
  pauseTask(task, opts);
} else if (cmd === "pickup") {
  const task = args[0];
  const agent = args[1] || "Antigravity";
  pickupTask(task, agent);
} else if (cmd === "release") {
  const [task] = args;
  if (!task) {
    console.error("用法: node agent-radar.mjs release <task-id>");
    process.exit(1);
  }
  releaseTask(task);
} else if (cmd === "prune") {
  pruneMergedBranches();
} else {
  console.error(`未知命令 "${cmd}". 支持: status, claim, pause, pickup, release, prune`);
  process.exit(1);
}
