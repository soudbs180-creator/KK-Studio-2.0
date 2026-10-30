import assert from "node:assert/strict";
import test from "node:test";
import { decodeSnapshot } from "../../src/features/creation/snapshotCodec.ts";

const hash = "e".repeat(64);
const receiptKey = `chatgpt-${"a".repeat(32)}`;
function fixture() {
  return {
    version: 3,
    revision: 9,
    activeProjectId: "existing-project",
    homeDraft: { prompt: "unsent home", retainedHomeMetadata: { width: 8 } },
    retainedSnapshotMetadata: { label: "existing" },
    projects: [
      {
        id: "existing-project",
        activeChatId: "existing-chat",
        items: [],
        tasks: [],
        retainedProjectMetadata: { label: "existing" },
        imageArchiveReceipts: {
          [receiptKey]: {
            jobId: "original-job",
            sha256: hash,
            assetId: `asset-${hash.slice(0, 24)}`,
            chatId: null,
          },
        },
        chats: {
          "existing-chat": {
            id: "existing-chat",
            name: "existing",
            createdAt: 1,
            updatedAt: 2,
            mainAgent: "codex",
            modelAllowlist: [],
            draft: { text: "unsent", retainedDraftMetadata: { width: 4 } },
            retainedChatMetadata: { label: "existing" },
            messages: [
              {
                id: "tool",
                role: "tool",
                content: "tool response",
                createdAt: 1,
              },
              {
                id: "error",
                role: "error",
                content: "error response",
                createdAt: 2,
              },
            ],
          },
        },
      },
    ],
  };
}

function roundtrip(value: unknown) {
  return decodeSnapshot(JSON.parse(JSON.stringify(decodeSnapshot(value))));
}

test("release upgrade retains existing tool/error messages without changing roles", () => {
  const source = fixture();
  const loaded = roundtrip(source);
  assert.deepEqual(
    loaded.projects[0].chats?.["existing-chat"].messages,
    source.projects[0].chats["existing-chat"].messages,
  );
});

test("release upgrade retains unknown v3 metadata and long message bodies", () => {
  const source = fixture();
  source.projects[0].chats["existing-chat"].messages = [
    { id: "long", role: "assistant", content: "x".repeat(24001), createdAt: 1 },
  ];
  const loaded = roundtrip(source);
  assert.deepEqual(loaded.homeDraft, {
    ...loaded.homeDraft,
    ...source.homeDraft,
  });
  assert.equal(
    Reflect.get(loaded, "retainedSnapshotMetadata").label,
    "existing",
  );
  const project = loaded.projects[0];
  assert.equal(
    Reflect.get(project, "retainedProjectMetadata").label,
    "existing",
  );
  assert.equal(
    project.chats?.["existing-chat"].messages[0].content.length,
    24001,
  );
  assert.deepEqual(project.chats?.["existing-chat"].retainedChatMetadata, {
    label: "existing",
  });
  assert.deepEqual(
    project.chats?.["existing-chat"].draft.retainedDraftMetadata,
    { width: 4 },
  );
});

test("release upgrade retains immutable image archive receipts", () => {
  const source = fixture();
  source.projects[0].chats["existing-chat"].messages = [];
  assert.deepEqual(
    Reflect.get(roundtrip(source).projects[0], "imageArchiveReceipts"),
    source.projects[0].imageArchiveReceipts,
  );
});

test("release upgrade rejects a malformed receipt instead of normalizing it away", () => {
  const source = fixture();
  source.projects[0].chats["existing-chat"].messages = [];
  source.projects[0].imageArchiveReceipts[receiptKey].assetId =
    "asset-mismatch";
  assert.throws(() => roundtrip(source));
});

test("release upgrade retains old v2 archive receipts and rejects invalid identities", () => {
  const source = fixture();
  source.version = 2;
  source.projects[0].chats["existing-chat"].messages = [];
  assert.deepEqual(
    Reflect.get(roundtrip(source).projects[0], "imageArchiveReceipts"),
    source.projects[0].imageArchiveReceipts,
  );
  for (const receipt of [
    null,
    [],
    { ...source.projects[0].imageArchiveReceipts[receiptKey], jobId: "" },
    {
      ...source.projects[0].imageArchiveReceipts[receiptKey],
      sha256: "E".repeat(64),
    },
    { ...source.projects[0].imageArchiveReceipts[receiptKey], chatId: "" },
  ]) {
    const bad = structuredClone(source);
    Reflect.set(bad.projects[0], "imageArchiveReceipts", {
      [receiptKey]: receipt,
    });
    assert.throws(() => roundtrip(bad));
  }
});
