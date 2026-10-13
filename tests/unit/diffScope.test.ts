import assert from "node:assert/strict";
import test from "node:test";
import { globToRegExp } from "../../scripts/governance/diff-scope.mjs";

test("globToRegExp supports zero, one, and multiple directory levels", () => {
  const scripts = globToRegExp("**/*.mjs");
  assert.equal(scripts.test("root.mjs"), true);
  assert.equal(scripts.test("scripts/check.mjs"), true);
  assert.equal(scripts.test("scripts/windows/desktop-release.mjs"), true);
  assert.equal(scripts.test("scripts/windows/desktop-release.ts"), false);
});

test("globToRegExp matches Windows paths after normalization", () => {
  const workflows = globToRegExp("**/*.yml");
  assert.equal(workflows.test(".github\\workflows\\quality.yml"), true);
  assert.equal(workflows.test("quality.yaml"), false);
});

test("globToRegExp preserves directory exclusions", () => {
  const generated = globToRegExp("**/node_modules/**");
  assert.equal(generated.test("node_modules/package/index.js"), true);
  assert.equal(generated.test("vendor/node_modules/package/index.js"), true);
  assert.equal(generated.test("src/node_modules/package/index.js"), true);
  assert.equal(generated.test("src/package/index.js"), false);
});
