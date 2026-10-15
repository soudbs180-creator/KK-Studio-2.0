import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createDesktopAgentLifecycle } from "../../src/features/agent/desktopAgentLifecycle.ts";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { startAgentServer } from "../helpers/agentServer.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

async function harness(t: TestContext, project = true) {
  const server = await startAgentServer("ready");
  const storage = memoryStorage();
  const connection = createAgentConnection({ storage });
  if (project)
    connection.setBridge({
      getSnapshot: () => ({
        projectId: "p1",
        title: "fixture",
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, scale: 1 },
      }),
      readAgentThread: () => "fixture-thread",
      applyOps: () => ({ applied: [], rejected: [] }),
    });
  let starts = 0,
    stops = 0;
  const runtime = {
    start: async () => {
      starts++;
      return { endpoint: server.url, token: "fixture-token" };
    },
    status: async () => ({
      available: true,
      running: starts > stops,
      healthy: starts > stops,
      endpoint: server.url,
    }),
    stop: async () => {
      stops++;
    },
  };
  const lifecycle = createDesktopAgentLifecycle({
    connection,
    storage,
    runtime,
    isDesktop: () => true,
  });
  t.after(async () => {
    connection.disconnect();
    await server.close();
  });
  return {
    server,
    connection,
    storage,
    runtime,
    lifecycle,
    starts: () => starts,
    stops: () => stops,
  };
}

test("startup waits for a project and only prepares the local service on home", async (t) => {
  const h = await harness(t, false);
  await Promise.all([h.lifecycle.ensure(), h.lifecycle.ensure()]);
  assert.equal(h.starts(), 1);
  assert.equal(h.lifecycle.getState().runtime?.healthy, true);
  assert.equal(h.connection.getState().status, "disconnected");
  assert.equal(
    h.server.requests.filter(
      (p) => p.includes("threads") || p.includes("/conversation/"),
    ).length,
    0,
  );
  assert.equal(h.server.turns.length, 0);
});

test("startup coalesces service/connection attempts and restores native ownership without a turn", async (t) => {
  const h = await harness(t);
  await Promise.all([h.lifecycle.ensure(), h.lifecycle.ensure()]);
  await h.lifecycle.ensure();
  assert.equal(h.starts(), 1);
  assert.equal(h.connection.getState().status, "connected");
  assert.equal(
    h.server.requests.filter((p) => p.endsWith("/threads/new")).length,
    0,
  );
  assert.equal(h.server.turns.length, 0);
  assert.equal(h.storage.getItem("canvas-agent-token"), null);
});

test("explicit disconnect persists the pause; manual reconnect resumes the same saved session", async (t) => {
  const h = await harness(t);
  await h.lifecycle.ensure();
  h.lifecycle.disconnect();
  await h.lifecycle.ensure();
  const next = createDesktopAgentLifecycle({
    connection: h.connection,
    storage: h.storage,
    runtime: h.runtime,
    isDesktop: () => true,
  });
  await next.ensure();
  assert.equal(h.connection.getState().status, "disconnected");
  assert.equal(h.starts(), 1);
  assert.equal(next.getState().automatic, false);
  await next.connect();
  assert.equal(h.connection.getState().status, "connected");
  assert.equal(next.getState().automatic, true);
  assert.equal(h.server.turns.length, 0);
});

test("an outstanding approval prevents service stop and disconnect", async (t) => {
  const h = await harness(t);
  await h.lifecycle.ensure();
  h.server.emit("codex_approval", {
    requestId: "fixture-approval",
    method: "shell",
    reason: "controlled approval",
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(h.connection.getState().pendingApproval);
  await assert.rejects(() => h.lifecycle.stop(), /任务|审批/);
  assert.throws(() => h.lifecycle.disconnect(), /任务|审批/);
  assert.equal(h.stops(), 0);
  assert.equal(h.connection.getState().status, "connected");
});

test("a late health response cannot mark a stopped service as running", async (t) => {
  const h = await harness(t);
  await h.lifecycle.ensure();
  let release!: (value: Awaited<ReturnType<typeof h.runtime.status>>) => void;
  h.runtime.status = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const late = h.lifecycle.refresh();
  h.runtime.status = async () => ({
    available: true,
    running: false,
    healthy: false,
    endpoint: h.server.url,
  });
  await h.lifecycle.stop();
  release({
    available: true,
    running: true,
    healthy: true,
    endpoint: h.server.url,
  });
  await late;
  assert.equal(h.lifecycle.getState().runtime?.running, false);
  assert.equal(h.lifecycle.getState().automatic, false);
});
