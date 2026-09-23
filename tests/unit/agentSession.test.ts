import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { startAgentServer } from "../helpers/agentServer.ts";
function storage(thread?: string) {
  const values = new Map<string, string>(
    thread ? [["kk-agent-thread:workspace", thread]] : [],
  );
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
async function settled(conn: ReturnType<typeof createAgentConnection>) {
  for (let n = 0; n < 100 && conn.getState().sending; n++) await delay(10);
  assert.equal(conn.getState().sending, false);
}
test("empty hello uses CAS preparation, repeated turns/model switch/reconnect retain thread; only explicit new creates thread", async (t) => {
  const server = await startAgentServer("idle");
  const conn = createAgentConnection({ storage: storage() });
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  conn.setCredentials(server.url, "fixture-token");
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal((await conn.sendMessage("第一句", { model: "first" })).ok, true);
  assert.equal(
    conn.getState().sending,
    true,
    "user echo does not complete turn",
  );
  await conn.interrupt();
  await settled(conn);
  assert.equal(
    (await conn.sendMessage("延续上文", { model: "second" })).ok,
    true,
  );
  await conn.interrupt();
  await settled(conn);
  await conn.connect();
  assert.equal(server.turns.length, 2);
  assert.ok(server.turns.every((turn) => turn.threadId === "fixture-thread"));
  assert.equal(
    server.requests.filter((path) => path.endsWith("/conversation/prepare"))
      .length,
    1,
  );
  assert.equal(
    server.requests.filter((path) => path.endsWith("/threads/new")).length,
    0,
  );
  await conn.connect(true);
  assert.equal(conn.getState().conversation?.threadId, "replacement-thread");
  assert.equal(
    server.requests.filter((path) => path.endsWith("/threads/new")).length,
    1,
  );
});
test("conditional prepare rejects another window's changed revision without replacing its thread", async (t) => {
  const server = await startAgentServer("idle");
  let release!: () => void, requested!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const conn = createAgentConnection({
    storage: storage(),
    fetcher: (async (url, init) => {
      if (String(url).endsWith("/conversation/prepare")) {
        requested();
        await held;
      }
      return fetch(url, init);
    }) as typeof fetch,
  });
  t.after(async () => {
    release();
    conn.disconnect();
    await server.close();
  });
  conn.setCredentials(server.url, "fixture-token");
  const pending = conn.connect();
  await started;
  server.emit("conversation_changed", {
    ...server.conversation(),
    revision: 2,
    conversationId: "other",
    threadId: "other-thread",
    status: "ready",
  });
  release();
  await pending;
  assert.equal(conn.getState().status, "error");
  assert.match(conn.getState().error ?? "", /保留现有会话/);
  assert.equal(server.conversation().threadId, "other-thread");
  assert.ok(!server.requests.some((path) => path.endsWith("/threads/new")));
});
test("old services fail closed when safe preparation is missing", async (t) => {
  const server = await startAgentServer("idle", false);
  const conn = createAgentConnection({ storage: storage() });
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  conn.setCredentials(server.url, "fixture-token");
  await conn.connect();
  assert.match(conn.getState().error ?? "", /不支持安全准备/);
  assert.ok(!server.requests.some((path) => path.endsWith("/threads/new")));
});
for (const status of ["ready", "warning", "running"] as const) {
  test(`owned ${status} hello restores session and entire approval queue without replacing it`, async (t) => {
    const server = await startAgentServer(status);
    server.emit("codex_approval", {
      requestId: "a",
      method: "shell",
      reason: "first",
    });
    server.emit("codex_approval", {
      requestId: "b",
      method: "shell",
      reason: "second",
    });
    const conn = createAgentConnection({ storage: storage("fixture-thread") });
    t.after(async () => {
      conn.disconnect();
      await server.close();
    });
    conn.setCredentials(server.url, "fixture-token");
    await conn.connect();
    assert.equal(
      conn.getState().status,
      "connected",
      conn.getState().error ?? "",
    );
    assert.equal(conn.getState().conversation?.status, status);
    assert.equal(conn.getState().pendingApproval?.requestId, "a");
    await conn.resolveApproval("accept");
    assert.equal(conn.getState().pendingApproval?.requestId, "b");
    await conn.resolveApproval("decline");
    assert.equal(conn.getState().pendingApproval, null);
    assert.equal(conn.getState().sending, status === "running");
    assert.ok(
      server.requests.indexOf("/events") <
        server.requests.indexOf("/canvas/activate"),
    );
    assert.ok(
      !server.requests.some(
        (path) => path.endsWith("/threads/new") || path.endsWith("/resume"),
      ),
    );
  });
}
test("unowned existing session is not adopted or replaced", async (t) => {
  const server = await startAgentServer("running");
  const conn = createAgentConnection({ storage: storage() });
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  conn.setCredentials(server.url, "fixture-token");
  await conn.connect();
  assert.equal(conn.getState().status, "error");
  assert.ok(!server.requests.some((path) => path.endsWith("/canvas/activate")));
});
