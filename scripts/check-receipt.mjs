/**
 * scripts/check-receipt.mjs
 * Static verification gate for PR receipt.json in KK-Studio-2.0.
 *
 * Verifies:
 * 1. File existence and JSON parseability.
 * 2. Schema version and provenance (commit SHA, ISO timestamps, desktop semver).
 * 3. Shadow mode write latency (<5ms across >=100 operations).
 * 4. 100-operation replay consistency (100% snapshot equivalence, 0 discrepancies).
 * 5. Conflict & preemption evidence (designer preemption, task.cancelled, cancelled & override events).
 * 6. Checks array all green and errors array empty.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA40_PATTERN = /^[a-f0-9]{40}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const TASK_ID_PATTERN = /^TASK-[A-Z0-9]+(-[A-Z0-9]+)*$/;

function validateMetadata(receipt, issues) {
  if (receipt.schemaVersion !== 1) {
    issues.push(
      `Invalid schemaVersion: expected 1, got ${receipt.schemaVersion}`,
    );
  }
  if (!receipt.taskId || !TASK_ID_PATTERN.test(receipt.taskId)) {
    issues.push(`Invalid or missing taskId: ${receipt.taskId}`);
  }
  if (!receipt.startedAt || !ISO_DATE_PATTERN.test(receipt.startedAt)) {
    issues.push(`Invalid startedAt timestamp: ${receipt.startedAt}`);
  }
  if (!receipt.completedAt || !ISO_DATE_PATTERN.test(receipt.completedAt)) {
    issues.push(`Invalid completedAt timestamp: ${receipt.completedAt}`);
  }
  if (!receipt.sourceHead || !SHA40_PATTERN.test(receipt.sourceHead)) {
    issues.push(`Invalid sourceHead Git commit SHA: ${receipt.sourceHead}`);
  }
  if (
    !receipt.versions?.desktop ||
    !SEMVER_PATTERN.test(receipt.versions.desktop)
  ) {
    issues.push(`Invalid versions.desktop: ${receipt.versions?.desktop}`);
  }
}

function validateShadowModeLatency(latency, issues) {
  if (!latency) {
    issues.push("Missing acceptanceEvidence.shadowModeLatency.");
    return;
  }
  if (typeof latency.sampleCount !== "number" || latency.sampleCount < 100) {
    issues.push(
      `shadowModeLatency.sampleCount must be >= 100, got ${latency.sampleCount}`,
    );
  }
  if (typeof latency.p95LatencyMs !== "number" || latency.p95LatencyMs >= 5.0) {
    issues.push(
      `shadowModeLatency.p95LatencyMs must be < 5.0ms, got ${latency.p95LatencyMs}ms`,
    );
  }
  if (
    typeof latency.averageLatencyMs !== "number" ||
    latency.averageLatencyMs >= 5.0
  ) {
    issues.push(
      `shadowModeLatency.averageLatencyMs must be < 5.0ms, got ${latency.averageLatencyMs}ms`,
    );
  }
  if (latency.passed !== true) {
    issues.push("shadowModeLatency.passed must be true.");
  }
}

function validateReplayConsistency(replay, issues) {
  if (!replay) {
    issues.push("Missing acceptanceEvidence.replayConsistency.");
    return;
  }
  if (
    typeof replay.operationsCount !== "number" ||
    replay.operationsCount < 100
  ) {
    issues.push(
      `replayConsistency.operationsCount must be >= 100, got ${replay.operationsCount}`,
    );
  }
  if (
    replay.snapshotEquivalence !== 1.0 &&
    replay.snapshotEquivalence !== "100%"
  ) {
    issues.push(
      `replayConsistency.snapshotEquivalence must be 1.0 (100%), got ${replay.snapshotEquivalence}`,
    );
  }
  if (replay.discrepancyCount !== 0) {
    issues.push(
      `replayConsistency.discrepancyCount must be 0, got ${replay.discrepancyCount}`,
    );
  }
  if (
    !replay.liveStateHash ||
    !replay.replayedStateHash ||
    replay.liveStateHash !== replay.replayedStateHash
  ) {
    issues.push(
      `replayConsistency state hashes mismatch or missing: live=${replay.liveStateHash}, replayed=${replay.replayedStateHash}`,
    );
  }
  if (replay.passed !== true) {
    issues.push("replayConsistency.passed must be true.");
  }
}

function validateConflictPreemption(preemption, issues) {
  if (!preemption) {
    issues.push("Missing acceptanceEvidence.conflictPreemption.");
    return;
  }
  if (preemption.designerPreempted !== true) {
    issues.push("conflictPreemption.designerPreempted must be true.");
  }
  if (preemption.taskCancelledSignal !== true) {
    issues.push("conflictPreemption.taskCancelledSignal must be true.");
  }
  const entries = Array.isArray(preemption.eventLogEntries)
    ? preemption.eventLogEntries
    : [];
  if (!entries.includes("cancelled") || !entries.includes("override")) {
    issues.push(
      `conflictPreemption.eventLogEntries must include both 'cancelled' and 'override', got: [${entries.join(", ")}]`,
    );
  }
  if (preemption.passed !== true) {
    issues.push("conflictPreemption.passed must be true.");
  }
}

function validateChecksAndErrors(receipt, issues) {
  if (!Array.isArray(receipt.checks) || receipt.checks.length === 0) {
    issues.push("receipt.checks must be a non-empty array of check records.");
  } else {
    for (const check of receipt.checks) {
      if (!check.name || check.passed !== true) {
        issues.push(`Check failed or invalid: ${check.name ?? "unnamed"}`);
      }
    }
  }

  if (!Array.isArray(receipt.errors) || receipt.errors.length > 0) {
    issues.push(
      `receipt.errors must be an empty array, found ${receipt.errors?.length ?? 0} errors.`,
    );
  }
  if (receipt.passed !== true) {
    issues.push("receipt.passed must be explicitly true.");
  }
}

export function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return ["Receipt must be a non-null JSON object."];
  }

  const issues = [];
  validateMetadata(receipt, issues);
  validateShadowModeLatency(
    receipt.acceptanceEvidence?.shadowModeLatency,
    issues,
  );
  validateReplayConsistency(
    receipt.acceptanceEvidence?.replayConsistency,
    issues,
  );
  validateConflictPreemption(
    receipt.acceptanceEvidence?.conflictPreemption,
    issues,
  );
  validateChecksAndErrors(receipt, issues);

  return issues;
}

export function runCli(targetPathArg) {
  const targetPath = targetPathArg || "receipt.json";
  const resolvedPath = path.resolve(process.cwd(), targetPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(
      `[check-receipt] Error: Receipt file not found at: ${resolvedPath}`,
    );
    return 1;
  }

  let content;
  try {
    content = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (err) {
    console.error(
      `[check-receipt] Error: Failed to parse JSON at ${resolvedPath}: ${err.message}`,
    );
    return 1;
  }

  const issues = validateReceipt(content);
  if (issues.length > 0) {
    console.error(
      `[check-receipt] FAILED: ${issues.length} violation(s) found in ${targetPath}:`,
    );
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    return 1;
  }

  const replayEquiv =
    typeof content.acceptanceEvidence.replayConsistency.snapshotEquivalence ===
    "number"
      ? `${content.acceptanceEvidence.replayConsistency.snapshotEquivalence * 100}%`
      : content.acceptanceEvidence.replayConsistency.snapshotEquivalence;

  console.log(
    `[check-receipt] SUCCESS: ${targetPath} passed all validation rules.`,
  );
  console.log(`  - Task: ${content.taskId}`);
  console.log(`  - Commit: ${content.sourceHead}`);
  console.log(
    `  - Shadow Write Latency (p95): ${content.acceptanceEvidence.shadowModeLatency.p95LatencyMs}ms (<5ms)`,
  );
  console.log(`  - Replay Consistency: ${replayEquiv} match (0 discrepancies)`);
  console.log(
    `  - Designer Preemption: Verified with 'cancelled' & 'override' events`,
  );
  return 0;
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirectExecution = invokedPath === path.resolve(currentFilePath);

if (isDirectExecution) {
  const code = runCli(process.argv[2]);
  process.exit(code);
}
