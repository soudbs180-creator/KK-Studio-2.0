import assert from "node:assert/strict";
import test from "node:test";
import {
  appendImageTask,
  assertLiveTextTask,
  prepareImageTask,
  appendImageTaskResults,
  canvasImageAttachments,
  ImageTaskCommandError,
  validateImageTaskInput,
} from "../../src/features/creation/imageTaskCommand.ts";
import {
  createProject,
  createTask,
  type CreateProjectInput,
} from "../../src/features/creation/model.ts";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { StoredGeneratedAsset } from "../../src/features/creation/assetRepository.ts";
import { connectionFromModelProfile } from "../../src/features/creation/providerRegistry.ts";

const input: CreateProjectInput = {
  prompt: "一张蓝调夜景产品图",
  model: "image-test",
  kind: "image",
  attachments: [],
  privacyMode: "byok_local",
  outputCount: 1,
};

const pixelDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("text cannot submit a deleted source, cancelled task or changed identity", () => {
  const project = createProject({
    ...input,
    kind: "text",
    model: "gpt-text-test",
  });
  const task = { ...createTask(project), sourceItemId: project.items[0].id };
  project.tasks = [task];
  assert.doesNotThrow(() => assertLiveTextTask(project, task));
  for (const current of [
    undefined,
    { ...project, items: [] },
    { ...project, tasks: [] },
    { ...project, tasks: [{ ...task, status: "cancelled" as const }] },
    { ...project, tasks: [{ ...task, idempotencyKey: "another-submission" }] },
  ])
    assert.throws(() => assertLiveTextTask(current, task), /已变化/);
});

test("text input cannot exceed the durable snapshot prompt limit", async () => {
  await assert.rejects(
    () =>
      prepareImageTask({
        ...input,
        kind: "text",
        model: "gpt-text-test",
        prompt: "x".repeat(4001),
      }),
    /4000/,
  );
});

test("archived results connect to the originating node and tolerate a deleted source", () => {
  const project = createProject(input);
  const source = project.items[0].id;
  const result = sourceItem("result-1", "asset-result");
  const published = appendImageTaskResults(project, [result], source);
  assert.equal(published.items.length, project.items.length + 1);
  assert.deepEqual(published.canvas.edges.at(-1), {
    id: "result-result-1",
    source,
    target: result.id,
    kind: "result",
  });
  assert.ok(published.canvas.positions[result.id]);
  const repeated = appendImageTaskResults(published, [result], source);
  assert.deepEqual(repeated, published);
  const deleted = appendImageTaskResults(
    { ...project, items: [] },
    [result],
    source,
  );
  assert.equal(deleted.items.length, 1);
  assert.deepEqual(deleted.canvas.edges, []);
});

function expectCommandError(run: () => void, message: RegExp): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ImageTaskCommandError);
    assert.match(error.message, message);
    return true;
  });
}

function asset(assetId: string, mime = "image/png"): StoredGeneratedAsset {
  return {
    assetId,
    sha256: "a".repeat(64),
    preview: pixelDataUrl,
    mime,
    tags: ["上传"],
    source: "upload",
    provenance: { generatedAt: "2026-09-18T12:00:00.000Z" },
  };
}

function sourceItem(
  id: string,
  assetId: string,
  extra: Partial<CanvasCollectionItem> = {},
): CanvasCollectionItem {
  return {
    id,
    title: id,
    description: "参考图",
    kind: "image",
    assetId,
    preview: pixelDataUrl,
    ...extra,
  };
}

test("image task input rejects oversized prompts, invalid counts and unsupported modes", () => {
  expectCommandError(
    () =>
      validateImageTaskInput({
        ...input,
        prompt: "x".repeat(4001),
      }),
    /4000/,
  );
  for (const outputCount of [0, -1, 1.5, 65, Number.NaN]) {
    expectCommandError(
      () => validateImageTaskInput({ ...input, outputCount }),
      /1 至 64/,
    );
  }
  expectCommandError(
    () => validateImageTaskInput({ ...input, privacyMode: "local_only" }),
    /ComfyUI/,
  );
  expectCommandError(
    () => validateImageTaskInput({ ...input, privacyMode: "platform_backed" }),
    /Prototype/,
  );
  const noModel = { ...input, model: "" };
  assert.throws(
    () => validateImageTaskInput(noModel),
    (error: unknown) => {
      assert.ok(error instanceof ImageTaskCommandError);
      assert.equal(error.configure, true);
      return true;
    },
  );
});

test("appendImageTask binds the source node and preserves the unsubmitted draft", () => {
  const project = createProject(input);
  const sourceItemId = project.items[0].id;
  const projectWithDraft = {
    ...project,
    composerDraft: { ...project.composerDraft, prompt: "仍要保留的草稿" },
  };
  const connection = connectionFromModelProfile({
    version: 1,
    name: "fixture",
    baseUrl: "https://models.example.test/v1",
    model: "image-test",
  });
  const appended = appendImageTask(
    projectWithDraft,
    input,
    connection,
    sourceItemId,
  );
  assert.equal(appended.task.sourceItemId, sourceItemId);
  assert.equal(appended.task.providerConnectionId, connection.id);
  assert.equal(appended.project.providerBaseUrl, connection.baseUrl);
  assert.equal(appended.project.composerDraft.prompt, "仍要保留的草稿");
  assert.equal(
    appended.project.items.find((item) => item.id === sourceItemId)
      ?.generationStatus,
    "pending",
  );
  assert.equal(appended.project.tasks.at(-1), appended.task);
});

test("appendImageTask rejects a deleted source before creating a task", () => {
  const project = createProject(input);
  const connection = connectionFromModelProfile({
    version: 1,
    name: "fixture",
    baseUrl: "https://models.example.test/v1",
    model: "image-test",
  });
  expectCommandError(
    () => appendImageTask(project, input, connection, "missing-source"),
    /来源节点已删除/,
  );
  assert.equal(project.tasks.length, 0);
});

test("canvasImageAttachments reads each archived self or incoming asset once without downloading previews", async () => {
  const project = createProject(input);
  const source = sourceItem("source", "asset-shared");
  const incoming = sourceItem("incoming", "asset-shared");
  const resultEdgeItem = sourceItem("result", "asset-shared");
  const reads: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("preview must not be downloaded");
  }) as typeof fetch;
  try {
    const attachments = await canvasImageAttachments(
      {
        ...project,
        items: [source, incoming, resultEdgeItem],
        canvas: {
          ...project.canvas,
          edges: [
            {
              id: "reference",
              source: incoming.id,
              target: source.id,
              kind: "reference",
            },
            {
              id: "result",
              source: resultEdgeItem.id,
              target: source.id,
              kind: "result",
            },
          ],
        },
      },
      source,
      async (id) => {
        reads.push(id);
        return asset(id);
      },
    );
    assert.deepEqual(reads, ["asset-shared"]);
    assert.equal(attachments.length, 1);
    assert.deepEqual(attachments[0], {
      id: source.id,
      assetId: "asset-shared",
      name: source.title,
      mime: "image/png",
      size: atob(pixelDataUrl.split(",")[1]).length,
      dataUrl: "kk-asset:asset-shared",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("画布文本提示词连线不被当作未归档图片附件", async () => {
  const project = createProject(input);
  const source = {
    ...sourceItem("source", "unused"),
    assetId: undefined,
    preview: undefined,
    result: undefined,
  };
  project.items = [
    source,
    {
      id: "prompt",
      kind: "text",
      title: "提示词",
      description: "",
      prompt: "产品照片",
    },
  ];
  project.canvas.edges = [
    {
      id: "text-reference",
      source: "prompt",
      target: source.id,
      kind: "reference",
    },
  ];
  assert.deepEqual(await canvasImageAttachments(project, source), []);
});

test("canvasImageAttachments fails closed for missing or invalid archived originals", async () => {
  const project = createProject(input);
  const source = sourceItem("source", "asset-missing");
  await assert.rejects(
    canvasImageAttachments(project, source, async () => null),
    /缺失或格式不支持/,
  );
  await assert.rejects(
    canvasImageAttachments(project, source, async () =>
      asset("asset-missing", "text/plain"),
    ),
    /缺失或格式不支持/,
  );
  const incomingWithoutAsset = sourceItem("incoming", "asset-incoming");
  delete incomingWithoutAsset.assetId;
  await assert.rejects(
    canvasImageAttachments(
      {
        ...project,
        items: [source, incomingWithoutAsset],
        canvas: {
          ...project.canvas,
          edges: [
            {
              id: "reference",
              source: incomingWithoutAsset.id,
              target: source.id,
              kind: "reference",
            },
          ],
        },
      },
      source,
      async (id) => asset(id),
    ),
    /尚未归档/,
  );
});
