import test from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  createDefaultChat,
  updateActiveChat,
  projectChatView,
  emptySnapshot,
  serializeCreationSnapshot,
} from "../../src/domain/creationModel.ts";
import {
  migrateSnapshotV2ToV3,
  sha256Hex,
} from "../../src/domain/chatMigrationCore.ts";
import { validateSnapshotV3 } from "../../src/domain/creationSnapshotCodec.ts";
import { commitIndexedChatMigration } from "../../src/features/creation/indexedChatMigration.ts";
import { createIndexedStorageFixture } from "../support/indexedStorageFixture.ts";
const legacy = () => ({
  version: 2 as const,
  revision: 7,
  activeProjectId: "p",
  homeDraft: {},
  projects: [
    {
      id: "p",
      name: "Original",
      messages: [{ id: "m", role: "user" as const, content: "kept" }],
      items: [],
      composerDraft: { prompt: "draft", attachments: [] },
    },
  ],
});
async function storage(f: ReturnType<typeof createIndexedStorageFixture>) {
  return new Promise<IDBDatabase>((resolve) => {
    const open = f.factory.open("fixture");
    open.onsuccess = () => resolve(open.result);
  });
}
test("R2-T1-01: actual v3 codec validates canonical chats and active identity", () => {
  const project = createProject({
    prompt: "test",
    model: "m",
    kind: "text",
    attachments: [],
  });
  const snapshot = serializeCreationSnapshot({
    ...emptySnapshot(),
    version: 3,
    projects: [project],
    activeProjectId: project.id,
  });
  assert.equal(
    validateSnapshotV3(snapshot).projects[0].activeChatId,
    project.activeChatId,
  );
});
test("R2-T1-02: production migration preserves transcript and pending draft without modifying v2", () => {
  const source = legacy(),
    before = structuredClone(source),
    result = migrateSnapshotV2ToV3(source);
  assert.deepEqual(source, before);
  const chat = result.projects[0].chats[result.projects[0].activeChatId];
  assert.equal(chat.messages[0].content, "kept");
  assert.equal(chat.draft.prompt, "draft");
});
test("R2-T1-03: actual migration transaction publishes archives, both barriers and receipt together", async () => {
  const source = legacy(),
    raw = JSON.stringify(source),
    candidate = migrateSnapshotV2ToV3(source);
  const f = createIndexedStorageFixture({ snapshot: source });
  await commitIndexedChatMigration(
    await storage(f),
    { snapshot: source, backup: undefined, marker: undefined },
    candidate,
    { snapshot: raw },
  );
  assert.deepEqual(f.records.get("snapshot"), candidate);
  assert.deepEqual(f.records.get("backup"), candidate);
  assert.deepEqual(f.records.get("formatMarker"), {
    formatVersion: 2,
    minWriterVersion: 2,
  });
  assert.equal(
    (
      f.records.get(`chat-migration:archive:${sha256Hex(raw)}`) as {
        rawBytes: string;
      }
    ).rawBytes,
    raw,
  );
  assert.ok(
    f.records.has(
      `chat-migration:receipt:${sha256Hex(JSON.stringify(candidate))}`,
    ),
  );
});
test("R2-T1-04: production chat updates isolate drafts while preserving shared canvas", () => {
  const p = createProject({
    prompt: "",
    model: "m",
    kind: "text",
    attachments: [],
  });
  p.chats!.other = createDefaultChat("other");
  const next = updateActiveChat(p, (c) => ({
    ...c,
    draft: { ...c.draft, prompt: "first" },
    modelAllowlist: ["model-a"],
  }));
  assert.equal(next.chats!.other.draft.prompt, "");
  assert.deepEqual(next.chats!.other.modelAllowlist, []);
  assert.equal(next.items, p.items);
});
test("R2-T1-05: real snapshot boundary rejects nested credentials", () => {
  const candidate = migrateSnapshotV2ToV3(legacy());
  Object.assign(candidate.homeDraft, {
    credentials: { apiKey: "synthetic-fixture" },
  });
  assert.throws(() => validateSnapshotV3(candidate), /密钥|令牌|凭据/);
});
test("R2-T2-01: empty v2 project gets a real default chat", () => {
  const candidate = migrateSnapshotV2ToV3({
    ...legacy(),
    projects: [{ id: "empty", items: [] }],
  });
  const p = candidate.projects[0];
  assert.equal(p.activeChatId, "chat-default");
  assert.equal(p.chats[p.activeChatId].mainAgent, "codex");
  assert.deepEqual(p.chats[p.activeChatId].messages, []);
});
test("R2-T2-02: failed main write rolls the actual migration transaction back to its original records", async () => {
  const source = legacy(),
    f = createIndexedStorageFixture({ snapshot: source }, "snapshot");
  await assert.rejects(
    commitIndexedChatMigration(
      await storage(f),
      { snapshot: source, backup: undefined, marker: undefined },
      migrateSnapshotV2ToV3(source),
      { snapshot: JSON.stringify(source) },
    ),
  );
  assert.deepEqual(f.records.get("snapshot"), source);
  assert.equal(f.records.has("backup"), false);
  assert.equal(f.records.size, 1);
});
test("R2-T2-03: actual migration CAS refuses a concurrent source change", async () => {
  const source = legacy(),
    changed = { ...source, revision: 8 },
    f = createIndexedStorageFixture({ snapshot: changed });
  await assert.rejects(
    commitIndexedChatMigration(
      await storage(f),
      { snapshot: source, backup: undefined, marker: undefined },
      migrateSnapshotV2ToV3(source),
      {},
    ),
    /变化/,
  );
  assert.deepEqual(f.records.get("snapshot"), changed);
});
test("R2-T2-04: switching the actual chat projection keeps accepted tasks bound to their origin", () => {
  const p = createProject({
    prompt: "",
    model: "m",
    kind: "text",
    attachments: [],
  });
  const id = p.activeChatId;
  p.chats!.other = createDefaultChat("other");
  p.activeChatId = "other";
  const view = projectChatView({
    ...p,
    tasks: [
      {
        id: "t",
        originChatId: id,
        status: "running",
      } as (typeof p.tasks)[number],
    ],
  });
  assert.equal(view.tasks[0].originChatId, id);
  assert.equal(view.tasks[0].status, "running");
  assert.equal(view.activeChatId, "other");
});
test("R2-T2-05: serialization preserves independently updated real chats", () => {
  let p = createProject({
    prompt: "",
    model: "m",
    kind: "text",
    attachments: [],
  });
  for (let i = 0; i < 10; i++) {
    const id = `chat-${i}`;
    p = {
      ...p,
      chats: { ...p.chats, [id]: createDefaultChat(id) },
      activeChatId: id,
    };
    p = updateActiveChat(p, (c) => ({
      ...c,
      draft: { ...c.draft, prompt: `draft-${i}` },
    }));
  }
  const snapshot = serializeCreationSnapshot({
    ...emptySnapshot(),
    version: 3,
    projects: [p],
    activeProjectId: p.id,
  });
  for (let i = 0; i < 10; i++)
    assert.equal(
      snapshot.projects[0].chats![`chat-${i}`].draft.prompt,
      `draft-${i}`,
    );
});
