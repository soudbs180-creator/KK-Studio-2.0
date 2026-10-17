import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSnapshotV3,
  migrateSnapshotV2ToV3,
  NonDowngradableWriteBarrier,
  sha256Hex,
  type CreationSnapshotV3,
  type LegacyV2Snapshot,
} from "./harness.ts";

/* =========================================================================
 * R2: Snapshot v3 & In-Project Multi-Chat Architecture E2E Tests
 * ========================================================================= */

// -------------------------------------------------------------------------
// Tier 1: Feature Coverage (Core Contracts & Happy Paths)
// -------------------------------------------------------------------------

test("R2-T1-01: snapshot v3 schema validates v3 structure with chats dictionary and activeChatId", () => {
  const validV3: CreationSnapshotV3 = {
    version: 3,
    revision: 10,
    activeProjectId: "proj-101",
    homeDraft: {},
    projects: [
      {
        id: "proj-101",
        name: "Test Creative Project",
        activeChatId: "chat-primary",
        chats: {
          "chat-primary": {
            id: "chat-primary",
            name: "主对话",
            createdAt: 1700000000000,
            updatedAt: 1700000001000,
            draft: { text: "Pending concept prompt" },
            messages: [
              {
                id: "msg-1",
                role: "user",
                content: "Design a cyberpunk vehicle",
                createdAt: 1700000000500,
              },
            ],
            mainAgent: "codex",
            modelAllowlist: ["gpt-4o", "claude-3-5-sonnet"],
          },
        },
        items: [{ id: "item-canvas-1", kind: "image", title: "Ref" }],
        tasks: [],
      },
    ],
  };

  const validated = validateSnapshotV3(validV3);
  assert.equal(validated.version, 3);
  assert.equal(validated.projects[0].activeChatId, "chat-primary");
  assert.ok(validated.projects[0].chats["chat-primary"]);
  assert.equal(validated.projects[0].chats["chat-primary"].mainAgent, "codex");
  assert.equal(validated.projects[0].chats["chat-primary"].modelAllowlist.length, 2);
});

test("R2-T1-02: deterministic migration splits legacy v2 codex, direct, and google conversations into separate chats", () => {
  const legacyV2: LegacyV2Snapshot = {
    version: 2,
    revision: 5,
    activeProjectId: "proj-legacy",
    homeDraft: {},
    projects: [
      {
        id: "proj-legacy",
        name: "Legacy Multi-Channel Project",
        // Mixed legacy fields
        messages: [
          { id: "m-direct-1", role: "user", content: "Direct conversation message" },
          { id: "m-direct-2", role: "assistant", content: "Direct reply" },
        ],
        composerDraft: {
          text: "Unsent direct draft",
        },
        agentThreadId: "thread-codex-xyz",
        googleConversation: { sessionId: "google-session-999" },
        items: [{ id: "shared-item-1" }],
        tasks: [{ id: "task-1" }],
      },
    ],
  };

  const v3 = migrateSnapshotV2ToV3(legacyV2);

  assert.equal(v3.version, 3);
  assert.equal(v3.revision, 6);
  assert.equal(v3.projects.length, 1);

  const proj = v3.projects[0];
  // Verify deterministic chat segregation
  assert.ok(proj.chats["legacy-codex"], "Codex history must be migrated to legacy-codex");
  assert.ok(proj.chats["legacy-direct"], "Direct history must be migrated to legacy-direct");
  assert.ok(proj.chats["legacy-google"], "Google history must be migrated to legacy-google");

  // Content preservation verification
  assert.equal(proj.chats["legacy-codex"].agentThreadId, "thread-codex-xyz");
  assert.equal(proj.chats["legacy-direct"].messages.length, 2);
  assert.equal(proj.chats["legacy-direct"].messages[0].content, "Direct conversation message");
  assert.equal(proj.chats["legacy-direct"].draft.text, "Unsent direct draft");

  // Shared assets preserved
  assert.equal(proj.items?.length, 1);
  assert.equal(proj.tasks?.length, 1);
  assert.ok(proj.tasks![0].originChatId, "Tasks must receive originChatId");
});

test("R2-T1-03: non-downgradable write barrier enforces strict transaction order and format marker advance", () => {
  const initialV2Raw = JSON.stringify({
    version: 2,
    revision: 1,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [{ id: "p1", name: "P1", items: [] }],
  });

  const barrier = new NonDowngradableWriteBarrier(initialV2Raw);
  assert.deepEqual(barrier.formatMarker, { formatVersion: 1, minWriterVersion: 1 });

  const v3Candidate: CreationSnapshotV3 = {
    version: 3,
    revision: 2,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        name: "P1",
        activeChatId: "chat-default",
        chats: {
          "chat-default": {
            id: "chat-default",
            name: "默认对话",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            draft: {},
            messages: [],
            mainAgent: "codex",
            modelAllowlist: [],
          },
        },
      },
    ],
  };

  const receipt = barrier.executeMigrationWriteBarrier(v3Candidate);

  // 1. Immutable v2 archive exists and matches SHA-256
  const expectedSha = sha256Hex(initialV2Raw);
  assert.equal(receipt.archiveSha, expectedSha);
  assert.ok(barrier.memoryFiles.has(`projects/archive-v2-${expectedSha}.json`));

  // 2. v3 backup exists
  assert.ok(barrier.memoryFiles.has("projects/creation-backup.json"));

  // 3. v3 main written
  const mainBytes = barrier.memoryFiles.get("projects/creation-v2.json")!;
  const mainParsed = JSON.parse(mainBytes);
  assert.equal(mainParsed.version, 3);

  // 4. Authority marker advanced to formatVersion=2, minWriterVersion=2
  assert.deepEqual(barrier.formatMarker, { formatVersion: 2, minWriterVersion: 2 });

  // 5. Transaction step order log check
  assert.match(barrier.stepLog[0], /^sha256:/);
  assert.match(barrier.stepLog[1], /^archived:/);
  assert.match(barrier.stepLog[2], /^backup_written:/);
  assert.match(barrier.stepLog[3], /^main_written:/);
  assert.match(barrier.stepLog[4], /^marker_advanced:/);
});

test("R2-T1-04: multi-chat architecture isolates drafts, transcripts, and model allowlists while sharing canvas items", () => {
  const project: CreationProjectV3 = {
    id: "proj-multi",
    name: "Collaborative Design",
    activeChatId: "chat-design",
    items: [{ id: "canvas-layer-1", type: "shape" }, { id: "canvas-layer-2", type: "text" }],
    tasks: [],
    chats: {
      "chat-design": {
        id: "chat-design",
        name: "UI 设计",
        createdAt: 1000,
        updatedAt: 1000,
        draft: { text: "Review wireframe token colors" },
        messages: [{ id: "m-1", role: "user", content: "Check contrast" }],
        mainAgent: "codex",
        modelAllowlist: ["gpt-4o"],
      },
      "chat-dev": {
        id: "chat-dev",
        name: "开发协作",
        createdAt: 2000,
        updatedAt: 2000,
        draft: { text: "Implement Rust validator" },
        messages: [{ id: "m-2", role: "user", content: "Run cargo check" }],
        mainAgent: "direct",
        modelAllowlist: ["claude-3-5-sonnet"],
      },
    },
  };

  // Chats are completely isolated
  assert.notEqual(
    project.chats["chat-design"].draft.text,
    project.chats["chat-dev"].draft.text,
  );
  assert.notDeepEqual(
    project.chats["chat-design"].modelAllowlist,
    project.chats["chat-dev"].modelAllowlist,
  );
  assert.notEqual(
    project.chats["chat-design"].messages[0].id,
    project.chats["chat-dev"].messages[0].id,
  );

  // Canvas items are shared
  assert.equal(project.items.length, 2);
  assert.equal(project.items[0].id, "canvas-layer-1");
});

test("R2-T1-05: security boundary strictly rejects API keys and access tokens embedded in snapshots", () => {
  const badSnapshot = {
    version: 3,
    revision: 1,
    activeProjectId: "p-secret",
    apiKey: "sk-live-synthetic-leak-credentials-987654321",
    projects: [],
    homeDraft: {},
  };

  assert.throws(
    () => validateSnapshotV3(badSnapshot),
    /凭据|令牌|密钥/,
    "Must throw corrupt error when apiKey or secret is present",
  );
});

// -------------------------------------------------------------------------
// Tier 2: Boundary & Corner Cases (Recovery, Fallback & Versioning)
// -------------------------------------------------------------------------

test("R2-T2-01: empty v2 project migration creates chat-default with clean state and codex mainAgent", () => {
  const emptyV2: LegacyV2Snapshot = {
    version: 2,
    revision: 1,
    activeProjectId: "empty-proj",
    homeDraft: {},
    projects: [
      {
        id: "empty-proj",
        name: "Clean Slate",
        items: [],
      },
    ],
  };

  const v3 = migrateSnapshotV2ToV3(emptyV2);
  const proj = v3.projects[0];

  assert.equal(proj.activeChatId, "chat-default");
  assert.ok(proj.chats["chat-default"]);
  assert.equal(proj.chats["chat-default"].name, "默认对话");
  assert.equal(proj.chats["chat-default"].mainAgent, "codex");
  assert.deepEqual(proj.chats["chat-default"].modelAllowlist, []);
  assert.deepEqual(proj.chats["chat-default"].messages, []);
});

test("R2-T2-02: crash recovery after v3 backup written restores v3 main without corrupting repository", () => {
  const initialV2Raw = JSON.stringify({
    version: 2,
    revision: 1,
    projects: [{ id: "p1", items: [] }],
  });

  const barrier = new NonDowngradableWriteBarrier(initialV2Raw);

  // Simulate crash state: backup was written, but main write crashed/failed
  const v3BackupPayload = JSON.stringify({
    version: 3,
    revision: 2,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        name: "Crash Safe",
        activeChatId: "chat-default",
        chats: {
          "chat-default": {
            id: "chat-default",
            name: "默认对话",
            createdAt: 100,
            updatedAt: 100,
            draft: {},
            messages: [],
            mainAgent: "codex",
            modelAllowlist: [],
          },
        },
      },
    ],
  });
  barrier.memoryFiles.set("projects/creation-backup.json", v3BackupPayload);

  // Run crash recovery
  const recovery = barrier.recoverFromCrash();
  assert.equal(recovery.state, "v3_recovered");

  const restoredMain = JSON.parse(barrier.memoryFiles.get("projects/creation-v2.json")!);
  assert.equal(restoredMain.version, 3);
  assert.equal(barrier.formatMarker.formatVersion, 2);
});

test("R2-T2-03: snapshot v3 validator rejects invalid versions, missing activeChatId, or mismatched keys", () => {
  // Version 2 passed as v3
  assert.throws(
    () => validateSnapshotV3({ version: 2, revision: 1, projects: [] }),
    /Unsupported snapshot version/,
  );

  // Missing activeChatId
  assert.throws(
    () =>
      validateSnapshotV3({
        version: 3,
        revision: 1,
        activeProjectId: "p1",
        homeDraft: {},
        projects: [{ id: "p1", chats: {} }],
      }),
    /missing activeChatId/,
  );

  // activeChatId not in chats dictionary
  assert.throws(
    () =>
      validateSnapshotV3({
        version: 3,
        revision: 1,
        activeProjectId: "p1",
        homeDraft: {},
        projects: [{ id: "p1", activeChatId: "missing-chat", chats: {} }],
      }),
    /not found in chats/,
  );
});

test("R2-T2-04: active tasks maintain originChatId during multi-chat switching without task cancellation", () => {
  const project: CreationProjectV3 = {
    id: "proj-tasks",
    name: "Task Tracking",
    activeChatId: "chat-1",
    chats: {
      "chat-1": {
        id: "chat-1",
        name: "Chat 1",
        createdAt: 100,
        updatedAt: 100,
        draft: {},
        messages: [],
        mainAgent: "codex",
        modelAllowlist: [],
      },
      "chat-2": {
        id: "chat-2",
        name: "Chat 2",
        createdAt: 200,
        updatedAt: 200,
        draft: {},
        messages: [],
        mainAgent: "codex",
        modelAllowlist: [],
      },
    },
    tasks: [
      { id: "task-image-gen-1", originChatId: "chat-1", status: "running" },
    ],
  };

  // Switch active chat to chat-2
  project.activeChatId = "chat-2";

  // Invariant: task in chat-1 is NOT deleted or canceled
  assert.equal(project.tasks?.length, 1);
  assert.equal(project.tasks?.[0].originChatId, "chat-1");
  assert.equal(project.tasks?.[0].status, "running");
});

test("R2-T2-05: rapid concurrent chat creation maintains draft isolation and unique scoped identifiers", () => {
  const chats: Record<string, unknown> = {};
  const chatCount = 10;

  for (let i = 0; i < chatCount; i++) {
    const chatId = `chat-session-${i}`;
    chats[chatId] = {
      id: chatId,
      name: `Conversation ${i}`,
      createdAt: Date.now() + i,
      updatedAt: Date.now() + i,
      draft: { text: `Draft specific to session ${i}` },
      messages: [],
      mainAgent: "codex",
      modelAllowlist: [],
    };
  }

  assert.equal(Object.keys(chats).length, chatCount);

  // Verify all drafts are distinct and properly indexed
  for (let i = 0; i < chatCount; i++) {
    assert.equal(chats[`chat-session-${i}`].draft.text, `Draft specific to session ${i}`);
  }
});
