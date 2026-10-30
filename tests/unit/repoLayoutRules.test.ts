import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test, { type TestContext } from "node:test";
import {
  collectLayoutViolations,
  compareLayoutViolations,
  checkRepoLayout,
} from "../../scripts/governance/check-repo-layout.mjs";

const roots = ["README.md", "package.json"];
const entries = (paths: string[], size = 1) =>
  paths.map((file) => ({ file, size }));

test("layout accepts existing product/test/contracts and required vendor provenance", () => {
  assert.deepEqual(
    collectLayoutViolations(
      entries([
        "README.md",
        "src/features/edit/index.ts",
        "packages/creation-contracts/ports.ts",
        "tests/unit/example.test.ts",
        "mobile/tests/example.test.ts",
        "vendor/canvas-agent/UPSTREAM.md",
        "docs/changes/2026-10-28-example/evidence-manifest.json",
        "docs/changes/2026-10-28-example/key.png",
      ]),
      roots,
    ),
    {},
  );
});

test("layout rejects unregistered root files, forbidden evidence and source backups", () => {
  const violations = collectLayoutViolations(
    entries([
      "loose.json",
      "docs/changes/example/run.log",
      "docs/changes/example/archive.gz",
      "docs/changes/example/recording.webm",
      "src/cache.tsbuildinfo",
      "src/old.bak",
      "src/old.orig",
      "src/old.tmp",
      "src/old.old",
    ]),
    roots,
  );
  assert.ok(violations["ROOT:loose.json"] !== undefined);
  for (const file of [
    "docs/changes/example/run.log",
    "docs/changes/example/archive.gz",
    "docs/changes/example/recording.webm",
    "src/cache.tsbuildinfo",
    "src/old.bak",
    "src/old.orig",
    "src/old.tmp",
  ])
    assert.ok(violations[`TYPE:${file}`] !== undefined, file);
  assert.ok(violations["LOCATION:src/old.old"] !== undefined);
});

test("layout enforces image threshold, names and document/test placement", () => {
  const paths = [
    "docs/new.png",
    "src/wrong.test.ts",
    "src/wrong.md",
    "docs/中文.png",
    "docs/has space.json",
    "docs/has\twhitespace.json",
    "vendor/canvas-agent/private/UPSTREAM.md",
  ];
  const violations = collectLayoutViolations(entries(paths, 204801), roots);
  assert.equal(violations["IMAGE:docs/new.png"], 204801);
  for (const file of paths.slice(1, 3))
    assert.ok(violations[`LOCATION:${file}`] !== undefined);
  for (const file of paths.slice(3, 6))
    assert.ok(violations[`NAME:${file}`] !== undefined);
  assert.ok(
    violations["LOCATION:vendor/canvas-agent/private/UPSTREAM.md"] !==
      undefined,
  );
  assert.deepEqual(
    collectLayoutViolations(entries(["docs/key.png"], 204800), roots),
    {},
  );
});

test("layout ratchet permits existing violations, removals and image reductions", () => {
  const old = { "TYPE:docs/old.log": 0, "IMAGE:docs/old.png": 300000 };
  assert.deepEqual(compareLayoutViolations(old, old, old).issues, []);
  const reduced = { "IMAGE:docs/old.png": 250000 };
  assert.deepEqual(compareLayoutViolations(reduced, reduced, old).issues, []);
  assert.equal(compareLayoutViolations({}, old, old).reductions.length, 2);
});

test("layout rejects new violations, equal-count swaps and baseline/image growth", () => {
  const old = { "TYPE:docs/old.log": 0, "IMAGE:docs/old.png": 300000 };
  const swap = { "TYPE:docs/new.log": 0, "IMAGE:docs/old.png": 300000 };
  assert.ok(compareLayoutViolations(swap, old, old).issues.length);
  assert.ok(compareLayoutViolations(swap, swap, old).issues.length);
  const grown = { ...old, "IMAGE:docs/old.png": 300001 };
  assert.ok(compareLayoutViolations(grown, old, old).issues.length);
  assert.ok(compareLayoutViolations(grown, grown, old).issues.length);
});

test("layout fails closed for malformed baseline values", () => {
  assert.throws(() => compareLayoutViolations({}, { bad: -1 }, {}));
  assert.throws(() => compareLayoutViolations({}, { bad: "0" }, {}));
  assert.throws(() => compareLayoutViolations({}, null, {}));
});

function repository(t: TestContext) {
  const parent = path.resolve(".tmp");
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, "repo-layout-"));
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(parent));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const write = (file: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  git("init", "--quiet");
  git("config", "user.name", "Layout fixture");
  git("config", "user.email", "layout@example.invalid");
  git("config", "commit.gpgsign", "false");
  fs.mkdirSync(path.join(root, "empty-hooks"));
  git("config", "core.hooksPath", path.join(root, "empty-hooks"));
  write("README.md", "fixture\n");
  write(".gitignore", "*.log\nempty-hooks/\n");
  write("docs/legacy.log", "old log\n");
  git("add", "-f", "README.md", ".gitignore", "docs/legacy.log");
  git("commit", "--quiet", "-m", "fixture seed");
  const baseRef = git("rev-parse", "HEAD");
  const rootFiles = [...roots, ".gitignore"];
  const baseline = {
    version: 1,
    commit: baseRef,
    violations: { "TYPE:docs/legacy.log": 0 },
  };
  write(
    "config/repo-layout-rules.json",
    JSON.stringify({ version: 1, rootFiles }),
  );
  write("config/repo-layout-baseline.json", JSON.stringify(baseline));
  return { root, git, write, baseRef, baseline };
}

test("layout Git integration checks untracked paths and forced ignored additions", (t) => {
  const { root, git, write, baseRef } = repository(t);
  assert.deepEqual(checkRepoLayout(root, { baseRef }).issues, []);
  write("docs/new name.json", "{}");
  write("docs/forced.log", "new log");
  git("add", "-f", "docs/forced.log");
  const result = checkRepoLayout(root, { baseRef });
  assert.ok(
    result.issues.some((issue: string) =>
      issue.includes("NAME:docs/new name.json"),
    ),
  );
  assert.ok(
    result.issues.some((issue: string) =>
      issue.includes("TYPE:docs/forced.log"),
    ),
  );
});

test("layout bootstrap cannot whitelist a new violation into its initial baseline", (t) => {
  const { root, write, baseRef, baseline } = repository(t);
  write("docs/new.png", "x".repeat(204801));
  write(
    "config/repo-layout-baseline.json",
    JSON.stringify({
      ...baseline,
      violations: { ...baseline.violations, "IMAGE:docs/new.png": 204801 },
    }),
  );
  assert.ok(
    checkRepoLayout(root, { baseRef }).issues.some((issue: string) =>
      issue.includes("baseline cannot grow"),
    ),
  );
});

test("layout Git integration rejects committed baseline growth and unreadable configuration", (t) => {
  const fixture = repository(t);
  fixture.git("add", "config");
  fixture.git("commit", "--quiet", "-m", "fixture baseline");
  const baseRef = fixture.git("rev-parse", "HEAD");
  assert.deepEqual(checkRepoLayout(fixture.root, { baseRef }).issues, []);
  fixture.write(
    "config/repo-layout-baseline.json",
    JSON.stringify({
      ...fixture.baseline,
      violations: { ...fixture.baseline.violations, "TYPE:docs/added.log": 0 },
    }),
  );
  assert.ok(
    checkRepoLayout(fixture.root, { baseRef }).issues.some((issue: string) =>
      issue.includes("baseline cannot grow"),
    ),
  );
  fixture.write("config/repo-layout-baseline.json", "broken json");
  assert.throws(() => checkRepoLayout(fixture.root, { baseRef }));
  assert.throws(() =>
    checkRepoLayout(fixture.root, { baseRef: "missing-ref" }),
  );
});
