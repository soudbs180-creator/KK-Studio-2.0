import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_FILES,
  checkChangedPackages,
  checkPackageCompleteness,
  resolvePackageDir,
} from "../../scripts/governance/delivery-completeness.mjs";

/**
 * 交付包完整性门禁的纯函数测试。
 *
 * 背景：SDLC 要求每次交付建立 intent/spec/plan/verification/review 五件套，
 * 实测 116 个交付包中 29 个缺件，且无任何门禁拦截。
 */

const FULL_PACKAGE = CORE_FILES.map(
  (file) => `docs/changes/2026-10-11-demo/${file}`,
);

test("resolvePackageDir 解析合规交付包路径", () => {
  assert.equal(
    resolvePackageDir("docs/changes/2026-10-11-gov-phase0/plan.md"),
    "docs/changes/2026-10-11-gov-phase0",
  );
});

test("resolvePackageDir 忽略非交付包与命名不合规目录", () => {
  assert.equal(resolvePackageDir("docs/engineering/BRANCH-POLICY.md"), null);
  assert.equal(resolvePackageDir("docs/changes/not-a-date/plan.md"), null);
  assert.equal(resolvePackageDir("src/features/creation/model.ts"), null);
});

test("checkPackageCompleteness 五件套齐全时放行", () => {
  const exists = (file) => FULL_PACKAGE.includes(file);
  assert.deepEqual(
    checkPackageCompleteness(
      "docs/changes/2026-10-11-demo",
      exists,
      () => false,
    ),
    [],
  );
});

test("checkPackageCompleteness 列出全部缺失文件", () => {
  const exists = () => false;
  const issues = checkPackageCompleteness(
    "docs/changes/2026-10-11-demo",
    exists,
    () => false,
  );
  assert.equal(issues.length, 1);
  for (const file of CORE_FILES)
    assert.match(issues[0], new RegExp(file.replace(".", "\\.")));
});

test("checkPackageCompleteness 放行显式豁免的历史包", () => {
  const issues = checkPackageCompleteness(
    "docs/changes/2026-10-10-legacy",
    () => false,
    () => true,
  );
  assert.deepEqual(issues, []);
});

test("checkChangedPackages 对同一交付包只判定一次", () => {
  const exists = (file) => !file.endsWith("review.md");
  const issues = checkChangedPackages(
    [
      "docs/changes/2026-10-11-demo/intent.md",
      "docs/changes/2026-10-11-demo/plan.md",
      "docs/changes/2026-10-11-demo/spec.md",
    ],
    exists,
    () => false,
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0], /review\.md/);
});

test("checkChangedPackages 忽略非交付包变更", () => {
  const issues = checkChangedPackages(
    ["src/App.tsx", "docs/engineering/REVIEW.md", "package.json"],
    () => false,
    () => false,
  );
  assert.deepEqual(issues, []);
});
