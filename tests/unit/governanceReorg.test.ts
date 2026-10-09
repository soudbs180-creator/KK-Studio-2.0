import assert from "node:assert/strict";
import test from "node:test";
import {
  displayStatusFor,
  normalizeTask,
} from "../../scripts/governance/normalize-ledger.mjs";
import {
  classifyWorkspacePath,
  workspaceEntry,
} from "../../scripts/governance/workspace-inventory.mjs";
import {
  canPruneWorktree,
  canPruneGeneratedContent,
  generatedPathCandidates,
} from "../../scripts/governance/worktree-reclaim.mjs";

test("maps canonical task states to the three user-facing states", () => {
  assert.equal(displayStatusFor("DONE", "PASS"), "已完成");
  assert.equal(displayStatusFor("DONE", "FAIL"), "未完成");
  assert.equal(displayStatusFor("PARTIAL", "PARTIAL"), "进行中");
  assert.equal(displayStatusFor("TODO", "NOT_VERIFIED"), "未完成");
  assert.equal(displayStatusFor("BLOCKED", "NOT_VERIFIED"), "未完成");
});

test("normalizes a task without inventing a product owner or feature", () => {
  const task = normalizeTask({
    id: "TASK-EXAMPLE",
    title: "示例任务",
    goal: "有证据的目标",
    scope: "治理",
    owner: "root",
    branch: "unallocated",
    worktree: "unallocated",
    updated: "2026-10-09",
    status: "TODO",
    verification: "NOT VERIFIED",
    verificationResult: "NOT_VERIFIED",
    acceptance: ["验收"],
    dependencies: [],
    affectedModules: ["docs"],
    evidence: [],
  });
  assert.equal(task.displayStatus, "未完成");
  assert.deepEqual(task.featureIds, []);
  assert.deepEqual(task.requirementRefs, ["ledger:TASK-EXAMPLE"]);
  assert.equal(task.nextAction, "补充负责人、优先级、分支和下一步验收证据");
});

test("classifies workspace entries without deleting or moving them", () => {
  assert.equal(classifyWorkspacePath("KK-Studio-2.0"), "PRIMARY_REPOSITORY");
  assert.equal(classifyWorkspacePath(".worktrees/TASK-1"), "ACTIVE_WORKTREE_ROOT");
  assert.equal(classifyWorkspacePath("output/run-1"), "EVIDENCE_CANDIDATE");
  assert.equal(classifyWorkspacePath(".tmp/session"), "TEMPORARY_CANDIDATE");
  assert.equal(classifyWorkspacePath("ai_group_chat_study"), "INDEPENDENT_PROJECT");
});

test("workspace entries retain absolute path and preservation action", () => {
  const entry = workspaceEntry("D:/kk-studio/output/run-1", {
    kind: "directory",
    bytes: 12,
    files: 2,
  });
  assert.equal(entry.path, "D:/kk-studio/output/run-1");
  assert.equal(entry.action, "MANIFEST_THEN_ARCHIVE");
  assert.equal(entry.deletable, false);
});

test("worktree reclamation only targets rebuildable paths in clean worktrees", () => {
  assert.equal(canPruneWorktree({ exists: true, dirty: 0 }), true);
  assert.equal(canPruneWorktree({ exists: true, dirty: 1 }), false);
  assert.equal(canPruneWorktree({ exists: false, dirty: 0 }), false);
  assert.equal(canPruneGeneratedContent({ exists: true, dirty: 0, inWorkspace: true, primary: false }), true);
  assert.equal(canPruneGeneratedContent({ exists: true, dirty: 4, inWorkspace: true, primary: false }), false);
  assert.equal(canPruneGeneratedContent({ exists: true, dirty: 4, inWorkspace: true, primary: true }), false);
  assert.deepEqual(generatedPathCandidates("D:/repo"), [
    "D:/repo/node_modules",
    "D:/repo/dist",
    "D:/repo/test-results",
    "D:/repo/src-tauri/target",
    "D:/repo/src-tauri/agent-runtime",
    "D:/repo/vendor/canvas-agent/dist",
    "D:/repo/vendor/canvas-agent/node_modules",
  ]);
});
