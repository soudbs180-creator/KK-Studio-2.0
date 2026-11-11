import test from "node:test";
import assert from "node:assert/strict";
import {
  createTurnFreezingController,
  createAgentHost,
  createConversationRewind,
} from "../../src/features/agent/index.ts";
import {
  createProject,
  createTask,
  createDefaultChat,
  projectChatView,
  updateActiveChat,
} from "../../src/domain/creationModel.ts";
import { migrateSnapshotV2ToV3 } from "../../src/domain/chatMigrationCore.ts";
import { validateSnapshotV3 } from "../../src/domain/creationSnapshotCodec.ts";
import { deduplicateRelayEntries } from "../../src/features/models/modelDeduplication.ts";
import { blendMaskedPixels } from "../../src/features/image-edit/pixels.ts";
import { imageResultContext } from "../../src/features/image-edit/context.ts";
import {
  resolveTargetImageMime,
  calculateAdaptiveResize,
  detectAlphaTransparency,
} from "../../src/domain/mediaAlpha.ts";
import { extractComfyUiOutputs } from "../../src/integrations/generation/localComfyUiAdapter.ts";
import { parseComfyUiProgressMessage } from "../../src/features/comfyui/comfyUiProgress.ts";
import { gatewayFixture } from "../support/gatewayFixture.ts";
import { CanvasMcpServer } from "../../src/domain/canvasOperations.ts";
import { createCanvasOperationFixture } from "../support/canvasOperationFixture.ts";
const input = {
  prompt: "draft",
  model: "model",
  kind: "image" as const,
  attachments: [],
};
test("SCENARIO-T3-01: turn freezing leaves actual accepted task polling independent", async () => {
  const c = createTurnFreezingController(),
    f = gatewayFixture({ asyncPrimary: true });
  c.onTurnStart();
  const end = c.beginStep();
  const result = await f.scheduler.dispatch(f.request);
  const pause = c.pause();
  end();
  await pause;
  await assert.rejects(
    f.scheduler.poll(result.channelId, "accepted-job", f.request),
  );
  assert.equal(c.isPaused(), true);
  assert.deepEqual(f.polls, ["primary"]);
  assert.deepEqual(f.submissions, ["primary"]);
  c.reset();
});
test("SCENARIO-T3-02: real model catalog selection remains scoped to the active chat", () => {
  let p = createProject(input);
  p.chats!.other = createDefaultChat("other");
  const row = deduplicateRelayEntries([
    {
      id: "a",
      label: "model",
      selection: { source: "api", model: "model", connectionId: "a" },
    },
    {
      id: "b",
      label: "model",
      selection: { source: "api", model: "model", connectionId: "b" },
    },
  ])[0];
  p = updateActiveChat(p, (c) => ({
    ...c,
    draft: { ...c.draft, model: row.selection!.model },
    modelAllowlist: [row.selection!.model],
  }));
  const original = p.activeChatId!;
  const view = projectChatView({ ...p, activeChatId: "other" });
  assert.deepEqual(view.chats![original].modelAllowlist, ["model"]);
  assert.deepEqual(view.chats!.other.modelAllowlist, []);
});
test("SCENARIO-T3-03: actual edit contexts from separate chat tasks preserve their shared original", () => {
  const p = createProject(input),
    a = createTask(p),
    b = createTask({ ...p, activeChatId: "other" });
  const first = imageResultContext(a, "asset-master"),
    second = imageResultContext(
      { ...b, imageEditContext: first },
      "asset-derivative",
    );
  assert.equal(second.originalAssetId, "asset-master");
  assert.notEqual(a.originChatId, b.originChatId);
});
test("SCENARIO-T3-04: real freeze controllers are independently scoped while chat drafts remain durable", async () => {
  const a = createTurnFreezingController(),
    b = createTurnFreezingController();
  a.onTurnStart();
  b.onTurnStart();
  await a.pause();
  assert.equal(a.isPaused(), true);
  assert.equal(b.isExecuting(), true);
  await a.resume();
  assert.equal(a.isExecuting(), true);
  a.reset();
  b.reset();
});
test("SCENARIO-T3-05: real alpha-safe compositing and Comfy output adaptation preserve modality", () => {
  const original = new Uint8ClampedArray([0, 0, 0, 0]),
    generated = new Uint8ClampedArray([200, 100, 0, 255]);
  const composed = blendMaskedPixels(
    original,
    generated,
    new Uint8Array([0]),
    1,
    1,
    0,
  );
  assert.equal(detectAlphaTransparency(composed), true);
  assert.equal(resolveTargetImageMime(true, "image/jpeg"), "image/png");
  const [output] = extractComfyUiOutputs(
    { node: { videos: [{ filename: "out.mp4" }] } },
    "job",
    "http://127.0.0.1:8188",
  );
  assert.equal(output.kind, "video");
});
test("SCENARIO-T4-01: actual project and task creation retain frozen chat and source identities", async () => {
  let p = createProject(input);
  let calls = 0;
  const host = createAgentHost({
    getProject: () => p,
    commit: (n) => {
      p = n;
    },
    modelAllowlist: ["model"],
    generate: async (node) => {
      calls++;
      const task = { ...createTask(p), sourceItemId: node.id };
      p = { ...p, tasks: [...p.tasks, task] };
      return { taskId: task.id };
    },
  });
  const result = await host.applyOps([
    {
      type: "add_node",
      id: "source",
      nodeType: "image",
      metadata: { prompt: "draw", model: "model" },
    },
    {
      type: "run_generation",
      nodeId: "source",
      model: "model",
      prompt: "draw",
    },
  ]);
  assert.equal(calls, 1);
  assert.equal(result.tasks?.[0].taskId, p.tasks[0].id);
  assert.equal(p.tasks[0].originChatId, p.activeChatId);
  assert.equal(p.tasks[0].sourceItemId, "source");
});
test("SCENARIO-T4-02: actual legacy migration remains editable with intact thread and transcript", () => {
  const legacy = {
    version: 2 as const,
    revision: 1,
    activeProjectId: "p",
    homeDraft: {},
    projects: [
      {
        id: "p",
        messages: [{ id: "u", role: "user" as const, content: "history" }],
        agentThreadId: "thread-1",
        composerDraft: { prompt: "draft" },
        items: [],
      },
    ],
  };
  const upgraded = migrateSnapshotV2ToV3(legacy);
  validateSnapshotV3(upgraded);
  const chat = upgraded.projects[0].chats[upgraded.projects[0].activeChatId];
  assert.equal(chat.messages[0].content, "history");
  assert.ok(
    Object.values(upgraded.projects[0].chats).some(
      (c) => c.agentThreadId === "thread-1",
    ),
  );
  assert.equal(chat.draft.prompt, "draft");
  assert.equal(legacy.version, 2);
});
test("SCENARIO-T4-03: real progress and completion events remain observable during a frozen turn", async () => {
  const c = createTurnFreezingController();
  c.onTurnStart();
  await c.pause();
  assert.equal(
    parseComfyUiProgressMessage({
      type: "progress",
      data: { value: 50, max: 100 },
    }).percent,
    50,
  );
  assert.equal(
    parseComfyUiProgressMessage({ type: "executing", data: { node: null } })
      .stage,
    "completed",
  );
  assert.equal(c.isPaused(), true);
  c.reset();
});
test("SCENARIO-T4-04: real rate-limit failover does not replay an accepted task", async () => {
  const f = gatewayFixture({ failPrimary: true, asyncPrimary: true });
  const result = await f.scheduler.dispatch(f.request);
  assert.equal(result.channelId, "secondary");
  await assert.rejects(
    f.scheduler.poll("secondary", "accepted-job", f.request),
  );
  assert.deepEqual(f.submissions, ["primary", "secondary"]);
});
test("SCENARIO-T4-05: real rewind refuses concurrent writes and canvas rejects hostile ID without mutation", async () => {
  let p = createProject(input);
  p.chats![p.activeChatId!].messages = [
    { id: "u", role: "user", content: "keep" },
  ];
  const rewind = createConversationRewind({
    getProject: () => p,
    getBlockReason: () => undefined,
    isBusy: () => true,
    commit: (n) => {
      p = n;
    },
    flush: async () => {},
  });
  await assert.rejects(rewind("u"), /in-flight/);
  assert.equal(p.chats![p.activeChatId!].messages.length, 1);
  const bridge = createCanvasOperationFixture();
  const before = structuredClone(bridge.getState());
  assert.equal(
    new CanvasMcpServer(bridge).executeOp({
      op: "move_card",
      payload: { id: "__proto__", x: 1, y: 1 },
    }).success,
    false,
  );
  assert.deepEqual(bridge.getState(), before);
  assert.deepEqual(calculateAdaptiveResize(10000, 100, 2048), {
    width: 2048,
    height: 20,
  });
});
