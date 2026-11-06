import assert from "node:assert/strict";
import test from "node:test";
import { reconcileNativeTasks } from "../../src/features/creation/nativeTaskHost.ts";
import {
  createProject,
  createTask,
  emptySnapshot,
} from "../../src/features/creation/model.ts";
import { applyArchivedCostReceipt } from "../../src/features/creation/taskCostArchive.ts";

function desktop(
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>,
) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { __TAURI_INTERNALS__: { invoke } },
  });
}

function quote(
  task: { id: string; idempotencyKey: string },
  amount = 0.08,
) {
  return {
    kind: "estimate",
    amount,
    currency: "USD",
    source: "provider",
    providerId: "test-provider",
    receiptId: "quote-1",
    receivedAt: 1,
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
  };
}

function projectWithTask() {
  const project = createProject({
    prompt: "介绍",
    model: "gpt-text-test",
    kind: "text",
    attachments: [],
  });
  const task = {
    ...createTask(project),
    id: "task-1",
    idempotencyKey: "stable-1",
    sourceItemId: project.items[0].id,
    status: "running" as const,
    submissionState: "submitted" as const,
  };
  project.tasks = [task];
  return { project, task };
}

function host(records: unknown[]) {
  desktop(async (command) => {
    if (command === "task_host_list") return records;
    if (command === "task_host_get" || command === "task_host_read")
      return null;
    throw new Error(`cost archive must not call ${command}`);
  });
}

test("provider quote is stored during native archive and token usage is not a price", async () => {
  const { project, task } = projectWithTask();
  host([
    {
      taskId: task.id,
      idempotencyKey: task.idempotencyKey,
      status: "succeeded",
      outputIndices: [0],
      outputs: [
        {
          index: 0,
          status: "succeeded",
          text: "完成",
          tokenUsage: { promptTokens: 3, completionTokens: 5, totalTokens: 8 },
        },
      ],
      costReceipt: quote(task),
      updatedAt: 42,
    },
  ]);
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      projects: [project],
    });
    const archived = recovered.projects[0].tasks[0];
    assert.equal(archived.status, "succeeded");
    assert.equal(archived.estimatedCostUsd, 0.08);
    assert.equal(archived.actualCostUsd, undefined);
    assert.equal(archived.estimatedCostQuote?.receiptId, "quote-1");
    assert.equal(archived.outputs?.[0].tokenUsage?.totalTokens, 8);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("a conflicting later quote does not replace the archived receipt", async () => {
  const { project, task } = projectWithTask();
  const first = {
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    status: "succeeded",
    outputIndices: [0],
    outputs: [{ index: 0, status: "succeeded", text: "完成" }],
    costReceipt: quote(task, 0.08),
    updatedAt: 42,
  };
  host([first]);
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      projects: [project],
    });
    host([{ ...first, costReceipt: quote(task, 0.2), updatedAt: 43 }]);
    const again = await reconcileNativeTasks(recovered);
    assert.equal(again.projects[0].tasks[0].estimatedCostUsd, 0.08);
    assert.equal(again.projects[0].tasks[0].estimatedCostQuote?.amount, 0.08);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("mismatched host identity does not apply its cost receipt", async () => {
  const { project, task } = projectWithTask();
  host([
    {
      taskId: "foreign-task",
      idempotencyKey: task.idempotencyKey,
      status: "succeeded",
      outputIndices: [0],
      outputs: [{ index: 0, status: "succeeded", text: "完成" }],
      costReceipt: quote({ ...task, id: "foreign-task" }),
      updatedAt: 42,
    },
  ]);
  try {
    const recovered = await reconcileNativeTasks({
      ...emptySnapshot(),
      projects: [project],
    });
    const archived = recovered.projects[0].tasks[0];
    assert.equal(archived.status, "unknown");
    assert.equal(archived.estimatedCostUsd, undefined);
    assert.equal(archived.estimatedCostQuote, undefined);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("fixture evidence stays on the task without becoming a dollar bill", () => {
  const { task } = projectWithTask();
  const next = applyArchivedCostReceipt(task, {
    ...quote(task),
    kind: "actual",
    source: "fixture",
    receiptId: "fixture-1",
  });
  assert.equal(next.actualCostReceipt?.source, "fixture");
  assert.equal(next.actualCostUsd, undefined);
  assert.equal(applyArchivedCostReceipt(task, undefined), task);
  assert.equal(
    applyArchivedCostReceipt(task, {
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
    }),
    task,
  );
});
