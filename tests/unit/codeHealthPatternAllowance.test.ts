import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { type TestContext } from "node:test";

const checker = fileURLToPath(
  new URL("../../scripts/check-code-health.mjs", import.meta.url),
);
const allowed =
  "// health: allow AS_ANY -- reviewed adapter boundary\nuse(v as any);";
const unallowed = "use(v as any);";

function checkChange(t: TestContext, before: string, after: string) {
  const root = mkdtempSync(join(tmpdir(), "kk-pattern-allow-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  mkdirSync(join(root, "src"));
  const source = join(root, "src", "fixture.ts");
  writeFileSync(source, before);
  git("add", "src/fixture.ts");
  git("commit", "-m", "base");
  const base = git("rev-parse", "HEAD");
  writeFileSync(source, after);
  git("add", "src/fixture.ts");
  git("commit", "-m", "head");
  const head = git("rev-parse", "HEAD");
  return spawnSync(
    process.execPath,
    [checker, "--base", base, "--head", head],
    { cwd: root, encoding: "utf8" },
  );
}

for (const [name, after] of [
  ["after", `${allowed}\n\n${unallowed}\n`],
  ["before", `${unallowed}\n\n${allowed}\n`],
]) {
  test(`an unallowed duplicate inserted ${name} an old allowance blocks the real CLI`, (t) => {
    const result = checkChange(t, `${allowed}\n`, after);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, /1 blocking, 0 allowed/);
  });
}

test("duplicate growth with every occurrence explicitly allowed still passes", (t) => {
  const result = checkChange(t, `${allowed}\n`, `${allowed}\n\n${allowed}\n`);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /0 blocking, 1 allowed/);
});

test("adding an allowance to old code cannot exempt a new unallowed duplicate", (t) => {
  const result = checkChange(
    t,
    `${unallowed}\n`,
    `${allowed}\n\n${unallowed}\n`,
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /1 blocking, 0 allowed/);
});
