import assert from "node:assert/strict";
import test from "node:test";
import { createAgentConnection } from "../../src/features/agent/agentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import {
  createProject,
  emptySnapshot,
} from "../../src/features/creation/model.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { startAgentServer } from "../helpers/agentServer.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("reconnect retries an owned failed thread once, preserves it, and then reads its ready history", async (t) => {
  const server = await startAgentServer("failed");
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "fixture-thread");
  const conn = createAgentConnection({ storage });
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
  await conn.connect();
  assert.equal(conn.getState().status, "connected");
  assert.equal(server.conversation().threadId, "fixture-thread");
  assert.equal(server.requests.filter((p) => p.endsWith("/resume")).length, 1);
  assert.equal(
    server.requests.filter((p) => p.endsWith("/threads/new")).length,
    0,
  );
  assert.equal(server.requests.includes("/agent/codex/turn"), false);
});

for (const gate of ["busy", "approval"] as const) {
  test(`an owned failed thread is not prepared again while ${gate} remains outstanding`, async (t) => {
    const server = await startAgentServer("failed");
    if (gate === "busy") server.emit("codex_state", { busy: true });
    else
      server.emit("codex_approval", {
        requestId: "approval-1",
        method: "shell",
      });
    const storage = memoryStorage();
    storage.setItem("kk-agent-thread:workspace", "fixture-thread");
    const conn = createAgentConnection({ storage });
    t.after(async () => {
      conn.disconnect();
      await server.close();
    });
    conn.setCredentials(server.url, "fixture-token");
    await conn.connect();
    assert.equal(conn.getState().status, "error");
    assert.equal(server.conversation().threadId, "fixture-thread");
    assert.equal(
      server.requests.some(
        (p) => p.endsWith("/resume") || p.endsWith("/threads/new"),
      ),
      false,
    );
    assert.equal(server.requests.includes("/agent/codex/turn"), false);
  });
}

for (const failure of ["history", "models"] as const) {
  test(`newly prepared ownership survives a ${failure} read failure and reconnect does not replace it`, async (t) => {
    const server = await startAgentServer("idle");
    const storage = memoryStorage();
    let failOnce = true;
    const conn = createAgentConnection({
      storage,
      fetcher: async (url, options) => {
        const matches =
          failure === "models"
            ? String(url).endsWith("/models")
            : /\/threads\/fixture-thread$/.test(String(url));
        if (failOnce && matches) {
          failOnce = false;
          return new Response(
            JSON.stringify({ error: "controlled read failure" }),
            {
              status: 503,
              headers: { "content-type": "application/json" },
            },
          );
        }
        return fetch(url, options);
      },
    });
    t.after(async () => {
      conn.disconnect();
      await server.close();
    });
    conn.setCredentials(server.url, "fixture-token");
    await conn.connect();
    assert.equal(conn.getState().status, "error");
    assert.equal(
      storage.getItem("kk-agent-thread:workspace"),
      "fixture-thread",
    );
    await conn.connect();
    assert.equal(
      conn.getState().status,
      "connected",
      conn.getState().error ?? "",
    );
    assert.equal(
      server.requests.filter((p) => p.endsWith("/conversation/prepare")).length,
      1,
    );
    assert.equal(
      server.requests.filter((p) => p.endsWith("/threads/new")).length,
      0,
    );
    assert.equal(server.turns.length, 0);
  });
}

test("a native project ownership record restores its thread when the WebView cache is empty", async (t) => {
  const server = await startAgentServer("ready");
  let project = {
    ...createProject({
      prompt: "fixture",
      kind: "text",
      model: "fixture",
      attachments: [],
    }),
    agentThreadId: "fixture-thread",
  };
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next as typeof project;
    },
    generate: async () => ({}),
  });
  const storage = memoryStorage();
  const conn = createAgentConnection({ storage });
  conn.setBridge(host);
  conn.setCredentials(server.url, "fixture-token");
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal(
    storage.getItem(`kk-agent-thread:${project.id}`),
    "fixture-thread",
  );
  assert.equal(
    server.requests.filter((p) => p.endsWith("/threads/new")).length,
    0,
  );
  assert.equal(server.turns.length, 0);
});

test("prepared ownership is saved with the project before fallible model reads", async (t) => {
  const server = await startAgentServer("idle");
  let project = createProject({
    prompt: "fixture",
    kind: "text",
    model: "fixture",
    attachments: [],
  });
  let flushes = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    flush: async () => {
      flushes++;
    },
    generate: async () => ({}),
  });
  const conn = createAgentConnection({
    storage: memoryStorage(),
    fetcher: async (url, options) => {
      if (String(url).endsWith("/models")) {
        assert.equal(project.agentThreadId, "fixture-thread");
        assert.equal(flushes, 1);
        return new Response(
          JSON.stringify({ error: "controlled model failure" }),
          { status: 503 },
        );
      }
      return fetch(url, options);
    },
  });
  conn.setBridge(host);
  conn.setCredentials(server.url, "fixture-token");
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  await conn.connect();
  assert.equal(conn.getState().status, "error");
  assert.equal(project.agentThreadId, "fixture-thread");
  assert.equal(flushes, 1);
});

test("thread identity survives snapshot normalization without connection credentials", () => {
  const project = {
    ...createProject({
      prompt: "fixture",
      kind: "text",
      model: "fixture",
      attachments: [],
    }),
    agentThreadId: "owned-thread",
  };
  const restored = decodeSnapshot({
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
  });
  assert.equal(restored.projects[0].agentThreadId, "owned-thread");
  assert.ok(!JSON.stringify(restored).includes("canvas-agent-token"));
});

test("initializing a different known project preserves the original thread for later restoration", async (t) => {
  const server = await startAgentServer("ready");
  const first = {
    ...createProject({
      prompt: "",
      kind: "text",
      model: "fixture",
      attachments: [],
    }),
    agentThreadId: "fixture-thread",
  };
  let second = createProject({
    prompt: "",
    kind: "text",
    model: "fixture",
    attachments: [],
  });
  let active = second;
  const host = createAgentHost({
    getProject: () => active,
    getProjects: () => [first, second],
    commit: (next) => {
      active = next;
      second = next;
    },
    generate: async () => ({}),
  });
  const conn = createAgentConnection({ storage: memoryStorage() });
  conn.setBridge(host);
  conn.setCredentials(server.url, "fixture-token");
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal(second.agentThreadId, "replacement-thread");
  assert.equal(first.agentThreadId, "fixture-thread");
  active = first;
  conn.syncProject();
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal(conn.getState().conversation?.threadId, "fixture-thread");
  assert.equal(
    server.requests.filter((p) => p.endsWith("/threads/new")).length,
    1,
  );
  assert.equal(server.turns.length, 0);
});

test("ambiguous ownership cannot authorize automatic initialization over an existing thread", async (t) => {
  const server = await startAgentServer("ready");
  const project = createProject({
    prompt: "",
    kind: "text",
    model: "fixture",
    attachments: [],
  });
  const host = createAgentHost({
    getProject: () => project,
    getProjects: () => [
      { ...project, id: "other-a", agentThreadId: "fixture-thread" },
      { ...project, id: "other-b", agentThreadId: "fixture-thread" },
      project,
    ],
    commit: () => {
      throw Error("must not mutate");
    },
    generate: async () => ({}),
  });
  const conn = createAgentConnection({ storage: memoryStorage() });
  conn.setBridge(host);
  conn.setCredentials(server.url, "fixture-token");
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  await conn.connect();
  assert.equal(conn.getState().status, "error");
  assert.equal(
    server.requests.filter((p) => p.endsWith("/threads/new")).length,
    0,
  );
  assert.equal(server.conversation().threadId, "fixture-thread");
});

test("an owned failed empty preparation is retryable across a recreated connection", async (t) => {
  const server = await startAgentServer("idle");
  const storage = memoryStorage();
  let failOnce = true;
  const first: ReturnType<typeof createAgentConnection> = createAgentConnection(
    {
      storage,
      fetcher: async (url, options) => {
        if (failOnce && String(url).endsWith("/conversation/prepare")) {
          failOnce = false;
          server.emit("conversation_changed", {
            ...server.conversation(),
            conversationId: "failed-attempt",
            revision: 3,
            status: "failed",
            threadId: "",
            sourceClientId: first.clientId,
          });
          return new Response(
            JSON.stringify({ error: "controlled preparation failure" }),
            { status: 503 },
          );
        }
        return fetch(url, options);
      },
    },
  );
  first.setCredentials(server.url, "fixture-token");
  const next = createAgentConnection({ storage });
  next.setCredentials(server.url, "fixture-token");
  t.after(async () => {
    first.disconnect();
    next.disconnect();
    await server.close();
  });
  await first.connect();
  assert.equal(first.getState().status, "error");
  first.disconnect();
  await next.connect();
  assert.equal(
    next.getState().status,
    "connected",
    next.getState().error ?? "",
  );
  assert.equal(storage.getItem("kk-agent-thread:workspace"), "fixture-thread");
  assert.equal(
    server.requests.filter((p) => p.endsWith("/threads/new")).length,
    0,
  );
  assert.equal(server.turns.length, 0);
});

test("an unowned failed empty preparation is preserved rather than silently retried", async (t) => {
  const server = await startAgentServer("failed");
  server.emit("conversation_changed", {
    ...server.conversation(),
    threadId: "",
    sourceClientId: "foreign-client",
  });
  const conn = createAgentConnection({ storage: memoryStorage() });
  conn.setCredentials(server.url, "fixture-token");
  t.after(async () => {
    conn.disconnect();
    await server.close();
  });
  await conn.connect();
  assert.equal(conn.getState().status, "error");
  assert.equal(
    server.requests.filter(
      (p) => p.endsWith("/conversation/prepare") || p.endsWith("/threads/new"),
    ).length,
    0,
  );
  assert.equal(server.conversation().status, "failed");
});
