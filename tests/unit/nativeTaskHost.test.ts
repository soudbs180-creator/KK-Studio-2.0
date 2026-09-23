import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelNativeTask,
  getNativeTask,
  listNativeTasks,
  reconcileNativeTasks,
  submitNativeTask,
  type NativeTaskHostRequest,
} from "../../src/features/creation/nativeTaskHost.ts";
import {
  createProject,
  createTask,
  emptySnapshot,
  normalizeCreationSnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";

test("native text recovery restores bounded content and result edge exactly once", async () => {
  const project = createProject({
    prompt: "介绍",
    model: "gpt-text-test",
    kind: "text",
    attachments: [],
  });
  const task = {
    ...createTask(project),
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
  };
  project.tasks = [task];
  const native = record({
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    status: "succeeded",
    outputs: [{ index: 0, status: "succeeded", text: "文案".repeat(6000) }],
  });
  desktop(async (command) => {
    if (command === "task_host_list") return [native];
    if (command === "task_host_get") return native;
    throw new Error("text recovery must not read image assets or submit again");
  });
  try {
    const snapshot = {
      ...emptySnapshot(),
      projects: [project],
      activeProjectId: project.id,
    };
    const recovered = await reconcileNativeTasks(snapshot);
    // 36KB is rejected even if an IPC response marks it as completed.
    assert.equal(recovered.projects[0].tasks[0].status, "unknown");
    assert.equal(recovered.projects[0].tasks[0].resultItemId, undefined);
    native.outputs = [
      { index: 0, status: "succeeded", text: "文案".repeat(5000) },
    ];
    const valid = await reconcileNativeTasks(snapshot);
    assert.equal(valid.projects[0].tasks[0].status, "succeeded");
    assert.equal(valid.projects[0].items.at(-1)?.result?.text?.length, 10000);
    assert.equal(
      valid.projects[0].canvas.edges.filter((edge) => edge.kind === "result")
        .length,
      1,
    );
    const roundtrip = normalizeCreationSnapshot(valid)!;
    assert.equal(
      roundtrip.projects[0].items.at(-1)?.result?.text,
      "文案".repeat(5000),
    );
    const again = await reconcileNativeTasks(roundtrip);
    assert.equal(
      again.projects[0].items.length,
      valid.projects[0].items.length,
    );
    assert.equal(
      again.projects[0].canvas.edges.filter((edge) => edge.kind === "result")
        .length,
      1,
    );
    const edited = structuredClone(again);
    const editedResult = edited.projects[0].items.at(-1)!;
    editedResult.title = "用户标题";
    editedResult.result!.text = "用户保存的文案";
    const editedRecovered = await reconcileNativeTasks(edited);
    assert.equal(editedRecovered.projects[0].items.at(-1)?.title, "用户标题");
    assert.equal(
      editedRecovered.projects[0].items.at(-1)?.result?.text,
      "用户保存的文案",
    );
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

function desktop(
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>,
) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { __TAURI_INTERNALS__: { invoke } },
  });
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    taskId: "task-1",
    idempotencyKey: "stable-1",
    status: "submitted",
    outputIndices: [0],
    outputs: [{ index: 0, status: "pending" }],
    updatedAt: 42,
    ...overrides,
  };
}

test("native TaskHost adapter forwards stable request and command arguments", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  desktop(async (command, args) => {
    calls.push({ command, args });
    if (command === "task_host_list") return [record()];
    return record();
  });
  try {
    const request: NativeTaskHostRequest = {
      taskId: "task-1",
      idempotencyKey: "stable-1",
      baseUrl: "https://provider.test/v1",
      credentialRef: "credential-1",
      model: "image-test",
      prompt: "生成一张图",
      outputIndices: [0],
      attachments: [{ assetId: "asset-a", name: "ref.png" }],
      providerName: "Local",
      promptHash: "hash-1",
    };
    for (const value of [
      await submitNativeTask(request),
      await getNativeTask("task-1"),
      (await listNativeTasks())[0],
      await cancelNativeTask("task-1"),
    ]) {
      assert.equal(value?.taskId, "task-1");
      assert.equal(value?.idempotencyKey, "stable-1");
      assert.equal(value?.status, "submitted");
    }
    assert.deepEqual(calls, [
      { command: "task_host_submit", args: { request } },
      { command: "task_host_get", args: { taskId: "task-1" } },
      { command: "task_host_list", args: {} },
      { command: "task_host_cancel", args: { taskId: "task-1" } },
    ]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("native reconciliation fences a missing submitted task as unknown", async () => {
  desktop(async (command) => {
    assert.ok(command === "task_host_list" || command === "task_host_read");
    return command === "task_host_list" ? [] : [];
  });
  const project = createProject({
    prompt: "生成",
    model: "image-test",
    kind: "image",
    attachments: [],
  });
  project.tasks = [
    {
      id: "task-1",
      prompt: project.prompt,
      model: project.model,
      kind: project.kind,
      status: "running",
      submissionState: "submitted",
      createdAt: 1,
      updatedAt: 1,
      attachments: [],
      attempt: 1,
      requestedOutputs: 1,
      completedOutputs: 0,
      idempotencyKey: "stable-1",
      privacyMode: "byok_local",
    },
  ];
  const snapshot: CreationSnapshot = {
    version: 2,
    revision: 1,
    activeProjectId: project.id,
    projects: [project],
    homeDraft: {
      prompt: "",
      model: "",
      kind: "image",
      attachments: [],
      approvalMode: "auto",
      privacyMode: "byok_local",
      outputCount: 1,
      updatedAt: 0,
    },
  };
  try {
    const reconciled = await reconcileNativeTasks(snapshot);
    const task = reconciled.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(task.submissionState, "unknown");
    assert.match(task.error ?? "", /不会自动重复提交/);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
