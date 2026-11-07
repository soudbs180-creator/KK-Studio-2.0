import assert from "node:assert/strict";
import test from "node:test";
import { agentAnswerabilityError } from "../../src/features/agent/agentAnswerability.ts";
import {
  createAgentConnection,
  type EventSourceLike,
} from "../../src/features/agent/agentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createProject } from "../../src/features/creation/model.ts";
import type { CanvasAgentSnapshot } from "../../src/features/agent/agentTypes.ts";

function snapshot(): CanvasAgentSnapshot {
  return {
    projectId: "p1",
    title: "test",
    nodes: [
      {
        id: "a",
        title: "A",
        type: "text",
        metadata: {},
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      },
    ],
    connections: [],
    selectedNodeIds: [],
    viewport: { x: 0, y: 0, scale: 1 },
  };
}

test("current graph permits generic input and identifies missing prompt, attachment and source IDs", () => {
  assert.equal(agentAnswerabilityError(null, "free text"), undefined);
  assert.equal(agentAnswerabilityError(snapshot(), "use @[node:a]"), undefined);
  assert.match(
    agentAnswerabilityError(snapshot(), "@[node:missing]")!,
    /missing/,
  );
  assert.match(
    agentAnswerabilityError(snapshot(), "use", ["missing-image"])!,
    /missing-image/,
  );
});

for (const input of [
  "missing",
  "valid",
  "deleted-during-prepare",
  "free-text",
]) {
  test(`live connection preflight ${input} checks the final snapshot before POST /turn`, async (t) => {
    let current = snapshot();
    let posts = 0;
    const conversation = {
      revision: 1,
      conversationId: "conv-1",
      threadId: "thread-1",
      status: "ready",
      mcpStatuses: {},
    };
    const conn = createAgentConnection({
      storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      prepareAttachments: async () => {
        if (input === "deleted-during-prepare")
          current = { ...current, nodes: [] };
        return [];
      },
      eventSourceFactory: (url) => {
        const source: EventSourceLike = {
          onmessage: null,
          onerror: null,
          close: () => {},
        };
        queueMicrotask(() =>
          source.onmessage?.({
            type: "hello",
            data: JSON.stringify({
              scope: JSON.parse(
                new URL(url).searchParams.get("scope") ?? "null",
              ),
              codex: { busy: false },
              conversation,
            }),
          }),
        );
        return source;
      },
      fetcher: (async (url) => {
        if (String(url).endsWith("/turn")) posts++;
        return new Response(
          JSON.stringify({
            ok: true,
            protocolVersion: 7,
            data: [],
            messages: [],
            conversation,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }) as typeof fetch,
    });
    conn.setBridge({
      getSnapshot: () => current,
      readAgentThread: () => "thread-1",
      applyOps: () => ({ applied: [], rejected: [] }),
    });
    t.after(() => conn.disconnect());
    await conn.connect();
    assert.equal(
      conn.getState().status,
      "connected",
      conn.getState().error ?? "",
    );
    const prompt =
      input === "missing"
        ? "@[node:missing]"
        : input === "free-text"
          ? "hello"
          : "@[node:a]";
    const result = await conn.sendMessage(prompt, { memoryMode: "none" });
    const allowed = input === "valid" || input === "free-text";
    assert.equal(result.ok, allowed, result.error);
    assert.equal(posts, allowed ? 1 : 0);
    if (!allowed) assert.match(result.error!, /不存在|已删除/);
  });
}

test("generation preflight rechecks references and source through the real submission validate callback", async () => {
  let project = createProject({
    prompt: "",
    kind: "image",
    model: "image-model",
    attachments: [],
  });
  let calls = 0;
  let delayedValidation: (() => string | undefined) | undefined;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    modelAllowlist: ["image-model"],
    generate: async (_node, _prompt, _signal, validate) => {
      calls++;
      delayedValidation = validate;
      return { taskId: "task-1" };
    },
  });
  await host.applyOps([
    {
      type: "add_node",
      id: "a",
      nodeType: "text",
      metadata: { content: "reference" },
    },
    {
      type: "add_node",
      id: "target",
      nodeType: "config",
      metadata: {
        generationMode: "image",
        model: "image-model",
        prompt: "base",
      },
    },
  ]);
  const blocked = await host.applyOps([
    { type: "run_generation", nodeId: "target", prompt: "@[node:missing]" },
  ]);
  assert.equal(blocked.rejected.length, 1);
  assert.equal(calls, 0);
  const accepted = await host.applyOps([
    { type: "run_generation", nodeId: "target", prompt: "@[node:a]" },
  ]);
  assert.equal(accepted.applied.length, 1);
  await host.applyOps([{ type: "delete_node", id: "a" }]);
  assert.match(delayedValidation!()!, /不存在|已删除/);
});
