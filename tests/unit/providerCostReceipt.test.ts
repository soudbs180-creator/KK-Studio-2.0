import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import { readTextStream } from "../../src/features/creation/textGeneration.ts";
import { publishTaskOutputState } from "../../src/features/creation/useTaskExecution.ts";
import {
  createProject,
  createTask,
  type CreationProject,
  type CreationSnapshot,
  type CreationTaskOutput,
} from "../../src/features/creation/model.ts";
import {
  readStreamCostReceipt,
  rememberCostReceipt,
} from "../../src/features/creation/taskCostArchive.ts";

const encode = new TextEncoder();

function stream(body: string) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encode.encode(body));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

function quote(task: { id: string; idempotencyKey: string }, amount: number) {
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

test("text frames expose an explicit quote and ignore token usage", async () => {
  const task = { id: "task-1", idempotencyKey: "stable-1" };
  const first = quote(task, 0.08);
  const second = quote(task, 0.2);
  const seen: unknown[] = [];
  const text = await readTextStream(
    stream(
      [
        `data: ${JSON.stringify({ choices: [{ delta: { content: "你好" }, finish_reason: null }] })}\n\n`,
        `data: ${JSON.stringify({
          choices: [{ delta: {}, finish_reason: null }],
          usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
          costReceipt: first,
        })}\n\n`,
        `data: ${JSON.stringify({
          choices: [{ delta: {}, finish_reason: null }],
          costReceipt: second,
        })}\n\n`,
        "data: [DONE]\n\n",
      ].join(""),
    ),
    new AbortController().signal,
    undefined,
    "openai-chat",
    undefined,
    undefined,
    (receipt) => seen.push(receipt),
  );
  assert.equal(text, "你好");
  assert.deepEqual(seen, [first, second]);
  assert.equal(
    readStreamCostReceipt({
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
    }),
    undefined,
  );
  const slot = { current: undefined as unknown };
  rememberCostReceipt(slot, first);
  rememberCostReceipt(slot, second);
  assert.equal((slot.current as { amount: number }).amount, 0.08);
});

test("publishing a text task stores the first provider quote and keeps it on conflict", () => {
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
  let current = project;
  const creationRef = {
    current: {
      projects: [current],
      activeProjectId: project.id,
    } as CreationSnapshot,
  };
  const updateProject = (
    _id: string,
    updater: (item: CreationProject) => CreationProject,
  ) => {
    current = updater(current);
    creationRef.current.projects = [current];
  };
  const outputs: CreationTaskOutput[] = [
    {
      index: 0,
      status: "succeeded",
      model: task.model,
      createdAt: task.createdAt,
      text: "你好",
      tokenUsage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
    },
  ];
  const costReceiptRef = { current: quote(task, 0.08) as unknown };
  const shared = {
    projectId: project.id,
    taskId: task.id,
    task,
    outputs,
    createdItems: [] as CanvasCollectionItem[],
    publishedItems: new Set<string>(),
    rejectedDeliveryIds: new Set<string>(),
    costReceiptRef,
    updateProject,
    creationRef,
    activeProjectIdRef: { current: project.id },
    replaceCanvasItems: (items: CanvasCollectionItem[]) => items,
  };
  publishTaskOutputState({
    ...shared,
    status: "succeeded",
    submissionState: "terminal",
  });
  assert.equal(current.tasks[0].estimatedCostUsd, 0.08);
  assert.equal(current.tasks[0].actualCostUsd, undefined);
  assert.equal(current.tasks[0].outputs?.[0].tokenUsage?.totalTokens, 5);
  costReceiptRef.current = quote(task, 0.2);
  publishTaskOutputState({
    ...shared,
    task: current.tasks[0],
    status: "succeeded",
    submissionState: "terminal",
  });
  assert.equal(current.tasks[0].estimatedCostQuote?.amount, 0.08);
});
