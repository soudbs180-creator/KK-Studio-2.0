import assert from "node:assert/strict";
import test from "node:test";
import {
  checkAdrNumbering,
  checkIndexCoverage,
  checkRetiredAdrDirectories,
  checkCurrentDocumentUniqueness,
  checkDocumentLifecycleHeader,
  checkSnapshotHeader,
} from "../../scripts/governance/doc-index.mjs";

/**
 * 索引与 ADR 编号唯一性门禁的纯函数测试。
 *
 * 背景：docs/README.md 曾漏索引 3 份 engineering 文档，docs/governance/ 有 5 份
 * 未登记，ADR 编号出现 002/006/007 三组重复。这些都没有门禁，靠人工维护必然复发。
 */

test("checkIndexCoverage 检出未登记文档并放行已登记文档", () => {
  const index = [
    "| [SDLC](engineering/SDLC.md) | AI 自主开发 |",
    "| [BRANCH-POLICY](engineering/BRANCH-POLICY.md) | 分支策略 |",
    "| [KNOWN_ISSUES](governance/KNOWN_ISSUES.md) | 已知问题 |",
  ].join("\n");

  const inventory = [
    {
      directory: "docs/engineering",
      files: ["SDLC.md", "BRANCH-POLICY.md", "REVIEW.md"],
    },
    { directory: "docs/governance", files: ["KNOWN_ISSUES.md"] },
  ];

  const issues = checkIndexCoverage(index, inventory);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /docs\/engineering\/REVIEW\.md/);
});

test("checkIndexCoverage 放行 README.md 与已登记文档", () => {
  const index = "| [ARCHITECTURE](architecture/ARCHITECTURE.md) | 架构 |";
  const inventory = [
    { directory: "docs/architecture", files: ["ARCHITECTURE.md", "README.md"] },
  ];
  assert.deepEqual(checkIndexCoverage(index, inventory), []);
});

test("checkAdrNumbering 检出重复编号", () => {
  const issues = checkAdrNumbering([
    "ADR-002-local-main-integration.md",
    "ADR-002-taskhost-text-output.md",
    "ADR-006-stage-plan-package-contract.md",
  ]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /编号 ADR-002 重复/);
  assert.match(issues[0], /ADR-002-local-main-integration\.md/);
  assert.match(issues[0], /ADR-002-taskhost-text-output\.md/);
});

test("checkAdrNumbering 放行唯一编号与非 ADR 文件", () => {
  assert.deepEqual(
    checkAdrNumbering([
      "README.md",
      "ADR-001-task-isolation.md",
      "ADR-012-taskhost-text-output.md",
      "ADR-015-canvas-ui-token-alignment.md",
    ]),
    [],
  );
});

test("checkAdrNumbering 检出文件名不合规", () => {
  const issues = checkAdrNumbering(["adr-001-task-isolation.md"]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /文件名不符合/);
});

test("checkRetiredAdrDirectories 检出已废止的第二处 ADR 目录", () => {
  const issues = checkRetiredAdrDirectories([
    "architecture",
    "decisions",
    "features",
  ]);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /docs\/decisions\//);
});

test("checkRetiredAdrDirectories 放行归并后的目录结构", () => {
  assert.deepEqual(
    checkRetiredAdrDirectories([
      "architecture",
      "engineering",
      "features",
      "governance",
    ]),
    [],
  );
});

test("checkSnapshotHeader 要求数据源、日期和非权威声明", () => {
  const incomplete = "# Snapshot\n\n数据源：task-ledger.json\n";
  const issues = checkSnapshotHeader(
    incomplete,
    "docs/governance/TASK_STATUS.md",
  );
  assert.equal(issues.length, 2);
  assert.match(issues[0], /快照日期/);
  assert.match(issues[1], /不替代权威账本/);
});

test("checkSnapshotHeader 放行完整快照头", () => {
  const complete = [
    "> 快照日期：2026-10-12",
    "> 数据源：docs/governance/task-ledger.json",
    "> 本文不替代权威账本。",
  ].join("\n");
  assert.deepEqual(
    checkSnapshotHeader(complete, "docs/governance/TASK_STATUS.md"),
    [],
  );
});

test("checkSnapshotHeader 拒绝无效日期和过期未标注快照", () => {
  const stale = [
    "> 快照日期：2025-99-40",
    "> 数据源：docs/governance/task-ledger.json",
    "> 本文不替代权威账本。",
  ].join("\n");
  assert.match(
    checkSnapshotHeader(
      stale,
      "docs/governance/TASK_STATUS.md",
      new Date("2026-10-12T00:00:00Z"),
    ).join("\n"),
    /有效的 YYYY-MM-DD/,
  );

  const old = [
    "> 快照日期：2025-01-01",
    "> 数据源：docs/governance/task-ledger.json",
    "> 本文不替代权威账本。",
  ].join("\n");
  assert.match(
    checkSnapshotHeader(
      old,
      "docs/governance/TASK_STATUS.md",
      new Date("2026-10-12T00:00:00Z"),
    ).join("\n"),
    /超过 14 天/,
  );
});

test("checkDocumentLifecycleHeader 要求稳定身份、更新时间和替代字段", () => {
  const complete = [
    "- docId: TASK_STATUS",
    "- status: current",
    "- updatedAt: 2026-10-12",
    "- source: `docs/governance/task-ledger.json`",
    "- supersededBy: null",
  ].join("\n");
  assert.deepEqual(
    checkDocumentLifecycleHeader(complete, "docs/governance/TASK_STATUS.md", {
      documentId: "TASK_STATUS",
      source: "docs/governance/task-ledger.json",
      now: new Date("2026-10-12T00:00:00Z"),
    }),
    [],
  );
});

test("checkDocumentLifecycleHeader 拒绝当前文档指向旧版本", () => {
  const stale = [
    "- docId: AI_HANDOFF",
    "- status: current",
    "- updatedAt: 2026-10-12",
    "- source: `docs/governance/PROJECT_STATE.md`",
    "- supersededBy: docs/archive/AI_HANDOFF.md",
  ].join("\n");
  assert.match(
    checkDocumentLifecycleHeader(stale, "docs/governance/AI_HANDOFF.md", {
      documentId: "AI_HANDOFF",
      source: "docs/governance/PROJECT_STATE.md",
      now: new Date("2026-10-12T00:00:00Z"),
    }).join("\n"),
    /status=current 时 supersededBy 必须为 null/,
  );
});

test("checkDocumentLifecycleHeader 要求当前状态和精确来源", () => {
  const currentWithWrongSource = [
    "- docId: TASK_STATUS",
    "- status: current-copy",
    "- updatedAt: 2026-10-12",
    "- source: docs/governance/task-ledger.json.bak",
    "- supersededBy: null",
  ].join("\n");
  const issues = checkDocumentLifecycleHeader(
    currentWithWrongSource,
    "docs/governance/TASK_STATUS.md",
    {
      documentId: "TASK_STATUS",
      source: "docs/governance/task-ledger.json",
      expectedStatus: "current",
      now: new Date("2026-10-12T00:00:00Z"),
    },
  );
  assert.match(
    issues.join("\n"),
    /缺少 status=current\|superseded\|historical/,
  );
  assert.match(issues.join("\n"), /source 应精确为/);
});

test("checkDocumentLifecycleHeader 不把正文中的字段当作元数据", () => {
  const source = [
    "# Governance entry",
    "正文提到 status: current 和 source: docs/governance/task-ledger.json。",
  ].join("\n");
  const issues = checkDocumentLifecycleHeader(source, "entry.md", {
    expectedStatus: "current",
    now: new Date("2026-10-12T00:00:00Z"),
  });
  assert.match(issues.join("\n"), /缺少稳定 docId/);
  assert.match(issues.join("\n"), /缺少 source/);
});

test("checkDocumentLifecycleHeader 忽略代码块中的伪元数据并拒绝重复字段", () => {
  const source = [
    "# Entry",
    "```yaml",
    "- docId: FAKE",
    "- status: current",
    "```",
    "- docId: TASK_STATUS",
    "- docId: TASK_STATUS_COPY",
    "- status: current",
    "- updatedAt: 2026-10-12",
    "- source: `docs/governance/task-ledger.json`",
    "- supersededBy: null",
  ].join("\n");
  const issues = checkDocumentLifecycleHeader(source, "entry.md", {
    documentId: "TASK_STATUS",
    source: "docs/governance/task-ledger.json",
    expectedStatus: "current",
    now: new Date("2026-10-12T00:00:00Z"),
  });
  assert.match(issues.join("\n"), /docId 元数据出现重复字段/);
  assert.doesNotMatch(issues.join("\n"), /FAKE/);
});

test("checkDocumentLifecycleHeader 拒绝 malformed supersededBy", () => {
  const source = [
    "- docId: OLD",
    "- status: superseded",
    "- updatedAt: 2026-10-12",
    "- source: `docs/governance/task-ledger.json`",
    "- supersededBy: nullx",
  ].join("\n");
  const issues = checkDocumentLifecycleHeader(source, "old.md", {
    source: "docs/governance/task-ledger.json",
    now: new Date("2026-10-12T00:00:00Z"),
  });
  assert.match(issues.join("\n"), /supersededBy/);
});

test("checkDocumentLifecycleHeader 要求 supersededBy 指向已登记 current 文档", () => {
  const source = [
    "- docId: OLD",
    "- status: superseded",
    "- updatedAt: 2026-10-12",
    "- source: `docs/governance/task-ledger.json`",
    "- supersededBy: docs/governance/MISSING.md",
  ].join("\n");
  const issues = checkDocumentLifecycleHeader(source, "old.md", {
    source: "docs/governance/task-ledger.json",
    knownSupersededTargets: new Set([
      "PROJECT_STATE",
      "docs/governance/PROJECT_STATE.md",
    ]),
    now: new Date("2026-10-12T00:00:00Z"),
  });
  assert.match(issues.join("\n"), /未指向已登记/);
});

test("checkCurrentDocumentUniqueness 拒绝重复 current docId", () => {
  const source = ["- docId: PROJECT_STATE", "- status: current"].join("\n");
  assert.match(
    checkCurrentDocumentUniqueness([
      { filePath: "a.md", source },
      { filePath: "b.md", source },
    ]).join("\n"),
    /重复 current docId PROJECT_STATE/,
  );
});
