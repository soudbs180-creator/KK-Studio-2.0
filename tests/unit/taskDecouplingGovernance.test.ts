import assert from "node:assert/strict";
import test from "node:test";
import {
  outputsForTask,
  rootItemId,
  capacitySwitchHint,
  hasArchivedOutputEvidence,
  publishTaskOutputState,
} from "../../src/features/creation/useTaskExecution.ts";
import {
  resolveNativeStatus,
  resolveNativeErrorMessage,
  publishNativeRecordState,
} from "../../src/features/creation/nativeTaskExecution.ts";
import {
  canvasSignature,
  validatePreflightGuards,
} from "../../src/features/creation/useImageCommandSubmission.ts";
import type {
  CreationProject,
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "../../src/features/creation/model.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";

test("outputsForTask constructs outputs from completedOutputIndices", () => {
  const task: CreationTask = {
    id: "test-task-1",
    model: "gemini-2.5-flash",
    prompt: "Generate hero image",
    requestedOutputs: 3,
    completedOutputs: 1,
    completedOutputIndices: [1],
    status: "partial",
    kind: "image",
    createdAt: 1000,
    updatedAt: 1000,
    attempt: 1,
    attachments: [],
  };

  const outputs = outputsForTask(task);
  assert.equal(outputs.length, 3);
  assert.equal(outputs[0].status, "waiting");
  assert.equal(outputs[1].status, "succeeded");
  assert.equal(outputs[2].status, "waiting");
});

test("outputsForTask falls back to completedOutputs count when indices are omitted", () => {
  const task: CreationTask = {
    id: "test-task-2",
    model: "gemini-2.5-flash",
    prompt: "Generate portrait",
    requestedOutputs: 2,
    completedOutputs: 1,
    status: "partial",
    kind: "image",
    createdAt: 1000,
    updatedAt: 1000,
    attempt: 1,
    attachments: [],
  };

  const outputs = outputsForTask(task);
  assert.equal(outputs.length, 2);
  assert.equal(outputs[0].status, "succeeded");
  assert.equal(outputs[1].status, "waiting");
});

test("rootItemId finds prompt card or fallback to first image node", () => {
  const projectWithPromptNode: CreationProject = {
    id: "proj-1",
    title: "Test",
    kind: "image",
    model: "gemini-2.5-flash",
    prompt: "Hello",
    composerDraft: { prompt: "", attachments: [], updatedAt: 1000 },
    items: [
      { id: "img-1", title: "Image 1", kind: "image", updatedAt: 1000 },
      { id: "proj-1-prompt", title: "Prompt", kind: "text", updatedAt: 1000 },
    ],
    canvas: { edges: [] },
    tasks: [],
    messages: [],
    createdAt: 1000,
    updatedAt: 1000,
  };
  assert.equal(rootItemId(projectWithPromptNode), "proj-1-prompt");

  const projectWithoutPromptNode: CreationProject = {
    ...projectWithPromptNode,
    items: [
      { id: "img-1", title: "Image 1", kind: "image", updatedAt: 1000 },
      { id: "img-2", title: "Image 2", kind: "image", updatedAt: 1000 },
    ],
  };
  assert.equal(rootItemId(projectWithoutPromptNode), "img-1");
});

test("hasArchivedOutputEvidence strictly validates text vs image outputs", () => {
  const imageTask = { kind: "image" as const };
  assert.equal(
    hasArchivedOutputEvidence(imageTask, {
      status: "succeeded",
      assetId: "asset-123",
    }),
    true,
  );
  assert.equal(
    hasArchivedOutputEvidence(imageTask, { status: "succeeded", assetId: "" }),
    false,
  );
  assert.equal(
    hasArchivedOutputEvidence(imageTask, {
      status: "running",
      assetId: "asset-123",
    }),
    false,
  );

  const textTask = { kind: "text" as const };
  assert.equal(
    hasArchivedOutputEvidence(textTask, {
      status: "succeeded",
      text: "Generated description",
    }),
    true,
  );
  assert.equal(
    hasArchivedOutputEvidence(textTask, { status: "succeeded", text: "   " }),
    false,
  );
});

test("capacitySwitchHint returns safe feedback string", () => {
  const hint = capacitySwitchHint("unknown-connection");
  assert.equal(typeof hint, "string");
  assert.ok(hint.length > 0);
});

test("resolveNativeStatus distinguishes terminal success, partial, failed and uncertain", () => {
  assert.equal(resolveNativeStatus("succeeded", 2, 2, false), "succeeded");
  assert.equal(resolveNativeStatus("succeeded", 1, 2, false), "partial");
  assert.equal(resolveNativeStatus("failed", 1, 2, false), "partial");
  assert.equal(resolveNativeStatus("failed", 0, 2, false), "failed");
  assert.equal(resolveNativeStatus("running", 1, 2, false), "running");
  assert.equal(resolveNativeStatus("succeeded", 2, 2, true), "unknown");
});

test("resolveNativeErrorMessage returns appropriate error strings based on status", () => {
  assert.equal(resolveNativeErrorMessage("succeeded", false), undefined);
  assert.equal(
    resolveNativeErrorMessage("failed", false, "OOM in provider"),
    "OOM in provider",
  );
  assert.equal(
    resolveNativeErrorMessage(
      "unknown",
      true,
      "timeout",
      "output missing receipt",
    ),
    "output missing receipt",
  );
});

test("publishNativeRecordState awaits flushPublishedResult before clearing saving state", async () => {
  const callOrder: string[] = [];
  let publishedStatus = "";

  await publishNativeRecordState({
    record: {
      taskId: "task-test-native",
      idempotencyKey: "idem-1",
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen-test",
      prompt: "test",
      status: "succeeded",
      outputs: [{ index: 0, status: "succeeded", assetId: "asset-native-1" }],
    },
    outputs: [{ index: 0, status: "succeeded", assetId: "asset-native-1" }],
    requestedOutputs: 1,
    publish: (status) => {
      publishedStatus = status;
      callOrder.push(`publish:${status}`);
    },
    flushPublishedResult: async () => {
      callOrder.push("flush:start");
      await new Promise((r) => setTimeout(r, 10));
      callOrder.push("flush:end");
    },
    setResultSaving: (saving) => {
      callOrder.push(`setResultSaving:${saving}`);
    },
  });

  assert.equal(publishedStatus, "succeeded");
  assert.deepEqual(callOrder, [
    "publish:succeeded",
    "flush:start",
    "flush:end",
    "setResultSaving:false",
  ]);
});

test("publishTaskOutputState preserves delivery failure across subsequent publishes", () => {
  let project: CreationProject = {
    id: "proj-delivery",
    title: "Delivery Test",
    kind: "image",
    model: "test-model",
    prompt: "Prompt",
    composerDraft: { prompt: "", attachments: [], updatedAt: 1000 },
    items: [
      { id: "source-node", title: "Source", kind: "image", updatedAt: 1000 },
    ],
    canvas: { edges: [], positions: { "source-node": { x: 0, y: 0 } } },
    tasks: [
      {
        id: "task-delivery-1",
        model: "test-model",
        prompt: "Prompt",
        status: "running",
        submissionState: "submitted",
        kind: "image",
        requestedOutputs: 1,
        completedOutputs: 0,
        createdAt: 1000,
        updatedAt: 1000,
        attempt: 1,
        attachments: [],
        sourceItemId: "source-node",
      },
    ],
    messages: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const creationRef = {
    current: {
      projects: [project],
      activeProjectId: "proj-delivery",
      homeDraft: { prompt: "", attachments: [], updatedAt: 1000 },
    } as unknown as CreationSnapshot,
  };

  const updateProject = (
    id: string,
    updater: (p: CreationProject) => CreationProject,
  ) => {
    project = updater(project);
    creationRef.current.projects = [project];
  };

  const deliveryErrorRef = { current: undefined as string | undefined };
  let outputs: CreationTaskOutput[] = [
    { index: 0, status: "succeeded", model: "test-model", createdAt: 1000 },
  ];
  const setOutputs = (next: CreationTaskOutput[]) => {
    outputs = next;
  };

  const createdItems: CanvasCollectionItem[] = [
    // An item missing required assetId for kind="image" -> triggers assertCanvasDeliveries failure!
    {
      id: "proj-delivery-task-delivery-1-result-1",
      title: "Broken Result",
      kind: "image",
      assetId: "", // Empty assetId fails canvas deliveries
      updatedAt: 1000,
    },
  ];

  const publishedItems = new Set<string>();
  const rejectedDeliveryIds = new Set<string>();
  const activeProjectIdRef = { current: "proj-delivery" };
  const replaceCanvasItems = (
    items:
      | CanvasCollectionItem[]
      | ((curr: CanvasCollectionItem[]) => CanvasCollectionItem[]),
  ) => (typeof items === "function" ? items([]) : items);

  // First publish: chunk processing finishes and attempts delivery
  publishTaskOutputState({
    projectId: "proj-delivery",
    taskId: "task-delivery-1",
    task: project.tasks[0],
    status: "running",
    submissionState: "submitted",
    outputs,
    createdItems,
    publishedItems,
    rejectedDeliveryIds,
    deliveryErrorRef,
    setOutputs,
    updateProject,
    creationRef,
    activeProjectIdRef,
    replaceCanvasItems,
  });

  // Verify delivery failed and deliveryErrorRef recorded the error
  assert.ok(
    deliveryErrorRef.current,
    "deliveryErrorRef should record delivery error",
  );
  assert.equal(
    project.tasks[0].status,
    "unknown",
    "Task status should become unknown on delivery error",
  );
  assert.equal(
    outputs[0].status,
    "unknown",
    "Output status should become unknown on delivery error",
  );

  // Second publish: Generation attempts to call publish("succeeded") with "terminal"
  publishTaskOutputState({
    projectId: "proj-delivery",
    taskId: "task-delivery-1",
    task: project.tasks[0],
    status: "succeeded",
    submissionState: "terminal",
    outputs,
    createdItems,
    publishedItems,
    rejectedDeliveryIds,
    deliveryErrorRef,
    setOutputs,
    updateProject,
    creationRef,
    activeProjectIdRef,
    replaceCanvasItems,
  });

  // CRITICAL VERIFICATION: The second publish must NOT overwrite status with "succeeded"
  assert.equal(
    project.tasks[0].status,
    "unknown",
    "Status must stay unknown and NOT be overwritten with succeeded",
  );
  assert.equal(
    project.tasks[0].submissionState,
    "unknown",
    "SubmissionState must stay unknown",
  );
  assert.equal(
    project.tasks[0].error,
    deliveryErrorRef.current,
    "Error message must be preserved",
  );
});

test("canvasSignature deterministically serializes project item and connected edges", () => {
  const project: CreationProject = {
    id: "proj-sig",
    title: "Sig Test",
    kind: "image",
    model: "gemini-2.5-flash",
    prompt: "Sig",
    composerDraft: { prompt: "", attachments: [], updatedAt: 1000 },
    items: [
      { id: "node-a", title: "A", kind: "image", updatedAt: 1000 },
      { id: "node-b", title: "B", kind: "image", updatedAt: 1000 },
    ],
    canvas: {
      edges: [
        { id: "e1", source: "node-a", target: "node-b", kind: "reference" },
        { id: "e2", source: "node-b", target: "node-a", kind: "result" },
      ],
    },
    tasks: [],
    messages: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  const sig = canvasSignature(project, "node-b");
  const parsed = JSON.parse(sig);
  assert.equal(parsed.items.length, 2); // node-b and node-a (source of non-result edge targeting node-b)
  assert.equal(parsed.edges.length, 1); // e1 only (non-result targeting node-b)
});

test("validatePreflightGuards blocks on locked submission or non-saved persistence state", () => {
  const submitLock = { current: true };
  const lockedError = validatePreflightGuards({
    submitLock,
    persistenceState: "saved",
  });
  assert.equal(lockedError, "正在提交图片任务，请稍候。");

  submitLock.current = false;
  const readOnlyError = validatePreflightGuards({
    submitLock,
    persistenceState: "read_only",
  });
  assert.equal(readOnlyError, "请先处理项目读取或保存提示，当前未提交生成。");

  const passed = validatePreflightGuards({
    submitLock,
    persistenceState: "saved",
  });
  assert.equal(passed, undefined);
});
