import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assessGeneratedCandidate,
  assessWorktreeRemoval,
  buildRecoveryInventory,
  defaultReclamationOutputDirectory,
  isContainedPath,
  validateApprovedCandidates,
  writeApplyResult,
  writeImmutablePlan,
} from "../../scripts/governance/worktree-reclaim.mjs";
import {
  DEFAULT_WORKTREE_POLICY,
  checkWorktreeCreation,
  loadWorktreePolicy,
  measureGeneratedBytes,
} from "../../scripts/governance/worktree-policy.mjs";

test("reclamation output defaults to the dated container output directory", () => {
  assert.equal(
    defaultReclamationOutputDirectory(
      "D:/kk-studio/KK-Studio-2.0",
      new Date("2026-10-12T00:00:00Z"),
    ),
    path.join("D:/kk-studio", "output", "2026-10-12-worktree-reclamation"),
  );
});

test("worktree removal requires every task DONE and a main-reachable commit", () => {
  const base = {
    exists: true,
    inWorkspace: true,
    primary: false,
    current: false,
    dirty: 0,
    locked: false,
    branch: "codex/TASK-1",
    head: "abc123",
  };
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      taskStatuses: ["DONE"],
      reachableFromMain: true,
    }).allowed,
    true,
  );
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      taskStatuses: ["DONE", "PARTIAL"],
      reachableFromMain: true,
    }).allowed,
    false,
  );
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      taskStatuses: ["DONE"],
      reachableFromMain: false,
    }).allowed,
    false,
  );
  assert.equal(
    assessWorktreeRemoval({
      ...base,
      current: true,
      taskStatuses: ["DONE"],
      reachableFromMain: true,
    }).allowed,
    false,
  );
});

test("candidate validation rejects escape paths, tracked content, symlinks, and evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-worktree-"));
  const generated = path.join(root, "node_modules");
  fs.mkdirSync(generated);
  fs.writeFileSync(path.join(generated, "package.json"), "{}");
  assert.equal(isContainedPath(root, generated), true);
  assert.equal(isContainedPath(root, path.join(root, "..", "outside")), false);
  assert.equal(
    assessGeneratedCandidate({
      path: generated,
      worktreeRoot: root,
      tracked: true,
    }).allowed,
    false,
  );
  assert.equal(
    assessGeneratedCandidate({
      path: path.join(root, "evidence"),
      worktreeRoot: root,
      ignored: true,
    }).allowed,
    false,
  );
  assert.equal(
    assessGeneratedCandidate({
      path: path.join(root, "node_modules"),
      worktreeRoot: root,
      ignored: true,
    }).allowed,
    true,
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("recovery inventory is deterministic and hashes source files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-inventory-"));
  fs.writeFileSync(path.join(root, "a.txt"), "alpha");
  const first = buildRecoveryInventory(root);
  const second = buildRecoveryInventory(root);
  assert.deepEqual(first, second);
  assert.equal(first.files[0].sha256.length, 64);
  fs.rmSync(root, { recursive: true, force: true });
});

test("only candidates present in an immutable plan may be approved", () => {
  const plan = {
    schemaVersion: 2,
    immutable: true,
    candidates: [
      {
        id: "candidate-1",
        path: "D:/kk-studio/.worktrees/a/node_modules",
        action: "PRUNE_GENERATED",
      },
    ],
  };
  assert.deepEqual(validateApprovedCandidates(plan, ["candidate-1"]), {
    ok: true,
    candidates: [plan.candidates[0]],
  });
  assert.equal(validateApprovedCandidates(plan, ["candidate-2"]).ok, false);
});

test("apply results are written as unique audit records", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-result-"));
  const plan = { planId: "plan-1" };
  const resultPath = writeApplyResult(
    {
      removed: [],
      failed: [],
      removedWorktrees: [],
      appliedAt: "2026-10-09T00:00:00Z",
    },
    plan,
    root,
  );
  assert.equal(fs.existsSync(resultPath), true);
  assert.equal(
    JSON.parse(fs.readFileSync(resultPath, "utf8")).planId,
    "plan-1",
  );
  fs.rmSync(root, { recursive: true, force: true });
});

test("immutable plan captures source hashes and never overwrites the same run", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-plan-"));
  const worktree = path.join(root, "worktree");
  const generated = path.join(worktree, "node_modules");
  fs.mkdirSync(generated, { recursive: true });
  fs.writeFileSync(path.join(generated, "marker.txt"), "keep me recoverable");
  const plan = {
    planId: "fixture-plan",
    schemaVersion: 2,
    immutable: false,
    allowedWorktreeRoot: root,
    candidates: [
      {
        id: "candidate-1",
        path: generated,
        worktreePath: worktree,
        action: "PRUNE_GENERATED",
      },
    ],
    worktrees: [],
    summary: {},
  };
  const planPath = writeImmutablePlan(plan, root);
  const written = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(written.immutable, true);
  assert.equal(
    written.candidates[0].sourceInventory.files[0].sha256.length,
    64,
  );
  assert.throws(() => writeImmutablePlan(plan, root), /EEXIST|already exists/i);
  fs.rmSync(root, { recursive: true, force: true });
});

test("worktree creation enforces the active and generated budgets while reusing a branch", () => {
  assert.equal(DEFAULT_WORKTREE_POLICY.maxActiveWorktrees, 4);
  const policy = loadWorktreePolicy({
    maxActiveWorktrees: 1,
    maxGeneratedBytes: 10,
  });
  const reused = checkWorktreeCreation({
    policy,
    activeWorktrees: [
      { path: "D:/kk-studio/.worktrees/existing", branch: "codex/TASK-1" },
    ],
    generatedBytes: 999,
    requestedBranch: "codex/TASK-1",
  });
  assert.equal(reused.allowed, true);
  assert.equal(reused.action, "REUSE_EXISTING_BRANCH");
  const denied = checkWorktreeCreation({
    policy,
    activeWorktrees: [
      { path: "D:/kk-studio/.worktrees/one", branch: "codex/OTHER" },
    ],
    generatedBytes: 10,
    requestedBranch: "codex/TASK-2",
  });
  assert.equal(denied.allowed, false);
  assert.match(denied.reason, /budget/i);
});

test("worktree storage accounting includes temporary agent output", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-worktree-policy-"));
  fs.mkdirSync(path.join(root, ".tmp"));
  fs.writeFileSync(
    path.join(root, ".tmp", "agent-runtime-previous.bin"),
    "12345",
  );
  assert.equal(measureGeneratedBytes(root), 5);
  fs.rmSync(root, { recursive: true, force: true });
});

test("worktree creation requires a branch before considering detached registrations", () => {
  for (const requestedBranch of [undefined, "", "  ", "refs/heads/"]) {
    const result = checkWorktreeCreation({
      activeWorktrees: [
        { path: "D:/kk-studio/.worktrees/detached", branch: null },
      ],
      generatedBytes: 0,
      requestedBranch,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "BRANCH_REQUIRED");
  }
});

test("worktree creation refuses a registered branch whose checkout is missing", () => {
  const result = checkWorktreeCreation({
    activeWorktrees: [
      {
        path: "D:/kk-studio/.worktrees/missing",
        branch: "refs/heads/codex/TASK-MISSING",
        exists: false,
      },
    ],
    generatedBytes: 0,
    requestedBranch: "codex/TASK-MISSING",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "EXISTING_WORKTREE_MISSING");
});

test("worktree creation validates an explicit path before reusing a branch", () => {
  const result = checkWorktreeCreation({
    policy: loadWorktreePolicy({ allowedRoot: "D:/kk-studio/.worktrees" }),
    activeWorktrees: [
      {
        path: "D:/kk-studio/.worktrees/existing",
        branch: "codex/TASK-EXISTING",
        exists: true,
      },
    ],
    generatedBytes: 0,
    requestedBranch: "codex/TASK-EXISTING",
    requestedPath: "D:/kk-studio/outside",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "WORKTREE_PATH_OUTSIDE_ALLOWED_ROOT");
});

const policyRepositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

function policyCliFixture() {
  const parent = path.join(
    policyRepositoryRoot,
    ".tmp/task-remaining-20261018",
  );
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, "worktree-policy-fixture-"));
}

function runPolicyCli(
  args: string[],
  cwd = policyRepositoryRoot,
  env: NodeJS.ProcessEnv = {},
) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(policyRepositoryRoot, "scripts/governance/worktree-policy.mjs"),
      "--check-create",
      ...args,
    ],
    { cwd, encoding: "utf8", env: { ...process.env, ...env } },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

test("worktree policy CLI fails closed outside a Git checkout", () => {
  const root = policyCliFixture();
  const result = runPolicyCli(["--branch=codex/TASK-CLI-NO-REPO"], root, {
    GIT_CEILING_DIRECTORIES: path.dirname(root),
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /"allowed": true/);
  assert.match(result.stderr, /WORKTREE_INVENTORY_UNAVAILABLE/);
});

test("worktree policy CLI rejects a target outside its configured root", () => {
  const root = policyCliFixture();
  const result = runPolicyCli(
    ["--branch=codex/TASK-CLI-PATH", `--path=${path.join(root, "outside")}`],
    policyRepositoryRoot,
    { KK_WORKTREE_ROOT: path.join(root, "allowed") },
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(
    JSON.parse(result.stdout).reason,
    "WORKTREE_PATH_OUTSIDE_ALLOWED_ROOT",
  );
});

test("worktree policy CLI permits a new target within its configured root", () => {
  const root = policyCliFixture();
  const result = runPolicyCli(
    [
      "--branch=codex/TASK-CLI-PATH",
      `--path=${path.join(root, "allowed", "new-checkout")}`,
    ],
    policyRepositoryRoot,
    { KK_WORKTREE_ROOT: path.join(root, "allowed") },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).action, "CREATE_WORKTREE");
});

test("worktree policy CLI reuses a registered checkout with an exhausted budget", () => {
  const root = policyCliFixture();
  const branch = execFileSync("git", ["branch", "--show-current"], {
    cwd: policyRepositoryRoot,
    encoding: "utf8",
  }).trim();
  assert.notEqual(branch, "");
  const result = runPolicyCli([`--branch=${branch}`], policyRepositoryRoot, {
    KK_WORKTREE_ROOT: path.join(root, "allowed"),
    KK_MAX_GENERATED_BYTES: "0",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const decision = JSON.parse(result.stdout);
  assert.equal(decision.action, "REUSE_EXISTING_BRANCH");
  assert.equal(path.resolve(decision.path), path.resolve(policyRepositoryRoot));
});
