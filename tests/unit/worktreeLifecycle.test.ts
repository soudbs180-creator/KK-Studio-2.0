import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assessGeneratedCandidate,
  assessWorktreeRemoval,
  buildRecoveryInventory,
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
