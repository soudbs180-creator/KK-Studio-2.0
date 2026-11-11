import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  parseMarkdownChunks,
  searchMemories,
  expandChunk,
  buildIndex,
} from "../../scripts/governance/memsearch.mjs";

test("memsearch: parseMarkdownChunks correctly chunks markdown headings with metadata", () => {
  const tmpFile = ".tmp/test-memory-chunking.md";
  const content = `# Test Header

## [2026-11-08] Task A Completed
- **执行 Agent**：Antigravity
- 核心成果：完成了本地检索索引引擎的搭建与测试验证。

## [2026-11-07] Task B Paused
- **执行 Agent**：Cursor
- 核心进展：完成了成本回执逻辑，单测全部通过。
`;

  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(tmpFile, content, "utf8");

  try {
    const chunks = parseMarkdownChunks(tmpFile, "test-domain");
    assert.equal(chunks.length, 2);

    const chunk1 = chunks[0];
    assert.equal(chunk1.date, "2026-11-08");
    assert.equal(chunk1.agent, "Antigravity");
    assert.ok(chunk1.title.includes("Task A Completed"));
    assert.ok(chunk1.content.includes("本地检索索引引擎"));
    assert.ok(chunk1.id.startsWith("chunk_"));

    const chunk2 = chunks[1];
    assert.equal(chunk2.date, "2026-11-07");
    assert.equal(chunk2.agent, "Cursor");
    assert.ok(chunk2.title.includes("Task B Paused"));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test("memsearch: buildIndex and searchMemories retrieve relevant chunks by keyword and domain", () => {
  const allChunks = buildIndex();
  assert.ok(
    allChunks.length > 10,
    "Should index more than 10 chunks from repository memory and architecture",
  );

  const hits = searchMemories("Topaz", { topK: 3 });
  assert.ok(
    hits.length > 0,
    "Should find Topaz mentions in architecture and memory",
  );
  assert.ok(hits[0].score > 0);
  assert.ok(hits[0].matchingKeywords.includes("topaz"));

  // Domain filter
  const uiHits = searchMemories("图标", { domain: "ui", topK: 3 });
  assert.ok(
    uiHits.length > 0,
    "Should find UI chunks when filtering by ui domain",
  );
  assert.equal(uiHits[0].chunk.domain, "ui");
});

test("memsearch: expandChunk returns full content for matching chunk id", () => {
  const hits = searchMemories("Topaz", { topK: 1 });
  assert.ok(hits.length > 0);

  const targetId = hits[0].chunk.id;
  const expanded = expandChunk(targetId);
  assert.ok(expanded !== null);
  assert.equal(expanded.id, targetId);
  assert.ok(expanded.content.length > 30);
});
