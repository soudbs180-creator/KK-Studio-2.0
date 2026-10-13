import assert from "node:assert/strict";
import test from "node:test";
import type {
  CanvasCollectionItem,
  CanvasItemKind,
} from "../../src/domain/canvasItems.ts";
import {
  createProject,
  createTask,
  type CreationProject,
  type CreationTask,
  type CreationTaskOutput,
} from "../../src/features/creation/model.ts";
import { summarizeUsage } from "../../src/features/creation/usageSummary.ts";
import type { TaskCostReceipt } from "../../src/features/creation/taskState.ts";

const assetId = "asset-0123456789abcdef01234567";
function project(): CreationProject {
  const value = createProject({
    prompt: "usage fixture",
    model: "synthetic",
    kind: "image",
    attachments: [],
  });
  return { ...value, id: "usage-project", items: [], tasks: [] };
}
function task(
  value: CreationProject,
  id: string,
  kind: CanvasItemKind = "image",
): CreationTask {
  return {
    ...createTask({ ...value, kind }),
    id,
    idempotencyKey: "idem-" + id,
  };
}
function output(index = 0): CreationTaskOutput {
  return {
    index,
    status: "succeeded",
    assetId,
    model: "synthetic",
    createdAt: 1,
  };
}
function result(
  value: CreationProject,
  target: CreationTask,
): CanvasCollectionItem {
  return {
    id: value.id + "-" + target.id + "-result-1",
    title: "stored result",
    description: "",
    kind: target.kind,
    assetId: target.kind === "text" ? undefined : assetId,
    result: {
      id: "result",
      title: "stored result",
      description: "",
      kind: target.kind,
      source: "provider",
      text: target.kind === "text" ? "archived text" : undefined,
    },
  };
}
function receipt(
  target: CreationTask,
  patch: Partial<TaskCostReceipt> = {},
): TaskCostReceipt {
  return {
    kind: "actual",
    source: "provider",
    currency: "USD",
    amount: 0.25,
    providerId: "provider-one",
    receiptId: "bill-one",
    receivedAt: 1,
    taskId: target.id,
    idempotencyKey: target.idempotencyKey,
    ...patch,
  };
}

test("usage reads task states without changing project records", () => {
  const value = project();
  const states = [
    "queued",
    "running",
    "unknown",
    "partial",
    "succeeded",
    "failed",
    "cancelled",
    "offline",
    "interrupted",
  ] as const;
  value.tasks = states.map((status, index) => ({
    ...task(value, "task-" + index),
    status,
  }));
  const before = structuredClone(value);
  const summary = summarizeUsage([value]);
  assert.equal(summary.projectCount, 1);
  assert.equal(summary.taskCount, 9);
  assert.equal(summary.succeededTasks, 1);
  assert.equal(summary.failedTasks, 1);
  assert.equal(summary.cancelledTasks, 1);
  assert.equal(summary.unfinishedTasks, 6);
  assert.deepEqual(value, before);
});

test("success counts require matching provider result evidence and deduplicate shared retry references", () => {
  const value = project();
  const image = { ...task(value, "image"), outputs: [output()] };
  const imageResult = result(value, image);
  const retry = {
    ...task(value, "retry"),
    retryOfTaskId: image.id,
    retryOutputIndices: [0],
    resultItemId: imageResult.id,
    outputs: [output()],
  };
  const secondImage = { ...task(value, "second-image"), outputs: [output()] };
  const video = { ...task(value, "video", "video"), outputs: [output()] };
  const text = {
    ...task(value, "text", "text"),
    outputs: [{ ...output(), assetId: undefined, text: "archived text" }],
  };
  const demo = { ...task(value, "demo"), outputs: [output()] };
  const demoResult = result(value, demo);
  demoResult.result!.source = "demo";
  value.tasks = [image, retry, secondImage, video, text, demo];
  value.items = [
    imageResult,
    result(value, secondImage),
    result(value, video),
    result(value, text),
    demoResult,
  ];
  const summary = summarizeUsage([value]);
  assert.deepEqual(summary.outputs, { image: 2, video: 1, text: 1 });
  assert.deepEqual(summary.unreportedOutputs, {
    image: false,
    video: false,
    text: false,
  });
});

test("missing archive evidence, running drafts and completion counters cannot invent output counts", () => {
  const value = project();
  const image = { ...task(value, "image"), outputs: [output()] };
  const video = {
    ...task(value, "video", "video"),
    outputs: [{ ...output(), assetId: undefined }],
  };
  const text = {
    ...task(value, "text", "text"),
    outputs: [{ ...output(), text: "a different text" }],
  };
  const draft = {
    ...task(value, "draft", "text"),
    outputs: [
      { ...output(), status: "running" as const, text: "archived text" },
    ],
  };
  const legacy = {
    ...task(value, "legacy"),
    status: "succeeded" as const,
    completedOutputs: 64,
    outputs: undefined,
  };
  value.tasks = [image, video, text, draft, legacy];
  value.items = [
    result(value, video),
    result(value, text),
    result(value, draft),
  ];
  const summary = summarizeUsage([value]);
  assert.deepEqual(summary.outputs, { image: 0, video: 0, text: 0 });
  assert.deepEqual(summary.unreportedOutputs, {
    image: true,
    video: true,
    text: true,
  });
});

test("successful task state without a successful output receipt stays unreported", () => {
  const value = project();
  value.tasks = [
    {
      ...task(value, "missing-receipt", "video"),
      status: "succeeded",
      completedOutputs: 1,
    },
  ];
  const summary = summarizeUsage([value]);
  assert.equal(summary.outputs.video, 0);
  assert.equal(summary.unreportedOutputs.video, true);
});
test("legacy resultItemId counts one archived provider card and marks undocumented remaining outputs unknown", () => {
  const value = project();
  const target = {
    ...task(value, "legacy"),
    status: "succeeded" as const,
    completedOutputs: 3,
    outputs: undefined,
  };
  const item = result(value, target);
  target.resultItemId = item.id;
  value.tasks = [target];
  value.items = [item];
  const summary = summarizeUsage([value]);
  assert.equal(summary.outputs.image, 1);
  assert.equal(summary.unreportedOutputs.image, true);
});

test("USD totals ignore fixtures, estimates, other currencies, cross-task receipts and raw legacy amounts", () => {
  const value = project();
  const patches: Partial<TaskCostReceipt>[] = [
    { source: "fixture" },
    { kind: "estimate" },
    { currency: "CNY" },
    { taskId: "other-task" },
    { idempotencyKey: "other-key" },
  ];
  value.tasks = patches.map((patch, index) => {
    const target = task(value, "invalid-" + index);
    return {
      ...target,
      actualCostReceipt: receipt(target, patch),
      actualCostUsd: 999,
    };
  });
  value.tasks.push({ ...task(value, "raw"), actualCostUsd: 999 });
  const summary = summarizeUsage([value]);
  assert.equal(summary.actualUsd, undefined);
  assert.equal(summary.receiptCount, 0);
});

test("provider and receipt identity deduplicate replay timestamps while preserving real zero receipts", () => {
  const value = project();
  const first = task(value, "first");
  const second = task(value, "second");
  value.tasks = [
    { ...first, actualCostReceipt: receipt(first, { amount: 0 }) },
    {
      ...first,
      actualCostReceipt: receipt(first, { amount: 0, receivedAt: 2 }),
    },
    {
      ...second,
      actualCostReceipt: receipt(second, { providerId: "provider-two" }),
    },
  ];
  const summary = summarizeUsage([value]);
  assert.equal(summary.actualUsd, 0.25);
  assert.equal(summary.receiptCount, 2);
  assert.equal(
    summarizeUsage([{ ...value, tasks: value.tasks.slice(0, 1) }]).actualUsd,
    0,
  );
});

test("receipt conflicts and a receipt reused by another task invalidate the entire identity", () => {
  for (const reuse of [false, true]) {
    const value = project();
    const first = task(value, "first");
    const second = reuse ? task(value, "second") : first;
    value.tasks = [
      { ...first, actualCostReceipt: receipt(first) },
      {
        ...second,
        actualCostReceipt: receipt(second, { amount: reuse ? 0.25 : 0.5 }),
      },
      { ...first, actualCostReceipt: receipt(first) },
    ];
    const summary = summarizeUsage([value]);
    assert.equal(summary.actualUsd, undefined);
    assert.equal(summary.receiptCount, 0);
  }
});

test("empty local records do not pretend to have reported billing", () => {
  const summary = summarizeUsage([]);
  assert.equal(summary.projectCount, 0);
  assert.equal(summary.taskCount, 0);
  assert.deepEqual(summary.outputs, { image: 0, video: 0, text: 0 });
  assert.equal(summary.actualUsd, undefined);
});
