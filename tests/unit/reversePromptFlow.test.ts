import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import type { CreationTask } from "../../packages/creation-contracts/index.ts";
import {
  createProject,
} from "../../src/features/creation/model.ts";
import {
  captionImage,
  visionCaptionCapabilityManifest,
  executeVisionCaptionCapability,
} from "../../src/features/capabilities/visionCaption.ts";
import {
  executeReversePromptFlowCore,
  executeGetResultCore,
} from "../../src/features/agent/reversePromptFlow.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";

test("visionCaption capability manifest satisfies contract and adapters fallback gracefully", async () => {
  assert.equal(visionCaptionCapabilityManifest.id, "vision.caption");
  assert.equal(visionCaptionCapabilityManifest.adapters.length, 3);
  assert.equal(visionCaptionCapabilityManifest.adapters[0].id, "vision.caption/codex");

  // Custom prompt passed in
  const custom = await captionImage({
    imageNodeId: "img-1",
    prompt: "定制的一只猫咪摄影",
  });
  assert.equal(custom, "定制的一只猫咪摄影");

  // Default Codex caption
  const def = await captionImage({
    imageNodeId: "img-1",
    title: "金色麦田",
  });
  assert.ok(def.includes("金色麦田"));

  // Adapter fallback: qwen-vl unintegrated falls back to codex
  let fallbackRecorded: unknown = null;
  const qwenResult = await executeVisionCaptionCapability(
    { imageNodeId: "img-1", title: "夜景城市" },
    {
      platform: "desktop",
      modelTraits: [],
      resources: [],
      permissions: ["canvas:read", "asset:read"],
      tasks: { submit: async () => ({ id: "task-1", status: "queued" } as unknown as CreationTask) },
      onFallback: (evt) => {
        fallbackRecorded = evt;
      },
    },
    visionCaptionCapabilityManifest.adapters[1],
  );
  assert.ok(typeof qwenResult === "string" && qwenResult.includes("夜景城市"));
  assert.ok(fallbackRecorded);
});

test("反推提示词流程：生成文本节点和生成节点，两条连线的源/目标正确", async () => {
  const project = createProject({
    prompt: "",
    kind: "image",
    model: "mock-model",
    attachments: [],
  });
  const initialImageNode: CanvasCollectionItem = {
    id: "source-image-1",
    kind: "image",
    title: "原图",
    description: "上传的参考图",
    assetId: "asset-img-1",
  };
  project.items = [initialImageNode];
  project.canvas = {
    viewport: { x: 0, y: 0, scale: 1 },
    positions: { "source-image-1": { x: 100, y: 200 } },
    edges: [],
  };

  const { nextProject, result } = await executeReversePromptFlowCore(
    project,
    {
      imageNodeId: "source-image-1",
      autoRun: false,
      model: "flux-dev",
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.imageNodeId, "source-image-1");
  assert.ok(result.textNodeId.startsWith("text-"));
  assert.ok(result.configNodeId.startsWith("config-"));
  assert.equal(result.autoRun, false);
  assert.equal(result.taskId, undefined);

  // 节点检查：1 原图 + 1 文本节点 + 1 配置节点
  assert.equal(nextProject.items.length, 3);
  const textItem = nextProject.items.find((item) => item.id === result.textNodeId);
  const configItem = nextProject.items.find((item) => item.id === result.configNodeId);

  assert.ok(textItem);
  assert.equal(textItem.kind, "text");
  assert.equal(textItem.title, "反推提示词");
  assert.equal(textItem.generationStatus, "ready");
  assert.equal(textItem.prompt, result.prompt);
  assert.equal(textItem.result?.text, result.prompt);

  assert.ok(configItem);
  assert.equal(configItem.kind, "image");
  assert.equal(configItem.title, "图片生成");
  assert.equal(configItem.prompt, `@[node:${result.textNodeId}]`);
  assert.equal(configItem.model, "flux-dev");
  assert.equal(configItem.generationStatus, undefined);

  // 连线检查：两条连线，原图 → 反推文本，反推文本 → 生成节点
  assert.equal(nextProject.canvas.edges.length, 2);
  const edge1 = nextProject.canvas.edges.find(
    (e) => e.source === "source-image-1" && e.target === result.textNodeId,
  );
  const edge2 = nextProject.canvas.edges.find(
    (e) => e.source === result.textNodeId && e.target === result.configNodeId,
  );
  assert.ok(edge1, "必须存在 原图 → 反推文本 连线");
  assert.ok(edge2, "必须存在 反推文本 → 生成配置 连线");

  assert.deepEqual(result.connections, [
    { fromNodeId: "source-image-1", toNodeId: result.textNodeId },
    { fromNodeId: result.textNodeId, toNodeId: result.configNodeId },
  ]);

  // 位置检查：文本节点在原图右侧，配置节点在文本节点右侧
  assert.equal(nextProject.canvas.positions[result.textNodeId].x, 460);
  assert.equal(nextProject.canvas.positions[result.textNodeId].y, 200);
  assert.equal(nextProject.canvas.positions[result.configNodeId].x, 820);
  assert.equal(nextProject.canvas.positions[result.configNodeId].y, 200);
});

test("autoRun 开/关两种行为：false 不触发生成，true 触发生成并返回 taskId", async () => {
  const project = createProject({
    prompt: "",
    kind: "image",
    model: "mock-model",
    attachments: [],
  });
  project.items = [
    {
      id: "img-node-auto",
      kind: "image",
      title: "原图",
      description: "测试自动生成",
    },
  ];

  let generatedNodeId = "";
  let generatedPrompt = "";
  let generateCalled = 0;
  const fakeGenerate = async (node: CanvasCollectionItem, prompt: string) => {
    generateCalled++;
    generatedNodeId = node.id;
    generatedPrompt = prompt;
    return { taskId: "task-auto-888" };
  };

  // autoRun = false
  const off = await executeReversePromptFlowCore(
    project,
    { imageNodeId: "img-node-auto", autoRun: false },
    { generate: fakeGenerate },
  );
  assert.equal(off.result.autoRun, false);
  assert.equal(off.result.taskId, undefined);
  assert.equal(generateCalled, 0);

  // autoRun = true
  const on = await executeReversePromptFlowCore(
    project,
    { imageNodeId: "img-node-auto", autoRun: true },
    { generate: fakeGenerate },
  );
  assert.equal(on.result.autoRun, true);
  assert.equal(on.result.taskId, "task-auto-888");
  assert.equal(generateCalled, 1);
  assert.equal(generatedNodeId, on.result.configNodeId);
  assert.equal(generatedPrompt, on.result.prompt);

  const configItem = on.nextProject.items.find(
    (item) => item.id === on.result.configNodeId,
  );
  assert.equal(configItem?.generationStatus, "pending");
});

test("无效 imageNodeId 报错且绝不留下半截节点与孤立连线", async () => {
  const project = createProject({
    prompt: "",
    kind: "image",
    model: "mock-model",
    attachments: [],
  });
  const initialItem: CanvasCollectionItem = {
    id: "existing-img",
    kind: "image",
    title: "原图",
    description: "既有原图",
  };
  project.items = [initialItem];
  project.canvas = {
    viewport: { x: 0, y: 0, scale: 1 },
    positions: { "existing-img": { x: 50, y: 50 } },
    edges: [],
  };

  // 无效 imageNodeId
  await assert.rejects(
    executeReversePromptFlowCore(project, {
      imageNodeId: "non-existent-img-999",
      autoRun: true,
    }),
    /图片节点不存在：non-existent-img-999/,
  );

  // 验证画布完全不变，没有半截节点
  assert.equal(project.items.length, 1);
  assert.equal(project.items[0].id, "existing-img");
  assert.equal(project.canvas.edges.length, 0);
  assert.deepEqual(Object.keys(project.canvas.positions), ["existing-img"]);

  // 缺少任何标识报错
  await assert.rejects(
    executeReversePromptFlowCore(project, {}),
    /必须提供 imageNodeId 或 attachmentId/,
  );
  assert.equal(project.items.length, 1);
  assert.equal(project.canvas.edges.length, 0);
});

test("使用 attachmentId 自动创建图片节点并建立反推和连线", async () => {
  const project = createProject({
    prompt: "",
    kind: "image",
    model: "mock-model",
    attachments: [],
  });
  project.items = [];
  project.canvas = {
    viewport: { x: 0, y: 0, scale: 1 },
    positions: {},
    edges: [],
  };

  const { nextProject, result } = await executeReversePromptFlowCore(
    project,
    {
      attachmentId: "upload-cat.png",
      prompt: "一只戴墨镜的猫咪",
      autoRun: false,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(nextProject.items.length, 3);
  const imageItem = nextProject.items.find((item) => item.id === result.imageNodeId);
  assert.ok(imageItem);
  assert.equal(imageItem.kind, "image");
  assert.equal(imageItem.assetId, "upload-cat.png");

  // 连线：新建图片节点 → 反推文本 → 生成配置
  assert.equal(nextProject.canvas.edges.length, 2);
  assert.equal(nextProject.canvas.edges[0].source, result.imageNodeId);
  assert.equal(nextProject.canvas.edges[0].target, result.textNodeId);
  assert.equal(nextProject.canvas.edges[1].source, result.textNodeId);
  assert.equal(nextProject.canvas.edges[1].target, result.configNodeId);
});

test("canvas_get_result 读取生成节点状态与产物（只读）", async () => {
  const project = createProject({
    prompt: "",
    kind: "image",
    model: "mock-model",
    attachments: [],
  });
  project.items = [
    {
      id: "node-pending",
      kind: "image",
      title: "待生成节点",
      description: "生成中",
      generationStatus: "pending",
    },
    {
      id: "node-ready",
      kind: "image",
      title: "已完成节点",
      description: "生成完成",
      generationStatus: "ready",
      preview: "blob:http://localhost/image-preview",
      assetId: "asset-finished-1",
      result: {
        id: "res-ready-1",
        kind: "image",
        title: "已完成图片",
        description: "完成",
        src: "blob:http://localhost/image-preview",
        source: "provider",
      },
    },
    {
      id: "node-error",
      kind: "image",
      title: "失败节点",
      description: "显存不足生成失败",
      generationStatus: "error",
    },
  ];
  project.tasks = [
    {
      id: "task-p-1",
      sourceItemId: "node-pending",
      status: "running",
      progress: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as unknown as CreationTask,
  ];

  // 读取 pending 节点
  const pendingRes = await executeGetResultCore(project, { nodeId: "node-pending" });
  assert.equal(pendingRes.ok, true);
  assert.equal(pendingRes.nodeId, "node-pending");
  assert.equal(pendingRes.status, "pending");
  assert.equal(pendingRes.ready, false);
  assert.equal(pendingRes.task?.id, "task-p-1");
  assert.equal(pendingRes.task?.status, "running");

  // 读取 ready 节点
  const readyRes = await executeGetResultCore(project, { nodeId: "node-ready" });
  assert.equal(readyRes.ok, true);
  assert.equal(readyRes.ready, true);
  assert.equal(readyRes.status, "ready");
  assert.equal(readyRes.preview, "blob:http://localhost/image-preview");
  assert.equal(readyRes.assetId, "asset-finished-1");
  assert.equal(readyRes.result?.src, "blob:http://localhost/image-preview");

  // 读取 error 节点
  const errorRes = await executeGetResultCore(project, { nodeId: "node-error" });
  assert.equal(errorRes.ok, true);
  assert.equal(errorRes.ready, false);
  assert.equal(errorRes.status, "error");
  assert.ok(errorRes.error?.includes("失败"));

  // 读取不存在节点报错
  await assert.rejects(
    executeGetResultCore(project, { nodeId: "non-existent-node" }),
    /画布节点不存在：non-existent-node/,
  );
});

test("agentHost 与 agentConnection 完整分派往返与失败脱敏测试", async (t) => {
  let project = createProject({
    prompt: "",
    kind: "image",
    model: "mock-model",
    attachments: [],
  });
  project.items = [
    {
      id: "host-img-1",
      kind: "image",
      title: "宿主测试图",
      description: "宿主图描述",
    },
  ];
  project.canvas = {
    viewport: { x: 0, y: 0, scale: 1 },
    positions: { "host-img-1": { x: 50, y: 80 } },
    edges: [],
  };
  if (project.chats && project.activeChatId) {
    project.chats[project.activeChatId].mainAgent = "codex";
    project.chats[project.activeChatId].agentThreadId = "thread-1";
  }

  let committedProject: typeof project | undefined;
  const host = createAgentHost({
    getExecutionBlockReason: () => undefined,
    getProject: () => project,
    commit: (p) => {
      project = p;
      committedProject = p;
    },
    generate: async (_node, _prompt) => ({ taskId: "fake-host-task-123" }),
  });

  const harness = createTestHarness();
  const receipts: Array<Record<string, unknown>> = [];
  const connection = createAgentConnection({
    storage: createMemoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (url, init) => {
      if (String(url).includes("/canvas/result")) {
        receipts.push(JSON.parse(String(init?.body)));
      }
      return createReadyResponse();
    }) as typeof fetch,
  });
  connection.setBridge(host);
  t.after(() => connection.disconnect());
  await connection.connect();

  // 1. 发起 canvas_create_reverse_prompt_flow 调用
  harness.sources[0].emit({
    type: "tool_call",
    data: {
      requestId: "flow-call-1",
      name: "canvas_create_reverse_prompt_flow",
      input: {
        imageNodeId: "host-img-1",
        autoRun: true,
        model: "flux-1",
      },
    },
  });
  await new Promise<void>(setImmediate);

  assert.equal(receipts.length, 1);
  const flowReceipt = receipts[0];
  assert.equal(flowReceipt.requestId, "flow-call-1");
  const flowResult = flowReceipt.result as Record<string, unknown>;
  assert.equal(flowResult.ok, true);
  assert.equal(flowResult.imageNodeId, "host-img-1");
  assert.equal(flowResult.autoRun, true);
  assert.equal(flowResult.taskId, "fake-host-task-123");
  assert.equal(committedProject?.items.length, 3);
  assert.equal(committedProject?.canvas.edges.length, 2);

  // 2. 发起失败的 canvas_create_reverse_prompt_flow 调用（无效图片节点）
  harness.sources[0].emit({
    type: "tool_call",
    data: {
      requestId: "flow-call-bad",
      name: "canvas_create_reverse_prompt_flow",
      input: {
        imageNodeId: "bad-node-id",
        autoRun: false,
      },
    },
  });
  await new Promise<void>(setImmediate);

  assert.equal(receipts.length, 2);
  const failReceipt = receipts[1];
  assert.equal(failReceipt.requestId, "flow-call-bad");
  assert.ok(String(failReceipt.error).includes("图片节点不存在"));
  // 节点数没有增加
  assert.equal(project.items.length, 3);

  // 3. 发起 canvas_get_result 调用
  harness.sources[0].emit({
    type: "tool_call",
    data: {
      requestId: "get-res-call-1",
      name: "canvas_get_result",
      input: {
        nodeId: flowResult.configNodeId,
      },
    },
  });
  await new Promise<void>(setImmediate);

  assert.equal(receipts.length, 3);
  const getReceipt = receipts[2];
  assert.equal(getReceipt.requestId, "get-res-call-1");
  const getResult = getReceipt.result as Record<string, unknown>;
  assert.equal(getResult.ok, true);
  assert.equal(getResult.nodeId, flowResult.configNodeId);
  assert.equal(getResult.status, "pending");
  assert.equal(getResult.ready, false);
});

interface FakeSource {
  onmessage: ((frame: { type?: string; data?: string }) => void) | null;
  onerror: unknown;
  closed: boolean;
  emit(event: { type: string; data?: unknown }): void;
  close(): void;
}

function createTestHarness() {
  const sources: FakeSource[] = [];
  const eventSourceFactory = (_url: string) => {
    const scope = JSON.parse(
      new URL(_url, "http://localhost").searchParams.get("scope") ?? "null",
    );
    const source: FakeSource = {
      onmessage: null,
      onerror: null,
      closed: false,
      emit(event: { type: string; data?: unknown }) {
        source.onmessage?.({
          type: event.type,
          data: JSON.stringify(
            event.data && typeof event.data === "object"
              ? {
                  scope,
                  ...(event.type === "tool_call"
                    ? { threadId: "thread-1", turnId: "turn-1" }
                    : {}),
                  ...event.data,
                }
              : event.data,
          ),
        });
      },
      close() {
        source.closed = true;
      },
    };
    sources.push(source);
    queueMicrotask(() => {
      source.emit({
        type: "hello",
        data: {
          codex: { busy: false },
          conversation: {
            revision: 1,
            conversationId: "conv-1",
            threadId: "thread-1",
            status: "ready",
            mcpStatuses: {},
          },
        },
      });
    });
    return source;
  };
  return { sources, eventSourceFactory };
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    length: store.size,
  };
}

function createReadyResponse() {
  return new Response(
    JSON.stringify({
      ok: true,
      protocolVersion: 7,
      conversation: {
        revision: 1,
        conversationId: "conv-1",
        threadId: "thread-1",
        status: "ready",
        mcpStatuses: {},
      },
      data: [],
      messages: [],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}
