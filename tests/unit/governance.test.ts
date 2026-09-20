import assert from "node:assert/strict";
import test from "node:test";
import {
  validateLedger,
  renderLedger,
} from "../../scripts/governance/ledger.mjs";

const task = {
  id: "T1",
  title: "Example",
  goal: "Verifiable work",
  scope: "bounded",
  owner: "root",
  branch: "fix/T1",
  worktree: ".worktrees/T1",
  updated: "2026-09-17",
  status: "TODO",
  verification: "NOT VERIFIED",
  verificationResult: "NOT_VERIFIED",
  acceptance: ["observable result"],
  dependencies: [] as string[],
  affectedModules: ["src"],
  evidence: [] as string[],
};
test("ledger rejects fake DONE, missing dependencies, and dependency cycles", () => {
  assert.equal(validateLedger([task]).length, 0);
  assert.match(
    validateLedger([{ ...task, status: "DONE" }]).join(),
    /evidence/,
  );
  assert.match(
    validateLedger([{ ...task, dependencies: ["missing"] }]).join(),
    /Missing dependency/,
  );
  assert.match(
    validateLedger([{ ...task, dependencies: ["T1"] }]).join(),
    /cycle/,
  );
  for (const result of ["FAIL", "PARTIAL", "NOT_VERIFIED"])
    assert.match(
      validateLedger([
        {
          ...task,
          status: "DONE",
          verificationResult: result,
          verification: "Completed",
          evidence: ["README.md"],
        },
      ]).join(),
      /evidence/,
    );
  assert.match(
    validateLedger([
      {
        ...task,
        status: "DONE",
        verificationResult: "PASS",
        verification: "FAIL: acceptance criteria and regression tests failed",
        evidence: ["README.md"],
      },
    ]).join(),
    /evidence/,
  );
});
test("blocked and active tasks require an external condition and allocated isolation", () => {
  assert.match(
    validateLedger([{ ...task, status: "BLOCKED" }]).join(),
    /external condition/,
  );
  assert.match(
    validateLedger([
      { ...task, status: "IN_PROGRESS", worktree: "unallocated" },
    ]).join(),
    /worktree/,
  );
});
test("ledger view includes ownership, acceptance, evidence and escapes table delimiters", () => {
  const view = renderLedger([{ ...task, title: "a|b" }]);
  assert.ok(view.includes("a\\|b"));
  for (const value of [
    task.worktree,
    task.branch,
    task.acceptance[0],
    "NOT VERIFIED",
  ])
    assert.ok(view.includes(value));
});

test("ledger reports malformed blocker data and simultaneous worktree ownership", () => {
  assert.match(
    validateLedger([{ ...task, status: "BLOCKED", blocker: 42 }]).join(),
    /external condition/,
  );
  assert.match(validateLedger([[]]).join(), /Invalid task record/);
  assert.match(
    validateLedger([
      { ...task, status: "IN_PROGRESS", worktree: "D:/repo/.worktrees/T1" },
      {
        ...task,
        id: "T2",
        status: "REVIEW",
        worktree: "d:\\repo\\.worktrees\\t1\\",
      },
    ]).join(),
    /worktree conflicts/,
  );
});

test("active isolation compares normalized absolute paths and rejects ambiguous relative paths", () => {
  const active = {
    ...task,
    status: "IN_PROGRESS",
    worktree: "D:/repo/.worktrees/T1",
  };
  for (const worktree of [
    "D:/repo/.worktrees/./T1",
    "D:/repo//.worktrees/T1",
    "D:/repo/.worktrees/other/../T1",
  ])
    assert.match(
      validateLedger([
        active,
        { ...active, id: "T2", branch: "fix/T2", worktree },
      ]).join(),
      /worktree conflicts/,
    );
  assert.match(
    validateLedger([{ ...active, worktree: ".worktrees/T1" }]).join(),
    /absolute/,
  );
});
