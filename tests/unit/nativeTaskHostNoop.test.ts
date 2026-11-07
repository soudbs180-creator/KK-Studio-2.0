import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  emptySnapshot,
  serializeCreationSnapshot,
  type CreationSnapshot,
  type CreationTask,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import {
  reconcileRetryTaskParents,
  recoverInterruptedTasks,
} from "../../src/features/creation/taskRecovery.ts";
import {
  listNativeTasks,
  reconcileNativeTasks,
} from "../../src/features/creation/nativeTaskHost.ts";

const persisted = (value: CreationSnapshot): CreationSnapshot =>
  JSON.parse(JSON.stringify(serializeCreationSnapshot(value)));

function fixture(withRetry = true) {
  const project = createProject({
    prompt: "synthetic local-only regression",
    model: "synthetic-model",
    kind: "image",
    attachments: [],
  });
  const parent: CreationTask = {
    ...createTask(project),
    id: "synthetic-parent",
    idempotencyKey: "synthetic-parent-key",
    status: "failed",
    submissionState: "terminal",
    createdAt: 10,
    updatedAt: 40,
    submittedAt: 11,
    sourceItemId: project.items[0].id,
    requestedOutputs: 1,
    completedOutputs: 0,
    error: "synthetic-parent-failure",
    outputs: [
      {
        index: 0,
        status: "failed",
        model: "synthetic-model",
        createdAt: 10,
      },
    ],
  };
  Object.assign(parent, { opaque: { keep: ["nested", { value: 1 }] } });
  const child: CreationTask = {
    ...createTask(project),
    id: "synthetic-retry",
    idempotencyKey: "synthetic-retry-key",
    status: "cancelled",
    submissionState: "terminal",
    createdAt: 20,
    updatedAt: 30,
    requestedOutputs: 1,
    completedOutputs: 0,
    error: "synthetic-user-cancel",
    retryOfTaskId: parent.id,
    retryOutputIndices: [0],
    outputs: [
      {
        index: 0,
        status: "cancelled",
        model: "synthetic-model",
        createdAt: 20,
      },
    ],
  };
  Object.assign(child.outputs![0], {
    opaque: { keep: ["nested", { value: 2 }] },
  });
  project.tasks = withRetry ? [parent, child] : [parent];
  project.items[0].generationStatus = "error";
  let snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    version: 3,
    projects: [project],
    activeProjectId: project.id,
    revision: 7,
  };
  snapshot = reconcileRetryTaskParents(snapshot, 40);
  snapshot.projects[0].updatedAt = 40;
  snapshot.revision = 7;
  snapshot = decodeSnapshot(persisted(snapshot));
  const native = {
    taskId: parent.id,
    idempotencyKey: parent.idempotencyKey,
    status: "failed",
    outputIndices: [0],
    outputs: [{ index: 0, status: "failed" }],
    failure: {
      failureClass: "provider",
      status: 500,
      message: "synthetic-parent-failure",
    },
    updatedAt: 11,
  };
  return { snapshot, native };
}

async function run(
  snapshot: CreationSnapshot,
  records: ReturnType<typeof fixture>["native"][],
  onlyTaskIds?: string[],
) {
  const calls: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          calls.push(command);
          if (command === "task_host_list") return structuredClone(records);
          throw new Error("Synthetic fixture refuses all non-list IPC");
        },
      },
    },
  });
  try {
    return {
      result: recoverInterruptedTasks(
        await reconcileNativeTasks(snapshot, onlyTaskIds),
        100,
      ),
      calls,
    };
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
}

test("native and retry recovery preserve a settled snapshot after an older parent receipt", async () => {
  const { snapshot, native } = fixture();
  const untouched = persisted(snapshot);
  const { result, calls } = await run(snapshot, [native]);
  assert.deepEqual(calls, ["task_host_list"]);
  assert.deepEqual(persisted(snapshot), untouched);
  assert.deepEqual(persisted(result), untouched);
  assert.equal(result, snapshot);
  assert.equal(result.projects[0], snapshot.projects[0]);
  assert.equal(result.projects[0].tasks, snapshot.projects[0].tasks);
  assert.equal((await run(result, [native])).result, snapshot);
});

test("an equal-time parent receipt also preserves a settled retry aggregate", async () => {
  const { snapshot, native } = fixture();
  native.updatedAt = snapshot.projects[0].tasks[0].updatedAt;
  assert.equal((await run(snapshot, [native])).result, snapshot);
});

test("a validated newer receipt preserves a timestamp-only update", async () => {
  const { snapshot, native } = fixture(false);
  const baseline = (await run(snapshot, [native])).result;
  native.updatedAt = 90;
  const { result } = await run(baseline, [native]);
  const comparable = persisted(result);
  comparable.revision = baseline.revision;
  comparable.projects[0].updatedAt = baseline.projects[0].updatedAt;
  comparable.projects[0].tasks[0].updatedAt =
    baseline.projects[0].tasks[0].updatedAt;
  assert.deepEqual(comparable, persisted(baseline));
  assert.notEqual(result, baseline);
  assert.equal(result.projects[0].tasks[0].updatedAt, 90);
  assert.equal((await run(result, [native])).result, result);
});

test("a genuine failure change survives even when its receipt timestamp is older", async () => {
  const { snapshot, native } = fixture(false);
  native.failure.message = "synthetic-new-failure";
  const { result } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.equal(result.projects[0].tasks[0].error, "synthetic-new-failure");
  assert.equal(result.projects[0].tasks[0].updatedAt, 11);
  assert.deepEqual(
    (result.projects[0].tasks[0] as CreationTask & { opaque: unknown }).opaque,
    { keep: ["nested", { value: 1 }] },
  );
});

test("a real source-item repair remains persisted when final task semantics cancel out", async () => {
  const { snapshot, native } = fixture();
  snapshot.projects[0].items[0].generationStatus = "pending";
  const { result } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.equal(result.projects[0].items[0].generationStatus, "error");
  assert.equal(result.projects[0].tasks[0], snapshot.projects[0].tasks[0]);
});

test("a real canvas repair is retained alongside a settled task aggregate", async () => {
  const { snapshot, native } = fixture();
  snapshot.projects[0].canvas.positions = {};
  const { result } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.ok(Object.keys(result.projects[0].canvas.positions).length > 0);
  assert.equal(result.projects[0].tasks[0], snapshot.projects[0].tasks[0]);
});

test("onlyTaskIds does not apply a newer receipt for an unselected task", async () => {
  const { snapshot, native } = fixture();
  const unselected: CreationTask = {
    ...snapshot.projects[0].tasks[0],
    id: "synthetic-unselected",
    idempotencyKey: "synthetic-unselected-key",
    outputs: [
      { index: 0, status: "failed", model: "synthetic", createdAt: 10 },
    ],
  };
  snapshot.projects[0].tasks.push(unselected);
  const newer = {
    ...native,
    taskId: unselected.id,
    idempotencyKey: unselected.idempotencyKey,
    updatedAt: 90,
    failure: { ...native.failure, message: "unselected new failure" },
  };
  const { result } = await run(snapshot, [native, newer], [native.taskId]);
  assert.equal(result, snapshot);
  assert.equal(result.projects[0].tasks[2], unselected);
});

test("an inconsistent identity still becomes unknown instead of being suppressed", async () => {
  const { snapshot, native } = fixture(false);
  native.idempotencyKey = "synthetic-foreign-key";
  const { result, calls } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.equal(result.projects[0].tasks[0].status, "unknown");
  assert.equal(result.projects[0].tasks[0].submissionState, "unknown");
  assert.equal(result.projects[0].tasks[0].outputs?.[0].status, "unknown");
  assert.deepEqual(calls, ["task_host_list"]);
});

test("a changed opaque retry output is retained with all known fields equal", async () => {
  const { snapshot, native } = fixture();
  Object.assign(snapshot.projects[0].tasks[1].outputs![0], {
    opaque: { keep: ["nested", { value: 3 }] },
  });
  const { result } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.notEqual(result.projects[0].tasks[0], snapshot.projects[0].tasks[0]);
  assert.deepEqual(
    result.projects[0].tasks[0].outputs,
    snapshot.projects[0].tasks[1].outputs,
  );
});

test("a newer parent receipt is retained even when retry aggregation restores its prior semantics", async () => {
  const { snapshot, native } = fixture();
  native.updatedAt = 90;
  const { result } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.ok(result.projects[0].tasks[0].updatedAt >= 90);
  assert.equal(
    result.projects[0].tasks[0].error,
    snapshot.projects[0].tasks[0].error,
  );
  assert.deepEqual(
    result.projects[0].tasks[0].outputs,
    snapshot.projects[0].tasks[0].outputs,
  );
});

for (const [label, rawTimestamp] of [
  ["missing", undefined],
  ["null", null],
  ["NaN", Number.NaN],
  ["positive infinity", Number.POSITIVE_INFINITY],
  ["negative infinity", Number.NEGATIVE_INFINITY],
  ["string", "90"],
] as const) {
  test(`a ${label} original receipt time cannot manufacture a newer retry aggregate`, async () => {
    const { snapshot, native } = fixture();
    if (rawTimestamp === undefined) Reflect.deleteProperty(native, "updatedAt");
    else Reflect.set(native, "updatedAt", rawTimestamp);
    const oldNow = Date.now;
    let clock = 100;
    Date.now = () => clock;
    try {
      const first = (await run(snapshot, [native])).result;
      clock = 200;
      const second = (await run(first, [native])).result;
      assert.deepEqual(persisted(first), persisted(snapshot));
      assert.deepEqual(persisted(second), persisted(snapshot));
      assert.equal(first, snapshot);
      assert.equal(second, snapshot);
    } finally {
      Date.now = oldNow;
    }
  });
}

test("a missing receipt time keeps the normalizer's existing clock fallback", async () => {
  const { native } = fixture();
  Reflect.deleteProperty(native, "updatedAt");
  const oldNow = Date.now;
  Date.now = () => 100;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          assert.equal(command, "task_host_list");
          return [native];
        },
      },
    },
  });
  try {
    assert.equal((await listNativeTasks())[0].updatedAt, 100);
  } finally {
    Date.now = oldNow;
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("a missing original receipt time does not suppress a real failure update", async () => {
  const { snapshot, native } = fixture(false);
  Reflect.deleteProperty(native, "updatedAt");
  native.failure.message = "synthetic-new-failure";
  const oldNow = Date.now;
  Date.now = () => 100;
  try {
    const { result } = await run(snapshot, [native]);
    assert.notEqual(result, snapshot);
    assert.equal(result.projects[0].tasks[0].error, "synthetic-new-failure");
    assert.equal(result.projects[0].tasks[0].updatedAt, 100);
  } finally {
    Date.now = oldNow;
  }
});

test("an invalid receipt time does not suppress identity quarantine", async () => {
  const { snapshot, native } = fixture(false);
  Reflect.set(native, "updatedAt", Number.NaN);
  native.idempotencyKey = "synthetic-foreign-key";
  const { result } = await run(snapshot, [native]);
  assert.notEqual(result, snapshot);
  assert.equal(result.projects[0].tasks[0].status, "unknown");
  assert.equal(result.projects[0].tasks[0].outputs?.[0].status, "unknown");
});
