import assert from "node:assert/strict";
import test from "node:test";
import {
  checkDocumentCommands,
  extractNpmRunScripts,
  isExemptPath,
} from "../../scripts/governance/doc-commands.mjs";

/**
 * 文档命令引用门禁的纯函数测试。
 *
 * 背景：REPO-STRUCTURE.md 曾指引执行 `npm run governance:worktree-audit`，
 * 而该脚本在 package.json 中不存在。文档指向不存在的命令比没有文档更糟。
 */

const SCRIPTS = {
  lint: "eslint",
  verify: "npm run lint",
  "index:check": "node scripts/check-doc-index.mjs",
};

test("extractNpmRunScripts 提取并去重脚本名", () => {
  const source =
    "先跑 `npm run lint`，再跑 `npm run verify`，重复 `npm run lint`。";
  assert.deepEqual(extractNpmRunScripts(source), ["lint", "verify"]);
});

test("extractNpmRunScripts 跳过 shell 变量与占位符", () => {
  const source = "运行 npm run $SCRIPT 和 npm run <name> 不应被校验。";
  assert.deepEqual(extractNpmRunScripts(source), []);
});

test("checkDocumentCommands 检出不存在的脚本", () => {
  const issues = checkDocumentCommands(
    "检查命令：`npm run governance:worktree-audit`。",
    SCRIPTS,
    "docs/REPO-STRUCTURE.md",
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0], /governance:worktree-audit/);
  assert.match(issues[0], /docs\/REPO-STRUCTURE\.md/);
});

test("checkDocumentCommands 放行真实存在的脚本", () => {
  const source = "执行 `npm run lint` 与 `npm run index:check`。";
  assert.deepEqual(
    checkDocumentCommands(source, SCRIPTS, "docs/README.md"),
    [],
  );
});

test("checkDocumentCommands 支持冒号命名的脚本", () => {
  assert.deepEqual(
    checkDocumentCommands(
      "跑 `npm run index:check`。",
      SCRIPTS,
      "docs/README.md",
    ),
    [],
  );
});

test("isExemptPath 豁免历史交付包与归档", () => {
  assert.equal(
    isExemptPath("docs/changes/2026-10-10-system-audit/plan.md"),
    true,
  );
  assert.equal(
    isExemptPath("docs/archive/ui-history/UI-STANDARDS-2026-09.md"),
    true,
  );
  assert.equal(isExemptPath("docs/engineering/BRANCH-POLICY.md"), false);
  assert.equal(isExemptPath("docs/README.md"), false);
});
