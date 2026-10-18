import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runCli, validateReceipt } from "../../scripts/check-receipt.mjs";

function createValidReceipt() {
  return {
    $schema: "./schemas/receipt.schema.json",
    schemaVersion: 1,
    taskId: "TASK-COMMANDBUS-001",
    title: "Rust Tauri CommandBus and SQLite WAL EventBus Implementation",
    startedAt: "2026-10-17T19:00:00.000Z",
    completedAt: "2026-10-17T19:30:00.000Z",
    sourceHead: "4e38351c3743abeb9169bf680b629fbcd3fba513",
    workingTree: {
      clean: false,
      untrackedFiles: 0,
    },
    environment: {
      node: "v24.20.0",
      cargo: "cargo 1.97.1 (c980f4866 2026-06-30)",
      rustc: "rustc 1.97.1 (8bab26f4f 2026-07-14)",
      platform: "windows-x64",
    },
    versions: {
      desktop: "2.1.35",
      web: "2.1.35",
    },
    acceptanceEvidence: {
      shadowModeLatency: {
        sampleCount: 100,
        maxLatencyMs: 3.82,
        p95LatencyMs: 2.15,
        averageLatencyMs: 1.12,
        thresholdMs: 5.0,
        passed: true,
      },
      replayConsistency: {
        operationsCount: 100,
        snapshotEquivalence: 1.0,
        discrepancyCount: 0,
        liveStateHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        replayedStateHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        passed: true,
      },
      conflictPreemption: {
        designerPreempted: true,
        taskCancelledSignal: true,
        eventLogEntries: ["cancelled", "override"],
        passed: true,
      },
    },
    checks: [
      { name: "typecheck", command: "npm run typecheck", passed: true },
      { name: "unit-tests", command: "npm test", passed: true },
      { name: "cargo-test", command: "cargo test --manifest-path src-tauri/Cargo.toml", passed: true },
    ],
    errors: [],
    passed: true,
  };
}

test("check-receipt accepts a fully compliant valid receipt", () => {
  const receipt = createValidReceipt();
  const issues = validateReceipt(receipt);
  assert.deepStrictEqual(issues, []);
});

test("check-receipt accepts snapshotEquivalence formatted as '100%'", () => {
  const receipt = createValidReceipt();
  receipt.acceptanceEvidence.replayConsistency.snapshotEquivalence = "100%";
  const issues = validateReceipt(receipt);
  assert.deepStrictEqual(issues, []);
});

test("check-receipt rejects non-object or null receipts", () => {
  assert.ok(validateReceipt(null).length > 0);
  assert.ok(validateReceipt(undefined).length > 0);
  assert.ok(validateReceipt([]).length > 0);
  assert.ok(validateReceipt("not a receipt").length > 0);
});

test("check-receipt rejects invalid top-level metadata", () => {
  const receipt = createValidReceipt();

  // Invalid schema version
  receipt.schemaVersion = 2;
  let issues = validateReceipt(receipt);
  assert.ok(issues.some((i) => i.includes("schemaVersion")));

  // Invalid taskId
  receipt.schemaVersion = 1;
  receipt.taskId = "invalid_lowercase_task";
  issues = validateReceipt(receipt);
  assert.ok(issues.some((i) => i.includes("taskId")));

  // Invalid timestamps
  receipt.taskId = "TASK-001";
  receipt.startedAt = "not-a-date";
  issues = validateReceipt(receipt);
  assert.ok(issues.some((i) => i.includes("startedAt")));

  receipt.startedAt = "2026-10-17T19:00:00.000Z";
  receipt.completedAt = "invalid";
  issues = validateReceipt(receipt);
  assert.ok(issues.some((i) => i.includes("completedAt")));

  // Invalid git commit SHA
  receipt.completedAt = "2026-10-17T19:30:00.000Z";
  receipt.sourceHead = "not-a-sha-123";
  issues = validateReceipt(receipt);
  assert.ok(issues.some((i) => i.includes("sourceHead")));

  // Invalid desktop version
  receipt.sourceHead = "4e38351c3743abeb9169bf680b629fbcd3fba513";
  receipt.versions.desktop = "invalid-semver";
  issues = validateReceipt(receipt);
  assert.ok(issues.some((i) => i.includes("versions.desktop")));
});

test("check-receipt rejects shadow mode latency violations", () => {
  // Missing latency section
  const r1 = createValidReceipt();
  delete (r1.acceptanceEvidence as Record<string, unknown>).shadowModeLatency;
  assert.ok(validateReceipt(r1).some((i) => i.includes("shadowModeLatency")));

  // sampleCount < 100
  const r2 = createValidReceipt();
  r2.acceptanceEvidence.shadowModeLatency.sampleCount = 99;
  assert.ok(validateReceipt(r2).some((i) => i.includes("sampleCount")));

  // p95LatencyMs >= 5.0
  const r3 = createValidReceipt();
  r3.acceptanceEvidence.shadowModeLatency.p95LatencyMs = 5.0;
  assert.ok(validateReceipt(r3).some((i) => i.includes("p95LatencyMs")));

  const r3b = createValidReceipt();
  r3b.acceptanceEvidence.shadowModeLatency.p95LatencyMs = 5.25;
  assert.ok(validateReceipt(r3b).some((i) => i.includes("p95LatencyMs")));

  // averageLatencyMs >= 5.0
  const r4 = createValidReceipt();
  r4.acceptanceEvidence.shadowModeLatency.averageLatencyMs = 5.01;
  assert.ok(validateReceipt(r4).some((i) => i.includes("averageLatencyMs")));

  // passed !== true
  const r5 = createValidReceipt();
  r5.acceptanceEvidence.shadowModeLatency.passed = false;
  assert.ok(validateReceipt(r5).some((i) => i.includes("shadowModeLatency.passed")));
});

test("check-receipt rejects replay consistency violations", () => {
  // Missing replay section
  const r1 = createValidReceipt();
  delete (r1.acceptanceEvidence as Record<string, unknown>).replayConsistency;
  assert.ok(validateReceipt(r1).some((i) => i.includes("replayConsistency")));

  // operationsCount < 100
  const r2 = createValidReceipt();
  r2.acceptanceEvidence.replayConsistency.operationsCount = 50;
  assert.ok(validateReceipt(r2).some((i) => i.includes("operationsCount")));

  // snapshotEquivalence < 1.0
  const r3 = createValidReceipt();
  r3.acceptanceEvidence.replayConsistency.snapshotEquivalence = 0.99;
  assert.ok(validateReceipt(r3).some((i) => i.includes("snapshotEquivalence")));

  // discrepancyCount > 0
  const r4 = createValidReceipt();
  r4.acceptanceEvidence.replayConsistency.discrepancyCount = 1;
  assert.ok(validateReceipt(r4).some((i) => i.includes("discrepancyCount")));

  // Hash mismatch
  const r5 = createValidReceipt();
  r5.acceptanceEvidence.replayConsistency.replayedStateHash = "b".repeat(64);
  assert.ok(validateReceipt(r5).some((i) => i.includes("state hashes mismatch")));

  // passed !== true
  const r6 = createValidReceipt();
  r6.acceptanceEvidence.replayConsistency.passed = false;
  assert.ok(validateReceipt(r6).some((i) => i.includes("replayConsistency.passed")));
});

test("check-receipt rejects conflict preemption violations", () => {
  // Missing conflictPreemption section
  const r1 = createValidReceipt();
  delete (r1.acceptanceEvidence as Record<string, unknown>).conflictPreemption;
  assert.ok(validateReceipt(r1).some((i) => i.includes("conflictPreemption")));

  // designerPreempted !== true
  const r2 = createValidReceipt();
  r2.acceptanceEvidence.conflictPreemption.designerPreempted = false;
  assert.ok(validateReceipt(r2).some((i) => i.includes("designerPreempted")));

  // taskCancelledSignal !== true
  const r3 = createValidReceipt();
  r3.acceptanceEvidence.conflictPreemption.taskCancelledSignal = false;
  assert.ok(validateReceipt(r3).some((i) => i.includes("taskCancelledSignal")));

  // missing required eventLogEntries: cancelled or override
  const r4 = createValidReceipt();
  r4.acceptanceEvidence.conflictPreemption.eventLogEntries = ["cancelled"];
  assert.ok(validateReceipt(r4).some((i) => i.includes("eventLogEntries")));

  const r5 = createValidReceipt();
  r5.acceptanceEvidence.conflictPreemption.eventLogEntries = ["override"];
  assert.ok(validateReceipt(r5).some((i) => i.includes("eventLogEntries")));

  // passed !== true
  const r6 = createValidReceipt();
  r6.acceptanceEvidence.conflictPreemption.passed = false;
  assert.ok(validateReceipt(r6).some((i) => i.includes("conflictPreemption.passed")));
});

test("check-receipt rejects checks and errors violations", () => {
  // Empty checks array
  const r1 = createValidReceipt();
  r1.checks = [];
  assert.ok(validateReceipt(r1).some((i) => i.includes("receipt.checks")));

  // Failed check in checks array
  const r2 = createValidReceipt();
  r2.checks = [{ name: "cargo-test", passed: false }];
  assert.ok(validateReceipt(r2).some((i) => i.includes("Check failed")));

  // Non-empty errors array
  const r3 = createValidReceipt();
  r3.errors = ["Some error occurred"];
  assert.ok(validateReceipt(r3).some((i) => i.includes("receipt.errors")));

  // passed !== true
  const r4 = createValidReceipt();
  r4.passed = false;
  assert.ok(validateReceipt(r4).some((i) => i.includes("receipt.passed")));
});

test("runCli executes correctly against valid and invalid receipt files", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "check-receipt-test-"));
  try {
    const validPath = path.join(tmpDir, "valid-receipt.json");
    fs.writeFileSync(validPath, JSON.stringify(createValidReceipt(), null, 2), "utf8");
    assert.equal(runCli(validPath), 0);

    const invalidPath = path.join(tmpDir, "invalid-receipt.json");
    const invalidReceipt = createValidReceipt();
    invalidReceipt.acceptanceEvidence.shadowModeLatency.p95LatencyMs = 6.2;
    fs.writeFileSync(invalidPath, JSON.stringify(invalidReceipt, null, 2), "utf8");
    assert.equal(runCli(invalidPath), 1);

    const nonExistentPath = path.join(tmpDir, "does-not-exist.json");
    assert.equal(runCli(nonExistentPath), 1);

    const corruptedPath = path.join(tmpDir, "corrupted.json");
    fs.writeFileSync(corruptedPath, "{ not valid json", "utf8");
    assert.equal(runCli(corruptedPath), 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
