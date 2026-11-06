// AI 共享思维流管理工具 (支持分领域隔离读取)
// 用于跨平台 Agent（Cursor, Claude, Antigravity, Copilot）快速查询、验证和交接思维链

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const memoryDir = path.join(repoRoot, "docs/governance/ai-memory");

const DOMAIN_MAP = {
  global: "memlog.md",
  ui: "ui-motion.md",
  frontend: "ui-motion.md",
  motion: "ui-motion.md",
  runtime: "engine-runtime.md",
  engine: "engine-runtime.md",
  mcp: "mcp-gateway.md",
};

function resolveTargetFile(domainArg) {
  const key = (domainArg || "global").toLowerCase();
  const fileName = DOMAIN_MAP[key] || "memlog.md";
  return path.join(memoryDir, fileName);
}

function readLatestMemory(domainArg) {
  const targetPath = resolveTargetFile(domainArg);
  if (!fs.existsSync(targetPath)) {
    console.error(`[AI-MEMORY] 未找到该领域的思维文件: ${targetPath}`);
    return;
  }
  const content = fs.readFileSync(targetPath, "utf8");
  const entries = content.split(
    /\n(?=## \[\d{4}-\d{2}-\d{2}|### \[\d{4}-\d{2}-\d{2})/,
  );
  const latest = entries.length > 1 ? entries[1] : entries[0];

  console.log(
    "================================================================================",
  );
  console.log(
    `【KK Studio AI 共享思维 - [${(domainArg || "GLOBAL").toUpperCase()}] 领域最新上下文】`,
  );
  console.log(
    "================================================================================",
  );
  console.log(latest.trim());
  console.log(
    "================================================================================",
  );
}

function writeMemory(domainArg, title, items, agent = "AI Agent") {
  const targetPath = resolveTargetFile(domainArg);
  if (!fs.existsSync(targetPath)) {
    console.error(`[AI-MEMORY] 未找到该领域的思维文件: ${targetPath}`);
    process.exit(1);
  }
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const block = `\n## [${timeStr}] ${title}\n- **执行 Agent**：${agent}\n${items.map((it) => `- ${it}`).join("\n")}\n`;
  const content = fs.readFileSync(targetPath, "utf8");
  const dividerIdx = content.indexOf("\n---\n");
  if (dividerIdx !== -1) {
    const head = content.slice(0, dividerIdx + 5);
    const rest = content.slice(dividerIdx + 5);
    fs.writeFileSync(targetPath, head + block + rest, "utf8");
  } else {
    fs.writeFileSync(targetPath, block + content, "utf8");
  }
  console.log(`[AI-MEMORY] 成功写入 [${(domainArg || "GLOBAL").toUpperCase()}] 思维流（置于最新头部）。`);
}

function checkMemoryHealth() {
  if (!fs.existsSync(memoryDir)) {
    console.error(`[AI-MEMORY] FAIL: 缺少必要目录 ${memoryDir}`);
    process.exit(1);
  }
  const memlog = path.join(memoryDir, "memlog.md");
  if (!fs.existsSync(memlog)) {
    console.error(`[AI-MEMORY] FAIL: 缺少全局 memlog.md`);
    process.exit(1);
  }
  console.log(
    "[AI-MEMORY] PASS: AI 分域思维系统健康，支持 ui/runtime/mcp/global 按需加载。",
  );
}

const command = process.argv[2] || "read";

if (command === "check" || command === "verify") {
  checkMemoryHealth();
} else if (command === "write" || command === "append") {
  const domain = process.argv[3] || "global";
  const title = process.argv[4] || "阶段思维留痕";
  const agent = process.argv[5] || "AI Agent";
  const items = process.argv.slice(6);
  writeMemory(domain, title, items.length > 0 ? items : ["阶段性进展已沉淀"], agent);
} else {
  const domain = process.argv[3] || (command !== "read" ? command : "global");
  readLatestMemory(domain);
}
