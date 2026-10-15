import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  createAgentConnection,
  type AgentConnectionOptions,
  type EventSourceLike,
} from "../../src/features/agent/agentConnection.ts";
import {
  prepareAgentAttachments,
  type AgentDraftAttachment,
} from "../../src/features/agent/agentAttachments.ts";
import type {
  CanvasAgentOp,
  CanvasAgentSnapshot,
} from "../../src/features/agent/agentTypes.ts";

/**
 * Agent 连接 store：connect 流程、SSE 事件驱动、画布工具回执、权限审批。
 * EventSource 与 fetch 均为可注入实现。
 */
interface FakeSource extends EventSourceLike {
  emit(event: { type: string; data: unknown }): void;
  closed: boolean;
}

function createHarness(hello?: unknown) {
  const sources: FakeSource[] = [];
  const eventSourceFactory = (_url: string) => {
    const source: FakeSource = {
      onmessage: null,
      onerror: null,
      closed: false,
      emit(event) {
        source.onmessage?.({
          type: event.type,
          data: JSON.stringify(event.data),
        });
      },
      close() {
        source.closed = true;
      },
    };
    sources.push(source);
    queueMicrotask(() =>
      source.emit({
        type: "hello",
        data: hello ?? {
          codex: { busy: false },
          conversation: readyConversation({ status: "idle", threadId: "" })
            .data,
        },
      }),
    );
    return source;
  };
  return { sources, eventSourceFactory };
}

test("连接初始化期间的新 SSE 状态、回复和已解决审批不被旧 hello 覆盖", async (t) => {
  const harness = createHarness({
    codex: { busy: true },
    conversation: readyConversation({ status: "running" }).data,
    pendingApprovals: [{ requestId: "a", method: "shell" }],
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).endsWith("/models")) {
        harness.sources[0].emit(readyConversation({ revision: 2 }));
        harness.sources[0].emit({
          type: "codex_approval_resolved",
          data: { requestId: "a", decision: "accept" },
        });
        harness.sources[0].emit({
          type: "agent_event",
          data: { type: "turn.completed", status: "completed" },
        });
        harness.sources[0].emit({
          type: "agent_event",
          data: {
            type: "item.completed",
            item: { id: "reply", type: "agent_message", text: "本轮已经完成" },
          },
        });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(conn.getState().status, "connected");
  assert.equal(conn.getState().sending, false);
  assert.equal(conn.getState().conversation?.revision, 2);
  assert.equal(conn.getState().pendingApproval, null);
  assert.equal(conn.getState().messages.at(-1)?.text, "本轮已经完成");
  assert.equal((await conn.sendMessage("继续")).ok, true);
});

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

test("图片发送冻结附件快照并携带实际图片和名称，不混入凭据", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  let turn: Record<string, unknown> | undefined;
  const dataUrl = "data:image/png;base64,aGVsbG8=";
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    prepareAttachments: async (attachments) =>
      attachments.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.mime,
        size: a.size,
        width: 1,
        height: 1,
        dataUrl,
      })),
    fetcher: (async (input, init) => {
      if (String(input).endsWith("/turn"))
        turn = JSON.parse(String(init?.body));
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  const attachments = [
    { id: "file", name: "sample.png", mime: "image/png", size: 5, dataUrl },
  ];
  const sending = conn.sendMessage("描述这张图片", { attachments });
  attachments[0].name = "later.png";
  assert.equal((await sending).ok, true);
  assert.deepEqual(turn?.attachments, [
    {
      id: "file",
      name: "sample.png",
      type: "image/png",
      size: 5,
      width: 1,
      height: 1,
      dataUrl,
    },
  ]);
  assert.equal(turn?.messageText, "描述这张图片\n\n参考图片：sample.png");
  assert.equal(turn?.messageMetadata, undefined);
});

test("附件读取被取消或失败时，不受理一个缺图的 turn", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  let posts = 0;
  let release: (() => void) | undefined;
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    prepareAttachments: async (_files, { signal }) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      signal.throwIfAborted();
      throw Error("原件缺失");
    },
    fetcher: (async (input) => {
      if (String(input).endsWith("/turn")) posts++;
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  const first = conn.sendMessage("分析");
  release?.();
  assert.match((await first).error ?? "", /原件缺失/);
  const second = conn.sendMessage("分析");
  await conn.interrupt();
  release?.();
  assert.equal((await second).ok, false);
  assert.equal(posts, 0);
});

test("持久历史与握手重放使用同一 itemId 去重，已完成回复不重复追加 delta", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).endsWith("/models")) {
        harness.sources[0].emit({
          type: "agent_event",
          data: {
            type: "item.updated",
            threadId: "thread-1",
            turnId: "turn-1",
            item: { id: "reply", type: "agent_message", delta: "完成回复" },
          },
        });
        harness.sources[0].emit({
          type: "agent_event",
          data: {
            type: "item.completed",
            threadId: "thread-1",
            turnId: "turn-1",
            item: { id: "reply", type: "agent_message", text: "完成回复" },
          },
        });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [
          {
            id: "thread-1:turn-1:reply",
            itemId: "reply",
            threadId: "thread-1",
            turnId: "turn-1",
            role: "assistant",
            text: "完成回复",
          },
        ],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.deepEqual(
    conn
      .getState()
      .messages.filter((m) => m.role === "assistant")
      .map((m) => m.text),
    ["完成回复"],
  );
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("活动按 thread/turn/item 合并，不串会话或合并另一轮同名活动", async (t) => {
  const harness = createHarness();
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async () =>
      jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      })) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  const emit = (
    threadId: string,
    turnId: string,
    phase: string,
    item: object,
  ) =>
    harness.sources[0].emit({
      type: "agent_event",
      data: {
        thread_id: threadId,
        turn_id: turnId,
        type: `item.${phase}`,
        item: { id: "cmd", type: "command_execution", ...item },
      },
    });
  emit("thread-1", "turn-1", "started", { command: "npm test" });
  emit("thread-1", "turn-1", "updated", { delta: "working\n" });
  emit("thread-1", "turn-1", "completed", {
    aggregatedOutput: "working\nfailed",
    exitCode: 1,
  });
  emit("thread-1", "turn-1", "updated", { delta: "late" });
  emit("thread-1", "turn-2", "started", { command: "npm build" });
  emit("other-thread", "turn-2", "started", { command: "private" });
  const tools = conn.getState().messages.filter((item) => item.role === "tool");
  assert.equal(tools.length, 2);
  assert.equal(tools[0].threadId, "thread-1");
  assert.equal(tools[0].turnId, "turn-1");
  assert.equal(tools[0].itemId, "cmd");
  assert.match(tools[0].text, /npm test/);
  assert.equal((tools[0].detail as { phase: string }).phase, "completed");
  assert.equal((tools[0].detail as { exitCode: number }).exitCode, 1);
  assert.equal(
    (tools[0].detail as { output: string }).output,
    "working\nfailed",
  );
  assert.equal(tools[1].turnId, "turn-2");
  assert.match(tools[1].text, /npm build/);
});

test("停止回执未到时保持执行中，明确中断事件才结束未完成活动", async (t) => {
  const harness = createHarness();
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async () =>
      jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      })) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  harness.sources[0].emit({ type: "codex_state", data: { busy: true } });
  harness.sources[0].emit({
    type: "agent_event",
    data: {
      thread_id: "thread-1",
      turn_id: "turn-1",
      type: "item.started",
      item: { id: "cmd", type: "command_execution", command: "long task" },
    },
  });
  assert.equal((await conn.interrupt()).ok, true);
  assert.equal(conn.getState().sending, true);
  assert.match(conn.getState().activity, /已请求停止.*等待/);
  harness.sources[0].emit({
    type: "agent_event",
    data: {
      thread_id: "thread-1",
      turn_id: "turn-1",
      type: "turn.completed",
      status: "interrupted",
    },
  });
  harness.sources[0].emit({ type: "codex_state", data: { busy: false } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(conn.getState().sending, false);
  assert.equal(
    (conn.getState().messages[0].detail as { turnStatus?: string } | undefined)
      ?.turnStatus,
    "interrupted",
  );
});

test("聚合推理历史的 source item 重放合并原记录，不追加重复活动", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).endsWith("/models")) {
        harness.sources[0].emit({
          type: "agent_event",
          data: {
            thread_id: "thread-1",
            turn_id: "turn-1",
            type: "item.completed",
            item: { id: "r1", type: "reasoning", text: "first thought" },
          },
        });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [
          {
            id: "thread-1:turn-1:synthetic:reasoning",
            itemId: "synthetic:reasoning",
            threadId: "thread-1",
            turnId: "turn-1",
            role: "tool",
            title: "思考摘要",
            text: "first thought\n\nsecond thought",
            activityItems: { r1: "first thought", r2: "second thought" },
            detail: {
              kind: "reasoning",
              status: "completed",
              sourceItemIds: ["r1", "r2"],
            },
          },
        ],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(conn.getState().messages.length, 1);
  assert.equal(
    conn.getState().messages[0].text,
    "first thought\n\nsecond thought",
  );
});

test("恢复连接期间的工具明确返回未执行，结束事件取消排队写入", async (t) => {
  const harness = createHarness({
    codex: { busy: true },
    conversation: readyConversation({ status: "running" }).data,
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  let applied = 0;
  const receipts: Array<{ requestId: string; error?: string }> = [];
  const emitTool = (requestId: string) =>
    harness.sources[0].emit({
      type: "tool_call",
      data: {
        requestId,
        name: "canvas_apply_ops",
        input: { ops: [{ type: "run_generation", nodeId: "image" }] },
      },
    });
  const terminal = () =>
    harness.sources[0].emit({
      type: "agent_event",
      data: { type: "turn.completed", status: "completed" },
    });
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input, init) => {
      if (String(input).endsWith("/models")) {
        emitTool("expired-during-connect");
        harness.sources[0].emit(readyConversation({ revision: 2 }));
        terminal();
      }
      if (String(input).includes("/canvas/result"))
        receipts.push(JSON.parse(String(init?.body)));
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => null,
    applyOps: (ops) => {
      applied++;
      return { applied: ops, rejected: [] };
    },
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(applied, 0);
  assert.match(
    receipts.find((r) => r.requestId === "expired-during-connect")?.error ?? "",
    /恢复连接.*未执行/,
  );
  await conn.sendMessage("下一轮");
  emitTool("queued-before-terminal");
  terminal();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(applied, 0, "terminal 必须在工具微任务执行之前取消队列");
});

const snapshot: CanvasAgentSnapshot = {
  projectId: "p1",
  title: "项目",
  nodes: [
    {
      id: "image",
      type: "image",
      title: "图片",
      position: { x: 0, y: 0 },
      width: 590,
      height: 705,
      metadata: {},
    },
  ],
  connections: [],
  selectedNodeIds: [],
  viewport: { x: 0, y: 0, scale: 1 },
};

test("停止发生在 turn 发出之前时不能继续提交，切换项目后旧事件无效", async () => {
  const harness = createHarness();
  let hold = false,
    turns = 0;
  let release: (() => void) | undefined;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      const url = String(input);
      if (url.includes("/canvas/activate") && hold)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (url.endsWith("/turn")) turns++;
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  let active = "p1";
  conn.setBridge({
    getSnapshot: () => ({ ...snapshot, projectId: active }),
    applyOps: (ops) => ({ applied: ops, rejected: [] }),
  });
  await conn.connect();
  hold = true;
  const send = conn.sendMessage("不要在停止后提交");
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  await conn.interrupt();
  release();
  await send;
  assert.equal(turns, 0);
  active = "p2";
  conn.syncProject();
  harness.sources[0].emit({
    type: "agent_event",
    data: {
      type: "item.completed",
      item: { id: "late", type: "agent_message", text: "old project" },
    },
  });
  assert.equal(conn.getState().messages.length, 0);
  assert.equal(conn.getState().status, "disconnected");
});

function readyConversation(overrides: Record<string, unknown> = {}) {
  return {
    type: "conversation_changed",
    data: {
      revision: 1,
      conversationId: "conv-1",
      threadId: "thread-1",
      status: "ready",
      mcpStatuses: {},
      ...overrides,
    },
  };
}

test("connect 成功：discover → SSE hello → activate → 快照 → thread 就绪", async (t: TestContext) => {
  const harness = createHarness();
  const posted: string[] = [];
  const conn = createAgentConnection({
    clientId: "client-1",
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    fetcher: (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      posted.push(url);
      if (url.includes("/config"))
        return jsonResponse(200, { ok: true, protocolVersion: 6 });
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    applyOps: () => ({ applied: [], rejected: [] }),
  });
  t.after(() => conn.disconnect());

  await conn.connect();
  assert.ok(posted.some((url) => url.includes("/config")));
  assert.ok(posted.some((url) => url.includes("/canvas/activate")));
  assert.ok(posted.some((url) => url.includes("/canvas/state")));
  assert.equal(harness.sources.length, 1);
  assert.ok(harness.sources[0].onmessage);

  // SSE 就绪事件把连接置为 connected。
  harness.sources[0].emit(readyConversation());
  const state = conn.getState();
  assert.equal(state.status, "connected");
  assert.equal(state.conversation?.conversationId, "conv-1");
  assert.equal(state.lastConnectedAt !== null, true);
});

test("connect 失败：/config 不可用 → error", async (t: TestContext) => {
  const conn = createAgentConnection({
    clientId: "client-1",
    eventSourceFactory: () => ({ onmessage: null, onerror: null, close() {} }),
    storage: memoryStorage(),
    fetcher: (async () =>
      jsonResponse(404, { error: "not found" })) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(conn.getState().status, "error");
  assert.match(conn.getState().error ?? "", /not found/);
});

test("sendMessage：先回显用户消息，再提交 turn", async (t: TestContext) => {
  const harness = createHarness();
  let turnBody: string | undefined;
  const conn = createAgentConnection({
    clientId: "client-1",
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/config"))
        return jsonResponse(200, { ok: true, protocolVersion: 6 });
      if (url.includes("/agent/codex/turn")) {
        turnBody = typeof init?.body === "string" ? init.body : undefined;
        return jsonResponse(200, { ok: true, threadId: "thread-1" });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    applyOps: () => ({ applied: [], rejected: [] }),
  });
  t.after(() => conn.disconnect());

  await conn.connect();
  harness.sources[0].emit(readyConversation());
  const result = await conn.sendMessage("画一只猫");
  assert.equal(result.ok, true);
  const body = JSON.parse(turnBody as string);
  assert.equal(body.messageText, "画一只猫");
  assert.equal(body.conversationId, "conv-1");
  assert.equal(body.permissionMode, "request");
  assert.ok(
    conn
      .getState()
      .messages.some(
        (item) => item.role === "user" && item.text === "画一只猫",
      ),
  );
});

test("Codex 图片选择形成内置生图指令并保持原始用户消息，不传图片名作为推理模型", async (t) => {
  const harness = createHarness();
  let turn: Record<string, unknown> | undefined;
  const conn = createAgentConnection({
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/agent/codex/turn")) {
        turn = JSON.parse(String(init?.body));
        return jsonResponse(200, { ok: true, threadId: "thread-1" });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    applyOps: () => ({ applied: [], rejected: [] }),
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  const result = await conn.sendMessage("蓝色玻璃球", {
    selection: { source: "codex", kind: "image", model: "image-test" },
  });
  assert.equal(result.ok, true);
  assert.equal(turn?.messageText, "蓝色玻璃球");
  assert.match(String(turn?.prompt), /imagegen\/image_generation 生成 1 张/);
  assert.match(
    String(turn?.prompt),
    /不要调用 KK 的 run_generation 或任何外部生成 API/,
  );
  assert.equal(turn?.model, undefined);
});

const canvasReference: AgentDraftAttachment = {
  id: "ref-1",
  canvasNodeId: "ref-1",
  name: "reference.png",
  mime: "image/png",
  size: 68,
  dataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
};
const canvasRequest = {
  nodeId: "image",
  prompt: "保留主体，改成蓝色背景",
  model: "",
  count: 1,
  kind: "image" as const,
};

async function canvasGenerationHarness(
  t: TestContext,
  prepareAttachments: AgentConnectionOptions["prepareAttachments"] = (
    files,
    { signal },
  ) =>
    prepareAgentAttachments(files, {
      signal,
      inspect: async () => ({ width: 1, height: 1 }),
    }),
  onRequest?: (url: string) => void,
) {
  const harness = createHarness();
  const turns: Record<string, unknown>[] = [];
  const conn = createAgentConnection({
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    prepareAttachments,
    fetcher: (async (input, init) => {
      const url = String(input);
      onRequest?.(url);
      if (url.endsWith("/turn")) turns.push(JSON.parse(String(init?.body)));
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => ({
      ...snapshot,
      nodes: [
        ...snapshot.nodes,
        ...["ref-1", "ref-2"].map((id) => ({ ...snapshot.nodes[0], id })),
      ],
    }),
    applyOps: () => ({ applied: [], rejected: [] }),
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  harness.sources[0].emit(readyConversation());
  return { conn, turns, source: harness.sources[0] };
}

test("Codex 卡片把多张原件传入生图 turn，并保留生成来源和参考节点", async (t) => {
  const { conn, turns } = await canvasGenerationHarness(t);
  const styleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const error = await conn.generateFromCanvas({
    ...canvasRequest,
    count: 2,
    attachments: [
      canvasReference,
      {
        ...canvasReference,
        id: "ref-2",
        canvasNodeId: "ref-2",
        name: "style.png",
        dataUrl: styleDataUrl,
      },
    ],
  });
  assert.equal(error, undefined);
  assert.equal(turns.length, 1);
  assert.deepEqual(turns[0].attachments, [
    {
      id: "ref-1",
      name: "reference.png",
      type: "image/png",
      size: 68,
      width: 1,
      height: 1,
      dataUrl: canvasReference.dataUrl,
    },
    {
      id: "ref-2",
      name: "style.png",
      type: "image/png",
      size: 68,
      width: 1,
      height: 1,
      dataUrl: styleDataUrl,
    },
  ]);
  assert.deepEqual(turns[0].messageMetadata, {
    canvasReferences: [
      {
        nodeId: "image",
        kind: "image",
        label: "KK 生成来源",
        title: "image",
        text: "p1",
      },
      {
        nodeId: "ref-1",
        kind: "image",
        label: "参考图片",
        title: "reference.png",
      },
      { nodeId: "ref-2", kind: "image", label: "参考图片", title: "style.png" },
    ],
  });
  assert.match(String(turns[0].prompt), /imagegen\/image_generation 生成 2 张/);
  assert.match(String(turns[0].prompt), /所附原件/);
  assert.equal(turns[0].model, undefined);
});

test("Codex 卡片原件无效时不提交缺图 turn", async (t) => {
  const { conn, turns } = await canvasGenerationHarness(t);
  const error = await conn.generateFromCanvas({
    ...canvasRequest,
    attachments: [{ ...canvasReference, dataUrl: "data:image/png;base64,???" }],
  });
  assert.match(error ?? "", /参考图片格式无效/);
  assert.equal(turns.length, 0);
});

test("Codex 卡片在原件读取期间取消时不提交 turn", async (t) => {
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const controller = new AbortController();
  const { conn, turns } = await canvasGenerationHarness(
    t,
    async (_, { signal }) => {
      started.resolve();
      await release.promise;
      signal.throwIfAborted();
      return [];
    },
  );
  const sending = conn.generateFromCanvas({
    ...canvasRequest,
    attachments: [canvasReference],
    signal: controller.signal,
  });
  await started.promise;
  controller.abort();
  release.resolve();
  assert.ok(await sending);
  assert.equal(turns.length, 0);
});

test("Codex 卡片已取消的请求不回显消息或提交 turn", async (t) => {
  const { conn, turns } = await canvasGenerationHarness(t);
  const before = conn.getState().messages.length;
  const controller = new AbortController();
  controller.abort();
  const error = await conn.generateFromCanvas({
    ...canvasRequest,
    signal: controller.signal,
  });
  assert.match(error ?? "", /取消/);
  assert.equal(conn.getState().messages.length, before);
  assert.equal(conn.getState().canvasNodeId, undefined);
  assert.equal(turns.length, 0);
});

test("Codex 卡片在发送前最后一次检查来源变化，拒绝旧图 turn", async (t) => {
  let armed = false;
  let changed = false;
  const { conn, turns } = await canvasGenerationHarness(t, undefined, (url) => {
    if (armed && url.includes("/canvas/state")) changed = true;
  });
  armed = true;
  const error = await conn.generateFromCanvas({
    ...canvasRequest,
    attachments: [canvasReference],
    validate: () => (changed ? "来源或参考图已变化" : undefined),
  });
  assert.equal(error, "来源或参考图已变化");
  assert.equal(turns.length, 0);
});

for (const { status, secondNodeId } of [
  { status: 200, secondNodeId: "image" },
  { status: 500, secondNodeId: "another-image" },
  { status: 500, secondNodeId: "image" },
]) {
  test(`旧卡片迟到 ${status} 回执不影响后续 ${secondNodeId} turn`, async (t) => {
    const harness = createHarness();
    const firstPosted = Promise.withResolvers<void>();
    const firstResponse = Promise.withResolvers<Response>();
    const secondReading = Promise.withResolvers<void>();
    const secondRelease = Promise.withResolvers<void>();
    const firstController = new AbortController();
    let preparing = 0;
    let posts = 0;
    let interrupts = 0;
    const conn = createAgentConnection({
      eventSourceFactory: harness.eventSourceFactory,
      storage: memoryStorage(),
      prepareAttachments: async (_, { signal }) => {
        if (++preparing === 2) {
          secondReading.resolve();
          await secondRelease.promise;
          signal.throwIfAborted();
        }
        return [];
      },
      fetcher: (async (input) => {
        const url = String(input);
        if (url.endsWith("/interrupt")) interrupts++;
        if (url.endsWith("/turn") && ++posts === 1) {
          firstPosted.resolve();
          return firstResponse.promise;
        }
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          conversation: readyConversation().data,
          messages: [],
          data: [],
        });
      }) as typeof fetch,
    });
    conn.setBridge({
      getSnapshot: () => ({
        ...snapshot,
        nodes: [
          ...snapshot.nodes,
          { ...snapshot.nodes[0], id: "another-image" },
        ],
      }),
      applyOps: () => ({ applied: [], rejected: [] }),
    });
    t.after(() => conn.disconnect());
    t.after(() => secondRelease.resolve());
    await conn.connect();
    harness.sources[0].emit(readyConversation());
    const first = conn.generateFromCanvas({
      ...canvasRequest,
      signal: firstController.signal,
    });
    await firstPosted.promise;
    harness.sources[0].emit({ type: "codex_state", data: { busy: false } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(conn.getState().sending, false);
    const second = conn.generateFromCanvas({
      ...canvasRequest,
      nodeId: secondNodeId,
    });
    await secondReading.promise;
    firstController.abort();
    firstResponse.resolve(
      jsonResponse(status, { ok: status === 200, error: "旧请求失败" }),
    );
    assert.equal(await first, status === 200 ? undefined : "旧请求失败");
    assert.equal(interrupts, 0);
    assert.equal(conn.getState().sending, true);
    assert.equal(conn.getState().canvasNodeId, secondNodeId);
    secondRelease.resolve();
    assert.equal(await second, undefined);
    assert.equal(posts, 2);
  });
}

test("assistant 增量通过 SSE 合并到消息", async (t: TestContext) => {
  const harness = createHarness();
  const conn = createAgentConnection({
    clientId: "client-1",
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    fetcher: (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/config"))
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          conversation: readyConversation().data,
          data: [],
        });
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    applyOps: () => ({ applied: [], rejected: [] }),
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  harness.sources[0].emit(readyConversation());

  harness.sources[0].emit({
    type: "agent_event",
    data: {
      turnId: "turn-1",
      type: "item.started",
      item: { id: "a1", type: "agent_message", text: "" },
    },
  });
  harness.sources[0].emit({
    type: "agent_event",
    data: {
      turnId: "turn-1",
      type: "item.updated",
      item: { id: "a1", type: "agent_message", delta: "你好" },
    },
  });
  harness.sources[0].emit({
    type: "agent_event",
    data: {
      turnId: "turn-1",
      type: "item.updated",
      item: { id: "a1", type: "agent_message", delta: "，世界" },
    },
  });
  const assistant = conn
    .getState()
    .messages.find((item) => item.role === "assistant");
  assert.equal(assistant?.text, "你好，世界");
});

test("工具回执等待期间串行写入，回执未知后阻断新 requestId 自动重试并停止回合", async (t) => {
  const harness = createHarness();
  let applied = 0,
    interrupted = 0;
  let release: (() => void) | undefined;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).includes("/canvas/result")) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return jsonResponse(503, { error: "lost receipt" });
      }
      if (String(input).endsWith("/interrupt")) interrupted++;
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    applyOps: (ops) => {
      applied++;
      return {
        applied: ops,
        rejected: [],
        tasks: [{ taskId: "accepted", nodeId: "image", status: "queued" }],
      };
    },
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  const emit = (requestId: string) =>
    harness.sources[0].emit({
      type: "tool_call",
      data: {
        requestId,
        name: "canvas_apply_ops",
        input: { ops: [{ type: "run_generation", nodeId: "image" }] },
      },
    });
  emit("original");
  await new Promise((resolve) => setTimeout(resolve, 0));
  emit("automatic-retry-before-receipt");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(applied, 1, "待确认回执时不并发执行另一写工具");
  release!();
  await new Promise((resolve) => setTimeout(resolve, 0));
  emit("automatic-retry-after-failure");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(applied, 1);
  assert.equal(interrupted, 1);
  harness.sources[0].emit({
    type: "agent_event",
    data: { type: "turn.completed", status: "completed" },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal((await conn.sendMessage("再来一次")).ok, false);
  assert.match(conn.getState().error ?? "", /回执未确认/);
});

test("tool_call：canvas_apply_ops 应用并回执 /canvas/result", async (t: TestContext) => {
  const harness = createHarness();
  const posted: Array<{ url: string; body?: string }> = [];
  let appliedOps: CanvasAgentOp[] | null = null;
  let snapshotPushes = 0;
  const conn = createAgentConnection({
    clientId: "client-1",
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      posted.push({
        url,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (url.includes("/config"))
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          conversation: readyConversation().data,
          data: [],
        });
      if (url.includes("/canvas/state")) snapshotPushes += 1;
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    applyOps: (ops) => {
      appliedOps = ops;
      return { applied: ops, rejected: [] };
    },
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  harness.sources[0].emit(readyConversation());

  harness.sources[0].emit({
    type: "tool_call",
    data: {
      requestId: "req-1",
      name: "canvas_apply_ops",
      input: { ops: [{ type: "add_node", nodeType: "text", title: "标题" }] },
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(appliedOps, [
    { type: "add_node", nodeType: "text", title: "标题" },
  ]);
  const resultCall = posted.find((entry) =>
    entry.url.includes("/canvas/result"),
  );
  assert.ok(resultCall);
  assert.match(resultCall.body ?? "", /"applied":1/);
  // 操作落地后推送新快照。
  assert.ok(snapshotPushes >= 2);
});

test("权限审批：approval 事件 → resolveApproval → 清除", async (t: TestContext) => {
  const harness = createHarness();
  let approvalBody: string | undefined;
  const conn = createAgentConnection({
    clientId: "client-1",
    eventSourceFactory: harness.eventSourceFactory,
    storage: memoryStorage(),
    fetcher: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/config"))
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          conversation: readyConversation().data,
          data: [],
        });
      if (url.includes("/agent/codex/approval")) {
        approvalBody = typeof init?.body === "string" ? init.body : undefined;
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation().data,
        data: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  harness.sources[0].emit(readyConversation());

  harness.sources[0].emit({
    type: "codex_approval",
    data: {
      requestId: "17",
      method: "local_shell_execute",
      command: "npm test",
    },
  });
  assert.equal(conn.getState().pendingApproval?.requestId, "17");
  const result = await conn.resolveApproval("accept");
  assert.equal(result.ok, true);
  assert.match(approvalBody ?? "", /"decision":"accept"/);
  harness.sources[0].emit({
    type: "codex_approval_resolved",
    data: { requestId: "17", decision: "accept" },
  });
  assert.equal(conn.getState().pendingApproval, null);
});

test("setCredentials 更新端点并持久化", () => {
  const storage = memoryStorage();
  const conn = createAgentConnection({ clientId: "c", storage });
  conn.setCredentials("http://127.0.0.1:17381/", "tok-1");
  assert.equal(conn.getState().endpoint, "http://127.0.0.1:17381/");
  assert.equal(conn.getState().token, "tok-1");
  assert.equal(storage.getItem("canvas-agent-url"), "http://127.0.0.1:17381/");
  assert.equal(storage.getItem("canvas-agent-token"), null);
});

test("重连读取到的新会话状态优先于启动期间的 hello 快照", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation({ status: "preparing" }).data,
  });
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async () =>
      jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        conversation: readyConversation({ status: "ready", revision: 2 }).data,
        messages: [],
        data: [],
      })) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(conn.getState().status, "connected");
  assert.equal(conn.getState().conversation?.status, "ready");
});
