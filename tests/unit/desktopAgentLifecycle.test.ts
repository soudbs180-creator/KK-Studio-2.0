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

function projectBridge(projectId: string) {
  return {
    getSnapshot: () => ({
      projectId,
      title: "fixture",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }),
    readAgentThread: () => "fixture-thread",
    applyOps: () => ({ applied: [], rejected: [] }),
  };
}

async function harness(t: TestContext, project = true) {
  const server = await startAgentServer("ready");
  const storage = memoryStorage();
  const connection = createAgentConnection({ storage });
  if (project) connection.setBridge(projectBridge("p1"));
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

function deferStart(h: Awaited<ReturnType<typeof harness>>) {
  let release!: () => void;
  let reject!: (reason: Error) => void;
  const gate = new Promise<void>((resolve, fail) => {
    release = resolve;
    reject = fail;
  });
  const start = h.runtime.start;
  h.runtime.start = async () => {
    const credentials = await start();
    await gate;
    return credentials;
  };
  return { release, reject };
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

test("native home submission forwards the explicit new project identity to its empty chat", async (t) => {
  const h = await harness(t);
  let thread: string | undefined;
  h.connection.setBridge({
    ...projectBridge("fresh-project"),
    getChatScope: () => ({
      projectId: "fresh-project",
      chatId: "chat-default",
    }),
    readAgentThread: () => thread,
    saveAgentThread: async (id) => {
      thread = id;
    },
  });
  await h.lifecycle.connect(true, "fresh-project");
  assert.equal(h.connection.getState().status, "connected");
  assert.equal(thread, "replacement-thread");
  assert.equal(
    h.server.requests.filter((path) => path.endsWith("/threads/new")).length,
    1,
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

test("explicit connection shares an in-flight attempt for the same project", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  const explicit = h.lifecycle.connect();
  gate.release();
  await Promise.all([startup, explicit]);
  assert.equal(h.starts(), 1);
  assert.equal(h.connection.getState().status, "connected");
  assert.equal(h.server.turns.length, 0);
});

test("explicit connection takes over an older project's flight without creating a new session", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  h.connection.setBridge(projectBridge("p2"));
  const explicit = h.lifecycle.connect();
  const repeated = h.lifecycle.connect();
  gate.release();
  await repeated;
  assert.equal(h.connection.getState().status, "connected");
  await Promise.all([startup, explicit, repeated]);
  assert.equal(h.starts(), 2);
  assert.equal(h.connection.getProjectId(), "p2");
  assert.equal(h.connection.getState().status, "connected");
  assert.equal(
    h.server.requests.filter((path) => path.endsWith("/threads/new")).length,
    0,
  );
  assert.equal(h.server.turns.length, 0);
});

test("disconnect cancels a new project's connection while an older flight is pending", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  h.connection.setBridge(projectBridge("p2"));
  const explicit = h.lifecycle.connect();
  h.lifecycle.disconnect();
  gate.release();
  await Promise.all([startup, explicit]);
  assert.equal(h.starts(), 1);
  assert.equal(h.connection.getState().status, "disconnected");
  assert.equal(h.lifecycle.getState().automatic, false);
  assert.equal(h.server.requests.length, 0);
});

test("switching projects again cancels a waiting explicit connection", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  h.connection.setBridge(projectBridge("p2"));
  const explicit = h.lifecycle.connect();
  h.connection.setBridge(projectBridge("p3"));
  gate.release();
  await Promise.all([startup, explicit]);
  assert.equal(h.starts(), 1);
  assert.equal(h.connection.getProjectId(), "p3");
  assert.equal(h.connection.getState().status, "disconnected");
  assert.equal(h.server.requests.length, 0);
});

test("stopping the service before project handover cancels the waiting connection", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  h.connection.setBridge(projectBridge("p2"));
  const explicit = h.lifecycle.connect();
  let stopped: Promise<void> | undefined;
  const unsubscribe = h.lifecycle.subscribe(() => {
    if (h.lifecycle.getState().pending) return;
    unsubscribe();
    stopped = h.lifecycle.stop();
  });
  gate.release();
  await Promise.all([startup, explicit]);
  await stopped;
  assert.equal(h.starts(), 1);
  assert.equal(h.stops(), 1);
  assert.equal(h.connection.getState().status, "disconnected");
  assert.equal(h.lifecycle.getState().automatic, false);
  assert.equal(h.lifecycle.getState().runtime?.running, false);
  assert.equal(h.server.requests.length, 0);
});

test("a manual connection wins over a waiting native project handover", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  h.connection.setBridge(projectBridge("p2"));
  const explicit = h.lifecycle.connect();
  h.connection.setCredentials(h.server.url, "manual-fixture-token");
  await h.connection.connect();
  const revision = h.connection.getState().connectionRevision;
  gate.release();
  await Promise.all([startup, explicit]);
  assert.equal(h.starts(), 1);
  assert.equal(h.connection.getState().status, "connected");
  assert.equal(h.connection.getState().connectionRevision, revision);
  assert.equal(h.connection.getState().token, "manual-fixture-token");
});

test("a failed older flight is reported without retrying for the new project", async (t) => {
  const h = await harness(t);
  const gate = deferStart(h);
  const startup = h.lifecycle.ensure();
  h.connection.setBridge(projectBridge("p2"));
  const explicit = h.lifecycle.connect();
  const rejected = assert.rejects(explicit, /fixture startup failed/);
  gate.reject(new Error("fixture startup failed"));
  await Promise.all([startup, rejected]);
  assert.equal(h.starts(), 1);
  assert.equal(h.connection.getState().status, "disconnected");
  assert.equal(h.lifecycle.getState().error, "fixture startup failed");
  assert.equal(h.server.requests.length, 0);
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
