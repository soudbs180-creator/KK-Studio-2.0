import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  type CreationProject,
  type CreationTask,
} from "../../src/features/creation/model.ts";
import {
  abortedAfterProviderSubmission,
  canRetryTask,
  mergeRetryTaskState,
  preserveAcceptedOutputsOnDeliveryFailure,
  recoverInterruptedTasks,
  retryBlockedOutputIndices,
  retryableOutputIndices,
} from "../../src/features/creation/taskRecovery.ts";

function task(
  id: string,
  status: CreationTask["status"],
  sourceItemId?: string,
): CreationTask {
  return {
    id,
    sourceItemId,
    prompt: id,
    model: "image-test",
    kind: "image",
    status,
    submissionState: status === "running" ? "submitted" : "intent",
    createdAt: 1,
    updatedAt: 1,
    attachments: [],
    attempt: 1,
    requestedOutputs: 1,
    completedOutputs: 0,
    idempotencyKey: id,
    privacyMode: "byok_local",
  };
}

function project(
  items: CreationProject["items"],
  tasks: CreationTask[],
  id = "project-1",
): CreationProject {
  const value = createProject({
    prompt: "测试项目",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  return {
    ...value,
    id,
    items,
    tasks,
    updatedAt: 1,
  };
}

function snapshot(projects: CreationProject[]) {
  return {
    version: 2 as const,
    revision: 4,
    activeProjectId: projects[0]?.id ?? null,
    projects,
    homeDraft: {
      prompt: "",
      model: "",
      kind: "image" as const,
      attachments: [],
      approvalMode: "auto" as const,
      privacyMode: "byok_local" as const,
      outputCount: 1,
      updatedAt: 1,
    },
  };
}

test("marks each explicit source and leaves unrelated image nodes untouched", () => {
  const value = project(
    [
      { id: "project-1-prompt", title: "根", description: "", kind: "image" },
      { id: "source-a", title: "A", description: "", kind: "image" },
      { id: "source-b", title: "B", description: "", kind: "image" },
      { id: "unrelated", title: "无关", description: "", kind: "image" },
    ],
    [
      task("task-a", "queued", "source-a"),
      task("task-b", "running", "source-b"),
    ],
  );
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  const items = recovered.projects[0].items;
  assert.equal(recovered.revision, 5);
  assert.deepEqual(
    items
      .filter((item) => item.generationStatus === "error")
      .map((item) => item.id),
    ["source-a", "source-b"],
  );
  assert.equal(recovered.projects[0].tasks[0].status, "interrupted");
  assert.equal(recovered.projects[0].tasks[1].status, "unknown");
  assert.equal(recovered.projects[0].tasks[1].updatedAt, 99);
  assert.equal(recovered.projects[0].updatedAt, 99);
});

test("marks an explicit source even when the source already has a result", () => {
  const source = {
    id: "result-source",
    title: "已有结果",
    description: "",
    kind: "image" as const,
    result: {
      id: "result-1",
      kind: "image" as const,
      title: "旧结果",
      description: "",
      source: "provider" as const,
    },
  };
  const value = project([source], [task("task-1", "running", source.id)]);
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  assert.equal(recovered.projects[0].items[0].generationStatus, "error");
  assert.deepEqual(recovered.projects[0].items[0].result, source.result);
  assert.equal(recovered.projects[0].tasks[0].status, "unknown");
});

test("does not fall back when an explicit source was deleted", () => {
  const value = project(
    [
      { id: "project-1-prompt", title: "根", description: "", kind: "image" },
      { id: "other", title: "其他", description: "", kind: "image" },
    ],
    [task("task-1", "running", "deleted-source")],
  );
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  assert.equal(
    recovered.projects[0].items.some((item) => item.generationStatus),
    false,
  );
  assert.equal(recovered.projects[0].tasks[0].status, "unknown");
});

test("uses the historical root or first unmaterialized image for old tasks", () => {
  const rootProject = project(
    [
      { id: "project-1-prompt", title: "根", description: "", kind: "image" },
      { id: "other", title: "其他", description: "", kind: "image" },
    ],
    [task("legacy-root", "queued")],
  );
  const firstImageProject = project(
    [
      { id: "text", title: "文案", description: "", kind: "text" },
      { id: "first-image", title: "图片", description: "", kind: "image" },
      { id: "second-image", title: "图片 2", description: "", kind: "image" },
    ],
    [task("legacy-image", "running")],
    "project-2",
  );
  const recovered = recoverInterruptedTasks(
    snapshot([rootProject, firstImageProject]),
    99,
  );
  assert.equal(
    recovered.projects[0].items.find((item) => item.id === "project-1-prompt")
      ?.generationStatus,
    "error",
  );
  assert.equal(
    recovered.projects[1].items.find((item) => item.id === "first-image")
      ?.generationStatus,
    "error",
  );
  assert.equal(
    recovered.projects[1].items.find((item) => item.id === "second-image")
      ?.generationStatus,
    undefined,
  );
});

test("queued tasks with an unknown submission boundary stay fenced after restart", () => {
  const source = {
    id: "source",
    title: "图片",
    description: "",
    kind: "image" as const,
  };
  const queued = task("queued-unknown", "queued", source.id);
  queued.submissionState = "unknown";
  const recovered = recoverInterruptedTasks(
    snapshot([project([source], [queued])]),
    99,
  );
  const result = recovered.projects[0].tasks[0];
  assert.equal(result.status, "unknown");
  assert.equal(result.submissionState, "unknown");
  assert.equal(canRetryTask(result), false);
  assert.equal(recovered.projects[0].items[0].generationStatus, "error");
});

test("unknown or submitted tasks cannot enter the ordinary retry path", () => {
  const unknown = task("unknown", "running");
  unknown.status = "unknown";
  unknown.submissionState = "unknown";
  const submitted = task("submitted", "failed");
  submitted.submissionState = "submitted";
  assert.equal(canRetryTask(unknown), false);
  assert.equal(canRetryTask(submitted), false);
  assert.equal(canRetryTask(task("failed", "failed")), true);
});

test("retryable output selection excludes unknown slots from mixed batches", () => {
  const mixed = task("mixed", "partial");
  mixed.submissionState = "terminal";
  const outputs = [
    { index: 0, status: "failed" as const, model: mixed.model, createdAt: 1 },
    { index: 1, status: "unknown" as const, model: mixed.model, createdAt: 1 },
    {
      index: 2,
      status: "succeeded" as const,
      model: mixed.model,
      createdAt: 1,
    },
  ];
  assert.deepEqual(retryableOutputIndices(mixed, outputs), [0]);
  assert.deepEqual(retryableOutputIndices(mixed, outputs, 1), []);
  const interrupted = task("interrupted", "interrupted");
  interrupted.submissionState = "intent";
  assert.deepEqual(
    retryableOutputIndices(interrupted, [
      { index: 0, status: "waiting", model: interrupted.model, createdAt: 1 },
    ]),
    [0],
  );
  const legacy = task("legacy", "failed");
  legacy.outputs = undefined;
  assert.deepEqual(
    retryableOutputIndices(legacy, [
      { index: 0, status: "waiting", model: legacy.model, createdAt: 1 },
    ]),
    [0],
  );
});

test("restart reconciles an accepted retry child into its parent", () => {
  const parent = task("parent", "partial");
  parent.submissionState = "terminal";
  parent.outputs = [
    { index: 0, status: "failed", model: parent.model, createdAt: 1 },
  ];
  const child = task("retry", "running");
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [0];
  child.outputs = [
    { index: 0, status: "running", model: child.model, createdAt: 2 },
  ];
  const value = project([], [parent, child]);
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  const tasks = recovered.projects[0].tasks;
  assert.equal(tasks[1].status, "unknown");
  assert.equal(tasks[1].submissionState, "unknown");
  assert.equal(tasks[0].status, "unknown");
  assert.equal(tasks[0].submissionState, "unknown");
  assert.equal(tasks[0].outputs?.[0]?.status, "unknown");
  assert.equal(canRetryTask(tasks[0]), false);
});

test("retry recovery materializes a missing parent output slot", () => {
  const parent = task("sparse-parent", "partial");
  parent.submissionState = "terminal";
  parent.requestedOutputs = 2;
  parent.completedOutputs = 1;
  parent.outputs = [
    { index: 0, status: "succeeded", model: parent.model, createdAt: 1 },
  ];
  const child = task("sparse-retry", "succeeded");
  child.submissionState = "terminal";
  child.completedOutputs = 1;
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [1];
  child.outputs = [
    {
      index: 0,
      status: "succeeded",
      assetId: "asset-2",
      model: child.model,
      createdAt: 2,
    },
  ];
  const value = project([], [parent, child]);
  const result = recoverInterruptedTasks(snapshot([value]), 99).projects[0]
    .tasks[0];
  assert.equal(result.status, "succeeded");
  assert.equal(result.completedOutputs, 2);
  assert.deepEqual(
    result.outputs?.map((output) => [output.index, output.status]),
    [
      [0, "succeeded"],
      [1, "succeeded"],
    ],
  );
});

test("known legacy retry failure remains retryable instead of becoming unknown", () => {
  const parent = task("sparse-failed-parent", "partial");
  parent.submissionState = "terminal";
  parent.requestedOutputs = 2;
  parent.completedOutputs = 1;
  parent.outputs = [
    { index: 0, status: "succeeded", model: parent.model, createdAt: 1 },
  ];
  const child = task("sparse-failed-retry", "failed");
  child.submissionState = "terminal";
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [1];
  child.outputs = undefined;
  child.error = "provider failed";
  const value = project([], [parent, child]);
  const result = recoverInterruptedTasks(snapshot([value]), 99).projects[0]
    .tasks[0];
  assert.equal(result.status, "partial");
  assert.equal(result.submissionState, "terminal");
  assert.equal(result.outputs?.[1]?.status, "failed");
  assert.deepEqual(retryableOutputIndices(result, result.outputs ?? []), [1]);
});

test("legacy terminal failure resolves an unknown parent when every slot is covered", () => {
  const parent = task("unknown-legacy-parent", "unknown");
  parent.submissionState = "unknown";
  parent.requestedOutputs = 1;
  parent.completedOutputs = 0;
  parent.error = "原任务受理状态不明";
  const child = task("unknown-legacy-retry", "failed");
  child.submissionState = "terminal";
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [0];
  child.outputs = undefined;
  child.error = "provider failed";
  const value = project([], [parent, child]);
  const result = recoverInterruptedTasks(snapshot([value]), 99).projects[0]
    .tasks[0];
  assert.equal(result.status, "failed");
  assert.equal(result.submissionState, "terminal");
  assert.equal(result.error, "provider failed");
  assert.equal(canRetryTask(result), true);
});

test("retry recovery preserves legacy completion evidence without an output vector", () => {
  const parent = task("legacy-parent", "partial");
  parent.submissionState = "terminal";
  parent.requestedOutputs = 2;
  parent.completedOutputs = 1;
  parent.resultItemId = "saved-result";
  const child = task("retry", "failed");
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [1];
  child.submissionState = "terminal";
  child.outputs = [
    { index: 0, status: "failed", model: child.model, createdAt: 2 },
  ];
  const value = project([], [parent, child]);
  const known = recoverInterruptedTasks(snapshot([value]), 99).projects[0]
    .tasks[0];
  assert.deepEqual(known, parent);
  child.status = "unknown";
  child.submissionState = "unknown";
  const uncertain = recoverInterruptedTasks(snapshot([value]), 99).projects[0]
    .tasks[0];
  assert.equal(uncertain.status, "unknown");
  assert.equal(uncertain.completedOutputs, 1);
  assert.equal(uncertain.resultItemId, "saved-result");
  assert.equal(uncertain.outputs, undefined);
});

test("restart merges a successful legacy retry into the parent without creating an output vector", () => {
  const parent = task("legacy-parent-success", "partial");
  parent.submissionState = "terminal";
  parent.requestedOutputs = 2;
  parent.completedOutputs = 1;
  const child = task("legacy-retry-success", "succeeded");
  child.submissionState = "terminal";
  child.completedOutputs = 1;
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [1];
  child.outputs = [
    {
      index: 0,
      status: "succeeded",
      assetId: "asset-2",
      model: child.model,
      createdAt: 2,
    },
  ];
  const value = project([], [parent, child]);
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  const result = recovered.projects[0].tasks[0];
  assert.equal(result.status, "succeeded");
  assert.equal(result.submissionState, "terminal");
  assert.equal(result.completedOutputs, 2);
  assert.deepEqual(result.completedOutputIndices, [0, 1]);
  assert.equal(result.outputs, undefined);
  const repeated = recoverInterruptedTasks(recovered, 100);
  assert.equal(repeated.revision, recovered.revision);
  assert.deepEqual(
    repeated.projects[0].tasks[0].completedOutputIndices,
    [0, 1],
  );
});

test("retry selection fences persisted accepted descendants before parent merge", () => {
  const child = task("retry", "unknown");
  child.retryOfTaskId = "parent";
  child.retryOutputIndices = [0, 2];
  child.outputs = [
    { index: 0, status: "unknown", model: child.model, createdAt: 1 },
    { index: 1, status: "failed", model: child.model, createdAt: 1 },
  ];
  assert.deepEqual(retryBlockedOutputIndices([child], "parent"), [0, 2]);
  const failedChild = task("failed-retry", "failed");
  failedChild.retryOfTaskId = "parent";
  failedChild.retryOutputIndices = [1];
  failedChild.outputs = [
    { index: 0, status: "failed", model: failedChild.model, createdAt: 1 },
  ];
  assert.deepEqual(
    retryBlockedOutputIndices([child, failedChild], "parent"),
    [0, 2],
  );
  const safeInterrupted = task("safe-retry", "interrupted");
  safeInterrupted.retryOfTaskId = "parent";
  safeInterrupted.retryOutputIndices = [1];
  safeInterrupted.submissionState = "intent";
  safeInterrupted.outputs = [
    { index: 0, status: "waiting", model: safeInterrupted.model, createdAt: 1 },
  ];
  assert.deepEqual(retryBlockedOutputIndices([safeInterrupted], "parent"), []);
});

test("retry selection fences a legacy terminal success before parent merge", () => {
  const parent = task("legacy-parent-fence", "failed");
  parent.requestedOutputs = 2;
  parent.outputs = [
    { index: 0, status: "failed", model: parent.model, createdAt: 1 },
    { index: 1, status: "failed", model: parent.model, createdAt: 1 },
  ];
  const child = task("legacy-child-fence", "succeeded");
  child.submissionState = "terminal";
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [1];
  child.completedOutputs = 1;
  child.outputs = undefined;
  assert.deepEqual(retryBlockedOutputIndices([parent, child], parent.id), [1]);
});

test("retry selection maps accepted nested descendants to root slots", () => {
  const parent = task("nested-parent", "partial");
  parent.requestedOutputs = 3;
  parent.outputs = [
    { index: 0, status: "failed", model: parent.model, createdAt: 1 },
    { index: 1, status: "succeeded", model: parent.model, createdAt: 1 },
    { index: 2, status: "failed", model: parent.model, createdAt: 1 },
  ];
  const firstRetry = task("nested-retry-1", "failed");
  firstRetry.submissionState = "terminal";
  firstRetry.retryOfTaskId = parent.id;
  firstRetry.retryOutputIndices = [0, 2];
  firstRetry.outputs = [
    { index: 0, status: "failed", model: firstRetry.model, createdAt: 2 },
  ];
  const secondRetry = task("nested-retry-2", "running");
  secondRetry.submissionState = "submitted";
  secondRetry.retryOfTaskId = firstRetry.id;
  secondRetry.retryOutputIndices = [1];
  secondRetry.outputs = [
    { index: 0, status: "running", model: secondRetry.model, createdAt: 3 },
  ];
  assert.deepEqual(
    retryBlockedOutputIndices([parent, firstRetry, secondRetry], parent.id),
    [2],
  );
});

test("one recovery pass merges a nested terminal descendant into the root", () => {
  const parent = task("nested-parent-reconcile", "partial");
  parent.submissionState = "terminal";
  parent.outputs = [
    { index: 0, status: "failed", model: parent.model, createdAt: 1 },
  ];
  const child = task("nested-child-reconcile", "failed");
  child.submissionState = "terminal";
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = [0];
  child.outputs = [
    { index: 0, status: "failed", model: child.model, createdAt: 2 },
  ];
  const grandchild = task("nested-grandchild-reconcile", "succeeded");
  grandchild.submissionState = "terminal";
  grandchild.retryOfTaskId = child.id;
  grandchild.retryOutputIndices = [0];
  grandchild.outputs = [
    {
      index: 0,
      status: "succeeded",
      assetId: "asset-final",
      model: grandchild.model,
      createdAt: 3,
    },
  ];
  // The grandchild precedes its parent to exercise the stale-child window.
  const value = project([], [parent, grandchild, child]);
  const recovered = recoverInterruptedTasks(snapshot([value]), 99);
  const tasks = recovered.projects[0].tasks;
  assert.equal(tasks[0].status, "succeeded");
  assert.equal(tasks[0].outputs?.[0].status, "succeeded");
  assert.equal(tasks[2].status, "succeeded");
});

test("retry selection fences legacy uncertain children without slot metadata", () => {
  const parent = task("legacy-unknown-parent", "failed");
  parent.requestedOutputs = 2;
  parent.outputs = [
    { index: 0, status: "failed", model: parent.model, createdAt: 1 },
    { index: 1, status: "failed", model: parent.model, createdAt: 1 },
  ];
  const child = task("legacy-unknown-child", "unknown");
  child.submissionState = "unknown";
  child.retryOfTaskId = parent.id;
  child.retryOutputIndices = undefined;
  child.outputs = undefined;
  assert.deepEqual(
    retryBlockedOutputIndices([parent, child], parent.id),
    [0, 1],
  );
});

test("retry child uncertainty propagates to the parent and locks ordinary retry", () => {
  const parent = task("parent", "partial");
  parent.submissionState = "terminal";
  parent.requestedOutputs = 2;
  parent.outputs = [
    {
      index: 0,
      status: "failed",
      model: parent.model,
      createdAt: 1,
    },
    {
      index: 1,
      status: "succeeded",
      assetId: "asset-1",
      model: parent.model,
      createdAt: 1,
    },
  ];
  const retry = task("retry", "unknown");
  retry.submissionState = "unknown";
  retry.retryOfTaskId = parent.id;
  retry.retryOutputIndices = [0];
  retry.outputs = [
    {
      index: 0,
      status: "unknown",
      model: retry.model,
      createdAt: 2,
      error: "生成产物尚未登记到画布。",
    },
  ];
  const merged = mergeRetryTaskState({ parent, retry });
  assert.equal(merged.status, "unknown");
  assert.equal(merged.submissionState, "unknown");
  assert.equal(merged.outputs?.[0]?.status, "unknown");
  assert.equal(canRetryTask(merged), false);

  const missingOutput = mergeRetryTaskState({
    parent,
    retry: {
      outputs: [],
      retryOutputIndices: [0],
      status: "unknown",
      submissionState: "unknown",
      error: "供应商受理状态不明。",
    },
  });
  assert.equal(missingOutput.outputs?.[0]?.status, "unknown");
  assert.equal(missingOutput.status, "unknown");
  assert.equal(canRetryTask(missingOutput), false);

  const succeededButUncertain = mergeRetryTaskState({
    parent,
    retry: {
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-2",
          model: retry.model,
          createdAt: 2,
        },
      ],
      retryOutputIndices: [0],
      status: "unknown",
      submissionState: "unknown",
      error: "原生任务最终状态仍需核对。",
    },
  });
  assert.equal(succeededButUncertain.status, "unknown");
  assert.equal(succeededButUncertain.submissionState, "unknown");
  assert.equal(canRetryTask(succeededButUncertain), false);

  const resolved = mergeRetryTaskState({
    parent: {
      ...parent,
      outputs: [
        {
          index: 0,
          status: "unknown",
          model: parent.model,
          createdAt: 1,
          error: "等待最终回执",
        },
        parent.outputs[1],
      ],
      status: "unknown",
      submissionState: "unknown",
    },
    retry: {
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-final",
          model: parent.model,
          createdAt: 3,
        },
      ],
      retryOutputIndices: [0],
      status: "succeeded",
      submissionState: "terminal",
    },
  });
  assert.equal(resolved.status, "succeeded");
  assert.equal(resolved.submissionState, "terminal");
  assert.equal(resolved.outputs?.[0]?.status, "succeeded");

  const lateReceipt = mergeRetryTaskState({
    parent: {
      ...parent,
      status: "unknown",
      submissionState: "unknown",
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-final",
          model: parent.model,
          createdAt: 3,
        },
        parent.outputs[1],
      ],
    },
    retry: {
      outputs: [
        {
          index: 0,
          status: "succeeded",
          assetId: "asset-final",
          model: parent.model,
          createdAt: 3,
        },
      ],
      retryOutputIndices: [0],
      status: "succeeded",
      submissionState: "terminal",
    },
  });
  assert.equal(lateReceipt.status, "succeeded");
  assert.equal(lateReceipt.submissionState, "terminal");
});

test("delivery rejection fences only the rejected batch slot", () => {
  const outputs = [
    {
      index: 0,
      status: "succeeded" as const,
      assetId: "asset-0",
      model: "image-test",
      createdAt: 1,
    },
    {
      index: 1,
      status: "succeeded" as const,
      assetId: "asset-1",
      model: "image-test",
      createdAt: 1,
    },
  ];
  const rejected = new Set(["project-task-result-2"]);
  const next = preserveAcceptedOutputsOnDeliveryFailure(
    outputs,
    "project",
    "task",
    rejected,
    "结果未通过画布交付校验。",
  );
  assert.equal(next[0].status, "succeeded");
  assert.equal(next[1].status, "unknown");
  assert.equal(next[1].error, "结果未通过画布交付校验。");
});

test("terminal retry failure closes a stale waiting parent slot", () => {
  const parent = task("waiting-parent", "partial");
  parent.submissionState = "terminal";
  parent.outputs = [
    { index: 0, status: "waiting", model: parent.model, createdAt: 1 },
  ];
  const retry = task("waiting-retry", "failed");
  retry.submissionState = "terminal";
  retry.retryOfTaskId = parent.id;
  retry.retryOutputIndices = [0];
  retry.outputs = [
    {
      index: 0,
      status: "failed",
      model: retry.model,
      createdAt: 2,
      error: "provider failed",
    },
  ];
  const merged = mergeRetryTaskState({ parent, retry });
  assert.equal(merged.outputs?.[0]?.status, "failed");
  assert.equal(merged.status, "failed");
  assert.equal(merged.submissionState, "terminal");
  assert.deepEqual(
    retryableOutputIndices({ ...parent, ...merged }, merged.outputs ?? []),
    [0],
  );

  const missingReceipt = mergeRetryTaskState({
    parent,
    retry: {
      outputs: [],
      retryOutputIndices: [0],
      status: "failed",
      submissionState: "terminal",
      error: "provider failed without an output receipt",
    },
  });
  assert.equal(missingReceipt.outputs?.[0]?.status, "failed");
  assert.equal(missingReceipt.status, "failed");
  assert.equal(missingReceipt.submissionState, "terminal");
  assert.deepEqual(
    retryableOutputIndices(
      { ...parent, ...missingReceipt },
      missingReceipt.outputs ?? [],
    ),
    [0],
  );
});

test("aborting after a provider request starts is always treated as unknown", () => {
  assert.equal(
    abortedAfterProviderSubmission({
      durableSubmission: true,
      providerRequestStarted: true,
      nativeTaskHost: false,
      aborted: true,
    }),
    true,
  );
  assert.equal(
    abortedAfterProviderSubmission({
      durableSubmission: true,
      providerRequestStarted: false,
      nativeTaskHost: true,
      aborted: true,
    }),
    true,
  );
  assert.equal(
    abortedAfterProviderSubmission({
      durableSubmission: true,
      providerRequestStarted: false,
      nativeTaskHost: false,
      aborted: true,
    }),
    false,
  );
  assert.equal(
    abortedAfterProviderSubmission({
      durableSubmission: false,
      providerRequestStarted: true,
      nativeTaskHost: false,
      aborted: true,
    }),
    false,
  );
});
