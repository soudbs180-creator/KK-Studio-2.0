import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import {
  globToRegExp,
  readSwitch,
} from "../../scripts/governance/diff-scope.mjs";

function switchFixture(t: TestContext, content: string) {
  const root = mkdtempSync(join(tmpdir(), "kk-switch-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "config.mjs"), content);
  return root;
}

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

test("readSwitch keeps health and footgun enforcement independent", (t) => {
  const root = switchFixture(
    t,
    [
      'export const ENFORCEMENT = "blocking";',
      'export const FOOTGUNS_ENFORCEMENT = "advisory";',
    ].join("\n"),
  );
  assert.equal(readSwitch(root, null, "config.mjs", "ENFORCEMENT"), "blocking");
  assert.equal(
    readSwitch(root, null, "config.mjs", "FOOTGUNS_ENFORCEMENT"),
    "advisory",
  );
});

test("readSwitch fails closed when only the other switch exists", (t) => {
  const root = switchFixture(t, 'export const FOOTGUNS_ENFORCEMENT = "off";');
  assert.equal(readSwitch(root, null, "config.mjs", "ENFORCEMENT"), "blocking");
});
