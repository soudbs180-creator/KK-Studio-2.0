import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  validateFeatures,
  validateFeatureReservations,
  renderFeatures,
} from "../../scripts/features/registry.mjs";

function fixture(t: test.TestContext, status = "REAL") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-feature-guard-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "docs/features"), { recursive: true });
  const card =
    `# 示例（FEAT-001）\n\n- 状态：${status}\n\n` +
    ["用户可见入口", "代码位置", "测试与证据", "当前能力", "差距与后端化"]
      .map((h) => `## ${h}\n\n说明\n`)
      .join("\n");
  fs.writeFileSync(path.join(root, "docs/features/feat-test.md"), card);
  for (const name of ["source.ts", "check.test.ts", "runtime.md"])
    fs.writeFileSync(path.join(root, name), "fixture");
  const feature = {
    id: "FEAT-001",
    title: "示例",
    area: "canvas",
    status,
    card: "docs/features/feat-test.md",
    summary: "示例能力",
    updated: "2026-09-22",
    entryPoints: ["画布"],
    code: ["source.ts"],
    tests: ["check.test.ts"],
    tasks: ["TASK-1"],
    platforms: ["web", "desktop"],
    runtimeEvidence: [
      { platform: "web", path: "runtime.md" },
      { platform: "desktop", path: "runtime.md" },
    ],
  };
  const tasks = [
    {
      id: "TASK-1",
      status: status === "REAL" ? "DONE" : "TODO",
      verificationResult: "PASS",
    },
  ];
  const check = (changes = {}, linkedTasks: unknown = tasks) =>
    validateFeatures([{ ...feature, ...changes }], linkedTasks, { root });
  return { root, feature, tasks, check, card };
}

test("REAL requires explicit platform evidence and a DONE/PASS task", (t) => {
  const { check } = fixture(t);
  assert.deepEqual(check(), []);
  for (const changes of [
    { runtimeEvidence: [] },
    { platforms: [] },
    { runtimeEvidence: [{ platform: "web", path: "runtime.md" }] },
  ])
    assert.match(check(changes).join("\n"), /platform|evidence/i);
  assert.match(
    check({}, [
      { id: "TASK-1", status: "DONE", verificationResult: "NOT VERIFIED" },
    ]).join("\n"),
    /DONE.*PASS/,
  );
  for (const field of ["entryPoints", "code", "tests", "tasks"])
    assert.match(check({ [field]: [] }).join("\n"), new RegExp(field));
});

test("non-REAL cannot use DONE, OBSOLETE or invalid tasks as open work", (t) => {
  const { check } = fixture(t, "PARTIAL");
  assert.deepEqual(check(), []);
  for (const status of ["DONE", "OBSOLETE", "typo"])
    assert.match(
      check({}, [{ id: "TASK-1", status }]).join("\n"),
      /open roadmap task/,
    );
  assert.match(check({ tasks: [] }).join("\n"), /roadmap task/);
});

test("card status is exact metadata, not a historical mention", (t) => {
  const { check, root, card } = fixture(t);
  fs.writeFileSync(
    path.join(root, "docs/features/feat-test.md"),
    card.replace("- 状态：REAL", "- 状态：PARTIAL") + "\n历史曾为 REAL\n",
  );
  assert.match(check().join("\n"), /card status/);
  fs.writeFileSync(
    path.join(root, "docs/features/feat-test.md"),
    card + "\n- 状态：PARTIAL\n",
  );
  assert.match(check().join("\n"), /card status/);
});

test("malformed feature and task fields report issues without throwing", (t) => {
  const { root, check } = fixture(t);
  for (const value of [null, false, 42, "bad", [], {}]) {
    assert.doesNotThrow(() => validateFeatures([value], [null], { root }));
    assert.ok(validateFeatures([value], [null], { root }).length);
  }
  for (const field of [
    "card",
    "code",
    "tests",
    "tasks",
    "entryPoints",
    "platforms",
    "runtimeEvidence",
  ])
    for (const value of [null, 1, {}, [null], [1]])
      assert.ok(
        check({ [field]: value }).length,
        `${field}: ${JSON.stringify(value)}`,
      );
  assert.ok(check({}, {}).length);
});

test("all referenced paths remain within the repository and have the expected type", (t) => {
  const { check, root } = fixture(t);
  for (const target of [
    "../source.ts",
    "docs/../source.ts",
    path.join(root, "source.ts"),
    "C:\\outside.ts",
    "https://example.test/file",
    "source.ts\u0000",
  ])
    assert.match(check({ code: [target] }).join("\n"), /path/);
  assert.match(check({ card: "docs/features" }).join("\n"), /file/);
  assert.match(check({ tests: ["docs/features"] }).join("\n"), /file/);
  assert.match(
    check({
      runtimeEvidence: [{ platform: "web", path: "docs/features" }],
    }).join("\n"),
    /file/,
  );
  assert.match(check({ code: ["missing.ts"] }).join("\n"), /does not exist/);
});

test("symlinked evidence cannot escape the repository", (t) => {
  const { check, root } = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "kk-feature-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, "evidence.md"), "outside");
  fs.symlinkSync(outside, path.join(root, "escape"), "junction");
  assert.match(
    check({
      runtimeEvidence: [{ platform: "web", path: "escape/evidence.md" }],
    }).join("\n"),
    /outside|escape/,
  );
});

test("unknown statuses, tasks, duplicate IDs and unregistered cards fail", (t) => {
  const { root, feature, tasks, check } = fixture(t);
  assert.match(check({ status: "DONE" }).join("\n"), /unknown status/);
  assert.match(check({ tasks: ["MISSING"] }).join("\n"), /unknown ledger task/);
  assert.match(
    validateFeatures([feature, feature], tasks, { root }).join("\n"),
    /Duplicate feature/,
  );
  fs.writeFileSync(path.join(root, "docs/features/feat-orphan.md"), "orphan");
  assert.match(check().join("\n"), /Unregistered feature card/);
});

test("board lists every feature and explains the stricter gate", (t) => {
  const { feature } = fixture(t);
  const board = renderFeatures([feature]);
  assert.match(board, /FEAT-001/);
  assert.match(board, /REAL（真实可用）/);
  assert.match(board, /runtimeEvidence/);
});

test("reservations are unique on the accepted base before implementation", () => {
  const outpaint = {
    id: "FEAT-040",
    card: "docs/features/feat-040-outpaint.md",
    status: "PLANNED",
    code: [],
    tests: [],
  };
  const duplicate = {
    ...outpaint,
    card: "docs/features/feat-040-model-store.md",
  };
  assert.deepEqual(validateFeatureReservations([outpaint], []), []);
  assert.deepEqual(validateFeatureReservations([duplicate], []), []);
  assert.match(
    validateFeatureReservations([duplicate], [outpaint]).join("\n"),
    /FEAT-040: already assigned to .*feat-040-outpaint/,
  );
  assert.match(
    validateFeatureReservations([], [outpaint]).join("\n"),
    /retain its registered card/,
  );
  const implemented = { ...outpaint, status: "PARTIAL", code: ["src/app.ts"] };
  assert.match(
    validateFeatureReservations([implemented], []).join("\n"),
    /reserve its PLANNED card on main/,
  );
  assert.deepEqual(validateFeatureReservations([implemented], [outpaint]), []);
  assert.match(
    validateFeatureReservations([{ ...outpaint, id: "FEAT-052" }], []).join(
      "\n",
    ),
    /reservation card must start/,
  );
});

test("feature CLI rejects a competing branch after main accepts the same number", (t) => {
  const { root, card, feature, tasks } = fixture(t, "PLANNED");
  const registry = path.join(root, "docs/features/features.registry.json");
  const ledger = path.join(root, "docs/governance/task-ledger.json");
  fs.unlinkSync(path.join(root, feature.card));
  fs.mkdirSync(path.dirname(ledger));
  fs.writeFileSync(ledger, JSON.stringify(tasks));
  fs.writeFileSync(registry, "[]");
  const env = {
    ...process.env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
  };
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      env,
    });
  git("init", "-qb", "main");
  git("config", "user.email", "fixture@example.test");
  git("config", "user.name", "Feature fixture");
  git("add", "--", "docs");
  git("commit", "-qm", "empty feature registry");
  const sharedBase = git("rev-parse", "HEAD").trim();
  git("branch", "competing");
  const cli = fileURLToPath(
    new URL("../../scripts/check-features.mjs", import.meta.url),
  );
  const run = (base: string) =>
    spawnSync(process.execPath, [cli, "--write"], {
      cwd: root,
      encoding: "utf8",
      env: { ...env, GOVERNANCE_BASE: base },
    });
  const reserve = (slug: string) => {
    const reserved = {
      ...feature,
      id: "FEAT-040",
      card: `docs/features/feat-040-${slug}.md`,
      code: [],
      tests: [],
      runtimeEvidence: undefined,
    };
    fs.writeFileSync(
      path.join(root, reserved.card),
      card.replace("FEAT-001", "FEAT-040"),
    );
    fs.writeFileSync(registry, JSON.stringify([reserved]));
  };
  reserve("outpaint");
  assert.equal(run(sharedBase).status, 0);
  git("add", "--", "docs");
  git("commit", "-qm", "main accepts outpaint");
  git("switch", "-q", "competing");
  reserve("model-store");
  assert.equal(run(sharedBase).status, 0);
  const rejected = run("main");
  assert.equal(rejected.status, 1);
  assert.match(
    rejected.stderr,
    /FEAT-040: already assigned to .*feat-040-outpaint/,
  );
});
