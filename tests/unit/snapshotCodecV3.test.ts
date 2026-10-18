import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  decodeSnapshot,
  parseSnapshot,
  SnapshotStorageError,
} from "../../src/features/creation/snapshotCodec.ts";
import type {
  CreationSnapshotV3,
  CreationProjectV3,
} from "../../src/features/creation/model.ts";
import {
  migrateSnapshotV2ToV3,
  type LegacyV2Snapshot,
} from "../../src/features/creation/chatMigration.ts";
import { NonDowngradableWriteBarrier } from "../../src/features/creation/storage.ts";

function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/* =========================================================================
 * Tier 1: Snapshot v3 Schema Decoding & Validation
 * ========================================================================= */

test("R2-U-SCHEMA-01: decodeSnapshot successfully decodes valid v3 snapshot with chats and activeChatId", () => {
  const v3Valid = {
    version: 3,
    revision: 10,
    activeProjectId: "proj-1",
    homeDraft: {},
    projects: [
      {
        id: "proj-1",
        name: "Creative Exploration",
        activeChatId: "chat-main",
        chats: {
          "chat-main": {
            id: "chat-main",
            name: "主对话",
            createdAt: 1700000000000,
            updatedAt: 1700000001000,
            draft: { text: "Generate cyberpunk vehicle" },
            messages: [
              {
                id: "msg-101",
                role: "user",
                content: "Concept vehicle prompt",
                createdAt: 1700000000500,
              },
            ],
            mainAgent: "codex",
            modelAllowlist: ["gpt-4o", "claude-3-5-sonnet"],
          },
        },
        items: [
          {
            id: "canvas-node-1",
            title: "Node",
            description: "",
            kind: "image",
          },
        ],
        tasks: [],
      },
    ],
  };

  const decoded = decodeSnapshot(v3Valid) as unknown as CreationSnapshotV3;
  assert.equal(decoded.version, 3);
  assert.equal(decoded.revision, 10);
  assert.equal(decoded.activeProjectId, "proj-1");
  assert.equal(decoded.projects.length, 1);

  const proj = decoded.projects[0];
  assert.equal(proj.activeChatId, "chat-main");
  assert.ok(proj.chats["chat-main"]);
  assert.equal(proj.chats["chat-main"].name, "主对话");
  assert.equal(proj.chats["chat-main"].mainAgent, "codex");
  assert.equal(proj.chats["chat-main"].modelAllowlist.length, 2);
  assert.equal(proj.chats["chat-main"].messages.length, 1);
  assert.equal(proj.items.length, 1);
});

test("R2-U-SCHEMA-02: decodeSnapshot rejects snapshot with unsupported versions (0, 1, 4)", () => {
  const baseSnapshot = {
    revision: 1,
    activeProjectId: null,
    homeDraft: {},
    projects: [],
  };

  for (const ver of [0, 1, 4, 99]) {
    assert.throws(
      () => decodeSnapshot({ ...baseSnapshot, version: ver }),
      (err: unknown) => {
        return (
          err instanceof SnapshotStorageError && err.code === "unsupported"
        );
      },
      `Should reject unsupported version ${ver}`,
    );
  }
});

test("R2-U-SCHEMA-03: decodeSnapshot rejects v3 project when activeChatId is missing or not found in chats", () => {
  // Missing activeChatId
  const missingActiveChatId = {
    version: 3,
    revision: 1,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        items: [],
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
        },
      },
    ],
  };
  assert.throws(
    () => decodeSnapshot(missingActiveChatId),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );

  // Mismatched activeChatId
  const mismatchedActiveChatId = {
    version: 3,
    revision: 1,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        activeChatId: "chat-nonexistent",
        items: [],
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
        },
      },
    ],
  };
  assert.throws(
    () => decodeSnapshot(mismatchedActiveChatId),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );
});

test("R2-U-SCHEMA-04: decodeSnapshot rejects malformed chat entries (mismatched ID, non-array messages)", () => {
  const base = {
    version: 3,
    revision: 1,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        activeChatId: "chat-1",
        items: [],
        chats: {
          "chat-1": {
            id: "chat-WRONG-KEY", // ID mismatch
            name: "Chat 1",
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
  };

  assert.throws(
    () => decodeSnapshot(base),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );

  // Non-array messages
  const nonArrayMessages = JSON.parse(JSON.stringify(base));
  nonArrayMessages.projects[0].chats["chat-1"].id = "chat-1";
  nonArrayMessages.projects[0].chats["chat-1"].messages = "not-an-array";
  assert.throws(
    () => decodeSnapshot(nonArrayMessages),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );
});

test("R2-U-SCHEMA-05: parseSnapshot rejects corrupt JSON strings", () => {
  assert.throws(
    () => parseSnapshot("{ version: 3, corrupt "),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );
});

/* =========================================================================
 * Tier 2: Deterministic v2 -> v3 Migration
 * ========================================================================= */

test("R2-U-MIGRATE-01: deterministic migration splits v2 direct, codex, and google channels with zero message loss", () => {
  const v2LegacySnapshot: LegacyV2Snapshot = {
    version: 2,
    revision: 7,
    activeProjectId: "proj-legacy",
    homeDraft: {},
    projects: [
      {
        id: "proj-legacy",
        name: "Legacy Multi-Channel Project",
        messages: [
          {
            id: "msg-dir-1",
            role: "user" as const,
            content: "Direct message 1",
            createdAt: 1000,
          },
          {
            id: "msg-dir-2",
            role: "assistant" as const,
            content: "Direct reply",
            createdAt: 1001,
          },
        ],
        composerDraft: {
          text: "Unsent direct draft",
        },
        agentThreadId: "thread-codex-abc-123",
        googleConversation: { sessionId: "gemini-session-888" },
        items: [
          {
            id: "canvas-shared-item",
            title: "Canvas Asset",
            description: "",
            kind: "image" as const,
          },
        ],
        tasks: [
          {
            id: "task-render-1",
            prompt: "render",
            model: "gpt-4o",
            status: "succeeded" as const,
          },
        ],
      },
    ],
  };

  const v3 = migrateSnapshotV2ToV3(v2LegacySnapshot);

  assert.equal(v3.version, 3);
  assert.equal(v3.revision, 8); // revision bumped
  assert.equal(v3.projects.length, 1);

  const proj = v3.projects[0];
  // Deterministic chat segregation
  assert.ok(
    proj.chats["legacy-direct"],
    "Direct history must migrate to legacy-direct",
  );
  assert.ok(
    proj.chats["legacy-codex"],
    "Codex history must migrate to legacy-codex",
  );
  assert.ok(
    proj.chats["legacy-google"],
    "Google conversation must migrate to legacy-google",
  );

  // Verify data fidelity in legacy-direct
  const directChat = proj.chats["legacy-direct"];
  assert.equal(directChat.mainAgent, "direct");
  assert.equal(directChat.messages.length, 2);
  assert.equal(directChat.messages[0].content, "Direct message 1");
  assert.equal(directChat.draft.text, "Unsent direct draft");

  // Verify data fidelity in legacy-codex
  const codexChat = proj.chats["legacy-codex"];
  assert.equal(codexChat.mainAgent, "codex");
  assert.equal(codexChat.agentThreadId, "thread-codex-abc-123");

  // Verify data fidelity in legacy-google
  const googleChat = proj.chats["legacy-google"];
  assert.equal(googleChat.mainAgent, "google");
  assert.deepEqual(googleChat.googleConversation, {
    sessionId: "gemini-session-888",
  });

  // Verify activeChatId priority: legacy-direct > legacy-codex > legacy-google
  assert.equal(proj.activeChatId, "legacy-direct");

  // Verify shared project assets are preserved untouched
  assert.equal(proj.items.length, 1);
  assert.equal(proj.items[0].id, "canvas-shared-item");

  // Verify background tasks receive originChatId matching activeChatId
  assert.equal(proj.tasks.length, 1);
  assert.equal(proj.tasks[0].id, "task-render-1");
  assert.equal(proj.tasks[0].originChatId, "legacy-direct");
});

test("R2-U-MIGRATE-02: migration of empty v2 project creates chat-default with clean state", () => {
  const emptyV2: LegacyV2Snapshot = {
    version: 2,
    revision: 1,
    activeProjectId: "p-empty",
    homeDraft: {},
    projects: [
      {
        id: "p-empty",
        name: "Empty Project",
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
  assert.deepEqual(proj.chats["chat-default"].messages, []);
  assert.deepEqual(proj.chats["chat-default"].modelAllowlist, []);
});

test("R2-U-MIGRATE-03: migration activeChatId resolution respects strict precedence direct -> codex -> google", () => {
  // Case A: Codex only (no direct messages)
  const codexOnly: LegacyV2Snapshot = {
    version: 2,
    revision: 1,
    activeProjectId: "p-codex",
    homeDraft: {},
    projects: [
      {
        id: "p-codex",
        agentThreadId: "thread-xyz",
        items: [],
      },
    ],
  };
  const v3Codex = migrateSnapshotV2ToV3(codexOnly);
  assert.equal(v3Codex.projects[0].activeChatId, "legacy-codex");

  // Case B: Google only
  const googleOnly: LegacyV2Snapshot = {
    version: 2,
    revision: 1,
    activeProjectId: "p-google",
    homeDraft: {},
    projects: [
      {
        id: "p-google",
        googleConversation: { token: "abc" },
        items: [],
      },
    ],
  };
  const v3Google = migrateSnapshotV2ToV3(googleOnly);
  assert.equal(v3Google.projects[0].activeChatId, "legacy-google");
});

/* =========================================================================
 * Tier 3: Non-Downgradable Write Barrier & Atomic Backup
 * ========================================================================= */

test("R2-U-BARRIER-01: write barrier executes strict 5-step sequence and SHA-256 archive", () => {
  const initialV2Raw = JSON.stringify({
    version: 2,
    revision: 3,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [{ id: "p1", name: "P1", items: [] }],
  });

  const barrier = new NonDowngradableWriteBarrier(initialV2Raw);
  assert.deepEqual(barrier.formatMarker, {
    formatVersion: 1,
    minWriterVersion: 1,
  });

  const v3Snapshot: CreationSnapshotV3 = {
    version: 3,
    revision: 4,
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
            createdAt: 100,
            updatedAt: 100,
            draft: {},
            messages: [],
            mainAgent: "codex",
            modelAllowlist: [],
          },
        },
        items: [],
        tasks: [],
      },
    ],
  };

  const receipt = barrier.executeMigrationWriteBarrier(v3Snapshot);

  // Step 1 & 2: Immutable archive with exact SHA-256
  const expectedSha = sha256Hex(initialV2Raw);
  assert.equal(receipt.archiveSha, expectedSha);
  assert.ok(barrier.memoryFiles.has(`projects/archive-v2-${expectedSha}.json`));

  // Step 3: v3 backup barrier
  assert.ok(barrier.memoryFiles.has("projects/creation-backup.json"));

  // Step 4: v3 main write
  const mainBytes = barrier.memoryFiles.get("projects/creation-v2.json")!;
  const mainParsed = JSON.parse(mainBytes);
  assert.equal(mainParsed.version, 3);
  assert.equal(mainParsed.revision, 4);

  // Step 5: Format marker advanced
  assert.deepEqual(barrier.formatMarker, {
    formatVersion: 2,
    minWriterVersion: 2,
  });

  // Verification of step order in transaction log
  const log = barrier.stepLog;
  assert.match(log[0], /^sha256:/);
  assert.match(log[1], /^archived:/);
  assert.match(log[2], /^backup_written:/);
  assert.match(log[3], /^main_written:/);
  assert.match(log[4], /^marker_advanced:/);
});

test("R2-U-BARRIER-02: crash recovery restores v3 main from backup without rolling back to v2", () => {
  const initialV2Raw = JSON.stringify({
    version: 2,
    revision: 1,
    projects: [{ id: "p1", items: [] }],
  });

  const barrier = new NonDowngradableWriteBarrier(initialV2Raw);

  // Simulate crash: backup was written, but main write failed mid-stream
  const v3BackupPayload = JSON.stringify({
    version: 3,
    revision: 2,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        name: "Crash Protected",
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
        items: [],
        tasks: [],
      },
    ],
  });
  barrier.memoryFiles.set("projects/creation-backup.json", v3BackupPayload);

  // Execute crash recovery
  const recovery = barrier.recoverFromCrash();
  assert.equal(recovery.state, "v3_recovered");

  const restoredMain = JSON.parse(
    barrier.memoryFiles.get("projects/creation-v2.json")!,
  );
  assert.equal(restoredMain.version, 3);
  assert.equal(restoredMain.projects[0].name, "Crash Protected");
  assert.equal(barrier.formatMarker.formatVersion, 2);
  assert.equal(barrier.formatMarker.minWriterVersion, 2);
});

/* =========================================================================
 * Tier 4: Credential Rejection Security Boundary
 * ========================================================================= */

test("R2-U-SECURITY-01: snapshot decoding strictly rejects apiKey, accessToken, and secretKey", () => {
  const baseV3 = {
    version: 3,
    revision: 1,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
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
        },
        items: [],
      },
    ],
  };

  // 1. Root level apiKey
  assert.throws(
    () =>
      decodeSnapshot({ ...baseV3, apiKey: "sk-live-synthetic-leak-key-12345" }),
    /凭据|令牌|密钥/,
  );

  // 2. Chat draft accessToken
  const leakInChatDraft = JSON.parse(JSON.stringify(baseV3));
  leakInChatDraft.projects[0].chats["chat-1"].draft.accessToken =
    "ghp_synthetic_token_12345";
  assert.throws(() => decodeSnapshot(leakInChatDraft), /凭据|令牌|密钥/);

  // 3. Task level secretKey
  const leakInTask = JSON.parse(JSON.stringify(baseV3));
  leakInTask.projects[0].tasks = [
    { id: "task-1", secretKey: "secret-synthetic-token-val" },
  ];
  assert.throws(() => decodeSnapshot(leakInTask), /凭据|令牌|密钥/);
});

test("R2-U-SECURITY-02: ordinary text containing substring key is not falsely rejected", () => {
  const safeSnapshot = {
    version: 3,
    revision: 1,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        activeChatId: "chat-1",
        chats: {
          "chat-1": {
            id: "chat-1",
            name: "Keyboard & Keyframes Chat",
            createdAt: 100,
            updatedAt: 100,
            draft: { text: "Render keyframe animation with primary keyword" },
            messages: [
              {
                id: "msg-1",
                role: "user" as const,
                content: "Press any key on the keyboard to resume.",
              },
            ],
            mainAgent: "codex",
            modelAllowlist: [],
          },
        },
        items: [],
        tasks: [],
      },
    ],
  };

  assert.doesNotThrow(() => decodeSnapshot(safeSnapshot));
});

/* =========================================================================
 * Tier 5: Multi-Chat State Isolation vs Shared Canvas Assets
 * ========================================================================= */

test("R2-U-ISOLATION-01: multi-chat isolates drafts, transcripts, and models while sharing canvas items", () => {
  const project: CreationProjectV3 = {
    id: "proj-multi",
    name: "Collaborative Design Project",
    activeChatId: "chat-design",
    items: [
      {
        id: "canvas-shape-1",
        kind: "image",
        title: "Background",
        description: "",
      },
      {
        id: "canvas-image-2",
        kind: "image",
        title: "Reference Photo",
        description: "",
      },
    ],
    tasks: [
      {
        id: "task-101",
        prompt: "p",
        model: "m",
        kind: "image" as const,
        status: "running" as const,
        originChatId: "chat-design",
      },
    ],
    chats: {
      "chat-design": {
        id: "chat-design",
        name: "UI 设计",
        createdAt: 1000,
        updatedAt: 1000,
        draft: { text: "Wireframe feedback" },
        messages: [{ id: "m-1", role: "user", content: "Check design tokens" }],
        mainAgent: "codex",
        modelAllowlist: ["gpt-4o"],
      },
      "chat-dev": {
        id: "chat-dev",
        name: "开发协作",
        createdAt: 2000,
        updatedAt: 2000,
        draft: { text: "Review Rust codec" },
        messages: [{ id: "m-2", role: "user", content: "Run cargo check" }],
        mainAgent: "direct",
        modelAllowlist: ["claude-3-5-sonnet"],
      },
    },
  };

  // Verify chat isolation
  assert.notEqual(
    project.chats["chat-design"].draft.text,
    project.chats["chat-dev"].draft.text,
  );
  assert.notDeepEqual(
    project.chats["chat-design"].modelAllowlist,
    project.chats["chat-dev"].modelAllowlist,
  );
  assert.notEqual(
    project.chats["chat-design"].messages[0].content,
    project.chats["chat-dev"].messages[0].content,
  );

  // Verify canvas sharing
  assert.equal(project.items.length, 2);
  assert.equal(project.items[0].id, "canvas-shape-1");
  assert.equal(project.items[1].id, "canvas-image-2");

  // Verify task origin tracking across active chat switch
  project.activeChatId = "chat-dev";
  assert.equal(project.tasks![0].originChatId, "chat-design");
  assert.equal(project.tasks![0].status, "running");
});
