import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MemoryAgentPort } from "../../packages/creation-contracts/index.ts";
import { agentConnection } from "../../src/features/agent/agentConnection.ts";
import { createAgentHost } from "../../src/features/agent/agentHost.ts";
import {
  createProject,
  emptySnapshot,
  snapshotWriteBlockReason,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import { memoryService } from "../../src/features/memory/index.ts";
import { MemoryService } from "../../src/features/memory/memoryService.ts";
import type { MemoryStorage } from "../../src/features/memory/storage.ts";
import {
  useMemory,
  type UseMemoryOptions,
} from "../../src/features/memory/useMemory.ts";

test("memory observes the injected Agent port rather than a global connection", async () => {
  for (const status of ["connected", "disconnected"]) {
    let sends = 0;
    const port: MemoryAgentPort = {
      getState: () => ({
        status,
        connectionRevision: 1,
        sending: false,
        conversation: null,
        messages: [],
      }),
      getProjectId: () => null,
      getExecutionBlockReason: () => undefined,
      sendMessage: async () => {
        sends++;
        return { ok: false, error: "no conversation" };
      },
    };
    let hook: ReturnType<typeof useMemory> | undefined;
    function Harness() {
      hook = useMemory(() => {}, port);
      return null;
    }
    renderToStaticMarkup(createElement(Harness));
    assert.equal(hook!.codexConnected, status === "connected");
    await hook!.extractWithCodex();
    assert.equal(
      sends,
      0,
      "a port without a conversation cannot submit extraction",
    );
  }
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function extractionHarness(
  t: TestContext,
  options?: UseMemoryOptions | boolean,
) {
  const project = createProject({
    kind: "image",
    prompt: "synthetic",
    model: "fixture",
    modelSelection: { source: "codex", model: "fixture" },
    attachments: [],
  });
  project.chats![project.activeChatId!].agentThreadId = "synthetic-thread";
  const state = {
    ...agentConnection.getState(),
    status: "connected" as const,
    connectionRevision: 10,
    sending: false,
    messages: [],
    conversation: {
      revision: 1,
      conversationId: "synthetic-conversation",
      threadId: "synthetic-thread",
      status: "ready" as const,
      mcpStatuses: {},
    },
  };
  let snapshot: CreationSnapshot = {
    ...emptySnapshot(),
    version: 3,
    activeProjectId: project.id,
    projects: [project],
  };
  const host = createAgentHost({
    getProject: () => project,
    getExecutionBlockReason: () => snapshotWriteBlockReason(snapshot),
    commit: () => {},
    generate: async () => ({}),
  });
  agentConnection.setBridge(host);
  t.after(() => agentConnection.setBridge(null));
  const feedback: string[] = [];
  const sent: unknown[][] = [];
  const saved: unknown[][] = [];
  let poll: (() => void) | undefined;
  t.mock.method(agentConnection, "getState", () => state);
  t.mock.method(agentConnection, "sendMessage", async (...args: unknown[]) => {
    sent.push(args);
    return { ok: false, error: "INTENTIONAL_SYNTHETIC_STOP" };
  });
  t.mock.method(memoryService, "isEnabled", () => true);
  t.mock.method(memoryService, "getMutationVersion", () => 7);
  t.mock.method(memoryService, "storageMode", async () => "isolated");
  t.mock.method(
    memoryService,
    "storageStatus",
    async () => "synthetic storage",
  );
  t.mock.method(memoryService, "load", async () => ({
    version: 1,
    records: [],
  }));
  t.mock.method(
    memoryService,
    "saveCodexExtraction",
    async (...args: unknown[]) => {
      saved.push(args);
      return 1;
    },
  );
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setInterval(callback: () => void) {
        poll = callback;
        return 1;
      },
      clearInterval() {
        poll = undefined;
      },
    },
  });
  t.after(() => {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  let hook: ReturnType<typeof useMemory> | undefined;
  function Harness() {
    hook = useMemory(
      (message) => feedback.push(message),
      agentConnection,
      options,
    );
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  assert.ok(hook);
  return {
    hook,
    state,
    project,
    host,
    unsupportedSnapshot() {
      snapshot = { ...snapshot, version: 99 as CreationSnapshot["version"] };
    },
    feedback,
    sent,
    saved,
    allowReply() {
      t.mock.method(
        agentConnection,
        "sendMessage",
        async (...args: unknown[]) => {
          sent.push(args);
          return { ok: true, messageId: "synthetic-request" };
        },
      );
    },
    poll() {
      assert.ok(poll, "the real hook must wait for an assistant reply");
      poll();
    },
    pollIfWaiting() {
      poll?.();
    },
    complete() {
      state.messages = [
        {
          id: "user",
          role: "user",
          text: "synthetic extraction",
          clientMessageId: "synthetic-request",
          threadId: "synthetic-thread",
          turnId: "synthetic-turn",
        },
        {
          id: "assistant",
          role: "assistant",
          text: "记忆：用户偏好合成测试颜色",
          threadId: "synthetic-thread",
          turnId: "synthetic-turn",
          detail: { phase: "completed" },
        },
      ] as ReturnType<typeof agentConnection.getState>["messages"];
    },
  };
}

for (const [name, options, target] of [
  ["boolean target", true, false],
  ["object target", { isTemporary: true }, { isTemporary: false }],
  [
    "active chat",
    { isTemporary: false, activeChat: { isTemporary: true } },
    false,
  ],
] as const) {
  test(`memory extraction: false ${name} cannot override a temporary marker`, async (t) => {
    const h = extractionHarness(t, options);
    await h.hook.extractWithCodex(target);
    assert.equal(h.sent.length, 0);
    assert.equal(h.saved.length, 0);
    assert.ok(
      h.feedback.some((message) =>
        message.includes("临时会话无法提炼长期记忆"),
      ),
    );
  });
}

for (const reason of [
  "temporary",
  "duplicate-thread",
  "invalid-thread",
  "unsupported",
] as const) {
  test(`memory extraction without options honors the actual ${reason} host block`, async (t) => {
    const h = extractionHarness(t);
    const chat = h.project.chats![h.project.activeChatId!];
    if (reason === "temporary") chat.isTemporary = true;
    else if (reason === "duplicate-thread")
      h.project.chats!.other = { ...chat, id: "other" };
    else if (reason === "unsupported") h.unsupportedSnapshot();
    else chat.agentThreadId = "invalid/thread";
    const block = h.host.getExecutionBlockReason();
    assert.ok(block);
    await h.hook.extractWithCodex(false);
    assert.equal(h.sent.length, 0);
    assert.equal(h.saved.length, 0);
    assert.ok(h.feedback.includes(block));
  });
}

for (const change of [
  "revision",
  "project",
  "thread",
  "disconnect",
  "temporary",
  "unsupported",
] as const) {
  test(`memory extraction cancels ${change} changes while storage mode is pending`, async (t) => {
    const h = extractionHarness(t);
    const mode = deferred<"isolated">();
    let modeRequested = false;
    t.mock.method(memoryService, "storageMode", () => {
      modeRequested = true;
      return mode.promise;
    });
    const pending = h.hook.extractWithCodex();
    assert.equal(modeRequested, true, "extraction must reach the awaited gate");
    if (change === "revision") h.state.connectionRevision++;
    else if (change === "project") h.project.id = "different-project";
    else if (change === "thread") h.state.conversation.threadId = "new-thread";
    else if (change === "disconnect")
      Object.assign(h.state, { status: "disconnected" });
    else if (change === "unsupported") h.unsupportedSnapshot();
    else h.project.chats![h.project.activeChatId!].isTemporary = true;
    mode.resolve("isolated");
    await pending;
    assert.equal(h.sent.length, 0);
    assert.equal(h.saved.length, 0);
  });
}

test("memory extraction cancels a reply after connection revision changes during send", async (t) => {
  const h = extractionHarness(t);
  const response = deferred<{ ok: true; messageId: string }>();
  t.mock.method(agentConnection, "sendMessage", (...args: unknown[]) => {
    h.sent.push(args);
    return response.promise;
  });
  const pending = h.hook.extractWithCodex();
  await new Promise(setImmediate);
  h.state.connectionRevision++;
  h.complete();
  response.resolve({ ok: true, messageId: "synthetic-request" });
  await new Promise(setImmediate);
  h.pollIfWaiting();
  await pending;
  assert.equal(h.sent.length, 1);
  assert.equal(h.saved.length, 0);
});

test("memory extraction cancels an old completed reply when the host becomes temporary", async (t) => {
  const h = extractionHarness(t);
  h.allowReply();
  const pending = h.hook.extractWithCodex();
  await new Promise(setImmediate);
  h.project.chats![h.project.activeChatId!].isTemporary = true;
  h.complete();
  h.poll();
  await pending;
  assert.equal(h.sent.length, 1);
  assert.equal(h.saved.length, 0);
});

test("memory extraction keeps read-only shared directories protected", async (t) => {
  const h = extractionHarness(t);
  t.mock.method(memoryService, "storageMode", async () => "shared-readonly");
  await h.hook.extractWithCodex();
  assert.equal(h.sent.length, 0);
  assert.equal(h.saved.length, 0);
});

for (const scope of [
  "ordinary",
  "multiple chats",
  "stale root thread",
] as const) {
  test(`memory extraction in a ${scope} scope saves the matching completed reply and mutation version`, async (t) => {
    const h = extractionHarness(t);
    if (scope === "multiple chats") {
      const chat = h.project.chats![h.project.activeChatId!];
      h.project.chats!.other = {
        ...chat,
        id: "other",
        agentThreadId: "other-thread",
      };
    } else if (scope === "stale root thread")
      h.project.agentThreadId = "stale-root-thread";
    assert.equal(h.host.getExecutionBlockReason(), undefined);
    assert.equal(h.host.readAgentThread?.(), "synthetic-thread");
    h.allowReply();
    const pending = h.hook.extractWithCodex();
    await new Promise(setImmediate);
    h.complete();
    h.poll();
    await pending;
    assert.equal(h.sent.length, 1);
    assert.deepEqual(h.sent[0]?.[1], {
      memoryMode: "none",
      isTemporary: false,
    });
    assert.deepEqual(
      h.saved.map((args) => args.slice(0, 3)),
      [["记忆：用户偏好合成测试颜色", "synthetic-thread", 7]],
    );
    assert.equal((h.saved[0]?.[3] as () => boolean)(), true);
    assert.ok(
      h.feedback.some((message) => message.includes("已提炼并保存 1 条记忆")),
    );
  });
}

for (const revokeAt of ["queued", "read", "fingerprint", "never"] as const) {
  test(`manual extraction storage authorization is checked when scope changes ${revokeAt}`, async (t) => {
    let current = true;
    let writes = 0;
    const started = deferred<void>();
    const read = deferred<void>();
    const hashing = deferred<void>();
    const fingerprint = deferred<ArrayBuffer>();
    if (revokeAt === "fingerprint") {
      t.mock.method(crypto.subtle, "digest", () => {
        hashing.resolve();
        return fingerprint.promise;
      });
    }
    const storage: MemoryStorage = {
      mode: async () => "isolated",
      statusText: async () => "synthetic",
      authorizeSharedDirectory: async () => false,
      leaveSharedDirectory: async () => {},
      resetIdentity: async () => ({ version: 1, records: [] }),
      read: async () => {
        started.resolve();
        await read.promise;
        return { version: 1, records: [] };
      },
      write: async (store) => {
        writes++;
        return store;
      },
    };
    const service = new MemoryService({
      storage,
      settings: { read: () => ({ enabled: true }), write: () => {} },
    });
    const pending = service.saveCodexExtraction(
      "记忆：用户偏好合成测试颜色",
      "synthetic-thread",
      0,
      () => current,
    );
    if (revokeAt === "queued") current = false;
    else {
      await started.promise;
      if (revokeAt === "read") current = false;
    }
    read.resolve();
    if (revokeAt === "fingerprint") {
      await hashing.promise;
      current = false;
      fingerprint.resolve(new ArrayBuffer(32));
    }
    assert.equal(await pending, revokeAt === "never" ? 1 : 0);
    assert.equal(writes, revokeAt === "never" ? 1 : 0);
  });
}
