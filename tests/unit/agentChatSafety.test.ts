import assert from "node:assert/strict";
import test from "node:test";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { sendProjectAgentMessage } from "../../src/features/agent/homeAgentRecovery.ts";
import * as model from "../../src/features/creation/model.ts";
import { startAgentServer } from "../helpers/agentServer.ts";

function projectFixture() {
  return model.createProject({
    kind: "image",
    prompt: "fixture",
    model: "image-model",
    attachments: [],
  });
}

function hostFixture(project = projectFixture()) {
  let current = project;
  const generated: string[] = [];
  const host = createAgentHost({
    getProject: () => current,
    commit: (next) => {
      current = next;
    },
    generate: async (node) => {
      generated.push(node.model!);
      return { taskId: `accepted-${generated.length}` };
    },
  });
  return {
    host,
    generated,
    getProject: () => current,
    setProject: (next: typeof project) => {
      current = next;
    },
  };
}

test("empty chat model authorization rejects external generation without changing the node", async () => {
  const h = hostFixture();
  const before = structuredClone(h.getProject());
  const result = await h.host.applyOps([
    { type: "run_generation", nodeId: before.items[0].id },
  ]);
  assert.equal(result.applied.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(h.generated, []);
  assert.deepEqual(h.getProject(), before);
});

test("missing chat authorization denies generation while legacy projects retain their old behavior", async () => {
  const project = projectFixture();
  delete (project.chats![project.activeChatId!] as Partial<model.ChatItem>)
    .modelAllowlist;
  const h = hostFixture(project);
  assert.equal(
    (
      await h.host.applyOps([
        { type: "run_generation", nodeId: project.items[0].id },
      ])
    ).rejected.length,
    1,
  );
  const legacy = { ...project, chats: undefined, activeChatId: undefined };
  h.setProject(legacy);
  assert.equal(
    (
      await h.host.applyOps([
        { type: "run_generation", nodeId: project.items[0].id },
      ])
    ).applied.length,
    1,
  );
});

test("a frozen turn authorization cannot be widened by later chat permissions", async () => {
  const project = projectFixture();
  project.chats![project.activeChatId!].modelAllowlist = [
    "image-model",
    "later-model",
  ];
  const h = hostFixture(project);
  const result = await h.host.applyOps(
    [
      {
        type: "run_generation",
        nodeId: project.items[0].id,
        model: "later-model",
      },
    ],
    {
      signal: new AbortController().signal,
      modelAllowlist: ["image-model"],
    },
  );
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(h.generated, []);
  project.chats![project.activeChatId!].modelAllowlist = [];
  const revoked = await h.host.applyOps(
    [{ type: "run_generation", nodeId: project.items[0].id }],
    {
      signal: new AbortController().signal,
      modelAllowlist: ["image-model"],
    },
  );
  assert.equal(revoked.rejected.length, 1);
});

for (const reason of ["multiple", "temporary", "thread-conflict"] as const) {
  test(`${reason} chat records cannot reuse or overwrite the root thread or apply canvas operations`, async () => {
    const project = projectFixture();
    project.agentThreadId = "original-thread";
    if (reason === "multiple") {
      project.chats!.other = {
        ...project.chats![project.activeChatId!],
        id: "other",
        agentThreadId: undefined,
      };
      project.activeChatId = "other";
    } else if (reason === "temporary")
      project.chats![project.activeChatId!].isTemporary = true;
    else
      project.chats![project.activeChatId!].agentThreadId = "different-thread";
    const h = hostFixture(project);
    const before = structuredClone(project);
    assert.equal(h.host.readAgentThread(), undefined);
    await assert.rejects(h.host.saveAgentThread("replacement", project.id));
    const result = await h.host.applyOps([
      { type: "delete_node", id: project.items[0].id },
    ]);
    assert.equal(result.rejected.length, 1);
    assert.deepEqual(h.getProject(), before);
  });
}

test("normalization retains chat recovery and message metadata", () => {
  const project = projectFixture();
  const chat = project.chats![project.activeChatId!];
  const normalized = model.normalizeChat({
    ...chat,
    recovery: { pendingTurn: "accepted-turn", requestReceipt: "receipt-1" },
    draft: {
      ...chat.draft,
      recoveryAttachment: { id: "unfamiliar-reference" },
    },
    messages: [
      {
        id: "message-1",
        role: "assistant",
        content: "saved body",
        detail: { artifactId: "asset-1" },
      },
    ],
  });
  assert.deepEqual(normalized.recovery, {
    pendingTurn: "accepted-turn",
    requestReceipt: "receipt-1",
  });
  assert.deepEqual(normalized.draft.recoveryAttachment, {
    id: "unfamiliar-reference",
  });
  assert.deepEqual(normalized.messages[0].detail, { artifactId: "asset-1" });
});

test("home dispatch preserves the empty external-model authorization", async () => {
  let seen: Parameters<
    ReturnType<typeof createAgentConnection>["sendMessage"]
  >[1];
  await sendProjectAgentMessage(
    {
      sendMessage: async (_text, input) => {
        seen = input;
        return { ok: true };
      },
    },
    projectFixture(),
    "reason about this",
    undefined,
    undefined,
  );
  assert.deepEqual(seen?.modelAllowlist, []);
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("protocol 6 connection refuses a multi-chat host before publishing state", async (t) => {
  const server = await startAgentServer();
  const project = projectFixture();
  project.chats!.other = {
    ...project.chats![project.activeChatId!],
    id: "other",
  };
  const h = hostFixture(project);
  const connection = createAgentConnection({ storage: memoryStorage() });
  t.after(async () => {
    connection.disconnect();
    await server.close();
  });
  connection.setBridge(h.host);
  connection.setCredentials(server.url, "fixture-token");
  await connection.connect();
  assert.equal(connection.getState().status, "error");
  assert.deepEqual(server.requests, []);
});

test("empty external-model authorization permits the Codex reasoning model and forbids replacing its chat thread", async (t) => {
  const server = await startAgentServer();
  const project = projectFixture();
  project.agentThreadId = "fixture-thread";
  const h = hostFixture(project);
  const connection = createAgentConnection({ storage: memoryStorage() });
  t.after(async () => {
    connection.disconnect();
    await server.close();
  });
  connection.setBridge(h.host);
  connection.setCredentials(server.url, "fixture-token");
  await connection.connect();
  const result = await connection.sendMessage("reasoning only", {
    model: "reasoning-model",
    modelAllowlist: [],
    memoryMode: "none",
  });
  assert.equal(result.ok, true, result.error);
  assert.equal(server.turns.length, 1);
  await connection.interrupt();
  await connection.connect(true);
  assert.equal(connection.getState().conversation?.threadId, "fixture-thread");
  assert.equal(
    server.requests.some((path) => path.endsWith("/threads/new")),
    false,
  );
});

test("changing only the chat identity invalidates the connected epoch before late callbacks", async (t) => {
  const server = await startAgentServer();
  const project = projectFixture();
  project.agentThreadId = "fixture-thread";
  const h = hostFixture(project);
  const connection = createAgentConnection({ storage: memoryStorage() });
  t.after(async () => {
    connection.disconnect();
    await server.close();
  });
  connection.setBridge(h.host);
  connection.setCredentials(server.url, "fixture-token");
  await connection.connect();
  const before = connection.getState().connectionRevision;
  h.setProject({
    ...project,
    activeChatId: "changed",
    chats: {
      changed: { ...project.chats![project.activeChatId!], id: "changed" },
    },
  });
  connection.syncProject();
  assert.equal(connection.getState().status, "disconnected");
  assert.ok(connection.getState().connectionRevision > before);
  server.emit("chat_message", {
    message: { id: "late", role: "assistant", text: "wrong chat" },
  });
  assert.deepEqual(connection.getState().messages, []);
});

test("connection freezes tool authorization before a later permission grant and honors revocation", async (t) => {
  const server = await startAgentServer();
  const project = projectFixture();
  project.agentThreadId = "fixture-thread";
  project.chats![project.activeChatId!].modelAllowlist = ["image-model"];
  const h = hostFixture(project);
  let firstReceipt!: () => void;
  let secondReceipt!: () => void;
  const firstReceived = new Promise<void>((resolve) => {
    firstReceipt = resolve;
  });
  const secondReceived = new Promise<void>((resolve) => {
    secondReceipt = resolve;
  });
  const results: Array<{ result?: { applied: number; rejected: string[] } }> =
    [];
  const connection = createAgentConnection({
    storage: memoryStorage(),
    fetcher: async (input, init) => {
      if (new URL(String(input)).pathname === "/canvas/result") {
        results.push(JSON.parse(String(init?.body)));
        if (results.length === 1) firstReceipt();
        if (results.length === 2) secondReceipt();
      }
      return fetch(input, init);
    },
  });
  t.after(async () => {
    connection.disconnect();
    await server.close();
  });
  connection.setBridge(h.host);
  connection.setCredentials(server.url, "fixture-token");
  await connection.connect();
  assert.equal(
    (
      await connection.sendMessage("use authorized tools", {
        memoryMode: "none",
      })
    ).ok,
    true,
  );
  project.chats![project.activeChatId!].modelAllowlist.push("new-model");
  server.emit("tool_call", {
    requestId: "widened",
    name: "canvas_apply_ops",
    input: {
      ops: [
        {
          type: "run_generation",
          nodeId: project.items[0].id,
          model: "new-model",
        },
      ],
    },
  });
  await Promise.race([
    firstReceived,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("tool receipt timeout")), 2000).unref(),
    ),
  ]);
  assert.equal(results[0].result?.applied, 0);
  project.chats![project.activeChatId!].modelAllowlist = [];
  server.emit("tool_call", {
    requestId: "revoked",
    name: "canvas_apply_ops",
    input: {
      ops: [
        {
          type: "run_generation",
          nodeId: project.items[0].id,
          model: "image-model",
        },
      ],
    },
  });
  await Promise.race([
    secondReceived,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("tool receipt timeout")), 2000).unref(),
    ),
  ]);
  assert.deepEqual(
    results.map((entry) => entry.result?.applied),
    [0, 0],
  );
  assert.ok(results.every((entry) => entry.result?.rejected.length === 1));
  assert.deepEqual(h.generated, []);
});

test("chat scope changes during attachment preparation never submit the old turn", async (t) => {
  const server = await startAgentServer();
  const project = projectFixture();
  project.agentThreadId = "fixture-thread";
  const h = hostFixture(project);
  let prepared!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => {
    prepared = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const connection = createAgentConnection({
    storage: memoryStorage(),
    prepareAttachments: async () => {
      prepared();
      await pending;
      return [];
    },
  });
  t.after(async () => {
    release();
    connection.disconnect();
    await server.close();
  });
  connection.setBridge(h.host);
  connection.setCredentials(server.url, "fixture-token");
  await connection.connect();
  const sending = connection.sendMessage("keep original draft", {
    memoryMode: "none",
  });
  await started;
  h.setProject({
    ...project,
    activeChatId: "changed",
    chats: {
      changed: { ...project.chats![project.activeChatId!], id: "changed" },
    },
  });
  release();
  assert.equal((await sending).ok, false);
  assert.deepEqual(server.turns, []);
  assert.equal(connection.getState().status, "disconnected");
});

test("Codex approval cannot authorize a request after only the chat identity changes", async (t) => {
  const server = await startAgentServer();
  const project = projectFixture();
  project.agentThreadId = "fixture-thread";
  const h = hostFixture(project);
  const connection = createAgentConnection({ storage: memoryStorage() });
  t.after(async () => {
    connection.disconnect();
    await server.close();
  });
  connection.setBridge(h.host);
  connection.setCredentials(server.url, "fixture-token");
  await connection.connect();
  let ready!: () => void;
  const approvalReady = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const unsubscribe = connection.subscribe(() => {
    if (connection.getState().pendingApproval) ready();
  });
  t.after(unsubscribe);
  server.emit("codex_approval", {
    requestId: "old-approval",
    method: "shell",
    threadId: "fixture-thread",
  });
  await approvalReady;
  h.setProject({
    ...project,
    activeChatId: "changed",
    chats: {
      changed: { ...project.chats![project.activeChatId!], id: "changed" },
    },
  });
  assert.equal((await connection.resolveApproval("accept")).ok, false);
  assert.deepEqual(server.decisions, []);
});

test("snapshot write gate preserves legacy single-chat use and blocks unsafe formats or identities", () => {
  const snapshot = { ...model.emptySnapshot(), projects: [projectFixture()] };
  assert.equal(model.snapshotWriteBlockReason(snapshot), undefined);
  assert.ok(model.snapshotWriteBlockReason({ ...snapshot, version: 3 }));
  const project = snapshot.projects[0];
  const before = structuredClone(project);
  project.chats!.other = {
    ...project.chats![project.activeChatId!],
    id: "other",
  };
  assert.ok(model.snapshotWriteBlockReason(snapshot));
  assert.deepEqual(project.messages, before.messages);
  assert.deepEqual(project.composerDraft, before.composerDraft);
});

test("generation preflight rechecks a revoked grant at the task acceptance boundary", async () => {
  const project = projectFixture();
  project.chats![project.activeChatId!].modelAllowlist = ["image-model"];
  let ready!: () => void;
  let release!: () => void;
  const preparing = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let accepted = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: () => {},
    generate: async (_node, _prompt, _signal, validate) => {
      ready();
      await pending;
      const error = validate?.();
      if (error) return { error };
      accepted++;
      return { taskId: "must-not-be-accepted" };
    },
  });
  const running = host.applyOps([
    { type: "run_generation", nodeId: project.items[0].id },
  ]);
  await preparing;
  project.chats![project.activeChatId!].modelAllowlist = [];
  release();
  const result = await running;
  assert.equal(accepted, 0);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.tasks, []);
});
