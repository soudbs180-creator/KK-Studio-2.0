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
import { createDesktopAgentLifecycle } from "../../src/features/agent/desktopAgentLifecycle.ts";
import { clearSentPendingDraft } from "../../src/features/agent/homeAgentRecovery.ts";
import {
  createProject,
  projectChatView,
  serializeCreationSnapshot,
  updateActiveChat,
} from "../../src/features/creation/model.ts";
import { updateProjectChatView } from "../../src/features/agent/chatProjectUpdate.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";

test("home settings can connect without persisting synthetic workspace history into a project", async (t) => {
  const harness = createHarness();
  let writes = 0;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async () => connectionReadyResponse()) as typeof fetch,
  });
  conn.setBridge(
    createAgentHost({
      getProject: () => undefined,
      commit: () => {
        writes++;
      },
      generate: async () => ({}),
    }),
  );
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal(conn.getState().error, null);
  assert.equal(writes, 0);
});

test("reconnect persists thinner remote history without losing metadata and skips identical replay", async (t) => {
  let project = createProject({
    prompt: "",
    model: "",
    kind: "text",
    attachments: [],
  });
  const chat = project.chats![project.activeChatId!];
  chat.mainAgent = "codex";
  chat.agentThreadId = "thread-1";
  const roles = ["user", "system", "error", "assistant"] as const;
  chat.messages = roles.map((role) => ({
    id: `local-${role}`,
    clientMessageId: `client-${role}`,
    threadId: "thread-1",
    role,
    content: `saved ${role}`,
    attachments: [{ id: `attachment-${role}`, assetId: `asset-${role}` }],
    assetIds: [`asset-${role}`],
    opaqueMetadata: { source: role, retained: true },
  }));
  const originals = structuredClone(chat.messages);
  const harness = createHarness({
    conversation: readyConversation().data,
    codex: { busy: false },
  });
  let saves = 0;
  let flushes = 0;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (new URL(String(input)).pathname.endsWith("/threads/thread-1")) {
        harness.sources.at(-1)!.emit({
          type: "chat_message",
          data: {
            message: {
              id: "remote-user",
              clientMessageId: "client-user",
              threadId: "thread-1",
              role: "user",
              text: "restored user",
            },
          },
        });
        return jsonResponse(200, {
          ok: true,
          conversation: readyConversation().data,
          messages: roles.map((role) => ({
            id: role === "user" ? "remote-user" : `local-${role}`,
            clientMessageId: `client-${role}`,
            threadId: "thread-1",
            role,
            text: `restored ${role}`,
          })),
        });
      }
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  conn.setBridge(
    createAgentHost({
      getProject: () => project,
      getProjects: () => [project],
      commit: (next) => {
        project = next;
        saves++;
      },
      flush: async () => {
        flushes++;
      },
      generate: async () => ({}),
    }),
  );
  t.after(() => conn.disconnect());
  for (let attempt = 0; attempt < 2; attempt++) {
    const beforeProject = project;
    const beforeSaves = saves;
    const beforeFlushes = flushes;
    await conn.connect();
    assert.equal(
      conn.getState().status,
      "connected",
      conn.getState().error ?? "",
    );
    const saved = project.chats![chat.id].messages;
    assert.equal(saved.length, originals.length);
    for (const original of originals) {
      const restored = saved.find(
        (message) => message.clientMessageId === original.clientMessageId,
      )!;
      assert.equal(
        restored.id,
        original.id,
        `${original.role} keeps its canonical id`,
      );
      assert.deepEqual(restored.attachments, original.attachments);
      assert.deepEqual(restored.assetIds, original.assetIds);
      assert.deepEqual(restored.opaqueMetadata, original.opaqueMetadata);
      assert.equal(restored.content, `restored ${original.role}`);
    }
    assert.ok(flushes > beforeFlushes, "reconnect waits for pending saves");
    if (attempt === 0) {
      assert.ok(saves > beforeSaves, "changed remote history is committed");
    } else {
      assert.equal(saves, beforeSaves, "identical replay does not commit");
      assert.strictEqual(project, beforeProject);
    }
    conn.disconnect();
  }
});

test("migrated legacy-codex resumes its exact old thread while original empty chats receive separate ownership", async (t) => {
  let project = createProject({
    prompt: "",
    model: "",
    kind: "text",
    attachments: [],
  });
  const empty = project.chats![project.activeChatId!];
  empty.mainAgent = "codex";
  project.chats!["legacy-codex"] = {
    ...empty,
    id: "legacy-codex",
    agentThreadId: "thread-legacy",
    messages: [
      { id: "offline", role: "assistant", content: "retained offline history" },
    ],
  };
  project.activeChatId = "legacy-codex";
  project.agentThreadId = "unrelated-root";
  const storage = memoryStorage();
  storage.setItem(`kk-agent-thread:${project.id}`, "unrelated-project-cache");
  const harness = createHarness({
    conversation: readyConversation({ threadId: "thread-legacy" }).data,
    codex: { busy: false },
  });
  const states: Record<string, unknown>[] = [];
  const mutations: string[] = [];
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path === "/canvas/state") states.push(JSON.parse(String(init?.body)));
      if (path.endsWith("/threads/new")) {
        mutations.push(path);
        return jsonResponse(200, {
          ok: true,
          conversation: readyConversation({ threadId: "thread-empty" }).data,
          messages: [],
        });
      }
      if (path.endsWith("/threads/thread-legacy"))
        return jsonResponse(200, {
          ok: true,
          conversation: readyConversation({ threadId: "thread-legacy" }).data,
          messages: [
            {
              id: "remote",
              role: "assistant",
              text: "restored original thread",
              threadId: "thread-legacy",
            },
          ],
        });
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 7,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  conn.setBridge(
    createAgentHost({
      getProject: () => project,
      getProjects: () => [project],
      commit: (next) => {
        project = next;
      },
      generate: async () => ({}),
    }),
  );
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal(conn.getState().conversation?.threadId, "thread-legacy");
  assert.deepEqual(mutations, []);
  assert.equal(
    project.chats!["legacy-codex"].messages.some(
      (message) => message.content === "retained offline history",
    ),
    true,
  );
  assert.equal(
    project.chats!["legacy-codex"].messages.some(
      (message) => message.content === "restored original thread",
    ),
    true,
  );
  assert.deepEqual(
    (states[0].scope as { chatId: string }).chatId,
    "legacy-codex",
  );
  assert.equal(states[0].threadId, "thread-legacy");
  project = { ...project, activeChatId: empty.id };
  conn.syncProject();
  await conn.connect();
  assert.equal(
    conn.getState().status,
    "connected",
    conn.getState().error ?? "",
  );
  assert.equal(project.chats![empty.id].agentThreadId, "thread-empty");
  assert.equal(project.chats!["legacy-codex"].agentThreadId, "thread-legacy");
  assert.equal(
    project.chats![empty.id].messages.some(
      (message) => message.content === "restored original thread",
    ),
    false,
  );
  assert.equal(mutations.length, 1);
});

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
    const scope = JSON.parse(
      new URL(_url, "http://localhost").searchParams.get("scope") ?? "null",
    );
    const source: FakeSource = {
      onmessage: null,
      onerror: null,
      closed: false,
      emit(event) {
        source.onmessage?.({
          type: event.type,
          data: JSON.stringify(
            event.data && typeof event.data === "object"
              ? {
                  scope,
                  ...(event.type === "tool_call"
                    ? { threadId: "", turnId: "" }
                    : {}),
                  ...event.data,
                }
              : event.data,
          ),
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

test("protocol 7 tool without frozen thread and turn identity never reaches the host", async (t) => {
  const harness = createHarness({
    conversation: readyConversation().data,
    codex: { busy: false },
  });
  let scope: unknown;
  let applied = 0;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (_url, init) => {
      const header = new Headers(init?.headers).get("x-canvas-agent-scope");
      if (header) scope = JSON.parse(header);
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => snapshot,
    readAgentThread: () => "thread-1",
    applyOps: () => {
      applied++;
      return { applied: [], rejected: [] };
    },
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(conn.getState().status, "connected");
  harness.sources[0].onmessage?.({
    type: "tool_call",
    data: JSON.stringify({
      scope,
      requestId: "missing-frozen-identity",
      name: "canvas_apply_ops",
      input: { ops: [] },
    }),
  });
  await new Promise<void>(setImmediate);
  assert.equal(applied, 0);
  assert.equal(conn.getState().status, "error");
  assert.match(conn.getState().error ?? "", /线程或 turn 身份/);
});

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
        protocolVersion: 7,
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

for (const mutation of ["new", "prepare", "resume", "retry-failed"] as const)
  test(`${mutation} ownership survives malformed mutation history and ordinary reconnect`, async (t) => {
    const storage = memoryStorage();
    const created = readyConversation({ threadId: "created-owned" }).data;
    let remote = readyConversation({
      threadId:
        mutation === "resume"
          ? "other-owned"
          : mutation === "retry-failed"
            ? "created-owned"
            : "",
      status:
        mutation === "retry-failed"
          ? "failed"
          : mutation === "resume"
            ? "ready"
            : "idle",
    }).data;
    if (mutation === "resume" || mutation === "retry-failed")
      storage.setItem("kk-agent-thread:workspace", "created-owned");
    let mutationCalls = 0;
    const paths: string[] = [];
    const conn = createAgentConnection({
      storage,
      fetcher: (async (input) => {
        const path = new URL(String(input)).pathname;
        paths.push(path);
        const isMutation =
          path.endsWith("/threads/new") ||
          path.endsWith("/conversation/prepare") ||
          path.endsWith("/resume");
        if (isMutation) {
          mutationCalls++;
          remote = created;
        }
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 7,
          conversation: remote,
          messages: isMutation ? [{ id: "bad", role: "user", text: 123 }] : [],
          settledTurnIds: isMutation ? ["bad-turn"] : [],
          data: [],
        });
      }) as typeof fetch,
      eventSourceFactory: () => {
        const source: FakeSource = {
          onmessage: null,
          onerror: null,
          closed: false,
          close() {
            source.closed = true;
          },
          emit(event) {
            source.onmessage?.({
              type: event.type,
              data: JSON.stringify(event.data),
            });
          },
        };
        queueMicrotask(() =>
          source.emit({
            type: "hello",
            data: { codex: { busy: false }, conversation: remote },
          }),
        );
        return source;
      },
    });
    t.after(() => conn.disconnect());
    await conn.connect(mutation === "new");
    assert.equal(conn.getState().status, "error");
    assert.match(conn.getState().error ?? "", /历史消息格式/);
    assert.deepEqual(conn.getState().messages, []);
    assert.equal(
      paths.some((path) => path.endsWith("/history/ack")),
      false,
    );
    assert.equal(storage.getItem("kk-agent-thread:workspace"), "created-owned");
    await conn.connect();
    assert.equal(
      conn.getState().status,
      "connected",
      conn.getState().error ?? "",
    );
    assert.equal(conn.getState().conversation?.threadId, "created-owned");
    assert.equal(storage.getItem("kk-agent-thread:workspace"), "created-owned");
    assert.equal(mutationCalls, 1);
    assert.deepEqual(conn.getState().messages, []);
    assert.equal(
      paths.some((path) => path.endsWith("/history/ack")),
      false,
    );
  });

for (const change of ["chat", "temporary", "adapter"] as const)
  for (const history of ["valid", "malformed"] as const)
    test(`late ${history} mutation cannot save ownership after ${change} changes`, async (t) => {
      const storage = memoryStorage();
      const gate = connectionGate();
      const entered = connectionGate();
      const harness = createHarness();
      let chatId = "original-chat";
      let temporary = false;
      let adapter = "codex";
      let saves = 0;
      const conn = createAgentConnection({
        storage,
        eventSourceFactory: harness.eventSourceFactory,
        fetcher: (async (input) => {
          if (String(input).endsWith("/conversation/prepare")) {
            entered.release();
            await gate.promise;
            return jsonResponse(200, {
              ok: true,
              conversation: readyConversation().data,
              messages: history === "malformed" ? [{ text: 123 }] : [],
            });
          }
          return connectionReadyResponse();
        }) as typeof fetch,
      });
      conn.setBridge({
        getSnapshot: () => snapshot,
        getChatScope: () => ({ projectId: snapshot.projectId, chatId }),
        getExecutionAdapter: () => adapter,
        getExecutionBlockReason: () =>
          temporary ? "临时聊天禁止持久化" : undefined,
        saveAgentThread: () => {
          saves++;
        },
        applyOps: () => ({ applied: [], rejected: [] }),
      });
      t.after(() => {
        gate.release();
        conn.disconnect();
      });
      const connecting = conn.connect();
      await entered.promise;
      if (change === "chat") chatId = "different-chat";
      else if (change === "adapter") adapter = "google";
      else temporary = true;
      gate.release();
      await connecting;
      assert.equal(conn.getState().status, "disconnected");
      assert.equal(
        storage.getItem(`kk-agent-thread:${snapshot.projectId}`),
        null,
      );
      assert.equal(saves, 0);
      assert.deepEqual(conn.getState().messages, []);
    });

for (const history of ["valid", "malformed"] as const)
  test(`numeric mutation identity is rejected with ${history} history`, async (t) => {
    const storage = memoryStorage();
    const harness = createHarness();
    const conn = createAgentConnection({
      storage,
      eventSourceFactory: harness.eventSourceFactory,
      fetcher: (async (input) => {
        if (String(input).endsWith("/threads/new"))
          return jsonResponse(200, {
            ok: true,
            conversation: readyConversation({ threadId: 123 }).data,
            messages: history === "malformed" ? [{ text: 123 }] : [],
          });
        return connectionReadyResponse();
      }) as typeof fetch,
    });
    t.after(() => conn.disconnect());
    await conn.connect(true);
    assert.equal(conn.getState().status, "error");
    assert.match(conn.getState().error ?? "", /无效会话身份/);
    assert.equal(storage.getItem("kk-agent-thread:workspace"), null);
    assert.deepEqual(conn.getState().messages, []);
  });

test("malformed GET history cannot replace an existing ownership receipt", async (t) => {
  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-1");
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) =>
      String(input).endsWith("/threads/thread-1")
        ? jsonResponse(200, {
            ok: true,
            conversation: readyConversation({ threadId: "foreign-thread" })
              .data,
            messages: [{ text: 123 }],
          })
        : connectionReadyResponse()) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  assert.equal(conn.getState().status, "error");
  assert.match(conn.getState().error ?? "", /历史消息格式/);
  assert.equal(storage.getItem("kk-agent-thread:workspace"), "thread-1");
  assert.deepEqual(conn.getState().messages, []);
});

function connectionGate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test("连接恢复：旧发送只能清除自己拥有的持久待发草稿", () => {
  const project = createProject({
    prompt: "pending A",
    model: "",
    kind: "image",
    attachments: [],
  });
  delete project.chats;
  delete project.activeChatId;
  project.composerDraft.pendingAgent = true;
  project.composerDraft.prompt = "pending A";
  project.composerDraft.attachments = [
    {
      id: "old-draft",
      name: "old.png",
      mime: "image/png",
      size: 1,
      dataUrl: "data:image/png;base64,YQ==",
    },
  ];
  const sent = project.composerDraft;
  const newer = {
    ...project,
    composerDraft: { ...sent, prompt: "new durable pending B" },
  };
  const retired = clearSentPendingDraft(newer, sent);
  assert.equal(retired.composerDraft.pendingAgent, undefined);
  assert.equal(retired.composerDraft.prompt, "new durable pending B");
  assert.deepEqual(retired.composerDraft.attachments, sent.attachments);
  assert.equal(newer.composerDraft.pendingAgent, true);
  assert.equal(clearSentPendingDraft(newer, undefined), newer);
  assert.equal(
    clearSentPendingDraft(newer, { ...sent, pendingAgent: undefined }),
    newer,
  );
  const ordinary = {
    ...project,
    composerDraft: { ...sent, pendingAgent: undefined },
  };
  assert.equal(
    clearSentPendingDraft(ordinary, ordinary.composerDraft),
    ordinary,
  );
  const cleared = clearSentPendingDraft(project, sent);
  assert.equal(cleared.composerDraft.prompt, "");
  assert.equal(cleared.composerDraft.pendingAgent, undefined);
  assert.deepEqual(cleared.composerDraft.attachments, []);
  assert.equal(project.composerDraft.prompt, "pending A");
  assert.equal(project.composerDraft.attachments.length, 1);
});

test("accepted HOME source retires through canonical chat views without clearing the next input or attachments", () => {
  let project = createProject({
    prompt: "original HOME image",
    model: "",
    kind: "image",
    modelSelection: { source: "codex", model: "", kind: "image" },
    attachments: [],
  });
  project = updateActiveChat(project, (chat) => ({
    ...chat,
    draft: { ...chat.draft, pendingAgent: true, prompt: "original HOME image" },
  }));
  const sent = projectChatView(project).composerDraft;
  const unchanged = updateProjectChatView(project, (view) =>
    clearSentPendingDraft(view, sent),
  );
  assert.equal(
    unchanged.chats![unchanged.activeChatId!].draft.pendingAgent,
    undefined,
  );
  assert.equal(unchanged.chats![unchanged.activeChatId!].draft.prompt, "");
  assert.deepEqual(
    unchanged.chats![unchanged.activeChatId!].draft.attachments,
    [],
  );
  const nextAttachment = {
    id: "next-attachment",
    name: "next.png",
    mime: "image/png",
    size: 1,
  };
  const next = updateActiveChat(project, (chat) => ({
    ...chat,
    draft: {
      ...chat.draft,
      prompt: "next canonical input",
      text: "next canonical input",
      attachments: [nextAttachment],
    },
  }));
  const accepted = updateProjectChatView(next, (view) =>
    clearSentPendingDraft(view, sent),
  );
  const draft = accepted.chats![accepted.activeChatId!].draft;
  assert.equal(draft.pendingAgent, undefined);
  assert.equal(draft.prompt, "next canonical input");
  assert.deepEqual(draft.attachments, [nextAttachment]);
  const wire = serializeCreationSnapshot({
    version: 3,
    revision: 1,
    activeProjectId: accepted.id,
    projects: [accepted],
    homeDraft: sent,
  });
  assert.equal(Object.hasOwn(wire.projects[0], "composerDraft"), false);
  assert.equal(next.chats![next.activeChatId!].draft.pendingAgent, true);
  assert.equal(sent.pendingAgent, true);
});

for (const edited of [false, true])
  test(`accepted HOME source retires original chat A after selecting B without changing B or ${edited ? "new A input" : "the active selection"}`, () => {
    let project = createProject({
      prompt: "HOME request A",
      model: "",
      kind: "image",
      attachments: [],
    });
    const originChatId = project.activeChatId!;
    project = updateActiveChat(project, (chat) => ({
      ...chat,
      agentThreadId: "thread-A",
      draft: { ...chat.draft, pendingAgent: true, prompt: "HOME request A" },
    }));
    const sent = projectChatView(project).composerDraft;
    const originalA = structuredClone(project.chats![originChatId]);
    if (edited)
      project = updateActiveChat(project, (chat) => ({
        ...chat,
        draft: {
          ...chat.draft,
          prompt: "next input A",
          text: "next input A",
          model: "next model A",
          attachments: [
            { id: "next-A", name: "next-A.png", mime: "image/png", size: 1 },
          ],
        },
      }));
    const expectedA = structuredClone(project.chats![originChatId].draft);
    project = projectChatView({
      ...project,
      activeChatId: "B",
      chats: {
        ...project.chats,
        B: {
          ...project.chats![originChatId],
          id: "B",
          name: "B",
          agentThreadId: "thread-B",
          draft: {
            ...sent,
            pendingAgent: true,
            prompt: "edited B",
            attachments: [
              { id: "B", name: "B.png", mime: "image/png", size: 1 },
            ],
          },
          messages: [
            { id: "B-message", role: "assistant", content: "B retained" },
          ],
        },
      },
    });
    const originalB = JSON.stringify(project.chats!.B);
    const accepted = updateProjectChatView(project, (view) =>
      clearSentPendingDraft(view, sent, originChatId),
    );
    assert.equal(accepted.activeChatId, "B");
    assert.equal(JSON.stringify(accepted.chats!.B), originalB);
    const retiredA = accepted.chats![originChatId];
    assert.equal(retiredA.draft.pendingAgent, undefined);
    assert.equal(retiredA.agentThreadId, originalA.agentThreadId);
    assert.deepEqual(retiredA.messages, originalA.messages);
    assert.equal(retiredA.draft.prompt, edited ? "next input A" : "");
    assert.deepEqual(
      retiredA.draft.attachments,
      edited ? expectedA.attachments : [],
    );
    if (edited) assert.equal(retiredA.draft.model, "next model A");
    const wire = serializeCreationSnapshot({
      version: 3,
      revision: 1,
      activeProjectId: accepted.id,
      projects: [accepted],
      homeDraft: sent,
    });
    assert.equal(Object.hasOwn(wire.projects[0], "composerDraft"), false);
    assert.equal(JSON.stringify(wire.projects[0].chats!.B), originalB);
    assert.equal(project.chats![originChatId].draft.pendingAgent, true);
  });

test("HOME pending retirement rejects missing chat targets and ambiguous legacy scope", () => {
  const project = createProject({
    prompt: "A",
    model: "",
    kind: "image",
    attachments: [],
  });
  const sent = { ...project.composerDraft, pendingAgent: true };
  project.composerDraft = sent;
  assert.equal(clearSentPendingDraft(project, sent, "missing"), project);
  assert.equal(clearSentPendingDraft(project, sent, ""), project);
  const invalid = { ...project, activeChatId: "missing" };
  assert.equal(clearSentPendingDraft(invalid, sent, "chat-default"), invalid);
  const deleted = { ...project, chats: {}, activeChatId: undefined };
  assert.equal(clearSentPendingDraft(deleted, sent, "chat-default"), deleted);
  const legacy = { ...project, chats: undefined, activeChatId: undefined };
  assert.equal(clearSentPendingDraft(legacy, sent, "chat-default"), legacy);
});

const connectionReadyResponse = () =>
  jsonResponse(200, {
    ok: true,
    protocolVersion: 7,
    conversation: readyConversation().data,
    data: [],
    messages: [],
  });

test("连接恢复：重复完成通知共享同一原图读取与归档", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const entered = connectionGate(),
    image = connectionGate(),
    imported = connectionGate();
  let history: unknown[] = [],
    imageReads = 0,
    imports = 0;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      const url = String(input);
      if (url.includes("/generated-image/")) {
        imageReads++;
        entered.release();
        await image.promise;
        return new Response(
          new Blob(["independent synthetic image bytes"], {
            type: "image/png",
          }),
        );
      }
      if (url.endsWith("/threads/thread-1"))
        return jsonResponse(200, {
          ok: true,
          conversation: readyConversation().data,
          messages: history,
        });
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => ({
      projectId: "image-project",
      title: "fixture",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }),
    readAgentThread: () => "thread-1",
    applyOps: () => ({ applied: [], rejected: [] }),
    hasGeneratedImage: () => imports > 0,
    importGeneratedImage: async () => {
      imports++;
      imported.release();
    },
  });
  t.after(() => {
    image.release();
    conn.disconnect();
  });
  await conn.connect();
  await conn.sendMessage("一次图片", { memoryMode: "none" });
  history = [
    {
      id: "result-1",
      itemId: "result-1",
      role: "tool",
      threadId: "thread-1",
      turnId: "turn-1",
      text: "completed",
      detail: { kind: "image", status: "completed", savedPath: "fixture.png" },
    },
  ];
  harness.sources[0].emit({
    type: "agent_event",
    data: { type: "turn.completed", status: "completed" },
  });
  await entered.promise;
  harness.sources[0].emit({ type: "codex_state", data: { busy: false } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(imageReads, 1, "同一结果的并发完成通知不能重复取原图");
  image.release();
  await imported.promise;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(imports, 1);
  assert.equal(conn.getState().sending, false);
});

test("连接恢复：Web生命周期等待已有连接初始化后只发送一次", async (t) => {
  const harness = createHarness();
  const entered = connectionGate(),
    models = connectionGate();
  const paths: string[] = [];
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      const url = String(input);
      paths.push(url);
      if (url.endsWith("/models")) {
        entered.release();
        await models.promise;
      }
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  t.after(() => {
    models.release();
    conn.disconnect();
  });
  const first = conn.connect();
  await entered.promise;
  const lifecycle = createDesktopAgentLifecycle({
    connection: conn,
    isDesktop: () => false,
  });
  let completed = false;
  const second = lifecycle.connect().then(() => {
    completed = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false, "同一次连接未就绪前不能提前完成");
  models.release();
  await Promise.all([first, second]);
  assert.equal(conn.getState().status, "connected");
  assert.equal(harness.sources.length, 1);
  assert.equal(paths.filter((p) => p.endsWith("/prepare")).length, 1);
  assert.equal(paths.filter((p) => p.endsWith("/threads/new")).length, 0);
  assert.equal(
    (await conn.sendMessage("本轮只发一次", { memoryMode: "none" })).ok,
    true,
  );
  assert.equal(paths.filter((p) => p.endsWith("/turn")).length, 1);
});

test("连接恢复：相同trim凭据在连接中及就绪后均不取消或清会话", async (t) => {
  const harness = createHarness();
  const entered = connectionGate(),
    config = connectionGate();
  let signal: AbortSignal | null | undefined;
  const storage = memoryStorage();
  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input, init) => {
      if (String(input).endsWith("/config")) {
        signal = init?.signal;
        entered.release();
        await config.promise;
      }
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  t.after(() => {
    config.release();
    conn.disconnect();
  });
  conn.setCredentials("/kk-agent", "");
  const first = conn.connect();
  await entered.promise;
  const revision = conn.getState().connectionRevision;
  conn.setCredentials(" /kk-agent ", " ");
  assert.equal(signal?.aborted, false);
  assert.equal(conn.getState().connectionRevision, revision);
  config.release();
  await first;
  assert.equal(conn.getState().status, "connected");
  const conversation = conn.getState().conversation;
  conn.setCredentials("/kk-agent", "");
  assert.equal(conn.getState().status, "connected");
  assert.equal(conn.getState().conversation, conversation);
  assert.equal(harness.sources[0].closed, false);
  assert.equal(storage.getItem("canvas-agent-token"), null);
});

test("连接恢复：取消旧连接后迟到完成不能释放新连接等待", async (t) => {
  const harness = createHarness();
  const aEntered = connectionGate(),
    bEntered = connectionGate();
  const a = connectionGate(),
    b = connectionGate();
  let modelRequests = 0;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).endsWith("/models")) {
        modelRequests++;
        if (modelRequests === 1) {
          aEntered.release();
          await a.promise;
        } else {
          bEntered.release();
          await b.promise;
        }
      }
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  t.after(() => {
    a.release();
    b.release();
    conn.disconnect();
  });
  const old = conn.connect();
  await aEntered.promise;
  conn.setCredentials("http://127.0.0.1:17382", "new-in-memory");
  const current = conn.connect();
  await bEntered.promise;
  a.release();
  await old;
  let completed = false;
  const joined = conn.connect().then(() => {
    completed = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false, "旧连接不能清掉新连接的共享等待");
  b.release();
  await Promise.all([current, joined]);
  assert.equal(modelRequests, 2);
  assert.equal(conn.getState().status, "connected");
  assert.equal(harness.sources[0].closed, true);
  assert.equal(harness.sources[1].closed, false);
});

test("连接恢复：共享失败保持错误并允许下一次真实重试", async (t) => {
  const harness = createHarness();
  const entered = connectionGate(),
    config = connectionGate();
  let attempts = 0;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).endsWith("/config")) {
        if (++attempts === 1) {
          entered.release();
          await config.promise;
          return jsonResponse(503, { error: "fixture offline" });
        }
      }
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  t.after(() => {
    config.release();
    conn.disconnect();
  });
  const first = conn.connect();
  await entered.promise;
  let joined = false;
  const second = conn.connect().then(() => {
    joined = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(joined, false);
  config.release();
  await Promise.all([first, second]);
  assert.equal(conn.getState().status, "error");
  await conn.connect();
  assert.equal(attempts, 2);
  assert.equal(conn.getState().status, "connected");
});

test("连接恢复：同步订阅重入也等待当前连接", async (t) => {
  const harness = createHarness();
  const entered = connectionGate(),
    models = connectionGate();
  let reentrant: Promise<void> | undefined,
    joined = false;
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      if (String(input).endsWith("/models")) {
        entered.release();
        await models.promise;
      }
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  t.after(() => {
    models.release();
    conn.disconnect();
  });
  const unsubscribe = conn.subscribe(() => {
    if (conn.getState().status === "connecting" && !reentrant) {
      reentrant = conn.connect().then(() => {
        joined = true;
      });
    }
  });
  t.after(unsubscribe);
  const first = conn.connect();
  await entered.promise;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(joined, false);
  models.release();
  await Promise.all([first, reentrant]);
  assert.equal(harness.sources.length, 1);
});

test("连接恢复：就绪后读取额度期间显式新会话仍执行", async (t) => {
  const harness = createHarness({
    codex: { busy: false },
    conversation: readyConversation().data,
  });
  const entered = connectionGate(),
    usage = connectionGate();
  let usageRequests = 0,
    newThreads = 0;
  const imageRequests: string[] = [];
  const conn = createAgentConnection({
    storage: memoryStorage(),
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      const url = String(input);
      if (url.endsWith("/usage") && ++usageRequests === 1) {
        entered.release();
        await usage.promise;
      }
      if (url.endsWith("/threads/new")) newThreads++;
      if (url.includes("/generated-image/")) {
        imageRequests.push(url);
        return new Response(new Blob(["synthetic"], { type: "image/png" }));
      }
      if (url.endsWith("/threads/thread-1"))
        return jsonResponse(200, {
          ok: true,
          conversation: readyConversation().data,
          messages: [
            {
              id: "old-project-image",
              role: "tool",
              threadId: "thread-1",
              turnId: "old-turn",
              text: "old",
              detail: {
                kind: "image",
                status: "completed",
                savedPath: "old.png",
              },
            },
          ],
        });
      if (newThreads)
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 7,
          data: [],
          messages: [],
          conversation: readyConversation({ threadId: "thread-new" }).data,
        });
      return connectionReadyResponse();
    }) as typeof fetch,
  });
  conn.setBridge({
    getSnapshot: () => ({
      projectId: "epoch-project",
      title: "fixture",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, scale: 1 },
    }),
    readAgentThread: () => "thread-1",
    applyOps: () => ({ applied: [], rejected: [] }),
    importGeneratedImage: async () => {},
  });
  t.after(() => {
    usage.release();
    conn.disconnect();
  });
  const first = conn.connect();
  await entered.promise;
  assert.equal(conn.getState().status, "connected");
  await conn.connect(true);
  assert.equal(newThreads, 1);
  usage.release();
  await first;
  assert.deepEqual(imageRequests, [], "旧连接额度迟到后不能把旧图投射进新线程");
});

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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        return jsonResponse(200, { ok: true, protocolVersion: 7 });
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 7,
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
        return jsonResponse(200, { ok: true, protocolVersion: 7 });
      if (url.includes("/agent/codex/turn")) {
        turnBody = typeof init?.body === "string" ? init.body : undefined;
        return jsonResponse(200, { ok: true, threadId: "thread-1" });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 7,
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
        protocolVersion: 7,
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
        protocolVersion: 7,
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
          protocolVersion: 7,
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
          protocolVersion: 7,
          conversation: readyConversation().data,
          data: [],
        });
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 7,
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
        protocolVersion: 7,
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
          protocolVersion: 7,
          conversation: readyConversation().data,
          data: [],
        });
      if (url.includes("/canvas/state")) snapshotPushes += 1;
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 7,
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
          protocolVersion: 7,
          conversation: readyConversation().data,
          data: [],
        });
      if (url.includes("/agent/codex/approval")) {
        approvalBody = typeof init?.body === "string" ? init.body : undefined;
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 7,
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
        protocolVersion: 7,
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
