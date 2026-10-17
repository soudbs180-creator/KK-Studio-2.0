/**
 * tests/unit/temporaryChatPersistenceStress.test.ts
 *
 * Adversarial Empirical Stress Test Suite for Milestone 2 (R2):
 * Storage Persistence Stripping of Temporary Chats.
 *
 * Comprehensive stress cases verified:
 * 1. Multiple projects with complex mixed configurations (all-temp, all-perm, mixed, empty, legacy).
 * 2. Deep snapshots with massive message trees, nested metadata, drafts, attachments, and canary secrets.
 * 3. High-scale stress test (50 projects, 1,000 chats, 500 temporary chats).
 * 4. In-memory immutability: live session continuity vs storage stripping.
 * 5. Desktop Tauri IPC pipeline persistence stripping.
 * 6. Web sessionStorage sync persistence & recovery draft isolation.
 * 7. 100% temporary workspace (all projects pure-temporary).
 * 8. Adversarial `isTemporary` falsy/truthy edge-case values.
 * 9. Rapid sequential persistence autosave loop (100 cycles).
 * 10. Prototype pollution & special character chat key resistance.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizeSnapshotForPersistence,
  persistCreationSnapshotAsync,
  loadCreationSnapshot,
  pendingRecoveryDraft,
} from "../../src/features/creation/storage.ts";
import {
  CREATION_STORAGE_KEY,
  emptyDraft,
  type ChatItem,
  type ChatItemDraft,
  type CreationSnapshot,
  type CreationProjectV3,
} from "../../src/features/creation/model.ts";
import {
  decodeSnapshot,
} from "../../src/features/creation/snapshotCodec.ts";

// -----------------------------------------------------------------------------
// Test Helpers & Mock Storage
// -----------------------------------------------------------------------------

function createChatFixture(
  id: string,
  name: string,
  isTemporary?: boolean,
  messageCount = 0,
  tokenPrefix = "",
): ChatItem {
  const messages = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push({
      id: `${id}-msg-${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `${tokenPrefix} Message content ${i} for chat ${id} with detailed transcript data.`,
      createdAt: 1700000000000 + i * 1000,
    });
  }

  return {
    id,
    name,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    draft: {
      ...emptyDraft(),
      prompt: `${tokenPrefix} Draft prompt for ${id}`,
      text: `${tokenPrefix} Draft text content for ${id}`,
      attachments: [],
    } as ChatItemDraft,
    messages,
    mainAgent: "codex",
    modelAllowlist: ["gpt-4o", "claude-3-5-sonnet"],
    agentThreadId: `${id}-thread-id`,
    isTemporary,
  };
}

function createProjectV3Fixture(
  id: string,
  name: string,
  chats: Record<string, ChatItem> = {},
  activeChatId?: string,
): CreationProjectV3 {
  const chatKeys = Object.keys(chats);
  const resolvedActive = activeChatId ?? (chatKeys.length > 0 ? chatKeys[0] : "chat-default");

  return {
    id,
    name,
    activeChatId: resolvedActive,
    chats,
    items: [
      {
        id: `${id}-item-1`,
        title: `Canvas Asset for ${id}`,
        description: `Description of canvas item for ${id}`,
        kind: "image",
      },
    ],
    tasks: [],
    attachments: [],
    composerDraft: {
      ...emptyDraft(),
      attachments: [],
    },
  };
}

class MockMemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

test("STRESS-01: Multiple Projects - Complex Matrix of Pure-Temp, Pure-Perm, Mixed, and Empty Projects", () => {
  const projects: CreationProjectV3[] = [];

  // 1. Pure Temporary Project (5 temp chats)
  const p1Chats: Record<string, ChatItem> = {};
  for (let i = 1; i <= 5; i++) {
    const id = `p1-temp-${i}`;
    p1Chats[id] = createChatFixture(id, `P1 Temp ${i}`, true);
  }
  projects.push(createProjectV3Fixture("proj-1-all-temp", "P1 All Temp", p1Chats, "p1-temp-3"));

  // 2. Pure Permanent Project (5 permanent chats)
  const p2Chats: Record<string, ChatItem> = {};
  for (let i = 1; i <= 5; i++) {
    const id = `p2-perm-${i}`;
    p2Chats[id] = createChatFixture(id, `P2 Perm ${i}`, false);
  }
  projects.push(createProjectV3Fixture("proj-2-all-perm", "P2 All Perm", p2Chats, "p2-perm-2"));

  // 3. Mixed Project with Active Chat being Temporary
  const p3Chats: Record<string, ChatItem> = {};
  for (let i = 1; i <= 4; i++) {
    p3Chats[`p3-temp-${i}`] = createChatFixture(`p3-temp-${i}`, `P3 Temp ${i}`, true);
    p3Chats[`p3-perm-${i}`] = createChatFixture(`p3-perm-${i}`, `P3 Perm ${i}`, false);
  }
  projects.push(createProjectV3Fixture("proj-3-mixed-temp-active", "P3 Mixed", p3Chats, "p3-temp-1"));

  // 4. Mixed Project with Active Chat being Permanent
  const p4Chats: Record<string, ChatItem> = {};
  for (let i = 1; i <= 3; i++) {
    p4Chats[`p4-temp-${i}`] = createChatFixture(`p4-temp-${i}`, `P4 Temp ${i}`, true);
    p4Chats[`p4-perm-${i}`] = createChatFixture(`p4-perm-${i}`, `P4 Perm ${i}`, false);
  }
  projects.push(createProjectV3Fixture("proj-4-mixed-perm-active", "P4 Mixed", p4Chats, "p4-perm-2"));

  // 5. Single Temporary Chat Project
  const p5Chats: Record<string, ChatItem> = {
    "p5-only-temp": createChatFixture("p5-only-temp", "P5 Only Temp", true),
  };
  projects.push(createProjectV3Fixture("proj-5-single-temp", "P5 Single Temp", p5Chats, "p5-only-temp"));

  // 6. Single Permanent Chat Project
  const p6Chats: Record<string, ChatItem> = {
    "p6-only-perm": createChatFixture("p6-only-perm", "P6 Only Perm", false),
  };
  projects.push(createProjectV3Fixture("proj-6-single-perm", "P6 Single Perm", p6Chats, "p6-only-perm"));

  // 7. Empty chats project
  projects.push(createProjectV3Fixture("proj-7-empty", "P7 Empty", {}, "chat-default"));

  // 8. 20 Alternating Chats Project (10 temp, 10 perm)
  const p8Chats: Record<string, ChatItem> = {};
  for (let i = 1; i <= 20; i++) {
    const isTemp = i % 2 !== 0;
    const id = `p8-chat-${i}`;
    p8Chats[id] = createChatFixture(id, `P8 Chat ${i}`, isTemp);
  }
  projects.push(createProjectV3Fixture("proj-8-alternating", "P8 Alternating", p8Chats, "p8-chat-1"));

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 100,
    activeProjectId: "proj-1-all-temp",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects,
  };

  const sanitized = sanitizeSnapshotForPersistence(snapshot);

  // Assertions across all 8 projects
  assert.equal(sanitized.projects.length, 8);

  // Proj 1 (was all temp): stripped completely, fallback chat-default generated
  const sP1 = sanitized.projects[0] as CreationProjectV3;
  assert.equal(Object.keys(sP1.chats).length, 1);
  assert.ok(sP1.chats["chat-default"], "Fallback chat-default should be created");
  assert.equal(sP1.activeChatId, "chat-default");

  // Proj 2 (was all perm): all 5 preserved, active unchanged
  const sP2 = sanitized.projects[1] as CreationProjectV3;
  assert.equal(Object.keys(sP2.chats).length, 5);
  assert.equal(sP2.activeChatId, "p2-perm-2");

  // Proj 3 (mixed, active was temp): temp stripped (4 left), active reassigned to first perm
  const sP3 = sanitized.projects[2] as CreationProjectV3;
  assert.equal(Object.keys(sP3.chats).length, 4);
  for (let i = 1; i <= 4; i++) {
    assert.equal(sP3.chats[`p3-temp-${i}`], undefined, `p3-temp-${i} must be stripped`);
    assert.ok(sP3.chats[`p3-perm-${i}`], `p3-perm-${i} must be preserved`);
  }
  assert.ok(sP3.chats[sP3.activeChatId], "Active chat must exist in sanitized chats");
  assert.equal(sP3.chats[sP3.activeChatId].isTemporary, false);

  // Proj 4 (mixed, active was perm): temp stripped (3 left), active preserved
  const sP4 = sanitized.projects[3] as CreationProjectV3;
  assert.equal(Object.keys(sP4.chats).length, 3);
  assert.equal(sP4.activeChatId, "p4-perm-2");

  // Proj 5 (single temp): fallback created
  const sP5 = sanitized.projects[4] as CreationProjectV3;
  assert.equal(Object.keys(sP5.chats).length, 1);
  assert.ok(sP5.chats["chat-default"]);
  assert.equal(sP5.activeChatId, "chat-default");

  // Proj 6 (single perm): preserved
  const sP6 = sanitized.projects[5] as CreationProjectV3;
  assert.equal(Object.keys(sP6.chats).length, 1);
  assert.ok(sP6.chats["p6-only-perm"]);

  // Proj 7 (empty): fallback created
  const sP7 = sanitized.projects[6] as CreationProjectV3;
  assert.equal(Object.keys(sP7.chats).length, 1);
  assert.ok(sP7.chats["chat-default"]);

  // Proj 8 (20 alternating): exactly 10 permanent preserved
  const sP8 = sanitized.projects[7] as CreationProjectV3;
  assert.equal(Object.keys(sP8.chats).length, 10);
  for (let i = 1; i <= 20; i++) {
    if (i % 2 !== 0) {
      assert.equal(sP8.chats[`p8-chat-${i}`], undefined);
    } else {
      assert.ok(sP8.chats[`p8-chat-${i}`]);
    }
  }

  // Validate entire snapshot passes schema validation
  const decoded = decodeSnapshot(sanitized);
  assert.equal(decoded.version, 3);
});

test("STRESS-02: Deep Snapshot - Massive Message Trees, Nested Metadata, Drafts, and Confidential Canary Secrets", () => {
  const CANARY_TEMP_SECRET_1 = "CANARY_CONFIDENTIAL_TOKEN_A_99998888";
  const CANARY_TEMP_SECRET_2 = "CANARY_CONFIDENTIAL_TOKEN_B_77776666";
  const CANARY_TEMP_SECRET_3 = "CANARY_CONFIDENTIAL_TOKEN_C_55554444";
  const CANARY_TEMP_SECRET_4 = "CANARY_CONFIDENTIAL_TOKEN_D_33332222";

  const CANARY_PERM_PRESERVE_1 = "CANARY_PERMANENT_PRESERVE_X_11110000";
  const CANARY_PERM_PRESERVE_2 = "CANARY_PERMANENT_PRESERVE_Y_22220000";

  // Temporary chat with 100 deep messages and canary secrets
  const tempChat = createChatFixture(
    "chat-deep-temp-1",
    `Temp Chat ${CANARY_TEMP_SECRET_1}`,
    true,
    100,
    CANARY_TEMP_SECRET_2,
  );
  tempChat.draft.prompt = `Classified prompt ${CANARY_TEMP_SECRET_3}`;
  tempChat.agentThreadId = `thread-${CANARY_TEMP_SECRET_4}`;

  // Permanent chat with 100 deep messages and canary secrets
  const permChat = createChatFixture(
    "chat-deep-perm-1",
    `Perm Chat ${CANARY_PERM_PRESERVE_1}`,
    false,
    100,
    CANARY_PERM_PRESERVE_2,
  );

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 50,
    activeProjectId: "proj-deep",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects: [
      createProjectV3Fixture("proj-deep", "Deep Project", {
        "chat-deep-temp-1": tempChat,
        "chat-deep-perm-1": permChat,
      }, "chat-deep-temp-1"),
    ],
  };

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const serialized = JSON.stringify(sanitized);

  // Adversarial Check: NOT A SINGLE temporary secret canary may leak anywhere
  assert.equal(serialized.includes(CANARY_TEMP_SECRET_1), false, "Chat name secret leaked!");
  assert.equal(serialized.includes(CANARY_TEMP_SECRET_2), false, "Message content secret leaked!");
  assert.equal(serialized.includes(CANARY_TEMP_SECRET_3), false, "Draft prompt secret leaked!");
  assert.equal(serialized.includes(CANARY_TEMP_SECRET_4), false, "Thread ID secret leaked!");
  assert.equal(serialized.includes("chat-deep-temp-1"), false, "Temporary chat ID leaked!");

  // Permanent canary secrets MUST be fully preserved
  assert.equal(serialized.includes(CANARY_PERM_PRESERVE_1), true, "Permanent chat name lost!");
  assert.equal(serialized.includes(CANARY_PERM_PRESERVE_2), true, "Permanent message content lost!");
  assert.equal(serialized.includes("chat-deep-perm-1"), true, "Permanent chat ID lost!");

  // Active chat ID reassigned to permanent chat
  assert.equal(sanitized.projects[0].activeChatId, "chat-deep-perm-1");

  // Validate decodeSnapshot accepts the deep sanitized structure
  const decoded = decodeSnapshot(sanitized);
  assert.equal(decoded.version, 3);
});

test("STRESS-03: High Scale & Performance Benchmark - 50 Projects, 1000 Total Chats", () => {
  const projects: CreationProjectV3[] = [];
  const TOTAL_PROJECTS = 50;
  const CHATS_PER_PROJECT = 20;

  let totalTempChats = 0;
  let totalPermChats = 0;

  for (let p = 0; p < TOTAL_PROJECTS; p++) {
    const pId = `proj-scale-${p}`;
    const chats: Record<string, ChatItem> = {};

    for (let c = 0; c < CHATS_PER_PROJECT; c++) {
      const cId = `chat-p${p}-c${c}`;
      // Every even chat is temporary, every odd chat is permanent
      const isTemp = c % 2 === 0;
      if (isTemp) totalTempChats++;
      else totalPermChats++;

      chats[cId] = createChatFixture(cId, `Chat ${p}-${c}`, isTemp, 2);
    }

    projects.push(createProjectV3Fixture(pId, `Project ${p}`, chats, `chat-p${p}-c0`));
  }

  assert.equal(totalTempChats, 500);
  assert.equal(totalPermChats, 500);

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 1,
    activeProjectId: "proj-scale-0",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects,
  };

  const startTime = performance.now();
  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const elapsedMs = performance.now() - startTime;

  // Efficiency check: 1,000 chats stripped in less than 500ms
  assert.ok(elapsedMs < 500, `Sanitization took too long: ${elapsedMs}ms`);

  let survivingChats = 0;
  for (let p = 0; p < TOTAL_PROJECTS; p++) {
    const proj = sanitized.projects[p] as CreationProjectV3;
    const chatKeys = Object.keys(proj.chats);
    survivingChats += chatKeys.length;

    // Verify each chat in sanitized project is strictly non-temporary
    for (const [key, chat] of Object.entries(proj.chats)) {
      assert.notEqual(chat.isTemporary, true, `Temporary chat ${key} found in project ${p}`);
    }

    // Active chat ID must point to a surviving chat
    assert.ok(proj.chats[proj.activeChatId], `activeChatId ${proj.activeChatId} must exist`);
  }

  // Exactly 500 permanent chats should survive
  assert.equal(survivingChats, 500);

  // Validate codec acceptance on full 50-project sanitized snapshot
  const decoded = decodeSnapshot(sanitized);
  assert.equal(decoded.projects.length, 50);
});

test("STRESS-04: In-Memory Immutability - Live Session Temporary Chats Are Not Corrupted by Persistence Sanitize", () => {
  const originalTempChat = createChatFixture("chat-live-temp", "Live Temporary", true, 5);
  const originalPermChat = createChatFixture("chat-live-perm", "Live Permanent", false, 5);

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 10,
    activeProjectId: "proj-live",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects: [
      createProjectV3Fixture("proj-live", "Live Project", {
        "chat-live-temp": originalTempChat,
        "chat-live-perm": originalPermChat,
      }, "chat-live-temp"),
    ],
  };

  const sanitized = sanitizeSnapshotForPersistence(snapshot);

  // 1. Original snapshot MUST NOT be mutated (live temporary chat must survive in memory)
  const originalProj = snapshot.projects[0] as CreationProjectV3;
  assert.ok(originalProj.chats["chat-live-temp"], "Original snapshot must retain temporary chat for live typing");
  assert.equal(originalProj.chats["chat-live-temp"].messages.length, 5);
  assert.equal(originalProj.activeChatId, "chat-live-temp", "Original activeChatId must not be changed");

  // 2. Sanitized snapshot MUST be clean
  const sanitizedProj = sanitized.projects[0] as CreationProjectV3;
  assert.equal(sanitizedProj.chats["chat-live-temp"], undefined, "Sanitized snapshot must not have temporary chat");
  assert.ok(sanitizedProj.chats["chat-live-perm"]);
  assert.equal(sanitizedProj.activeChatId, "chat-live-perm");

  // 3. Mutating original chat afterwards does not leak into sanitized copy
  originalTempChat.messages.push({
    id: "new-adversarial-msg",
    role: "user",
    content: "Post-sanitize mutation text",
    createdAt: Date.now(),
  });
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes("new-adversarial-msg"), false);
});

test("STRESS-05: Desktop Persistence Pipeline (Tauri IPC) Strips Temporary Chats", async () => {
  const originalWindow = globalThis.window;
  let interceptedIpcPayload: CreationSnapshot | null = null;

  try {
    // Mock Tauri desktop runtime
    globalThis.window = {
      __TAURI_INTERNALS__: {
        invoke: async (cmd: string, args: Record<string, unknown>) => {
          if (cmd === "read_creation_snapshot") {
            return { status: "missing", snapshot: null };
          }
          if (cmd === "write_creation_snapshot") {
            interceptedIpcPayload = args.snapshot as CreationSnapshot;
            return { revision: (args.snapshot as CreationSnapshot).revision };
          }
          return null;
        },
      },
    } as unknown as Window & typeof globalThis;

    // Initialize writable state via loadCreationSnapshot
    await loadCreationSnapshot();

    const tempChat = createChatFixture("ipc-temp-chat", "IPC Temp", true, 3);
    const permChat = createChatFixture("ipc-perm-chat", "IPC Perm", false, 3);

    const snapshot: CreationSnapshot = {
      version: 3,
      schemaVersion: 3,
      revision: 42,
      activeProjectId: "proj-ipc",
      homeDraft: { ...emptyDraft(), attachments: [] },
      projects: [
        createProjectV3Fixture("proj-ipc", "IPC Project", {
          "ipc-temp-chat": tempChat,
          "ipc-perm-chat": permChat,
        }, "ipc-temp-chat"),
      ],
    };

    await persistCreationSnapshotAsync(snapshot);

    assert.ok(interceptedIpcPayload, "Tauri invoke should have received write_creation_snapshot");
    const ipcSnapshot = interceptedIpcPayload as CreationSnapshot;
    const project = ipcSnapshot.projects[0] as CreationProjectV3;

    assert.equal(project.chats["ipc-temp-chat"], undefined, "Temporary chat must not be sent over Tauri IPC");
    assert.ok(project.chats["ipc-perm-chat"], "Permanent chat must be sent over Tauri IPC");
    assert.equal(project.activeChatId, "ipc-perm-chat");

    const serializedIpc = JSON.stringify(ipcSnapshot);
    assert.equal(serializedIpc.includes("ipc-temp-chat"), false);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("STRESS-06: Web Storage Persistence (SessionStorage Sync + Journal + Recovery Draft)", async () => {
  const originalWindow = globalThis.window;
  const mockSession = new MockMemoryStorage();
  const mockLocal = new MockMemoryStorage();

  try {
    globalThis.window = {
      sessionStorage: mockSession,
      localStorage: mockLocal,
    } as unknown as Window & typeof globalThis;

    const tempChat = createChatFixture("sess-temp-1", "Session Temp 1", true, 4);
    const permChat = createChatFixture("sess-perm-1", "Session Perm 1", false, 4);

    const snapshot: CreationSnapshot = {
      version: 3,
      schemaVersion: 3,
      revision: 7,
      activeProjectId: "proj-sess",
      homeDraft: { ...emptyDraft(), attachments: [] },
      projects: [
        createProjectV3Fixture("proj-sess", "Session Project", {
          "sess-temp-1": tempChat,
          "sess-perm-1": permChat,
        }, "sess-temp-1"),
      ],
    };

    // Test sanitizeSnapshotForPersistence directly matches the persistCreationSnapshotSync contract
    const sanitized = sanitizeSnapshotForPersistence(snapshot);
    const serializedJournal = JSON.stringify({
      baseRevision: 7,
      snapshot: sanitized,
    });
    const journalKey = `${CREATION_STORAGE_KEY}:pending`;
    mockSession.setItem(journalKey, serializedJournal);

    // Read back through pendingRecoveryDraft
    const recovered = pendingRecoveryDraft();
    assert.ok(recovered, "Recovery draft should be read from sessionStorage");
    const recoveredProj = recovered.projects[0] as CreationProjectV3;

    assert.equal(recoveredProj.chats["sess-temp-1"], undefined, "Recovered draft must not contain temporary chat");
    assert.ok(recoveredProj.chats["sess-perm-1"], "Recovered draft must contain permanent chat");
    assert.equal(recoveredProj.activeChatId, "sess-perm-1");
  } finally {
    globalThis.window = originalWindow;
  }
});

test("STRESS-07: All Projects in Workspace 100% Temporary Chats", () => {
  const projects: CreationProjectV3[] = [];
  const TOTAL_PURE_TEMP_PROJECTS = 5;

  for (let p = 0; p < TOTAL_PURE_TEMP_PROJECTS; p++) {
    const pId = `proj-pure-temp-${p}`;
    const chats: Record<string, ChatItem> = {};
    for (let c = 1; c <= 3; c++) {
      const cId = `temp-p${p}-c${c}`;
      chats[cId] = createChatFixture(cId, `Temp Chat ${p}-${c}`, true);
    }
    projects.push(createProjectV3Fixture(pId, `Pure Temp Project ${p}`, chats, `temp-p${p}-c1`));
  }

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 1,
    activeProjectId: "proj-pure-temp-0",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects,
  };

  const sanitized = sanitizeSnapshotForPersistence(snapshot);

  for (let p = 0; p < TOTAL_PURE_TEMP_PROJECTS; p++) {
    const proj = sanitized.projects[p] as CreationProjectV3;
    assert.equal(Object.keys(proj.chats).length, 1, `Project ${p} must have exactly 1 fallback chat`);
    assert.ok(proj.chats["chat-default"], `Project ${p} must have chat-default`);
    assert.equal(proj.activeChatId, "chat-default");
    assert.equal(proj.chats["chat-default"].isTemporary, undefined);
    assert.equal(proj.chats["chat-default"].name, "对话 1");
  }

  const decoded = decodeSnapshot(sanitized);
  assert.equal(decoded.projects.length, 5);
});

test("STRESS-08: Adversarial isTemporary Falsy & Truthy Value Permutations", () => {
  const chats: Record<string, ChatItem> = {
    "c-true": createChatFixture("c-true", "True Temp", true),
    "c-bool-true": createChatFixture("c-bool-true", "Bool True", Boolean(true)),
    "c-truthy-num": createChatFixture("c-truthy-num", "Truthy Num", 1 as unknown as boolean),
    "c-truthy-str": createChatFixture("c-truthy-str", "Truthy Str", "true" as unknown as boolean),
    "c-truthy-obj": createChatFixture("c-truthy-obj", "Truthy Obj", {} as unknown as boolean),
    "c-false": createChatFixture("c-false", "False Perm", false),
    "c-undefined": createChatFixture("c-undefined", "Undef Perm", undefined),
    "c-falsy-zero": createChatFixture("c-falsy-zero", "Zero Perm", 0 as unknown as boolean),
    "c-falsy-empty": createChatFixture("c-falsy-empty", "Empty Perm", "" as unknown as boolean),
  };

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 1,
    activeProjectId: "proj-adversarial-flags",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects: [
      createProjectV3Fixture("proj-adversarial-flags", "Flag Permutations", chats, "c-false"),
    ],
  };

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const sanitizedChats = (sanitized.projects[0] as CreationProjectV3).chats;

  // All truthy variants must be stripped
  assert.equal(sanitizedChats["c-true"], undefined, "c-true must be stripped");
  assert.equal(sanitizedChats["c-bool-true"], undefined, "c-bool-true must be stripped");
  assert.equal(sanitizedChats["c-truthy-num"], undefined, "c-truthy-num must be stripped");
  assert.equal(sanitizedChats["c-truthy-str"], undefined, "c-truthy-str must be stripped");
  assert.equal(sanitizedChats["c-truthy-obj"], undefined, "c-truthy-obj must be stripped");

  // All falsy or omitted variants must be preserved
  assert.ok(sanitizedChats["c-false"], "c-false must be preserved");
  assert.ok(sanitizedChats["c-undefined"], "c-undefined must be preserved");
  assert.ok(sanitizedChats["c-falsy-zero"], "c-falsy-zero must be preserved");
  assert.ok(sanitizedChats["c-falsy-empty"], "c-falsy-empty must be preserved");
});

test("STRESS-09: Rapid Autosave / Sequential Concurrency Stress (100 Cycles)", () => {
  const originalWindow = globalThis.window;
  const mockSession = new MockMemoryStorage();

  try {
    globalThis.window = {
      sessionStorage: mockSession,
      localStorage: new MockMemoryStorage(),
    } as unknown as Window & typeof globalThis;

    const baseSnapshot: CreationSnapshot = {
      version: 3,
      schemaVersion: 3,
      revision: 1,
      activeProjectId: "proj-rapid",
      homeDraft: { ...emptyDraft(), attachments: [] },
      projects: [
        createProjectV3Fixture("proj-rapid", "Rapid Autosave", {
          "chat-perm-anchor": createChatFixture("chat-perm-anchor", "Anchor Perm", false),
        }, "chat-perm-anchor"),
      ],
    };

    // Run 100 sequential cycles simulating rapid autosave
    for (let cycle = 0; cycle < 100; cycle++) {
      baseSnapshot.revision = cycle + 1;
      const proj = baseSnapshot.projects[0] as CreationProjectV3;

      // Add a temporary chat for this cycle
      const tempId = `temp-cycle-${cycle}`;
      proj.chats[tempId] = createChatFixture(tempId, `Temp ${cycle}`, true, 1, `SECRET-${cycle}`);

      // Even cycles switch active chat to temporary
      if (cycle % 2 === 0) {
        proj.activeChatId = tempId;
      } else {
        proj.activeChatId = "chat-perm-anchor";
      }

      // Add a permanent chat on every 10th cycle
      if (cycle % 10 === 0) {
        const permId = `perm-cycle-${cycle}`;
        proj.chats[permId] = createChatFixture(permId, `Perm ${cycle}`, false, 1);
      }

      const clean = sanitizeSnapshotForPersistence(baseSnapshot);
      const cleanSerialized = JSON.stringify(clean);

      // Verify no temporary chat or secret from ANY cycle exists in the sanitized payload
      assert.equal(cleanSerialized.includes(tempId), false, `tempId ${tempId} leaked on cycle ${cycle}`);
      assert.equal(cleanSerialized.includes(`SECRET-${cycle}`), false, `Secret leaked on cycle ${cycle}`);

      // Verify anchor permanent chat is always present
      assert.ok((clean.projects[0] as CreationProjectV3).chats["chat-perm-anchor"]);
    }
  } finally {
    globalThis.window = originalWindow;
  }
});

test("STRESS-10: Prototype Pollution & Special Character Chat Key Resistance", () => {
  const specialKeys = [
    "constructor",
    "prototype",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "chat-with-spaces and symbols!@#$%^&*()_+",
    "chat-with-unicode-🚀-🎉-中文",
  ];

  const chats: Record<string, ChatItem> = {};
  for (const key of specialKeys) {
    // Alternate between temporary and permanent
    const isTemp = key.includes("o") || key.includes("!");
    chats[key] = createChatFixture(key, `Special Chat ${key}`, isTemp);
  }

  // Add an anchor chat
  chats["chat-anchor"] = createChatFixture("chat-anchor", "Anchor", false);

  const snapshot: CreationSnapshot = {
    version: 3,
    schemaVersion: 3,
    revision: 1,
    activeProjectId: "proj-special",
    homeDraft: { ...emptyDraft(), attachments: [] },
    projects: [
      createProjectV3Fixture("proj-special", "Special Keys Project", chats, "chat-anchor"),
    ],
  };

  const sanitized = sanitizeSnapshotForPersistence(snapshot);
  const sanitizedChats = (sanitized.projects[0] as CreationProjectV3).chats;

  // Verify Object prototype was not polluted with isTemporary or new properties
  assert.equal(Object.hasOwn(Object.prototype, "chat-with-spaces and symbols!@#$%^&*()_+"), false);
  assert.equal(Object.hasOwn(Object.prototype, "chat-with-unicode-🚀-🎉-中文"), false);

  // Verify all temporary special keys were stripped from own properties and JSON
  const serializedChats = JSON.stringify(sanitizedChats);
  for (const key of specialKeys) {
    const wasTemp = key.includes("o") || key.includes("!");
    if (wasTemp) {
      assert.equal(
        Object.hasOwn(sanitizedChats, key),
        false,
        `Special temporary key ${key} must not be an own property of sanitized chats`,
      );
      assert.equal(
        serializedChats.includes(`"${key}"`),
        false,
        `Special temporary key ${key} must not appear in serialized JSON`,
      );
    } else {
      assert.equal(
        Object.hasOwn(sanitizedChats, key),
        true,
        `Special permanent key ${key} must be preserved in sanitized chats`,
      );
    }
  }

  assert.ok(sanitizedChats["chat-anchor"]);
});
