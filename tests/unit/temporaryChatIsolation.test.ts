import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  sanitizeSnapshotForPersistence,
  persistCreationSnapshotSync,
  persistCreationSnapshotAsync,
  loadCreationSnapshot,
} from "../../src/features/creation/storage.ts";
import {
  normalizeChat,
  emptyDraft,
  CREATION_STORAGE_KEY,
  type ChatItem,
  type ChatItemDraft,
  type CreationSnapshot,
  type CreationProjectV3,
} from "../../src/features/creation/model.ts";
import {
  chatItemSchema,
  decodeSnapshot,
} from "../../src/features/creation/snapshotCodec.ts";
import { useMemory } from "../../src/features/memory/useMemory.ts";
import { memoryService } from "../../src/features/memory/index.ts";
import {
  createAgentConnection,
} from "../../src/features/agent/agentConnection.ts";
import { sendProjectAgentMessage } from "../../src/features/agent/homeAgentRecovery.ts";

function createValidChat(id: string, name: string, isTemporary?: boolean): ChatItem {
  return {
    id,
    name,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    isTemporary,
  };
}

function createTestSnapshot(projects: CreationProjectV3[]): CreationSnapshot {
  return {
    version: 3,
    schemaVersion: 3,
    revision: 1,
    activeProjectId: projects[0]?.id ?? "proj-1",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects: projects.map((p) => ({
      attachments: [],
      composerDraft: { ...emptyDraft(), attachments: [] },
      ...p,
    })) as CreationProjectV3[],
  };
}

class MockStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

// -----------------------------------------------------------------------------
// 1. sanitizeSnapshotForPersistence strips temporary chats
// -----------------------------------------------------------------------------

test("R2-ISO-01: sanitizeSnapshotForPersistence removes temporary chats while preserving regular chats", () => {
  const normalChat = createValidChat("chat-main", "主对话", false);
  const tempChat1 = createValidChat("chat-temp-101", "临时会话 1", true);
  const tempChat2 = createValidChat("chat-temp-102", "临时会话 2", true);

  const snapshot = createTestSnapshot([
    {
      id: "proj-1",
      name: "测试项目",
      activeChatId: "chat-main",
      chats: {
        "chat-main": normalChat,
        "chat-temp-101": tempChat1,
        "chat-temp-102": tempChat2,
      },
      items: [],
      tasks: [],
    },
  ]);

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const sanitizedChats = (sanitized.projects[0] as CreationProjectV3).chats;

  assert.equal(Object.keys(sanitizedChats).length, 1);
  assert.ok(sanitizedChats["chat-main"], "Regular chat should remain");
  assert.equal(sanitizedChats["chat-temp-101"], undefined, "Temporary chat 1 must be stripped");
  assert.equal(sanitizedChats["chat-temp-102"], undefined, "Temporary chat 2 must be stripped");
  assert.equal(sanitized.projects[0].activeChatId, "chat-main");
});

test("R2-ISO-02: sanitizeSnapshotForPersistence reassigns activeChatId when the active chat was temporary", () => {
  const normalChat = createValidChat("chat-regular", "常规对话", false);
  const tempChat = createValidChat("chat-temp-999", "临时会话", true);

  const snapshot = createTestSnapshot([
    {
      id: "proj-1",
      name: "测试项目",
      activeChatId: "chat-temp-999", // Active chat is temporary!
      chats: {
        "chat-regular": normalChat,
        "chat-temp-999": tempChat,
      },
      items: [],
      tasks: [],
    },
  ]);

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  assert.equal(sanitized.projects[0].activeChatId, "chat-regular");
  const sanitizedChats = (sanitized.projects[0] as CreationProjectV3).chats;
  assert.equal(sanitizedChats["chat-temp-999"], undefined);
});

test("R2-ISO-03: sanitizeSnapshotForPersistence creates a fallback default chat when all chats are temporary", () => {
  const tempChat1 = createValidChat("chat-temp-1", "临时 1", true);
  const tempChat2 = createValidChat("chat-temp-2", "临时 2", true);

  const snapshot = createTestSnapshot([
    {
      id: "proj-1",
      name: "临时专用项目",
      activeChatId: "chat-temp-1",
      chats: {
        "chat-temp-1": tempChat1,
        "chat-temp-2": tempChat2,
      },
      items: [],
      tasks: [],
    },
  ]);

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const project = sanitized.projects[0] as CreationProjectV3;
  const sanitizedChats = project.chats;

  assert.equal(Object.keys(sanitizedChats).length, 1);
  assert.ok(sanitizedChats["chat-default"], "A fallback default chat must be generated");
  assert.equal(sanitizedChats["chat-default"].isTemporary, undefined);
  assert.equal(project.activeChatId, "chat-default");
  assert.equal(sanitizedChats["chat-default"].mainAgent, "codex");
});

test("R2-ISO-04: sanitizeSnapshotForPersistence isolates multiple projects without data loss in canvas or tasks", () => {
  const snapshot = createTestSnapshot([
    {
      id: "proj-1",
      name: "项目 1",
      activeChatId: "p1-reg",
      chats: {
        "p1-reg": createValidChat("p1-reg", "常规 1"),
        "p1-temp": createValidChat("p1-temp", "临时 1", true),
      },
      items: [
        {
          id: "item-1",
          kind: "image",
          x: 100,
          y: 200,
          width: 512,
          height: 512,
          name: "素材 1",
        },
      ],
      tasks: [
        {
          id: "task-1",
          prompt: "测试任务",
          model: "gpt-4o",
          kind: "image",
          status: "succeeded",
        },
      ],
    },
    {
      id: "proj-2",
      name: "项目 2",
      activeChatId: "p2-temp",
      chats: {
        "p2-temp": createValidChat("p2-temp", "临时 2", true),
      },
      items: [],
      tasks: [],
    },
  ]);

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const p1 = sanitized.projects[0] as CreationProjectV3;
  const p2 = sanitized.projects[1] as CreationProjectV3;

  assert.equal(Object.keys(p1.chats).length, 1);
  assert.ok(p1.chats["p1-reg"]);
  assert.equal(p1.items.length, 1, "Canvas items must be preserved");
  assert.equal(p1.tasks.length, 1, "Tasks must be preserved");

  assert.equal(Object.keys(p2.chats).length, 1);
  assert.equal(p2.activeChatId, "chat-default");
  assert.ok(p2.chats["chat-default"]);
});

// -----------------------------------------------------------------------------
// 2. normalizeChat preserves isTemporary
// -----------------------------------------------------------------------------

test("R2-ISO-05: normalizeChat preserves isTemporary boolean flag", () => {
  const tempChatCandidate = {
    id: "chat-temp-123",
    name: "临时会话",
    isTemporary: true,
    messages: [{ id: "m1", role: "user", content: "hello" }],
  };
  const normalizedTemp = normalizeChat(tempChatCandidate);
  assert.equal(normalizedTemp.isTemporary, true, "isTemporary should be true for temporary candidate");
  assert.equal(normalizedTemp.id, "chat-temp-123");
  assert.equal(normalizedTemp.messages.length, 1);

  const regularChatCandidate = {
    id: "chat-normal-456",
    name: "常规会话",
    isTemporary: false,
  };
  const normalizedRegular = normalizeChat(regularChatCandidate);
  assert.equal(normalizedRegular.isTemporary, false, "isTemporary should be false when set to false");

  const unflaggedChatCandidate = {
    id: "chat-legacy-789",
    name: "传统会话",
  };
  const normalizedUnflagged = normalizeChat(unflaggedChatCandidate);
  assert.equal(normalizedUnflagged.isTemporary, false, "isTemporary should default to false when omitted");

  const nullCandidate = normalizeChat(null, "chat-fallback");
  assert.equal(nullCandidate.id, "chat-fallback");
  assert.equal(nullCandidate.isTemporary, false);
});

// -----------------------------------------------------------------------------
// 3. chatItemSchema explicitly supports isTemporary
// -----------------------------------------------------------------------------

test("R2-ISO-06: chatItemSchema validates isTemporary and decodeSnapshot handles v3 snapshot with isTemporary", () => {
  const parsedTemp = chatItemSchema.safeParse({
    id: "chat-t1",
    name: "临时会话",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    isTemporary: true,
  });
  assert.ok(parsedTemp.success, "chatItemSchema should accept isTemporary: true");
  if (parsedTemp.success) {
    assert.equal(parsedTemp.data.isTemporary, true);
  }

  const parsedFalse = chatItemSchema.safeParse({
    id: "chat-t2",
    name: "常规会话",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    isTemporary: false,
  });
  assert.ok(parsedFalse.success, "chatItemSchema should accept isTemporary: false");
  if (parsedFalse.success) {
    assert.equal(parsedFalse.data.isTemporary, false);
  }

  const parsedOmitted = chatItemSchema.safeParse({
    id: "chat-t3",
    name: "省略会话",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
  });
  assert.ok(parsedOmitted.success, "chatItemSchema should accept omitted isTemporary");

  // Verify full v3 decodeSnapshot with isTemporary
  const fullV3 = createTestSnapshot([
    {
      id: "proj-1",
      activeChatId: "chat-t1",
      chats: {
        "chat-t1": {
          id: "chat-t1",
          name: "临时会话",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          draft: { ...emptyDraft() } as ChatItemDraft,
          messages: [],
          mainAgent: "codex",
          modelAllowlist: [],
          isTemporary: true,
        },
      },
      items: [],
      tasks: [],
    },
  ]);

  const decoded = decodeSnapshot(fullV3);
  assert.equal(decoded.version, 3);
  assert.equal(decoded.projects[0].chats?.["chat-t1"]?.isTemporary, true);
});

// -----------------------------------------------------------------------------
// 4. Storage persistence strips temporary chats
// -----------------------------------------------------------------------------

test("R2-ISO-07: persistCreationSnapshotSync strips temporary chats before writing to sessionStorage", async () => {
  const originalWindow = globalThis.window;
  const mockSessionStorage = new MockStorage();
  const mockLocalStorage = new MockStorage();

  try {
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (cmd: string) => {
          if (cmd === "read_creation_snapshot") {
            return { status: "missing", snapshot: null };
          }
          return null;
        },
      },
      sessionStorage: mockSessionStorage,
      localStorage: mockLocalStorage,
    } as unknown as Window & typeof globalThis;

    // Load initial snapshot to establish writable = true
    await loadCreationSnapshot();

    // Switch to web browser runtime mode (non-desktop) so persistCreationSnapshotSync writes to sessionStorage
    delete (globalThis.window as Record<string, unknown>).__TAURI_INTERNALS__;

    const normalChat = createValidChat("chat-norm", "持久会话");
    const tempChat = createValidChat("chat-temp-sess", "临时会话", true);

    const snapshot = createTestSnapshot([
      {
        id: "proj-1",
        name: "测试项目",
        activeChatId: "chat-temp-sess",
        chats: {
          "chat-norm": normalChat,
          "chat-temp-sess": tempChat,
        },
        items: [],
        tasks: [],
      } as CreationProjectV3,
    ]);

    // Genuinely invoke persistCreationSnapshotSync
    persistCreationSnapshotSync(snapshot);

    const journalKey = `${CREATION_STORAGE_KEY}:pending`;
    const storedRaw = mockSessionStorage.getItem(journalKey);
    assert.ok(storedRaw, "sessionStorage should receive serialized pending journal from persistCreationSnapshotSync");

    const stored = JSON.parse(storedRaw);
    assert.equal(stored.snapshot.projects[0].chats?.["chat-temp-sess"], undefined, "Temporary chat must be stripped");
    assert.ok(stored.snapshot.projects[0].chats?.["chat-norm"], "Normal chat must be preserved");
    assert.equal(stored.snapshot.projects[0].activeChatId, "chat-norm", "activeChatId must point to preserved chat");
  } finally {
    globalThis.window = originalWindow;
  }
});

// -----------------------------------------------------------------------------
// 5. Memory isolation: extraction and injection/ingestion blocked
// -----------------------------------------------------------------------------

test("R2-ISO-08: useMemory blocks manual memory extraction when active chat is temporary", async () => {
  const feedbacks: string[] = [];
  let capturedHook: ReturnType<typeof useMemory> | null = null;

  function TestHarness({
    isTemp,
  }: {
    isTemp: boolean;
  }): ReactElement | null {
    capturedHook = useMemory((msg) => feedbacks.push(msg), {
      isTemporary: isTemp,
    });
    return null;
  }

  // Render harness with isTemporary: true
  renderToStaticMarkup(createElement(TestHarness, { isTemp: true }));
  assert.ok(capturedHook, "Hook must be captured");

  await (capturedHook as unknown as ReturnType<typeof useMemory>).extractWithCodex();

  assert.ok(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    `Expected feedback to warn about temporary chat, got: ${feedbacks.join(", ")}`,
  );
});

test("R2-ISO-09: extractWithCodex respects explicit temporary argument override", async () => {
  const feedbacks: string[] = [];
  let capturedHook: ReturnType<typeof useMemory> | null = null;

  function TestHarness(): ReactElement | null {
    capturedHook = useMemory((msg) => feedbacks.push(msg), {
      isTemporary: false, // Default is regular chat
    });
    return null;
  }

  renderToStaticMarkup(createElement(TestHarness));
  assert.ok(capturedHook);

  // Explicitly call extractWithCodex with a temporary chat
  await (capturedHook as unknown as ReturnType<typeof useMemory>).extractWithCodex({
    isTemporary: true,
  });

  assert.ok(
    feedbacks.some((msg) => msg.includes("临时会话无法提炼长期记忆")),
    `Expected feedback to warn about temporary chat with direct arg, got: ${feedbacks.join(", ")}`,
  );
});

test("R2-ISO-10: agentConnection blocks buildInjection and ingestMessage when isTemporary is true", async () => {
  let ingestCount = 0;
  let buildCount = 0;
  const origIngest = memoryService.ingestMessage;
  const origBuild = memoryService.buildInjection;
  memoryService.ingestMessage = async (...args) => {
    ingestCount++;
    return origIngest.apply(memoryService, args);
  };
  memoryService.buildInjection = async (...args) => {
    buildCount++;
    return origBuild.apply(memoryService, args);
  };

  try {
    const makeConnection = () => {
      const sources: { onmessage: ((e: { type: string; data: string }) => void) | null; emit(e: { type: string; data: unknown }): void; close(): void }[] = [];
      const eventSourceFactory = () => {
        const source = {
          onmessage: null as ((e: { type: string; data: string }) => void) | null,
          onerror: null,
          closed: false,
          emit(event: { type: string; data: unknown }) {
            source.onmessage?.({ type: event.type, data: JSON.stringify(event.data) });
          },
          close() {
            source.closed = true;
          },
        };
        sources.push(source);
        queueMicrotask(() => {
          source.emit({
            type: "hello",
            data: {
              codex: { busy: false },
              conversation: {
                revision: 1,
                conversationId: "conv-1",
                threadId: "thread-1",
                status: "ready",
                mcpStatuses: {},
              },
            },
          });
        });
        return source;
      };

      const storageMap = new Map<string, string>();
      const storage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => void storageMap.set(k, v),
        removeItem: (k: string) => void storageMap.delete(k),
      };
      storage.setItem("kk-agent-thread:workspace", "thread-1");

      const conn = createAgentConnection({
        storage,
        eventSourceFactory,
        fetcher: (async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.endsWith("/models")) {
            sources[0]?.emit({
              type: "conversation_changed",
              data: { revision: 1, conversationId: "conv-1", threadId: "thread-1", status: "ready", mcpStatuses: {} },
            });
          }
          return new Response(JSON.stringify({ ok: true, protocolVersion: 6, data: [], messages: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }) as typeof fetch,
      });

      return { conn, sources };
    };

    // 1. Genuinely invoke sendMessage with isTemporary: true
    const { conn: tempConn } = makeConnection();
    await tempConn.connect();
    await new Promise((r) => setImmediate(r));

    const tempResult = await tempConn.sendMessage("测试临时消息", { isTemporary: true });
    assert.equal(tempResult.ok, true, "sendMessage with isTemporary: true should succeed");
    assert.equal(ingestCount, 0, "ingestMessage must not be called when isTemporary is true");
    assert.equal(buildCount, 0, "buildInjection must not be called when isTemporary is true");
    tempConn.disconnect();

    // 2. Genuinely verify with sendProjectAgentMessage when project's active chat is temporary
    const { conn: projectConn } = makeConnection();
    await projectConn.connect();
    await new Promise((r) => setImmediate(r));

    const tempProject = {
      id: "proj-temp",
      activeChatId: "chat-temp",
      chats: {
        "chat-temp": createValidChat("chat-temp", "临时会话", true),
      },
      items: [],
      composerDraft: { outputCount: 1 } as unknown,
    };

    const projectResult = await sendProjectAgentMessage(
      projectConn,
      tempProject as unknown as Parameters<typeof sendProjectAgentMessage>[1],
      "项目临时会话测试",
      [],
      undefined,
    );
    assert.equal(projectResult.ok, true);
    assert.equal(ingestCount, 0, "sendProjectAgentMessage must block ingestMessage for temporary chat");
    assert.equal(buildCount, 0, "sendProjectAgentMessage must block buildInjection for temporary chat");
    projectConn.disconnect();

    // 3. Contrast verification: invoke sendMessage with isTemporary: false -> memory is ingested and injected
    const { conn: normalConn } = makeConnection();
    await normalConn.connect();
    await new Promise((r) => setImmediate(r));

    const normalResult = await normalConn.sendMessage("测试常规消息", { isTemporary: false });
    assert.equal(normalResult.ok, true);
    assert.equal(ingestCount, 1, "ingestMessage must be called when isTemporary is false");
    assert.equal(buildCount, 1, "buildInjection must be called when isTemporary is false");
    normalConn.disconnect();
  } finally {
    memoryService.ingestMessage = origIngest;
    memoryService.buildInjection = origBuild;
  }
});

test("R2-ISO-11: persistCreationSnapshotAsync genuinely strips temporary chats before writing to storage", async () => {
  const originalWindow = globalThis.window;
  let interceptedSnapshot: CreationSnapshot | null = null;

  try {
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (cmd: string, args: Record<string, unknown>) => {
          if (cmd === "read_creation_snapshot") {
            return { status: "missing", snapshot: null };
          }
          if (cmd === "write_creation_snapshot") {
            interceptedSnapshot = args.snapshot as CreationSnapshot;
            return { revision: (args.snapshot as CreationSnapshot).revision };
          }
          return null;
        },
      },
      sessionStorage: new MockStorage(),
      localStorage: new MockStorage(),
    } as unknown as Window & typeof globalThis;

    await loadCreationSnapshot();

    const normalChat = createValidChat("chat-norm-async", "持久会话", false);
    const tempChat = createValidChat("chat-temp-async", "临时会话", true);

    const snapshot = createTestSnapshot([
      {
        id: "proj-async-1",
        name: "测试异步持久化项目",
        activeChatId: "chat-temp-async",
        chats: {
          "chat-norm-async": normalChat,
          "chat-temp-async": tempChat,
        },
        items: [],
        tasks: [],
      } as CreationProjectV3,
    ]);

    // Genuinely call persistCreationSnapshotAsync
    await persistCreationSnapshotAsync(snapshot);

    assert.ok(interceptedSnapshot, "Desktop IPC should have received write_creation_snapshot");
    const writtenProject = (interceptedSnapshot as CreationSnapshot).projects[0] as CreationProjectV3;
    assert.equal(writtenProject.chats?.["chat-temp-async"], undefined, "Temporary chat must be stripped from async persistent storage");
    assert.ok(writtenProject.chats?.["chat-norm-async"], "Normal chat must be preserved in async persistent storage");
    assert.equal(writtenProject.activeChatId, "chat-norm-async", "activeChatId must fall back to preserved regular chat");
  } finally {
    globalThis.window = originalWindow;
  }
});
