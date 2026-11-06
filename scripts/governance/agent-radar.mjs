import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const CLAIMS_FILE = path.join(REPO_ROOT, "docs/governance/active-work.json");
const MEMLOG_FILE = path.join(REPO_ROOT, "docs/governance/ai-memory/memlog.md");
const MAILBOX_DIR = path.join(REPO_ROOT, "docs/governance/ai-memory/inbox");
const MESSAGES_FILE = path.join(MAILBOX_DIR, "messages.json");

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

export function readMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) return { messages: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf8"));
    return Array.isArray(parsed.messages) ? parsed : { messages: [] };
  } catch {
    return { messages: [] };
  }
}

export function writeMessages(data) {
  fs.mkdirSync(MAILBOX_DIR, { recursive: true });
  fs.writeFileSync(MESSAGES_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function sendAgentMessage(options) {
  const data = readMessages();
  const now = new Date();
  const id = `MSG-${now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}-${options.from.toLowerCase()}`;
  const msg = {
    id,
    from: options.from,
    to: options.to,
    timestamp: now.toISOString(),
    taskId: options.taskId || "",
    type: options.type || "DIRECT_HANDOFF",
    subject: options.subject,
    body: options.body,
    action: options.action || {},
    read: false,
  };
  data.messages.unshift(msg);
  writeMessages(data);
  console.log(`✉️  [MAILBOX SENT] 消息已投递给 [${options.to}]: "${options.subject}" (ID: ${id})`);
  return msg;
}

export function markMessageRead(msgId) {
  const data = readMessages();
  const msg = data.messages.find((m) => m.id === msgId);
  if (msg) {
    msg.read = true;
    writeMessages(data);
    console.log(`✓ 消息 ${msgId} 已标记为已读。`);
    return true;
  }
  return false;
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

export function showRadar(targetAgent = "") {
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

  // 2. Direct Inter-Agent Mailbox (Active Messages)
  const { messages } = readMessages();
  const unreadMessages = messages.filter((m) => !m.read);
  const relevantMessages = targetAgent
    ? unreadMessages.filter(
        (m) =>
          m.to.toLowerCase() === targetAgent.toLowerCase() ||
          m.to.toLowerCase() === "all" ||
          m.to.toLowerCase() === "broadcast",
      )
    : unreadMessages;

  if (relevantMessages.length > 0) {
    console.log(
      `📬 【AI 智能体直接互通信箱 (Inter-Agent Direct Mailbox)】: 发现 ${relevantMessages.length} 条待处理交接信！`,
    );
    relevantMessages.forEach((m) => {
      console.log(`  👉 [定向交接信 #${m.id}]`);
      console.log(`     发件人: [${m.from}] ➔ 收件人: [${m.to}] ${m.taskId ? `| 关联任务: ${m.taskId}` : ""}`);
      console.log(`     主题: ${m.subject}`);
      console.log(`     内容: ${m.body}`);
      if (m.action?.command) {
        console.log(`     💡 建议执行命令: ${m.action.command}`);
      }
      if (m.action?.pending && m.action.pending.length > 0) {
        console.log(`     📋 待办事项: ${m.action.pending.join(" | ")}`);
      }
      if (m.action?.testCmd) {
        console.log(`     🧪 验收命令: ${m.action.testCmd}`);
      }
      console.log("");
    });
    console.log(
      "--------------------------------------------------------------------------------",
    );
  }

  // 3. Active Claims & Dual-Track Status
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

  // 4. Paused / Relay-Ready Tasks
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

  // 5. Live Worktrees & Dirty Changes
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

  // 6. Dual-Track Orthogonality & Collision Analysis
  console.log(
    "\n--------------------------------------------------------------------------------",
  );

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
    `🚀 [PICKUP SUCCESS] ${agent} 成功接力任务 ${targetTask} (原负责人: ${prevAgent})！`,
  );
  if (entry.breakpoint?.pending && entry.breakpoint.pending.length > 0) {
    console.log(`   后续接力待办: ${entry.breakpoint.pending.join(" | ")}`);
  }
  if (entry.breakpoint?.testCmd) {
    console.log(`   建议验证命令: ${entry.breakpoint.testCmd}`);
  }
}

function releaseTask(task) {
  const data = readClaims();
  const idx = data.claims.findIndex((c) => (c.task || c.taskId) === task);
  if (idx >= 0) {
    data.claims[idx].status = "DONE";
    data.claims[idx].updatedAt = new Date().toISOString();
    writeClaims(data);
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
  const targetAgent = args[0]?.startsWith("--agent=") ? args[0].split("=")[1] : (process.env.AGENT_NAME || "");
  showRadar(targetAgent);
} else if (cmd === "send" || cmd === "msg:send") {
  const opts = { from: "Agent", to: "All", subject: "", body: "", taskId: "", action: {} };
  args.forEach((a) => {
    if (a.startsWith("--from=")) opts.from = a.split("=")[1];
    else if (a.startsWith("--to=")) opts.to = a.split("=")[1];
    else if (a.startsWith("--subject=")) opts.subject = a.split("=")[1];
    else if (a.startsWith("--body=")) opts.body = a.split("=")[1];
    else if (a.startsWith("--task=")) opts.taskId = a.split("=")[1];
    else if (a.startsWith("--cmd=")) opts.action.command = a.split("=")[1];
    else if (a.startsWith("--test=")) opts.action.testCmd = a.split("=")[1];
    else if (a.startsWith("--pending=")) opts.action.pending = a.split("=")[1].split(";");
  });
  if (!opts.subject) {
    console.error("用法: node agent-radar.mjs send --from=A --to=B --subject='...' [--body='...'] [--task=...] [--cmd=...]");
    process.exit(1);
  }
  sendAgentMessage(opts);
} else if (cmd === "ack" || cmd === "msg:ack") {
  const msgId = args[0];
  if (!msgId) {
    console.error("用法: node agent-radar.mjs ack <msg-id>");
    process.exit(1);
  }
  markMessageRead(msgId);
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
  console.error(`未知命令 "${cmd}". 支持: status, send, ack, claim, pause, pickup, release, prune`);
  process.exit(1);
}
