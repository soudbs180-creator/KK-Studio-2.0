import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  type CreationTask,
} from "../../src/features/creation/model.ts";
import {
  taskOutputsForDisplay,
  taskRetryAvailability,
} from "../../src/features/creation/taskRetryAvailability.ts";

function failedTask(id: string, count = 1): CreationTask {
  const project = createProject({
    prompt: "安全重试夹具",
    model: "image-test",
    kind: "image",
    attachments: [],
    outputCount: count,
  });
  const task = createTask(project);
  return {
    ...task,
    id,
    status: "failed",
    submissionState: "terminal",
    outputs: task.outputs!.map((output) => ({ ...output, status: "failed" })),
  };
}

for (const [status, submissionState, reason] of [
  ["failed", "unknown", /受理状态不明/],
  ["partial", "submitted", /已提交/],
  ["interrupted", "unknown", /受理状态不明/],
] as const) {
  test(`${status}/${submissionState} never advertises a safe retry`, () => {
    const task = { ...failedTask("root"), status, submissionState };
    const result = taskRetryAvailability(task);
    assert.deepEqual(result.indices, []);
    assert.match(result.blockedReason!, reason);
  });
}

for (const [status, submissionState, outputStatus] of [
  ["queued", "intent", "waiting"],
  ["running", "submitted", "running"],
  ["unknown", "unknown", "unknown"],
  ["succeeded", "terminal", "succeeded"],
] as const) {
  test(`a ${status} retry child protects only its original output slot`, () => {
    const root = failedTask("root", 2);
    const child: CreationTask = {
      ...failedTask("child"),
      status,
      submissionState,
      retryOfTaskId: root.id,
      retryOutputIndices: [1],
      outputs: [{ ...root.outputs![1], index: 0, status: outputStatus }],
    };
    const result = taskRetryAvailability(root, [root, child]);
    assert.deepEqual(result.indices, [0]);
    assert.match(result.blockedReason!, /已有重试任务/);
  });
}

test("nested retry fences return the selected child's local indices", () => {
  const root = failedTask("root", 3);
  const child = {
    ...failedTask("child", 2),
    retryOfTaskId: root.id,
    retryOutputIndices: [2, 0],
  };
  const grandchild: CreationTask = {
    ...failedTask("grandchild"),
    status: "running",
    submissionState: "submitted",
    retryOfTaskId: child.id,
    retryOutputIndices: [1],
    outputs: [{ ...child.outputs![1], index: 0, status: "running" }],
  };
  const result = taskRetryAvailability(child, [root, child, grandchild]);
  assert.deepEqual(result.indices, [0]);
  assert.match(result.blockedReason!, /已有重试任务/);
});

test("legacy completion indices remain protected and preserve display labels", () => {
  const task = {
    ...failedTask("legacy", 3),
    outputs: undefined,
    completedOutputs: 1,
    completedOutputIndices: [1],
  };
  assert.deepEqual(taskRetryAvailability(task).indices, [0, 2]);
  assert.deepEqual(
    taskOutputsForDisplay(task).map((output) => output.status),
    ["failed", "succeeded", "failed"],
  );
});

test("a child cannot bypass its original task's unknown acceptance", () => {
  const root = { ...failedTask("root"), submissionState: "unknown" as const };
  const child = {
    ...failedTask("child"),
    retryOfTaskId: root.id,
    retryOutputIndices: [0],
  };
  const result = taskRetryAvailability(child, [root, child]);
  assert.deepEqual(result.indices, []);
  assert.match(result.blockedReason!, /受理状态不明/);
});

test("safe failed outputs stay available and completed outputs do not", () => {
  const task = failedTask("partial", 2);
  task.status = "partial";
  task.completedOutputs = 1;
  task.outputs![0].status = "succeeded";
  const result = taskRetryAvailability(task);
  assert.deepEqual(result.indices, [1]);
  assert.equal(result.blockedReason, undefined);
});
