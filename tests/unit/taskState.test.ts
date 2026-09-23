import assert from "node:assert/strict";
import test from "node:test";
import {
  canRetryTask,
  estimateTaskCostUsd,
  formatCostUsd,
  retryFailedOutputIndices,
  taskStateRank,
  unifiedTaskStatuses,
} from "../../src/features/creation/taskState.ts";
import type { CreationTaskOutput } from "../../src/features/creation/model.ts";

function output(index: number, status: CreationTaskOutput["status"]) {
  return {
    index,
    status,
    model: "test-model",
    createdAt: Date.now(),
  };
}

test("unifiedTaskStatuses covers the full 9-state contract", () => {
  assert.deepEqual(unifiedTaskStatuses, [
    "queued",
    "running",
    "unknown",
    "partial",
    "succeeded",
    "failed",
    "cancelled",
    "offline",
    "interrupted",
  ]);
});

test("canRetryTask only allows terminated safe states", () => {
  assert.equal(canRetryTask("failed"), true);
  assert.equal(canRetryTask("partial"), true);
  assert.equal(canRetryTask("unknown", "unknown"), true);
  assert.equal(canRetryTask("queued"), false);
  assert.equal(canRetryTask("running"), false);
  assert.equal(canRetryTask("succeeded"), false);
  assert.equal(canRetryTask("cancelled"), false);
  assert.equal(canRetryTask("offline"), false);
  assert.equal(canRetryTask("interrupted"), false);
});

test("retryFailedOutputIndices returns only failed/unknown outputs", () => {
  const outputs = [
    output(0, "succeeded"),
    output(1, "failed"),
    output(2, "unknown"),
    output(3, "cancelled"),
  ];
  assert.deepEqual(retryFailedOutputIndices(outputs), [1, 2]);
  assert.deepEqual(retryFailedOutputIndices([]), []);
  assert.deepEqual(retryFailedOutputIndices(undefined), []);
});

test("estimateTaskCostUsd bounds inputs and returns finite estimates", () => {
  assert.equal(estimateTaskCostUsd(2, 0.04), 0.08);
  assert.equal(estimateTaskCostUsd(0, 0.04), undefined);
  assert.equal(estimateTaskCostUsd(2, undefined), undefined);
  assert.equal(estimateTaskCostUsd(2, 0), undefined);
  assert.equal(estimateTaskCostUsd(2, -1), undefined);
  assert.equal(estimateTaskCostUsd(2.5, 0.04), undefined);
});

test("formatCostUsd labels estimates as estimates", () => {
  assert.equal(formatCostUsd(0.08), "约 $0.08（估算，非实际扣费）");
  assert.equal(formatCostUsd(undefined), "尚未取得报价");
  assert.equal(formatCostUsd(Number.NaN), "尚未取得报价");
});

test("taskStateRank orders states for UI", () => {
  assert.equal(taskStateRank("queued"), 0);
  assert.equal(taskStateRank("running"), 1);
  assert.equal(taskStateRank("succeeded"), 3);
  assert.equal(taskStateRank("failed"), 4);
  assert.equal(taskStateRank("unknown"), 8);
});
