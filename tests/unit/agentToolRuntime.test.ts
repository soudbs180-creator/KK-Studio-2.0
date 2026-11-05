import test from "node:test";
import assert from "node:assert/strict";
import { AgentToolRuntime } from "../../src/features/agent/agentToolRuntime.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
import type { RichStatuslinePayload } from "../../src/domain/agentWorkflow.ts";
import {
  createAgentConnection,
  type EventSourceLike,
} from "../../src/features/agent/agentConnection.ts";

function setup() {
  let project = createProject({
    kind: "image",
    prompt: "",
    model: "image-model",
    attachments: [],
  });
  let scope = project.id;
  let generated = 0;
  const statuses: RichStatuslinePayload[] = [];
  const runtime = new AgentToolRuntime({
    getScope: () => scope,
    getBlockReason: () => undefined,
  });
  const host = createAgentHost({
    toolRuntime: runtime,
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    modelAllowlist: ["image-model"],
    generate: async () => {
      generated++;
      return { taskId: "accepted-task" };
    },
  });
  host.subscribeStatusline?.((payload) => statuses.push(payload));
  return {
    host,
    statuses,
    getProject: () => project,
    generated: () => generated,
    switchScope: () => {
      scope = "other-chat";
    },
  };
}

test("production host routes actual canvas mutations through mandate, worker and statusline", async () => {
  const h = setup();
  const result = await h.host.applyOps([
    {
      type: "add_node",
      id: "real-node",
      nodeType: "text",
      metadata: { content: "actual text" },
    },
  ]);
  assert.equal(result.applied.length, 1);
  assert.equal(
    h.getProject().items.find((item) => item.id === "real-node")?.prompt,
    "actual text",
  );
  assert.deepEqual(
    h.statuses.map((item) => item.state),
    ["thinking", "tool_use", "completed"],
  );
  assert.equal(
    h.statuses.at(-1)?.sandboxEnabled,
    false,
    "canvas worker must not claim an OS sandbox",
  );
});

test("deletion waits for the concrete plan approval and rejects scope changes after approval", async () => {
  const h = setup();
  await h.host.applyOps([{ type: "add_node", id: "keep", nodeType: "text" }]);
  await assert.rejects(
    h.host.applyOps([{ type: "delete_node", id: "keep" }]),
    /未获授权/,
  );
  assert.ok(h.getProject().items.some((item) => item.id === "keep"));
  await assert.rejects(
    h.host.applyOps([{ type: "delete_node", id: "keep" }], {
      signal: new AbortController().signal,
      confirmPlan: async (checkpoint) => {
        assert.match(checkpoint.plan.items[0].goal, /删除 1 个节点.*keep/);
        h.switchScope();
        return true;
      },
    }),
    /已切换/,
  );
  assert.ok(h.getProject().items.some((item) => item.id === "keep"));
});

test("approval is bound to the original canvas and caller operation bytes", async () => {
  const h = setup();
  await h.host.applyOps([
    { type: "add_node", id: "original", nodeType: "text" },
  ]);
  await assert.rejects(
    h.host.applyOps([{ type: "delete_node", nodeType: "text" }], {
      signal: new AbortController().signal,
      confirmPlan: async (checkpoint) => {
        assert.match(checkpoint.plan.items[0].goal, /删除 1 个节点.*original/);
        await h.host.applyOps([
          { type: "add_node", id: "new-during-approval", nodeType: "text" },
        ]);
        return true;
      },
    }),
    /画布已变化/,
  );
  assert.ok(h.getProject().items.some((item) => item.id === "original"));
  assert.ok(
    h.getProject().items.some((item) => item.id === "new-during-approval"),
  );
  const op = { type: "delete_node" as const, id: "original" };
  const result = await h.host.applyOps([op], {
    signal: new AbortController().signal,
    confirmPlan: async () => {
      op.id = "new-during-approval";
      return true;
    },
  });
  assert.equal(result.applied.length, 1);
  assert.equal(
    h.getProject().items.some((item) => item.id === "original"),
    false,
  );
  assert.ok(
    h.getProject().items.some((item) => item.id === "new-during-approval"),
  );
});

test("same-batch additions cannot expand a broad deletion and model edits are previewed before generation", async () => {
  let project = createProject({
    kind: "image",
    prompt: "",
    model: "m1",
    attachments: [],
  });
  const runtime = new AgentToolRuntime({
    getScope: () => project.id,
    getBlockReason: () => undefined,
  });
  let submittedModel: string | undefined;
  const host = createAgentHost({
    toolRuntime: runtime,
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    modelAllowlist: ["m1", "m2"],
    generate: async (node) => {
      submittedModel = node.model;
      return { taskId: "accepted" };
    },
  });
  await host.applyOps([
    { type: "add_node", id: "old", nodeType: "text" },
    {
      type: "add_node",
      id: "target",
      nodeType: "image",
      metadata: { model: "m1", prompt: "forest" },
    },
  ]);
  await host.applyOps(
    [
      { type: "add_node", id: "new", nodeType: "text" },
      { type: "delete_node", nodeType: "text" },
    ],
    {
      signal: new AbortController().signal,
      confirmPlan: async (checkpoint) => {
        assert.match(checkpoint.plan.items[1].goal, /删除 1 个节点.*old/);
        assert.doesNotMatch(checkpoint.plan.items[1].goal, /new/);
        return true;
      },
    },
  );
  assert.ok(project.items.some((item) => item.id === "new"));
  assert.equal(
    project.items.some((item) => item.id === "old"),
    false,
  );
  const result = await host.applyOps(
    [
      { type: "update_node", id: "target", metadata: { model: "m2" } },
      { type: "run_generation", nodeId: "target" },
    ],
    {
      signal: new AbortController().signal,
      confirmPlan: async (checkpoint) => {
        assert.match(checkpoint.plan.items[1].goal, /模型 m2/);
        assert.doesNotMatch(checkpoint.plan.items[1].goal, /模型 m1/);
        return true;
      },
    },
  );
  assert.equal(result.rejected.length, 0);
  assert.equal(submittedModel, "m2");
});

test("generation permission is checked before the actual submission and returns accepted task identity", async () => {
  const h = setup();
  await h.host.applyOps([
    {
      type: "add_node",
      id: "target",
      nodeType: "image",
      metadata: { prompt: "a forest", model: "image-model" },
    },
  ]);
  const op = { type: "run_generation" as const, nodeId: "target" };
  await assert.rejects(h.host.applyOps([op]), /未获授权/);
  assert.equal(h.generated(), 0);
  const result = await h.host.applyOps([op], {
    signal: new AbortController().signal,
    confirmPlan: async () => true,
  });
  assert.equal(h.generated(), 1);
  assert.equal(result.tasks?.[0].taskId, "accepted-task");
  assert.equal(h.statuses.at(-1)?.taskCount, 1);
});

test("cancelled confirmation and secret-bearing tool payloads cause no canvas writes", async () => {
  const h = setup();
  const before = structuredClone(h.getProject());
  const controller = new AbortController();
  await assert.rejects(
    h.host.applyOps([{ type: "delete_node", id: "absent" }], {
      signal: controller.signal,
      confirmPlan: async () => {
        controller.abort();
        return true;
      },
    }),
    /abort/i,
  );
  await assert.rejects(
    h.host.applyOps([
      { type: "add_node", metadata: { content: "sk-" + "secret".repeat(8) } },
    ]),
    /credential leakage/i,
  );
  assert.deepEqual(h.getProject(), before);
});

test("cancelling an in-flight host batch preserves previous writes and the accepted task receipt", async () => {
  let project = createProject({
    kind: "image",
    prompt: "",
    model: "image-model",
    attachments: [],
  });
  let accept!: (result: { taskId: string }) => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const runtime = new AgentToolRuntime({
    getScope: () => project.id,
    getBlockReason: () => undefined,
  });
  const host = createAgentHost({
    toolRuntime: runtime,
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    modelAllowlist: ["image-model"],
    generate: () => {
      entered();
      return new Promise((resolve) => {
        accept = resolve;
      });
    },
  });
  const controller = new AbortController();
  const pending = host.applyOps(
    [
      {
        type: "add_node",
        id: "created",
        nodeType: "image",
        metadata: { model: "image-model", prompt: "forest" },
      },
      { type: "run_generation", nodeId: "created" },
      { type: "add_node", id: "cancelled-tail", nodeType: "text" },
    ],
    { signal: controller.signal, confirmPlan: async () => true },
  );
  await started;
  controller.abort();
  accept({ taskId: "already-accepted" });
  const result = await pending;
  assert.equal(result.applied.length, 2);
  assert.equal(result.tasks?.[0].taskId, "already-accepted");
  assert.match(result.rejected[0].reason, /取消/);
  assert.ok(project.items.some((item) => item.id === "created"));
  assert.equal(
    project.items.some((item) => item.id === "cancelled-tail"),
    false,
  );
});

for (const decision of ["accept", "decline", "disconnect"] as const) {
  test(`actual SSE tool request → local plan approval → ${decision} preserves authorization and receipts`, async (t) => {
    const h = setup();
    const project = h.getProject();
    project.chats![project.activeChatId!].mainAgent = "codex";
    project.chats![project.activeChatId!].agentThreadId = "thread-1";
    await h.host.applyOps([
      { type: "add_node", id: "source", nodeType: "text" },
    ]);
    let source!: EventSourceLike;
    let eventScope: unknown;
    const posted: Array<{ url: string; body: Record<string, unknown> }> = [];
    const conversation = {
      revision: 1,
      conversationId: "conv-1",
      threadId: "thread-1",
      status: "ready",
      mcpStatuses: {},
    };
    const connection = createAgentConnection({
      storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      eventSourceFactory: (url) => {
        eventScope = JSON.parse(
          new URL(url).searchParams.get("scope") ?? "null",
        );
        source = { onmessage: null, onerror: null, close: () => {} };
        queueMicrotask(() =>
          source.onmessage?.({
            type: "hello",
            data: JSON.stringify({
              scope: eventScope,
              conversation,
              codex: { busy: false },
            }),
          }),
        );
        return source;
      },
      fetcher: (async (url, init) => {
        if (init?.body)
          posted.push({
            url: String(url),
            body: JSON.parse(String(init.body)),
          });
        return new Response(
          JSON.stringify({
            ok: true,
            protocolVersion: 7,
            conversation,
            messages: [],
            data: [],
          }),
          { headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch,
    });
    connection.setBridge(h.host);
    t.after(() => connection.disconnect());
    await connection.connect();
    assert.equal(
      connection.getState().status,
      "connected",
      connection.getState().error ?? "",
    );
    source.onmessage?.({
      type: "tool_call",
      data: JSON.stringify({
        scope: eventScope,
        threadId: "thread-1",
        turnId: "turn-1",
        requestId: "delete-request",
        name: "canvas_apply_ops",
        input: { ops: [{ type: "delete_node", id: "source" }] },
      }),
    });
    await new Promise<void>(setImmediate);
    assert.match(
      connection.getState().pendingApproval?.requestId ?? "",
      /^kk-plan-/,
    );
    assert.ok(h.getProject().items.some((item) => item.id === "source"));
    if (decision === "disconnect") connection.disconnect();
    else assert.equal((await connection.resolveApproval(decision)).ok, true);
    await new Promise<void>(setImmediate);
    assert.equal(connection.getState().pendingApproval, null);
    assert.equal(
      h.getProject().items.some((item) => item.id === "source"),
      decision !== "accept",
    );
    assert.equal(
      posted.some((item) => item.url.includes("/approval")),
      false,
      "local approval must not be sent to the Codex server",
    );
    if (decision !== "disconnect") {
      const receipt = posted.find((item) =>
        item.url.includes("/canvas/result"),
      );
      assert.ok(receipt, "server must receive the original request's outcome");
      assert.equal(receipt.body.requestId, "delete-request");
      if (decision === "accept")
        assert.equal((receipt.body.result as { applied: number }).applied, 1);
      else assert.match(String(receipt.body.error), /未获授权/);
    }
  });
}
