import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  createAgentConnection,
  type EventSourceLike,
} from "../../src/features/agent/agentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import type {
  AgentConversationState,
  CanvasAgentSnapshot,
} from "../../src/features/agent/agentTypes.ts";
import { createProject } from "../../src/features/creation/model.ts";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

type ToolReceipt = {
  requestId: string;
  result: {
    ok: boolean;
    applied: number;
    rejected: string[];
    tasks: Array<{ taskId: string; nodeId: string; status: string }>;
  };
};

async function receiptHarness(t: TestContext) {
  const makeProject = (prompt: string) => {
    const project = createProject({
      kind: "image",
      prompt,
      model: "image-model",
      attachments: [],
    });
    project.agentThreadId = "fixture-thread";
    project.chats![project.activeChatId!].modelAllowlist = ["image-model"];
    return project;
  };
  let project = makeProject("ORIGINAL_PROJECT_BODY");
  const nodeId = project.items[0].id;
  const conversation: AgentConversationState = {
    revision: 1,
    conversationId: "fixture-conversation",
    threadId: "fixture-thread",
    status: "ready",
    mcpStatuses: {},
  };
  const source: EventSourceLike = {
    onmessage: null,
    onerror: null,
    close() {},
  };
  const emit = (type: string, payload: unknown) =>
    source.onmessage?.({ type, data: JSON.stringify(payload) });
  const receiptReceived = deferred();
  const receiptGate = deferred();
  const receipts: ToolReceipt[] = [];
  const states: CanvasAgentSnapshot[] = [];
  const storage = new Map<string, string>();
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    generate: async () => ({ taskId: "accepted-task" }),
  });
  const connection = createAgentConnection({
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
      removeItem: (key) => void storage.delete(key),
    },
    eventSourceFactory: () => {
      queueMicrotask(() =>
        emit("hello", {
          conversation,
          codex: { busy: false },
          pendingApprovals: [],
        }),
      );
      return source;
    },
    fetcher: async (input, init) => {
      const path = new URL(String(input)).pathname;
      init?.signal?.throwIfAborted();
      if (path === "/canvas/result") {
        receipts.push(JSON.parse(String(init?.body)) as ToolReceipt);
        receiptReceived.resolve();
        await receiptGate.promise;
      } else if (path === "/canvas/state") {
        states.push(JSON.parse(String(init?.body)) as CanvasAgentSnapshot);
      }
      if (path === "/config")
        return Response.json({ ok: true, protocolVersion: 6 });
      if (path === "/agent/codex/models") return Response.json({ data: [] });
      if (path === "/agent/codex/threads/fixture-thread")
        return Response.json({ ok: true, conversation, messages: [] });
      if (path === "/agent/codex/turn")
        return Response.json({
          ok: true,
          state: { ...conversation, status: "running" },
        });
      assert.ok(
        [
          "/canvas/activate",
          "/canvas/state",
          "/canvas/result",
          "/agent/codex/usage",
          "/agent/codex/interrupt",
        ].includes(path),
        `Unexpected Agent request: ${path}`,
      );
      return Response.json({ ok: true });
    },
  });
  t.after(() => {
    receiptGate.resolve();
    connection.disconnect();
  });
  connection.setBridge(host);
  connection.setCredentials("http://127.0.0.1:4444", "synthetic-token");
  await connection.connect();
  assert.equal(connection.getState().status, "connected");
  const sent = await connection.sendMessage("Use the authorized image tool", {
    memoryMode: "none",
  });
  assert.equal(sent.ok, true, sent.error);
  states.length = 0;
  emit("tool_call", {
    requestId: "accepted-tool-request",
    name: "canvas_apply_ops",
    input: { ops: [{ type: "run_generation", nodeId }] },
  });
  await receiptReceived.promise;
  const expectedReceipt = {
    requestId: "accepted-tool-request",
    result: {
      ok: true,
      applied: 1,
      rejected: [],
      tasks: [{ taskId: "accepted-task", nodeId, status: "queued" }],
    },
  };
  assert.deepEqual(receipts, [expectedReceipt]);
  return {
    connection,
    states,
    receipts,
    expectedReceipt,
    projectId: project.id,
    changeProject() {
      project = makeProject("PRIVATE_NEW_PROJECT_BODY");
    },
    changeChat() {
      const previous = project.chats![project.activeChatId!];
      project = {
        ...project,
        activeChatId: "replacement-chat",
        chats: { "replacement-chat": { ...previous, id: "replacement-chat" } },
        items: project.items.map((item) => ({
          ...item,
          description: "PRIVATE_NEW_CHAT_BODY",
          prompt: "PRIVATE_NEW_CHAT_BODY",
        })),
      };
    },
    async releaseReceipt() {
      receiptGate.resolve();
      await new Promise<void>(setImmediate);
    },
  };
}

for (const change of ["project", "chat"] as const) {
  test(
    `a pending tool receipt cannot publish the ${change} selected before syncProject runs`,
    { timeout: 3000 },
    async (t) => {
      const h = await receiptHarness(t);
      if (change === "project") h.changeProject();
      else h.changeChat();
      await h.releaseReceipt();
      assert.deepEqual(
        h.states,
        [],
        "the old connection must not publish the new canvas or its private body",
      );
      assert.equal(h.connection.getState().status, "disconnected");
      assert.deepEqual(h.receipts, [h.expectedReceipt]);
    },
  );
}

test(
  "a same-scope tool receipt still publishes the canvas and preserves its accepted task",
  { timeout: 3000 },
  async (t) => {
    const h = await receiptHarness(t);
    await h.releaseReceipt();
    assert.equal(h.states.length, 1);
    assert.equal(h.states[0].projectId, h.projectId);
    assert.ok(JSON.stringify(h.states[0]).includes("ORIGINAL_PROJECT_BODY"));
    assert.equal(h.connection.getState().status, "connected");
    assert.deepEqual(h.receipts, [h.expectedReceipt]);
  },
);

test(
  "interrupting while a tool receipt is pending prevents a later canvas publication",
  { timeout: 3000 },
  async (t) => {
    const h = await receiptHarness(t);
    assert.equal((await h.connection.interrupt()).ok, true);
    await h.releaseReceipt();
    assert.deepEqual(h.states, []);
    assert.deepEqual(h.receipts, [h.expectedReceipt]);
  },
);
