import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  emptyDraft,
  serializeCreationSnapshot,
  type CreationSnapshot,
  type CreationTask,
  type CreationTaskOutput,
} from "../../src/features/creation/model.ts";
import { reconcileProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  recoverInterruptedTasks,
  reconcileRetryTaskParents,
} from "../../src/features/creation/taskRecovery.ts";

function task(id: string, extra: Partial<CreationTask> = {}): CreationTask {
  return {
    id,
    prompt: "synthetic recovery fixture",
    model: "image-test",
    kind: "image",
    status: "failed",
    submissionState: "terminal",
    createdAt: 1,
    updatedAt: 1,
    attachments: [],
    attempt: 1,
    requestedOutputs: 1,
    completedOutputs: 0,
    idempotencyKey: id,
    privacyMode: "byok_local",
    ...extra,
  };
}

function output(
  status: CreationTaskOutput["status"],
  extra: Partial<CreationTaskOutput> = {},
): CreationTaskOutput {
  return { index: 0, status, model: "image-test", createdAt: 1, ...extra };
}

function snapshot(tasks: CreationTask[]): CreationSnapshot {
  const project = {
    ...createProject({
      prompt: "synthetic recovery fixture",
      model: "image-test",
      kind: "image",
      attachments: [],
    }),
    id: "synthetic-project",
    items: [],
    tasks,
    createdAt: 1,
    updatedAt: 1,
  };
  project.canvas = reconcileProjectCanvas(project.canvas, project.items);
  return serializeCreationSnapshot({
    version: 3,
    revision: 4,
    activeProjectId: project.id,
    projects: [project],
    homeDraft: emptyDraft(),
  });
}

function terminalSiblings(withOutputs: boolean): CreationSnapshot {
  const children = ["A", "B"].map((label) =>
    task(`retry-${label}`, {
      error: `terminal child ${label}`,
      retryOfTaskId: "parent",
      retryOutputIndices: [0],
      ...(withOutputs
        ? { outputs: [output("failed", { error: `terminal child ${label}` })] }
        : {}),
    }),
  );
  const parent = task("parent", {
    error: withOutputs
      ? "0/1 张已归档，可重试未归档结果。"
      : "terminal child B",
    ...(withOutputs ? { outputs: structuredClone(children[1].outputs) } : {}),
  });
  return snapshot([parent, ...children]);
}

for (const [name, recover] of [
  ["interruption recovery", recoverInterruptedTasks],
  ["retry-parent recovery", reconcileRetryTaskParents],
] as const) {
  for (const withOutputs of [false, true]) {
    test(`${name} preserves all audit fields after terminal siblings return to the original ${withOutputs ? "outputs" : "legacy counts"}`, () => {
      const before = terminalSiblings(withOutputs);
      const untouched = structuredClone(before);
      const recovered = recover(before, 99);
      assert.deepEqual(before, untouched);
      assert.deepEqual(recovered, before);
      assert.equal(recovered, before);
      assert.equal(recovered.projects[0].tasks, before.projects[0].tasks);
      assert.equal(recover(recovered, 100), recovered);
    });
  }
}

test("a no-op recovery cannot replace valid audit fields with a non-finite clock", () => {
  for (const now of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const before = terminalSiblings(false);
    assert.equal(recoverInterruptedTasks(before, now), before);
  }
});

test("a genuine error update is retained once with unknown task fields intact", () => {
  const parent = {
    ...task("parent", { error: "prior error" }),
    extension: { opaque: [null, { retained: true }] },
  };
  const child = task("child", {
    error: "new error",
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
  });
  const before = snapshot([parent, child]);
  const recovered = recoverInterruptedTasks(before, 99);
  assert.equal(recovered.projects[0].tasks[0].error, "new error");
  assert.equal(recovered.projects[0].tasks[0].updatedAt, 99);
  assert.equal(recovered.projects[0].updatedAt, 99);
  assert.equal(recovered.revision, 5);
  assert.deepEqual(
    (recovered.projects[0].tasks[0] as typeof parent).extension,
    parent.extension,
  );
  assert.equal(recoverInterruptedTasks(recovered, 100), recovered);
});

test("a changed successful asset survives when status and completion count stay equal", () => {
  const parent = task("parent", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [output("succeeded", { assetId: "old-asset" })],
  });
  const child = task("child", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [output("succeeded", { assetId: "new-asset" })],
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
  });
  const recovered = recoverInterruptedTasks(snapshot([parent, child]), 99);
  assert.equal(recovered.projects[0].tasks[0].status, "succeeded");
  assert.equal(recovered.projects[0].tasks[0].completedOutputs, 1);
  assert.equal(
    recovered.projects[0].tasks[0].outputs?.[0].assetId,
    "new-asset",
  );
  assert.equal(recovered.projects[0].tasks[0].updatedAt, 99);
  assert.equal(recovered.revision, 5);
});

test("a changed opaque output field is retained with all known output fields equal", () => {
  const original = {
    ...output("succeeded", { assetId: "same-asset" }),
    opaque: { nested: [null, { value: "old" }] },
  };
  const changed = {
    ...original,
    opaque: { nested: [null, { value: "new" }] },
  };
  const parent = task("parent", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [original],
  });
  const child = task("child", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [changed],
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
  });
  const recovered = recoverInterruptedTasks(snapshot([parent, child]), 99);
  assert.deepEqual(recovered.projects[0].tasks[0].outputs, [changed]);
  assert.equal(recovered.revision, 5);
});

test("object key order alone does not advance audit timestamps or revision", () => {
  const original = output("succeeded", { assetId: "same-asset" });
  const reordered = Object.fromEntries(
    Object.entries(original).reverse(),
  ) as unknown as CreationTaskOutput;
  const parent = task("parent", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [original],
  });
  const child = task("child", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [reordered],
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
  });
  const before = snapshot([parent, child]);
  assert.equal(recoverInterruptedTasks(before, 99), before);
});

test("a real output status change survives even when the task remains failed", () => {
  const parent = task("parent", {
    outputs: [output("failed")],
    error: "0/1 张已归档，可重试未归档结果。",
  });
  const child = task("child", {
    status: "cancelled",
    outputs: [output("cancelled")],
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
  });
  const recovered = recoverInterruptedTasks(snapshot([parent, child]), 99);
  assert.equal(recovered.projects[0].tasks[0].status, "failed");
  assert.equal(recovered.projects[0].tasks[0].outputs?.[0].status, "cancelled");
  assert.equal(recovered.revision, 5);
});

for (const complete of [false, true]) {
  test(`${complete ? "complete" : "incomplete"} terminal evidence ${complete ? "resolves" : "preserves"} an unknown legacy parent`, () => {
    const parent = task("parent", {
      status: "unknown",
      submissionState: "unknown",
      requestedOutputs: complete ? 1 : 2,
      error: "unconfirmed",
    });
    const child = task("child", {
      error: "confirmed failed",
      retryOfTaskId: parent.id,
      retryOutputIndices: [0],
    });
    const recovered = recoverInterruptedTasks(snapshot([parent, child]), 99);
    assert.equal(
      recovered.projects[0].tasks[0].status,
      complete ? "failed" : "unknown",
    );
    assert.equal(
      recovered.projects[0].tasks[0].submissionState,
      complete ? "terminal" : "unknown",
    );
    assert.equal(recovered.projects[0].tasks[0].outputs, undefined);
    assert.equal(recovered.projects[0].tasks[0].completedOutputs, 0);
    if (complete) {
      assert.equal(recovered.projects[0].tasks[0].error, "confirmed failed");
      assert.equal(recovered.revision, 5);
    }
  });
}

test("a changed intermediate descendant is retained when the root is already current", () => {
  const final = output("succeeded", { assetId: "final-asset" });
  const parent = task("parent", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [final],
  });
  const child = task("child", {
    outputs: [output("failed")],
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
  });
  const grandchild = task("grandchild", {
    status: "succeeded",
    completedOutputs: 1,
    outputs: [final],
    retryOfTaskId: child.id,
    retryOutputIndices: [0],
  });
  const before = snapshot([parent, grandchild, child]);
  const recovered = recoverInterruptedTasks(before, 99);
  assert.equal(recovered.projects[0].tasks[0], parent);
  assert.equal(recovered.projects[0].tasks[2].status, "succeeded");
  assert.equal(
    recovered.projects[0].tasks[2].outputs?.[0].assetId,
    "final-asset",
  );
  assert.equal(recovered.projects[0].tasks[2].updatedAt, 99);
  assert.equal(recovered.revision, 5);
});

test("a real source-card correction persists while unchanged tasks keep their identity", () => {
  const parent = task("parent", { sourceItemId: "source" });
  const before = snapshot([parent]);
  before.projects[0].items = [
    {
      id: "source",
      title: "synthetic source",
      description: "",
      kind: "image",
      generationStatus: "pending",
    },
  ];
  before.projects[0].canvas = reconcileProjectCanvas(
    before.projects[0].canvas,
    before.projects[0].items,
  );
  const recovered = recoverInterruptedTasks(before, 99);
  assert.equal(recovered.projects[0].tasks, before.projects[0].tasks);
  assert.equal(recovered.projects[0].tasks[0], parent);
  assert.equal(recovered.projects[0].items[0].generationStatus, "error");
  assert.equal(recovered.projects[0].updatedAt, 99);
  assert.equal(recovered.revision, 5);
});
