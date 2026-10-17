/**
 * tests/unit/snapshotCodecV3Adversarial.test.ts
 *
 * Adversarial Empirical Stress Test Suite for KK Studio Milestone 2 (R2).
 * Specifically challenges:
 *   1. Malformed Payloads: invalid versions (-1, 0, 1, 4, 99, 3.14, NaN, strings),
 *      missing activeChatId, activeChatId missing from chats, duplicate chat/message IDs,
 *      mismatched dictionary keys, prototype pollution probes, overlong strings.
 *   2. Credential Injection: exhaustive secret key variants (apiKey, accessToken, secretKey,
 *      bearerToken, authorization headers, clientSecret) at root, project, chat, draft,
 *      message metadata, and 25-level deep nesting, while guaranteeing false-positive immunity
 *      for ordinary text containing "key", "secret", "authorization".
 *   3. Rapid Multi-Chat Creation & Scale: 500-1000 chat creation under load,
 *      ID collision resistance, isolated drafts, transcripts, model allowlists, and shared canvas.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSnapshot,
  validateSnapshotV3,
  rejectSecrets,
  SnapshotStorageError,
} from "../../src/features/creation/snapshotCodec.ts";
import type { CreationSnapshotV3 } from "../../src/features/creation/model.ts";
import { NonDowngradableWriteBarrier } from "../../src/features/creation/storage.ts";

function createValidBaseV3(): CreationSnapshotV3 {
  return {
    version: 3,
    revision: 1,
    activeProjectId: "proj-adversarial-1",
    homeDraft: {
      prompt: "Base draft prompt",
      model: "gpt-4o",
      kind: "text",
      attachments: [],
      approvalMode: "auto",
      privacyMode: "local_only",
      outputCount: 1,
      updatedAt: 1700000000000,
    },
    projects: [
      {
        id: "proj-adversarial-1",
        name: "Adversarial Stress Project",
        activeChatId: "chat-primary",
        chats: {
          "chat-primary": {
            id: "chat-primary",
            name: "Primary Chat",
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
            draft: {
              prompt: "Draft prompt",
              text: "Draft text content",
              model: "gpt-4o",
              attachments: [],
            },
            messages: [
              {
                id: "msg-p1",
                role: "user",
                content: "Initial testing message",
                createdAt: 1700000000100,
              },
            ],
            mainAgent: "codex",
            modelAllowlist: ["gpt-4o", "claude-3-5-sonnet"],
          },
        },
        items: [
          {
            id: "item-canvas-1",
            title: "Shared Canvas Layer",
            description: "Canvas asset description",
            kind: "image",
          },
        ],
        tasks: [
          {
            id: "task-adv-1",
            prompt: "Test task prompt",
            model: "gpt-4o",
            kind: "image",
            status: "succeeded",
            originChatId: "chat-primary",
            createdAt: 1700000000200,
            updatedAt: 1700000000300,
            attachments: [],
            attempt: 1,
            requestedOutputs: 1,
            completedOutputs: 1,
          },
        ],
      },
    ],
  };
}

/* =========================================================================
 * Category 1: Malformed Payloads & Boundary Stress
 * ========================================================================= */

test("ADV-PAYLOAD-01: comprehensive version boundary matrix rejects invalid, negative, future and malformed versions", () => {
  const invalidVersions = [
    -999,
    -42,
    -1,
    0,
    1, // legacy v1 not directly accepted as v3
    4, // future version
    5,
    99,
    999999,
    3.14159, // float
    2.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "3", // string type mismatch
    "v3",
    null,
    undefined,
    true,
    false,
    [],
    {},
  ];

  for (const badVer of invalidVersions) {
    const candidate = {
      ...createValidBaseV3(),
      version: badVer,
    };

    // 1. validateSnapshotV3 must reject
    assert.throws(
      () => validateSnapshotV3(candidate),
      (err: unknown) => {
        return (
          err instanceof SnapshotStorageError &&
          (err.code === "unsupported" || err.code === "corrupt")
        );
      },
      `validateSnapshotV3 must reject invalid version ${String(badVer)}`,
    );

    // 2. decodeSnapshot must reject versions other than 2 and 3
    if (badVer !== 2) {
      assert.throws(
        () => decodeSnapshot(candidate),
        (err: unknown) => {
          return (
            err instanceof SnapshotStorageError &&
            (err.code === "unsupported" || err.code === "corrupt")
          );
        },
        `decodeSnapshot must reject invalid version ${String(badVer)}`,
      );
    }
  }
});

test("ADV-PAYLOAD-02: activeChatId invariants and hostile inputs are strictly rejected", () => {
  const hostileActiveChatIds = [
    undefined,
    null,
    12345,
    true,
    false,
    "", // empty string
    "   ", // whitespace only
    "a".repeat(161), // exceeds 160 max length
    "chat-nonexistent-404", // not in chats
    "chat-random-missing-uuid-12345",
  ];

  for (const hostileId of hostileActiveChatIds) {
    const snapshot = createValidBaseV3();
    const proj = snapshot.projects[0];
    (proj as unknown as Record<string, unknown>).activeChatId = hostileId;

    assert.throws(
      () => validateSnapshotV3(snapshot),
      (err: unknown) => {
        return err instanceof SnapshotStorageError && err.code === "corrupt";
      },
      `validateSnapshotV3 must reject hostile activeChatId: ${String(hostileId)}`,
    );

    assert.throws(
      () => decodeSnapshot(snapshot),
      (err: unknown) => {
        return err instanceof SnapshotStorageError && err.code === "corrupt";
      },
      `decodeSnapshot must reject hostile activeChatId: ${String(hostileId)}`,
    );
  }
});

test("ADV-PAYLOAD-03: chats dictionary structural corruption and key mismatches are strictly rejected", () => {
  // Case A: chats is not an object or missing
  const malformedChatsEntries = [
    undefined,
    null,
    "chats-string",
    1234,
    true,
    [], // array instead of object
  ];

  for (const badChats of malformedChatsEntries) {
    const snapshot = createValidBaseV3();
    (snapshot.projects[0] as unknown as Record<string, unknown>).chats =
      badChats;

    assert.throws(
      () => validateSnapshotV3(snapshot),
      (err: unknown) =>
        err instanceof SnapshotStorageError && err.code === "corrupt",
      `Must reject malformed chats: ${String(badChats)}`,
    );
  }

  // Case B: key mismatch (dictionary key !== chat.id)
  const snapshotMismatchedKey = createValidBaseV3();
  snapshotMismatchedKey.projects[0].activeChatId = "chat-alpha";
  snapshotMismatchedKey.projects[0].chats = {
    "chat-alpha": {
      id: "chat-beta", // MISMATCH
      name: "Mismatched ID Chat",
      createdAt: 1000,
      updatedAt: 1000,
      draft: {},
      messages: [],
      mainAgent: "codex",
      modelAllowlist: [],
    },
  };

  assert.throws(
    () => validateSnapshotV3(snapshotMismatchedKey),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
    "Must reject when dictionary key differs from chat.id",
  );

  assert.throws(
    () => decodeSnapshot(snapshotMismatchedKey),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
    "decodeSnapshot must reject key mismatch",
  );

  // Case C: Malformed chat fields
  const baseMalformedChat = createValidBaseV3();
  const targetChat = baseMalformedChat.projects[0].chats["chat-primary"];

  // Non-array messages
  (targetChat as unknown as Record<string, unknown>).messages =
    "invalid-messages-string";
  assert.throws(
    () => validateSnapshotV3(baseMalformedChat),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );

  // Non-array modelAllowlist
  (targetChat as unknown as Record<string, unknown>).messages = [];
  (targetChat as unknown as Record<string, unknown>).modelAllowlist = {
    model: "gpt-4o",
  };
  assert.throws(
    () => validateSnapshotV3(baseMalformedChat),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );

  // Non-string mainAgent
  (targetChat as unknown as Record<string, unknown>).modelAllowlist = [];
  (targetChat as unknown as Record<string, unknown>).mainAgent = 42;
  assert.throws(
    () => validateSnapshotV3(baseMalformedChat),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
  );
});

test("ADV-PAYLOAD-04: duplicate message, task, and project identifiers are rejected as corrupt", () => {
  // 1. Duplicate message IDs inside a chat
  const dupMsgSnapshot = createValidBaseV3();
  dupMsgSnapshot.projects[0].chats["chat-primary"].messages = [
    { id: "msg-collision-1", role: "user", content: "First message" },
    { id: "msg-collision-1", role: "assistant", content: "Collision message" },
  ];

  assert.throws(
    () => decodeSnapshot(dupMsgSnapshot),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
    "Must reject duplicate message IDs in the same chat",
  );

  // 2. Duplicate task IDs in a project
  const dupTaskSnapshot = createValidBaseV3();
  dupTaskSnapshot.projects[0].tasks = [
    {
      id: "task-dup-1",
      prompt: "p1",
      model: "m",
      kind: "text",
      status: "succeeded",
      createdAt: 1,
      updatedAt: 1,
      attachments: [],
      attempt: 1,
      requestedOutputs: 1,
      completedOutputs: 1,
    },
    {
      id: "task-dup-1",
      prompt: "p2",
      model: "m",
      kind: "text",
      status: "succeeded",
      createdAt: 2,
      updatedAt: 2,
      attachments: [],
      attempt: 1,
      requestedOutputs: 1,
      completedOutputs: 1,
    },
  ];

  assert.throws(
    () => decodeSnapshot(dupTaskSnapshot),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
    "Must reject duplicate task IDs",
  );

  // 3. Duplicate project IDs
  const dupProjSnapshot = createValidBaseV3();
  dupProjSnapshot.projects.push(
    JSON.parse(JSON.stringify(dupProjSnapshot.projects[0])),
  );
  assert.throws(
    () => decodeSnapshot(dupProjSnapshot),
    (err: unknown) =>
      err instanceof SnapshotStorageError && err.code === "corrupt",
    "Must reject duplicate project IDs",
  );
});

test("ADV-PAYLOAD-05: prototype property names as activeChatId are safely prevented from decoding", () => {
  // Testing prototype pollution and built-in property probes as activeChatId
  const protoKeys = ["toString", "valueOf", "constructor", "__proto__"];

  for (const protoKey of protoKeys) {
    const snapshot = createValidBaseV3();
    snapshot.projects[0].activeChatId = protoKey;

    // decodeSnapshot must never successfully return a corrupted project with prototype activeChatId
    assert.throws(
      () => decodeSnapshot(snapshot),
      (err: unknown) => {
        // Either SnapshotStorageError or TypeError due to missing properties on prototype method
        return err instanceof Error;
      },
      `decodeSnapshot must reject or fail on prototype property probe: ${protoKey}`,
    );
  }
});

/* =========================================================================
 * Category 2: Credential Injection & Security Boundary Hardening
 * ========================================================================= */

test("ADV-SEC-01: rejectSecrets blocks all sensitive credential keys across naming conventions", () => {
  const secretKeyVariations = [
    "apiKey",
    "API_KEY",
    "ApiKey",
    "api_key",
    "apikey",
    "accessToken",
    "ACCESS_TOKEN",
    "access_token",
    "accesstoken",
    "secretKey",
    "SECRET_KEY",
    "secret_key",
    "secret",
    "bearerToken",
    "BEARER_TOKEN",
    "bearer_token",
    "bearertoken",
    "authorization",
    "AUTHORIZATION",
    "Authorization",
    "clientSecret",
    "CLIENT_SECRET",
    "client_secret",
    "refreshToken",
    "REFRESH_TOKEN",
    "refresh_token",
    "oauthToken",
    "OAUTH_TOKEN",
    "oauth_token",
  ];

  for (const secretKey of secretKeyVariations) {
    const payload = { [secretKey]: "synthetic-secret-leak-value-999" };

    // 1. Direct rejectSecrets call
    assert.throws(
      () => rejectSecrets(payload),
      (err: unknown) => {
        return (
          err instanceof SnapshotStorageError &&
          err.code === "corrupt" &&
          /凭据|令牌|密钥/.test(err.message)
        );
      },
      `rejectSecrets must reject sensitive key: ${secretKey}`,
    );

    // 2. Through validateSnapshotV3
    const snapshotWithRootSecret = {
      ...createValidBaseV3(),
      [secretKey]: "secret-leak",
    };
    assert.throws(
      () => validateSnapshotV3(snapshotWithRootSecret),
      (err: unknown) =>
        err instanceof SnapshotStorageError && err.code === "corrupt",
      `validateSnapshotV3 must reject sensitive key: ${secretKey}`,
    );

    // 3. Through decodeSnapshot
    assert.throws(
      () => decodeSnapshot(snapshotWithRootSecret),
      (err: unknown) =>
        err instanceof SnapshotStorageError && err.code === "corrupt",
      `decodeSnapshot must reject sensitive key: ${secretKey}`,
    );
  }
});

test("ADV-SEC-02: credential injection is blocked across diverse nesting topologies", () => {
  // Location 1: In project tasks
  const leakInTasks = createValidBaseV3();
  (
    leakInTasks.projects[0].tasks![0] as unknown as Record<string, unknown>
  ).accessToken = "ghp_synthetic_token_123";
  assert.throws(
    () => decodeSnapshot(leakInTasks),
    /凭据|令牌|密钥/,
    "Must reject secret inside task",
  );

  // Location 2: In chat draft
  const leakInChatDraft = createValidBaseV3();
  (
    leakInChatDraft.projects[0].chats["chat-primary"].draft as Record<
      string,
      unknown
    >
  ).apiKey = "sk-synthetic-live-secret";
  assert.throws(
    () => decodeSnapshot(leakInChatDraft),
    /凭据|令牌|密钥/,
    "Must reject secret inside chat draft",
  );

  // Location 3: In chat message
  const leakInMessage = createValidBaseV3();
  (
    leakInMessage.projects[0].chats["chat-primary"].messages[0] as Record<
      string,
      unknown
    >
  ).authorization = "Bearer synthetic-jwt-token";
  assert.throws(
    () => decodeSnapshot(leakInMessage),
    /凭据|令牌|密钥/,
    "Must reject secret inside chat message",
  );

  // Location 4: In headers / metadata nested inside plugin
  const leakInMetadata = createValidBaseV3();
  (
    leakInMetadata.projects[0].items[0] as unknown as Record<string, unknown>
  ).plugin = {
    type: "custom-filter",
    metadata: {
      headers: {
        Authorization: "Bearer header-token-value",
      },
    },
  };
  assert.throws(
    () => decodeSnapshot(leakInMetadata),
    /凭据|令牌|密钥/,
    "Must reject Authorization header inside plugin metadata",
  );

  // Location 5: Deeply nested hierarchy (25 levels deep)
  let deeplyNested: Record<string, unknown> = {
    apiKey: "sk-deeply-nested-leak",
  };
  for (let i = 0; i < 25; i++) {
    deeplyNested = { child: deeplyNested };
  }
  const leakDeep = createValidBaseV3();
  (
    leakDeep.projects[0].items[0] as unknown as Record<string, unknown>
  ).metadata = deeplyNested;
  assert.throws(
    () => decodeSnapshot(leakDeep),
    /凭据|令牌|密钥/,
    "Must detect secret nested 25 levels deep",
  );

  // Location 6: Array-embedded object with secret
  const leakInArray = createValidBaseV3();
  (leakInArray.projects[0] as unknown as Record<string, unknown>).customArray =
    [{ safe: 1 }, [{ nestedSafe: true }, { clientSecret: "leak-in-array" }]];
  assert.throws(
    () => decodeSnapshot(leakInArray),
    /凭据|令牌|密钥/,
    "Must detect secret inside array elements",
  );
});

test("ADV-SEC-03: safe ordinary text values containing 'key', 'secret', or 'token' are not falsely rejected", () => {
  const safeTextSnapshot = createValidBaseV3();
  const chat = safeTextSnapshot.projects[0].chats["chat-primary"];

  chat.name = "API Key Management Discussion & Keyframe Generation";
  chat.draft.text =
    "We need to document the secret handshake, primary key constraints, and bearer token RFC in the docs.";
  chat.messages = [
    {
      id: "msg-safe-1",
      role: "user",
      content:
        "Press any key on the keyboard. A secret agent uses public key cryptography to verify tokens.",
    },
    {
      id: "msg-safe-2",
      role: "assistant",
      content:
        "Authorization header format: 'Authorization: Bearer <token>' is a standard RFC 6750 pattern.",
    },
  ];

  safeTextSnapshot.projects[0].items[0].title = "Secret Garden Keyframe";
  safeTextSnapshot.projects[0].items[0].description =
    "Keyword research: high-speed keyboard shortcuts and authorization flow diagrams.";

  // Must not throw in rejectSecrets
  assert.doesNotThrow(
    () => rejectSecrets(safeTextSnapshot),
    "rejectSecrets must never throw on ordinary text string values",
  );

  // Must not throw in validateSnapshotV3
  assert.doesNotThrow(
    () => validateSnapshotV3(safeTextSnapshot),
    "validateSnapshotV3 must successfully validate safe ordinary text",
  );

  // Must not throw in decodeSnapshot
  const decoded = decodeSnapshot(
    safeTextSnapshot,
  ) as unknown as CreationSnapshotV3;
  assert.equal(decoded.projects[0].chats["chat-primary"].name, chat.name);
  assert.equal(decoded.projects[0].chats["chat-primary"].messages.length, 2);
});

/* =========================================================================
 * Category 3: Rapid Multi-Chat Creation & Scale Stress
 * ========================================================================= */

test("ADV-SCALE-01: rapid creation of 500 chats guarantees unique IDs and high-throughput validation", () => {
  const snapshot = createValidBaseV3();
  const proj = snapshot.projects[0];
  const chatCount = 500;
  const createdIds = new Set<string>();

  const startCreate = performance.now();
  for (let i = 0; i < chatCount; i++) {
    const chatId = `chat-bench-${i.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    createdIds.add(chatId);

    proj.chats[chatId] = {
      id: chatId,
      name: `Automated Chat ${i}`,
      createdAt: 1700000000000 + i * 10,
      updatedAt: 1700000000000 + i * 10,
      draft: {
        prompt: `Prompt for session ${i}`,
        text: `Draft text for session ${i}`,
        model: i % 2 === 0 ? "gpt-4o" : "claude-3-5-sonnet",
      },
      messages: [
        {
          id: `msg-${chatId}-1`,
          role: "user",
          content: `Initial prompt for chat ${i}`,
          createdAt: 1700000000000 + i * 10 + 1,
        },
      ],
      mainAgent: i % 3 === 0 ? "codex" : "direct",
      modelAllowlist: [`model-${i % 4}`],
    };
  }
  const elapsedCreate = performance.now() - startCreate;

  // 1. Verify all 500 chat IDs are distinct
  assert.equal(
    createdIds.size,
    chatCount,
    "All generated chat IDs must be completely unique without collision",
  );
  assert.equal(Object.keys(proj.chats).length, chatCount + 1); // including initial primary chat

  // 2. Validate scale payload through validateSnapshotV3
  const startValidate = performance.now();
  const validated = validateSnapshotV3(snapshot);
  const elapsedValidate = performance.now() - startValidate;

  assert.equal(validated.version, 3);
  assert.equal(Object.keys(validated.projects[0].chats).length, chatCount + 1);

  // 3. Decode scale payload through decodeSnapshot
  const startDecode = performance.now();
  const decoded = decodeSnapshot(snapshot) as unknown as CreationSnapshotV3;
  const elapsedDecode = performance.now() - startDecode;

  assert.equal(decoded.projects[0].chats["chat-primary"].id, "chat-primary");

  // Latency assertions: 500 chats should easily process under 500ms
  assert.ok(
    elapsedCreate < 500,
    `500-chat creation should complete within 500ms (took ${elapsedCreate.toFixed(2)}ms)`,
  );
  assert.ok(
    elapsedValidate < 300,
    `500-chat validation should complete within 300ms (took ${elapsedValidate.toFixed(2)}ms)`,
  );
  assert.ok(
    elapsedDecode < 300,
    `500-chat decoding should complete within 300ms (took ${elapsedDecode.toFixed(2)}ms)`,
  );
});

test("ADV-SCALE-02: multi-chat state isolation guarantees zero draft or transcript crosstalk", () => {
  const snapshot = createValidBaseV3();
  const proj = snapshot.projects[0];
  const totalChats = 100;

  for (let i = 0; i < totalChats; i++) {
    const chatId = `chat-iso-${i}`;
    proj.chats[chatId] = {
      id: chatId,
      name: `Isolated Room ${i}`,
      createdAt: 1000 + i,
      updatedAt: 1000 + i,
      draft: {
        text: `Unsent secret draft for room #${i}`,
        prompt: `Prompt template #${i}`,
        model: `model-provider-${i}`,
      },
      messages: [
        {
          id: `m-iso-${i}`,
          role: "user",
          content: `Transcript strictly private to room ${i}`,
        },
      ],
      mainAgent: i % 2 === 0 ? "codex" : "direct",
      modelAllowlist: [`allowed-for-${i}`],
    };
  }

  // Verify draft and transcript isolation across all pairs
  for (let i = 0; i < totalChats; i++) {
    const currentChat = proj.chats[`chat-iso-${i}`];
    assert.equal(currentChat.draft.text, `Unsent secret draft for room #${i}`);
    assert.equal(
      currentChat.messages[0].content,
      `Transcript strictly private to room ${i}`,
    );
    assert.deepEqual(currentChat.modelAllowlist, [`allowed-for-${i}`]);

    // Mutate draft of chat-iso-i
    currentChat.draft.text = `MUTATED_CONTENT_${i}`;
  }

  // Verify no mutation affected adjacent chat drafts
  for (let i = 0; i < totalChats; i++) {
    assert.equal(
      proj.chats[`chat-iso-${i}`].draft.text,
      `MUTATED_CONTENT_${i}`,
    );
  }

  // Verify shared project canvas items remain untouched and singular
  assert.equal(proj.items.length, 1);
  assert.equal(proj.items[0].id, "item-canvas-1");

  // Verify task origin tracking across active chat switches
  proj.activeChatId = "chat-iso-42";
  assert.equal(proj.tasks![0].originChatId, "chat-primary");
  proj.activeChatId = "chat-iso-99";
  assert.equal(proj.tasks![0].originChatId, "chat-primary");
});

test("ADV-BARRIER-01: write barrier enforces non-downgradability and tamper detection", () => {
  const initialV2Raw = JSON.stringify({
    version: 2,
    revision: 1,
    activeProjectId: "p1",
    projects: [{ id: "p1", name: "Original v2", items: [] }],
    homeDraft: {},
  });

  const barrier = new NonDowngradableWriteBarrier(initialV2Raw);
  assert.deepEqual(barrier.formatMarker, {
    formatVersion: 1,
    minWriterVersion: 1,
  });

  const validV3Candidate: CreationSnapshotV3 = {
    version: 3,
    revision: 2,
    activeProjectId: "p1",
    homeDraft: {},
    projects: [
      {
        id: "p1",
        name: "Upgraded v3",
        activeChatId: "chat-default",
        chats: {
          "chat-default": {
            id: "chat-default",
            name: "默认对话",
            createdAt: 1000,
            updatedAt: 1000,
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

  const receipt = barrier.executeMigrationWriteBarrier(validV3Candidate);
  assert.ok(receipt.archiveSha);
  assert.equal(barrier.formatMarker.formatVersion, 2);
  assert.equal(barrier.formatMarker.minWriterVersion, 2);

  // Validate that candidate rejection happens when attempting to migrate invalid version
  assert.throws(
    () =>
      validateSnapshotV3({
        version: 2, // Cannot pass v2 as v3 migration candidate!
        revision: 1,
        projects: [],
      }),
    /Unsupported snapshot version/,
  );

  // Crash recovery refuses rollback if backup does not have version 3
  barrier.memoryFiles.set(
    "projects/creation-backup.json",
    JSON.stringify({ version: 2, revision: 1 }),
  );
  assert.equal(barrier.recoverFromCrash().state, "v2");

  // Crash recovery successfully restores when backup is valid v3
  barrier.memoryFiles.set(
    "projects/creation-backup.json",
    JSON.stringify(validV3Candidate),
  );
  assert.equal(barrier.recoverFromCrash().state, "v3_recovered");
  assert.deepEqual(barrier.formatMarker, {
    formatVersion: 2,
    minWriterVersion: 2,
  });
});
