import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createAgentConnection,
  type AgentConnection,
  type EventSourceLike,
} from "../../src/features/agent/agentConnection.ts";
import {
  sendProjectAgentMessage,
} from "../../src/features/agent/homeAgentRecovery.ts";
import {
  emptyDraft,
  type ChatItem,
  type ChatItemDraft,
  type CreationProject,
} from "../../src/features/creation/model.ts";
import { memoryService } from "../../src/features/memory/index.ts";
import { useMemory } from "../../src/features/memory/useMemory.ts";
import { agentConnection } from "../../src/features/agent/agentConnection.ts";

// -----------------------------------------------------------------------------
// Test Helpers & Mock Infrastructure
// -----------------------------------------------------------------------------

interface FakeSource extends EventSourceLike {
  emit(event: { type: string; data: unknown }): void;
  closed: boolean;
}

interface GlobalWithTempChat {
  __kkActiveChat?: { isTemporary?: boolean };
  __kkActiveChatIsTemporary?: boolean;
}

function createHarness(hello?: unknown) {
  const sources: FakeSource[] = [];
  const eventSourceFactory = (_url: string) => {
    const source: FakeSource = {
      onmessage: null,
      onerror: null,
      closed: false,
      emit(event) {
        source.onmessage?.({
          type: event.type,
          data: JSON.stringify(event.data),
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
          conversation: {
            revision: 1,
            conversationId: "conv-test",
            threadId: "thread-test",
            status: "ready",
            mcpStatuses: {},
          },
        },
      }),
    );
    return source;
  };
  return { sources, eventSourceFactory };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createFakeProject(
  chats: Record<string, ChatItem>,
  activeChatId: string,
): CreationProject {
  return {
    id: "proj-stress",
    name: "Stress Test Project",
    version: 3,
    activeChatId,
    chats,
    items: [
      {
        id: "node-root",
        kind: "image",
        x: 0,
        y: 0,
        width: 512,
        height: 512,
        name: "root",
      },
    ],
    tasks: [],
    messages: [],
    composerDraft: { ...emptyDraft() },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as unknown as CreationProject;
}

// -----------------------------------------------------------------------------
// Suite 1: Adversarial Challenge on AgentConnection Injection & Ingestion
// -----------------------------------------------------------------------------

test("ADV-CHALLENGE-01: agentConnection.sendMessage strictly blocks buildInjection and ingestMessage when isTemporary: true", async (t: TestContext) => {
  const harness = createHarness();
  let postedPrompt = "";

  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-test");

  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input, init) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        harness.sources[0]?.emit({
          type: "conversation_changed",
          data: {
            revision: 2,
            conversationId: "conv-test",
            threadId: "thread-test",
            status: "ready",
            mcpStatuses: {},
          },
        });
      }
      if (url.endsWith("/turn")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        postedPrompt = body.prompt;
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          turnId: "turn-1",
          status: "completed",
        });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  await new Promise((resolve) => setImmediate(resolve));

  // Spy on memoryService
  let ingestCount = 0;
  let injectionCount = 0;
  const originalIngest = memoryService.ingestMessage;
  const originalBuild = memoryService.buildInjection;

  memoryService.ingestMessage = async (...args) => {
    ingestCount++;
    return originalIngest.apply(memoryService, args);
  };
  memoryService.buildInjection = async (..._args) => {
    injectionCount++;
    return "[LEAKED_MEMORY_INJECTION_MARKER]";
  };

  t.after(() => {
    memoryService.ingestMessage = originalIngest;
    memoryService.buildInjection = originalBuild;
  });

  const res = await conn.sendMessage("请帮我生成一幅图", {
    isTemporary: true,
  });

  assert.equal(res.ok, true, `Send failed: ${res.error}`);
  assert.equal(ingestCount, 0, "ingestMessage must NEVER be called when isTemporary is true");
  assert.equal(injectionCount, 0, "buildInjection must NEVER be called when isTemporary is true");
  assert.equal(
    postedPrompt.includes("LEAKED_MEMORY_INJECTION_MARKER"),
    false,
    "Turn prompt must NOT contain any injected memory",
  );
});

test("ADV-CHALLENGE-02: agentConnection.sendMessage permits injection & ingestion for regular chats (isTemporary: false)", async (t: TestContext) => {
  const harness = createHarness();
  let postedPrompt = "";

  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-test");

  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input, init) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        harness.sources[0]?.emit({
          type: "conversation_changed",
          data: {
            revision: 2,
            conversationId: "conv-test",
            threadId: "thread-test",
            status: "ready",
            mcpStatuses: {},
          },
        });
      }
      if (url.endsWith("/turn")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        postedPrompt = body.prompt;
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          turnId: "turn-2",
          status: "completed",
        });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  await new Promise((resolve) => setImmediate(resolve));

  let ingestCount = 0;
  let injectionCount = 0;
  const originalIngest = memoryService.ingestMessage;
  const originalBuild = memoryService.buildInjection;

  memoryService.ingestMessage = async (...args) => {
    ingestCount++;
    return originalIngest.apply(memoryService, args);
  };
  memoryService.buildInjection = async () => {
    injectionCount++;
    return "【用户记忆参考】：偏好水彩风格";
  };

  t.after(() => {
    memoryService.ingestMessage = originalIngest;
    memoryService.buildInjection = originalBuild;
  });

  const res = await conn.sendMessage("常规对话指令", {
    isTemporary: false,
  });

  assert.equal(res.ok, true, `Send failed: ${res.error}`);
  assert.equal(ingestCount, 1, "Regular chat must call ingestMessage");
  assert.equal(injectionCount, 1, "Regular chat must call buildInjection");
  assert.ok(
    postedPrompt.includes("【用户记忆参考】：偏好水彩风格"),
    "Turn prompt must contain injected memory for regular chat",
  );
});

test("ADV-CHALLENGE-03: sendProjectAgentMessage with diverse fake temporary chat structures blocks memory", async (_t: TestContext) => {
  const capturedInputs: Array<Record<string, unknown> | undefined> = [];

  const fakeConn: Pick<AgentConnection, "sendMessage"> = {
    async sendMessage(_message: string, input?: Record<string, unknown>) {
      capturedInputs.push(input);
      return { ok: true };
    },
  };

  // Case 1: Standard temporary chat
  const chat1: ChatItem = {
    id: "temp-1",
    name: "临时会话 1",
    createdAt: 100,
    updatedAt: 100,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    isTemporary: true,
  };
  const proj1 = createFakeProject({ "temp-1": chat1 }, "temp-1");
  await sendProjectAgentMessage(fakeConn, proj1, "msg1", undefined, undefined);
  assert.equal(capturedInputs[0]?.isTemporary, true);

  // Case 2: Fake chat using Boolean constructor coercion
  const chat2: ChatItem = {
    id: "temp-2",
    name: "临时 2",
    createdAt: 100,
    updatedAt: 100,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    isTemporary: Boolean(1),
  };
  const proj2 = createFakeProject({ "temp-2": chat2 }, "temp-2");
  await sendProjectAgentMessage(fakeConn, proj2, "msg2", undefined, undefined);
  assert.equal(capturedInputs[1]?.isTemporary, true);

  // Case 3: Prototype-less fake chat (Object.create(null))
  const chat3 = Object.create(null) as ChatItem;
  chat3.id = "temp-3";
  chat3.name = "无原型临时";
  chat3.isTemporary = true;
  const proj3 = createFakeProject({ "temp-3": chat3 }, "temp-3");
  await sendProjectAgentMessage(fakeConn, proj3, "msg3", undefined, undefined);
  assert.equal(capturedInputs[2]?.isTemporary, true);

  // Case 4: Deep frozen fake chat
  const chat4 = Object.freeze({
    id: "temp-4",
    name: "冻结临时",
    createdAt: 100,
    updatedAt: 100,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex" as const,
    modelAllowlist: [],
    isTemporary: true,
  });
  const proj4 = createFakeProject({ "temp-4": chat4 }, "temp-4");
  await sendProjectAgentMessage(fakeConn, proj4, "msg4", undefined, undefined);
  assert.equal(capturedInputs[3]?.isTemporary, true);

  // Case 5: Regular chat must have isTemporary !== true
  const regChat: ChatItem = {
    id: "reg-1",
    name: "常规会话",
    createdAt: 100,
    updatedAt: 100,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    isTemporary: false,
  };
  const proj5 = createFakeProject({ "reg-1": regChat }, "reg-1");
  await sendProjectAgentMessage(fakeConn, proj5, "msg5", undefined, undefined);
  assert.equal(capturedInputs[4]?.isTemporary, false);

  // Case 6: Legacy chat without isTemporary property
  const legChat: ChatItem = {
    id: "leg-1",
    name: "传统会话",
    createdAt: 100,
    updatedAt: 100,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
  };
  const proj6 = createFakeProject({ "leg-1": legChat }, "leg-1");
  await sendProjectAgentMessage(fakeConn, proj6, "msg6", undefined, undefined);
  assert.equal(capturedInputs[5]?.isTemporary, undefined);

  // Case 7: Corrupted / mismatched activeChatId
  const proj7 = createFakeProject({ "temp-1": chat1 }, "non-existent-id");
  await sendProjectAgentMessage(fakeConn, proj7, "msg7", undefined, undefined);
  assert.equal(capturedInputs[6]?.isTemporary, undefined);

  // Case 8: Undefined project
  await sendProjectAgentMessage(fakeConn, undefined, "msg8", undefined, undefined);
  assert.equal(capturedInputs[7]?.isTemporary, undefined);
});

// -----------------------------------------------------------------------------
// Suite 2: Adversarial Challenge on extractWithCodex in useMemory.ts
// -----------------------------------------------------------------------------

test("ADV-CHALLENGE-04: extractWithCodex never calls agentConnection or writes to disk when chat is temporary", async (t: TestContext) => {
  const feedbacks: string[] = [];
  let agentSendCalls = 0;
  let saveExtractionCalls = 0;

  // Spy on agentConnection.sendMessage and memoryService.saveCodexExtraction
  const originalSend = agentConnection.sendMessage;
  const originalSave = memoryService.saveCodexExtraction;

  agentConnection.sendMessage = async (...args) => {
    agentSendCalls++;
    return originalSend.apply(agentConnection, args);
  };
  memoryService.saveCodexExtraction = async (...args) => {
    saveExtractionCalls++;
    return originalSave.apply(memoryService, args);
  };

  t.after(() => {
    agentConnection.sendMessage = originalSend;
    memoryService.saveCodexExtraction = originalSave;
  });

  // Harness 1: Configured via hook options object { isTemporary: true }
  let hook1: ReturnType<typeof useMemory> | null = null;
  function Harness1(): ReactElement | null {
    hook1 = useMemory((msg) => feedbacks.push(msg), { isTemporary: true });
    return null;
  }
  renderToStaticMarkup(createElement(Harness1));
  assert.ok(hook1);

  await (hook1 as unknown as ReturnType<typeof useMemory>).extractWithCodex();
  assert.equal(agentSendCalls, 0, "agentConnection.sendMessage must NEVER be called");
  assert.equal(saveExtractionCalls, 0, "saveCodexExtraction must NEVER be called");
  assert.ok(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    "Must output blocking feedback",
  );

  // Harness 2: Configured via hook options { activeChat: { isTemporary: true } }
  feedbacks.length = 0;
  let hook2: ReturnType<typeof useMemory> | null = null;
  function Harness2(): ReactElement | null {
    hook2 = useMemory((msg) => feedbacks.push(msg), {
      activeChat: { isTemporary: true },
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness2));
  assert.ok(hook2);

  await (hook2 as unknown as ReturnType<typeof useMemory>).extractWithCodex();
  assert.equal(agentSendCalls, 0, "Must not call agent");
  assert.equal(saveExtractionCalls, 0, "Must not write to disk");
  assert.ok(feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")));

  // Harness 3: Configured via boolean primitive `true`
  feedbacks.length = 0;
  let hook3: ReturnType<typeof useMemory> | null = null;
  function Harness3(): ReactElement | null {
    hook3 = useMemory((msg) => feedbacks.push(msg), true);
    return null;
  }
  renderToStaticMarkup(createElement(Harness3));
  assert.ok(hook3);

  await (hook3 as unknown as ReturnType<typeof useMemory>).extractWithCodex();
  assert.equal(agentSendCalls, 0);
  assert.equal(saveExtractionCalls, 0);
  assert.ok(feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")));
});

test("ADV-CHALLENGE-05: extractWithCodex blocks adversarial arguments and fake chat structures", async (t: TestContext) => {
  const feedbacks: string[] = [];
  let agentSendCalls = 0;
  let saveExtractionCalls = 0;

  const originalSend = agentConnection.sendMessage;
  const originalSave = memoryService.saveCodexExtraction;

  agentConnection.sendMessage = async (...args) => {
    agentSendCalls++;
    return originalSend.apply(agentConnection, args);
  };
  memoryService.saveCodexExtraction = async (...args) => {
    saveExtractionCalls++;
    return originalSave.apply(memoryService, args);
  };

  t.after(() => {
    agentConnection.sendMessage = originalSend;
    memoryService.saveCodexExtraction = originalSave;
  });

  let hook: ReturnType<typeof useMemory> | null = null;
  function Harness(): ReactElement | null {
    // Default hook initialized as regular chat
    hook = useMemory((msg) => feedbacks.push(msg), { isTemporary: false });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  assert.ok(hook);
  const memoryHook = hook as unknown as ReturnType<typeof useMemory>;

  // Attack 1: Direct boolean parameter override: extractWithCodex(true)
  feedbacks.length = 0;
  await memoryHook.extractWithCodex(true);
  assert.equal(agentSendCalls, 0);
  assert.equal(saveExtractionCalls, 0);
  assert.ok(feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")));

  // Attack 2: Fake chat object with extra payload
  feedbacks.length = 0;
  await memoryHook.extractWithCodex({
    isTemporary: true,
  });
  assert.equal(agentSendCalls, 0);
  assert.equal(saveExtractionCalls, 0);
  assert.ok(feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")));

  // Attack 3: Object without prototype having isTemporary: true
  const bareObj: { isTemporary?: boolean } = Object.create(null);
  bareObj.isTemporary = true;
  feedbacks.length = 0;
  await memoryHook.extractWithCodex(bareObj);
  assert.equal(agentSendCalls, 0);
  assert.equal(saveExtractionCalls, 0);
  assert.ok(feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")));
});

test("ADV-CHALLENGE-06: extractWithCodex respects global fallback __kkActiveChat and __kkActiveChatIsTemporary", async (t: TestContext) => {
  const feedbacks: string[] = [];
  let agentSendCalls = 0;
  let saveExtractionCalls = 0;

  const originalSend = agentConnection.sendMessage;
  const originalSave = memoryService.saveCodexExtraction;

  agentConnection.sendMessage = async (...args) => {
    agentSendCalls++;
    return originalSend.apply(agentConnection, args);
  };
  memoryService.saveCodexExtraction = async (...args) => {
    saveExtractionCalls++;
    return originalSave.apply(memoryService, args);
  };

  const globalScope = globalThis as GlobalWithTempChat;

  t.after(() => {
    agentConnection.sendMessage = originalSend;
    memoryService.saveCodexExtraction = originalSave;
    delete globalScope.__kkActiveChat;
    delete globalScope.__kkActiveChatIsTemporary;
  });

  // Mount hook with no options (like in MemorySettingsSection)
  let hook: ReturnType<typeof useMemory> | null = null;
  function Harness(): ReactElement | null {
    hook = useMemory((msg) => feedbacks.push(msg));
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  assert.ok(hook);
  const memoryHook = hook as unknown as ReturnType<typeof useMemory>;

  // Subcase A: Global __kkActiveChat has isTemporary: true
  globalScope.__kkActiveChat = { isTemporary: true };
  feedbacks.length = 0;
  await memoryHook.extractWithCodex();
  assert.equal(agentSendCalls, 0);
  assert.equal(saveExtractionCalls, 0);
  assert.ok(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    "Should block via __kkActiveChat.isTemporary",
  );

  // Subcase B: Global __kkActiveChatIsTemporary is true
  delete globalScope.__kkActiveChat;
  globalScope.__kkActiveChatIsTemporary = true;
  feedbacks.length = 0;
  await memoryHook.extractWithCodex();
  assert.equal(agentSendCalls, 0);
  assert.equal(saveExtractionCalls, 0);
  assert.ok(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    "Should block via __kkActiveChatIsTemporary",
  );
});

test("ADV-CHALLENGE-07: extractWithCodex dynamically updates when options change via optionsRef", async (t: TestContext) => {
  const feedbacks: string[] = [];
  let agentSendCalls = 0;

  const originalSend = agentConnection.sendMessage;
  agentConnection.sendMessage = async (...args) => {
    agentSendCalls++;
    return originalSend.apply(agentConnection, args);
  };

  const globalScope = globalThis as GlobalWithTempChat;

  t.after(() => {
    agentConnection.sendMessage = originalSend;
    delete globalScope.__kkActiveChat;
    delete globalScope.__kkActiveChatIsTemporary;
  });

  // Mutable options object passed to hook
  const dynamicOptions: { isTemporary?: boolean } = { isTemporary: false };
  let hookInstance: ReturnType<typeof useMemory> | null = null;

  function DynamicHarness(): ReactElement | null {
    hookInstance = useMemory((msg) => feedbacks.push(msg), dynamicOptions);
    return null;
  }

  // 1. First render: regular chat
  renderToStaticMarkup(createElement(DynamicHarness));
  assert.ok(hookInstance);
  const memoryHook = hookInstance as unknown as ReturnType<typeof useMemory>;

  // 2. Tab switch: user switches to temporary chat -> options updated to isTemporary: true
  dynamicOptions.isTemporary = true;

  // 3. Invoke extraction without arguments
  feedbacks.length = 0;
  await memoryHook.extractWithCodex();

  assert.equal(
    agentSendCalls,
    0,
    "optionsRef must have captured the latest temporary state, blocking agent call",
  );
  assert.ok(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    "Feedback must confirm extraction was blocked",
  );
});

test("ADV-CHALLENGE-08: fatal memoryService failure does not affect temporary chats since neither ingest nor injection is called", async (t: TestContext) => {
  const harness = createHarness();

  const storage = memoryStorage();
  storage.setItem("kk-agent-thread:workspace", "thread-test");

  const conn = createAgentConnection({
    storage,
    eventSourceFactory: harness.eventSourceFactory,
    fetcher: (async (input) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        harness.sources[0]?.emit({
          type: "conversation_changed",
          data: {
            revision: 2,
            conversationId: "conv-test",
            threadId: "thread-test",
            status: "ready",
            mcpStatuses: {},
          },
        });
      }
      if (url.endsWith("/turn")) {
        return jsonResponse(200, {
          ok: true,
          protocolVersion: 6,
          turnId: "turn-fail-resilient",
          status: "completed",
        });
      }
      return jsonResponse(200, {
        ok: true,
        protocolVersion: 6,
        data: [],
        messages: [],
      });
    }) as typeof fetch,
  });
  t.after(() => conn.disconnect());
  await conn.connect();
  await new Promise((resolve) => setImmediate(resolve));

  // Break memoryService intentionally
  const originalIngest = memoryService.ingestMessage;
  const originalBuild = memoryService.buildInjection;
  memoryService.ingestMessage = async () => {
    throw new Error("FATAL_MEMORY_INGEST_CRASH");
  };
  memoryService.buildInjection = async () => {
    throw new Error("FATAL_MEMORY_INJECTION_CRASH");
  };

  t.after(() => {
    memoryService.ingestMessage = originalIngest;
    memoryService.buildInjection = originalBuild;
  });

  // Sending in temporary chat MUST NOT crash because ingest and build are never invoked!
  const res = await conn.sendMessage("临时会话指令在记忆服务损坏下执行", {
    isTemporary: true,
  });

  assert.equal(res.ok, true, `Temporary chat should be completely immune to memory service errors: ${res.error}`);
});

test("ADV-CHALLENGE-09: extractWithCodex does not falsely block regular chats", async (t: TestContext) => {
  const feedbacks: string[] = [];
  let agentSendCalls = 0;

  const originalSend = agentConnection.sendMessage;
  const originalGetState = agentConnection.getState;
  const originalStorageMode = memoryService.storageMode;

  memoryService.storageMode = async () => "isolated";

  // Mock agentConnection state as connected with valid threadId
  agentConnection.getState = () => ({
    ...originalGetState.apply(agentConnection),
    status: "connected",
    conversation: {
      revision: 1,
      conversationId: "conv-regular",
      threadId: "thread-regular",
      status: "ready",
      mcpStatuses: {},
    },
  });

  agentConnection.sendMessage = async (..._args) => {
    agentSendCalls++;
    return { ok: false, error: "INTENTIONAL_STOP_AFTER_AGENT_CALLED" };
  };

  const globalScope = globalThis as GlobalWithTempChat;

  t.after(() => {
    agentConnection.sendMessage = originalSend;
    agentConnection.getState = originalGetState;
    memoryService.storageMode = originalStorageMode;
    delete globalScope.__kkActiveChat;
    delete globalScope.__kkActiveChatIsTemporary;
  });

  let hook: ReturnType<typeof useMemory> | null = null;
  function Harness(): ReactElement | null {
    hook = useMemory((msg) => feedbacks.push(msg), { isTemporary: false });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  assert.ok(hook);

  await (hook as unknown as ReturnType<typeof useMemory>).extractWithCodex();

  // Regular chat must have proceeded past isTemp guard to invoke agentConnection.sendMessage!
  assert.equal(
    agentSendCalls,
    1,
    "Regular chat must NOT be blocked by isTemporary guard",
  );
  assert.equal(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    false,
    "Regular chat must never receive temporary chat warning",
  );
});
