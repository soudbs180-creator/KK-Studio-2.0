// memsearch.mjs — KK Studio 本地轻量化影子检索索引引擎
// 吸收 zilliztech/memsearch 核心设计哲学：
// 1. Markdown is Truth：Markdown 永远是唯一真实真值来源
// 2. Shadow Rebuildable Index：索引仅作为可瞬时重建的瞬态缓存
// 3. Progressive Disclosure：三层渐进式展开（摘要 -> 块展开 -> 全文跳转）
// 4. Cross-Agent Universal：Cursor、Codex、Claude、Antigravity 全平台通用秒级检索

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const MEMORY_DIR = path.join(REPO_ROOT, "docs/governance/ai-memory");
const ARCH_DIR = path.join(REPO_ROOT, "docs/architecture");
const INDEX_CACHE = path.join(REPO_ROOT, ".tmp/memsearch-index.json");

function computeHash(content) {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

function discoverMarkdownFiles() {
  const targets = [];

  // 1. ai-memory files
  if (fs.existsSync(MEMORY_DIR)) {
    const memFiles = fs.readdirSync(MEMORY_DIR, { withFileTypes: true });
    for (const f of memFiles) {
      if (f.isFile() && f.name.endsWith(".md")) {
        let domain = "global";
        if (f.name.includes("ui")) domain = "ui";
        else if (f.name.includes("runtime") || f.name.includes("engine")) domain = "runtime";
        else if (f.name.includes("mcp")) domain = "mcp";
        targets.push({
          file: path.relative(REPO_ROOT, path.join(MEMORY_DIR, f.name)).replace(/\\/g, "/"),
          domain,
        });
      }
    }
    // Check archive
    const archiveDir = path.join(MEMORY_DIR, "archive");
    if (fs.existsSync(archiveDir)) {
      const archFiles = fs.readdirSync(archiveDir, { withFileTypes: true });
      for (const af of archFiles) {
        if (af.isFile() && af.name.endsWith(".md")) {
          targets.push({
            file: path.relative(REPO_ROOT, path.join(archiveDir, af.name)).replace(/\\/g, "/"),
            domain: "archive",
          });
        }
      }
    }
  }

  // 2. architecture whitepapers
  if (fs.existsSync(ARCH_DIR)) {
    const archFiles = fs.readdirSync(ARCH_DIR, { withFileTypes: true });
    for (const f of archFiles) {
      if (f.isFile() && f.name.endsWith(".md")) {
        targets.push({
          file: path.relative(REPO_ROOT, path.join(ARCH_DIR, f.name)).replace(/\\/g, "/"),
          domain: "architecture",
        });
      }
    }
  }

  return targets;
}

export function parseMarkdownChunks(relFile, domain) {
  const fullPath = path.join(REPO_ROOT, relFile);
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, "utf8");
  const lines = text.split(/\r?\n/);
  const chunks = [];

  let currentTitle = path.basename(relFile, ".md");
  let currentStart = 1;
  let currentLines = [];
  let currentDate = "";
  let currentAgent = "";

  function flush(endLine) {
    if (currentLines.length === 0) return;
    const body = currentLines.join("\n").trim();
    if (!body || body.length < 20) return;

    const hash = computeHash(body);
    const id = `chunk_${hash.slice(0, 8)}`;
    const snippet = currentLines
      .slice(0, 5)
      .filter((l) => !l.startsWith("#") && l.trim())
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .join(" ")
      .slice(0, 160);

    chunks.push({
      id,
      file: relFile,
      domain,
      title: currentTitle,
      date: currentDate || "historical",
      agent: currentAgent || "AI Agent",
      startLine: currentStart,
      endLine,
      content: body,
      snippet: snippet || body.slice(0, 160),
      hash,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detect Markdown headers: ## [2026-11-06 ...] or ## Title
    const headerMatch = line.match(/^##\s+(?:\[(.*?)\]\s+)?(.*)/);
    if (headerMatch) {
      if (currentLines.length > 0) {
        flush(lineNum - 1);
        currentLines = [];
      }
      currentStart = lineNum;
      currentDate = headerMatch[1] || "";
      currentTitle = headerMatch[2] || headerMatch[1] || `Section @ L${lineNum}`;
      currentAgent = "";
    }

    // Detect agent line: - **执行 Agent**：... or - Agent: ...
    const agentMatch = line.match(/- \*\*(?:执行\s*)?Agent\*\*[:：]\s*(.*)/i) || line.match(/-\s+Agent[:：]\s*(.*)/i);
    if (agentMatch) {
      currentAgent = agentMatch[1].trim();
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    flush(lines.length);
  }

  return chunks;
}

export function buildIndex() {
  const files = discoverMarkdownFiles();
  const allChunks = [];
  for (const { file, domain } of files) {
    const fileChunks = parseMarkdownChunks(file, domain);
    allChunks.push(...fileChunks);
  }

  try {
    fs.mkdirSync(path.dirname(INDEX_CACHE), { recursive: true });
    fs.writeFileSync(INDEX_CACHE, JSON.stringify(allChunks, null, 2), "utf8");
  } catch {
    // Non-blocking
  }

  return allChunks;
}

export function getOrBuildIndex() {
  if (fs.existsSync(INDEX_CACHE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(INDEX_CACHE, "utf8"));
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch {
      // Rebuild on error
    }
  }
  return buildIndex();
}

export function searchMemories(query, options = {}) {
  const chunks = getOrBuildIndex();
  const topK = options.topK || 5;
  const targetDomain = options.domain?.toLowerCase();

  const queryTerms = query
    .toLowerCase()
    .split(/[\s,，、|/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (queryTerms.length === 0) return [];

  const hits = [];

  for (const chunk of chunks) {
    if (targetDomain && chunk.domain.toLowerCase() !== targetDomain) {
      continue;
    }

    const titleLower = chunk.title.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    const fileLower = chunk.file.toLowerCase();

    let score = 0;
    const matchingKeywords = [];

    for (const term of queryTerms) {
      let termScore = 0;
      if (titleLower.includes(term)) termScore += 5.0;
      if (fileLower.includes(term)) termScore += 2.0;

      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = contentLower.match(regex);
      if (matches) {
        termScore += Math.min(matches.length * 1.0, 5.0);
      }

      if (termScore > 0) {
        score += termScore;
        matchingKeywords.push(term);
      }
    }

    if (score > 0) {
      if (chunk.date.includes("2026-11")) {
        score *= 1.25;
      }
      hits.push({ score, chunk, matchingKeywords });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

export function expandChunk(chunkId) {
  const chunks = getOrBuildIndex();
  return chunks.find((c) => c.id === chunkId) || null;
}

// CLI Execution only when run as main script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const [cmd, ...cliArgs] = process.argv.slice(2);

  if (cmd === "search") {
    const query = cliArgs[0];
    if (!query) {
      console.error("用法: node memsearch.mjs search <query> [--domain=ui|runtime|global] [--top-k=5] [--json]");
      process.exit(1);
    }
    let domain = "";
    let topK = 5;
    let jsonOutput = false;

    cliArgs.slice(1).forEach((arg) => {
      if (arg.startsWith("--domain=")) domain = arg.split("=")[1];
      else if (arg.startsWith("--top-k=")) topK = Number.parseInt(arg.split("=")[1], 10);
      else if (arg === "--json") jsonOutput = true;
    });

    const hits = searchMemories(query, { domain, topK });

    if (jsonOutput) {
      console.log(JSON.stringify(hits, null, 2));
    } else {
      console.log("================================================================================");
      console.log(`🔍 KK Studio MemSearch — 检索词: "${query}" (命中: ${hits.length} 项)`);
      console.log("================================================================================");
      if (hits.length === 0) {
        console.log("ℹ️ 未找到相关记忆块。建议更换关键词或运行 node memsearch.mjs index 重建索引。");
      } else {
        hits.forEach((h, idx) => {
          const c = h.chunk;
          console.log(`[${idx + 1}] 匹配分: ${h.score.toFixed(1)} | [${c.domain.toUpperCase()}] | ${c.date} | ID: ${c.id}`);
          console.log(`    标题: ${c.title}`);
          console.log(`    文件: ${c.file} (L${c.startLine}-L${c.endLine}) | Agent: ${c.agent}`);
          console.log(`    摘要: ${c.snippet}...`);
          console.log(`    💡 展开详情: node scripts/governance/memsearch.mjs expand ${c.id}`);
          console.log("");
        });
      }
      console.log("================================================================================");
    }
  } else if (cmd === "expand") {
    const chunkId = cliArgs[0];
    if (!chunkId) {
      console.error("用法: node memsearch.mjs expand <chunk_id>");
      process.exit(1);
    }
    const chunk = expandChunk(chunkId);
    if (!chunk) {
      console.error(`❌ 未找到 ID 为 ${chunkId} 的记忆块。`);
      process.exit(1);
    }
    console.log("================================================================================");
    console.log(`📖 展开记忆块: [${chunk.id}] ${chunk.title}`);
    console.log(`   来源: ${chunk.file}:${chunk.startLine}-${chunk.endLine} | 日期: ${chunk.date} | Agent: ${chunk.agent}`);
    console.log("--------------------------------------------------------------------------------");
    console.log(chunk.content);
    console.log("================================================================================");
  } else if (cmd === "index" || cmd === "reindex") {
    console.log("🔄 正在扫描并重建 KK Studio MemSearch 影子索引...");
    const chunks = buildIndex();
    console.log(`✅ 重建完成：共索引 ${chunks.length} 个 Markdown 语义块 (缓存至 .tmp/memsearch-index.json)！`);
  } else if (cmd) {
    const hits = searchMemories(cmd, { topK: 5 });
    hits.forEach((h, idx) => {
      console.log(`[${idx + 1}] (${h.score.toFixed(1)}) [${h.chunk.domain}] ${h.chunk.title} (${h.chunk.file}:${h.chunk.startLine})`);
      console.log(`    ${h.chunk.snippet}...`);
    });
  } else {
    console.log("用法: node memsearch.mjs <search|expand|index> [args]");
  }
}
