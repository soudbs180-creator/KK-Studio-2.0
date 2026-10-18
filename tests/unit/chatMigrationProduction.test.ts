import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  migrateSnapshotV2ToV3,
  sha256Hex,
} from "../../src/features/creation/chatMigration.ts";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";
import { sanitizeSnapshotForPersistence } from "../../src/features/creation/storage.ts";
import {
  projectChatView,
  serializeCreationSnapshot,
  updateActiveChat,
  snapshotWriteBlockReason,
} from "../../src/features/creation/model.ts";

test("migration keeps raw fields, existing chat identities and an independent root thread", () => {
  const input = {
    version: 2 as const,
    revision: 12,
    activeProjectId: "p",
    homeDraft: { extra: "home" },
    projectGroups: [{ id: "g", name: "Group" }],
    extra: { retained: true },
    projects: [
      {
        id: "p",
        items: [],
        groupId: "g",
        createdAt: 10,
        updatedAt: 20,
        extra: { retained: true },
        activeChatId: "c",
        chats: {
          c: {
            id: "c",
            name: "Existing",
            createdAt: 1,
            updatedAt: 2,
            draft: { text: "own" },
            messages: [],
            mainAgent: "codex",
            modelAllowlist: [],
          },
        },
        agentThreadId: "root-thread",
        composerDraft: { prompt: "unassigned", attachments: [] },
        messages: [
          {
            id: "m",
            role: "system" as const,
            content: "history",
            detail: { keep: true },
          },
        ],
        tasks: [{ id: "t", prompt: "old", model: "m", status: "succeeded" }],
      },
    ],
  };
  const raw = JSON.stringify(input);
  const migrated = migrateSnapshotV2ToV3(input);
  assert.equal(JSON.stringify(input), raw);
  assert.deepEqual(migrated, migrateSnapshotV2ToV3(input));
  assert.deepEqual(migrated.projectGroups, input.projectGroups);
  assert.deepEqual((migrated as unknown as typeof input).extra, input.extra);
  const project = migrated.projects[0];
  assert.deepEqual(project.chats!.c, input.projects[0].chats.c);
  assert.equal(project.activeChatId, "c");
  assert.equal(project.chats!["legacy-codex"].agentThreadId, "root-thread");
  assert.equal(project.chats!.c.agentThreadId, undefined);
  assert.deepEqual(
    project.chats!["legacy-history"].messages,
    input.projects[0].messages,
  );
  assert.equal(project.tasks[0].originChatId, undefined);
  for (const field of [
    "messages",
    "composerDraft",
    "agentThreadId",
    "googleConversation",
  ])
    assert.equal(Object.hasOwn(project, field), false);
});

test("canonical v3 decoding keeps unknown fields and full assistant history", () => {
  const input = migrateSnapshotV2ToV3({
    version: 2,
    revision: 1,
    activeProjectId: "p",
    homeDraft: { extra: "home" },
    extra: "root",
    projects: [
      {
        id: "p",
        items: [],
        extra: "project",
        messages: [
          {
            id: "m",
            role: "assistant",
            content: "x".repeat(25000),
            detail: { retained: true },
          },
        ],
      },
    ],
  });
  const decoded = decodeSnapshot(input);
  assert.equal((decoded as unknown as { extra: string }).extra, "root");
  assert.equal(
    (decoded.homeDraft as unknown as { extra: string }).extra,
    "home",
  );
  assert.equal(
    (decoded.projects[0] as unknown as { extra: string }).extra,
    "project",
  );
  assert.deepEqual(
    decoded.projects[0].chats!["legacy-history"].messages,
    input.projects[0].chats!["legacy-history"].messages,
  );
  assert.equal(decoded.projects[0].messages[0].role, "assistant");
});

test("TS migration matches the shared raw JSON golden vectors", () => {
  const { cases } = JSON.parse(
    readFileSync(
      new URL("../fixtures/chat-migration-vectors.json", import.meta.url),
      "utf8",
    ),
  );
  for (const vector of cases)
    assert.deepEqual(
      migrateSnapshotV2ToV3(vector.input),
      vector.expected,
      vector.name,
    );
});

test("canonical edits and serialization never copy stale root authority into a chat", () => {
  const migrated = migrateSnapshotV2ToV3({
    version: 2,
    revision: 1,
    activeProjectId: "p",
    homeDraft: {},
    projects: [{ id: "p", items: [], agentThreadId: "t" }],
  });
  const view = projectChatView(decodeSnapshot(migrated).projects[0]);
  view.composerDraft.prompt = "stale root only";
  const updated = updateActiveChat(view, (chat) => ({
    ...chat,
    draft: { prompt: "canonical edit" },
  }));
  const serialized = serializeCreationSnapshot({
    ...migrated,
    projects: [updated],
  });
  assert.equal(updated.composerDraft.prompt, "canonical edit");
  assert.equal(
    serialized.projects[0].chats!["legacy-codex"].draft.prompt,
    "canonical edit",
  );
  assert.equal(Object.hasOwn(serialized.projects[0], "composerDraft"), false);
  assert.equal(snapshotWriteBlockReason(serialized), undefined);
});

test("malformed raw identities and unsupported temporary records remain protected", () => {
  const base = {
    version: 2 as const,
    revision: 1,
    activeProjectId: "p",
    homeDraft: {},
    projects: [{ id: "p", items: [] }],
  };
  for (const fields of [
    { chats: null },
    { chats: {} },
    { activeChatId: "missing" },
    { chats: { c: { id: "c" } }, activeChatId: "missing" },
    { chats: { c: { id: "wrong" } }, activeChatId: "c" },
    { agentThreadId: "bad/thread" },
  ]) {
    const input = { ...base, projects: [{ ...base.projects[0], ...fields }] };
    const before = JSON.stringify(input);
    assert.throws(() => migrateSnapshotV2ToV3(input), /身份/);
    assert.equal(JSON.stringify(input), before);
  }
  const migrated = migrateSnapshotV2ToV3(base);
  migrated.projects[0].chats!["chat-default"].isTemporary = true;
  assert.match(snapshotWriteBlockReason(migrated)!, /临时/);
});

test("credential-shaped text is ordinary content while credential fields reject", () => {
  const base = {
    version: 2 as const,
    revision: 1,
    activeProjectId: "p",
    homeDraft: {},
    projects: [
      {
        id: "p",
        items: [],
        messages: [
          {
            id: "m",
            role: "user" as const,
            content: 'Explain "apiKey" and authorization without credentials',
          },
        ],
      },
    ],
  };
  assert.equal(
    migrateSnapshotV2ToV3(base).projects[0].chats!["legacy-history"].messages[0]
      .content,
    base.projects[0].messages[0].content,
  );
  assert.throws(
    () =>
      migrateSnapshotV2ToV3({ ...base, extra: { refreshToken: "synthetic" } }),
    /密钥/,
  );
});

test("raw malformed contexts reject and empty preferences compare by structure", () => {
  const base = {
    version: 2 as const,
    revision: 1,
    activeProjectId: "p",
    homeDraft: {},
    projects: [{ id: "p", items: [] }],
  };
  for (const fields of [
    { googleConversation: null },
    { googleConversation: { messages: null } },
    { composerDraft: [] },
    { messages: null },
  ])
    assert.throws(
      () =>
        migrateSnapshotV2ToV3({
          ...base,
          projects: [{ ...base.projects[0], ...fields }],
        } as never),
      /无法/,
    );
  const preferences = { prompt: "", attachments: [], model: "old" };
  const migrated = migrateSnapshotV2ToV3({
    ...base,
    projects: [
      {
        ...base.projects[0],
        composerDraft: preferences,
        legacyComposerPreferences: {
          model: "old",
          attachments: [],
          prompt: "",
        },
      },
    ],
  });
  assert.deepEqual(
    (migrated.projects[0] as unknown as { legacyComposerPreferences: unknown })
      .legacyComposerPreferences,
    preferences,
  );
  const chat = {
    id: "c",
    name: "C",
    createdAt: 1,
    updatedAt: 1,
    draft: {},
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
    agentThreadId: "same",
  };
  assert.throws(
    () =>
      migrateSnapshotV2ToV3({
        ...base,
        projects: [
          {
            ...base.projects[0],
            activeChatId: "c",
            chats: { c: chat },
            agentThreadId: "same",
          },
        ],
      }),
    /重复/,
  );
});

test("archive SHA-256 hashes exact UTF-8 and binary bytes", () => {
  for (const value of ["中文 🚀\ud800", new Uint8Array([0, 255, 128, 1])])
    assert.equal(
      sha256Hex(value),
      createHash("sha256").update(value).digest("hex"),
    );
});

test("durable v3 root conflicts never disappear through decode or serialization", () => {
  const raw = migrateSnapshotV2ToV3({
    version: 2,
    revision: 1,
    activeProjectId: "p",
    homeDraft: {},
    projects: [{ id: "p", items: [] }],
  });
  raw.projects[0].chats!["chat-default"].draft = { prompt: "chat" };
  raw.projects[0].chats!["chat-default"].messages = [
    { id: "chat-m", role: "user", content: "chat" },
  ];
  raw.projects[0].composerDraft = { prompt: "root" } as never;
  raw.projects[0].messages = [
    { id: "root-m", role: "user", content: "root", createdAt: 1 },
  ];
  const before = JSON.stringify(raw);
  assert.throws(() => decodeSnapshot(raw), /权威|迁移/);
  assert.throws(() => serializeCreationSnapshot(raw), /权威|迁移/);
  assert.throws(() => sanitizeSnapshotForPersistence(raw), /权威|迁移/);
  assert.equal(JSON.stringify(raw), before);
  const canonical = {
    ...raw,
    projects: raw.projects.map((project) => {
      const copy = { ...project };
      delete (copy as Partial<typeof copy>).messages;
      delete (copy as Partial<typeof copy>).composerDraft;
      return copy;
    }),
  };
  const view = decodeSnapshot(canonical);
  assert.deepEqual(
    serializeCreationSnapshot(view).projects[0].chats,
    canonical.projects[0].chats,
  );
});
