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
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";

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
