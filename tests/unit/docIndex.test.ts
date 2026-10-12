import assert from "node:assert/strict";
import test from "node:test";
import {
  checkAdrNumbering,
  checkIndexCoverage,
  checkRetiredAdrDirectories,
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
