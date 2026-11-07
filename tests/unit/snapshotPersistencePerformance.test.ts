import { featureEntryMocks } from "../support/featureEntryMocks.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as model from "../../src/features/creation/model.ts";
import * as codec from "../../src/features/creation/snapshotCodec.ts";
import * as assets from "../../src/features/creation/snapshotAssets.ts";
import { createProjectCanvas } from "../../src/domain/projectCanvas.ts";

function snapshot(): model.CreationSnapshot {
  const project = model.updateActiveChat(
    model.createProject({
      prompt: "",
      model: "",
      kind: "image",
      attachments: [],
    }),
    (chat) => ({ ...chat, draft: { ...chat.draft, prompt: "Keep my draft" } }),
  );
  const items = [
    { id: "image", kind: "image" as const, title: "Image", description: "" },
  ];
  return {
    ...model.emptySnapshot(),
    version: 3,
    schemaVersion: 3,
    revision: 7,
    activeProjectId: project.id,
    projects: [{ ...project, items, canvas: createProjectCanvas(items) }],
  };
}

async function harness() {
  const values = new Map<string, string>();
  const writes: { command: string; args: Record<string, unknown> }[] = [];
  let serializations = 0;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const window: {
    __TAURI_INTERNALS__?: object;
    localStorage: typeof storage;
    sessionStorage: typeof storage;
  } = {
    __TAURI_INTERNALS__: {},
    localStorage: storage,
    sessionStorage: storage,
  };
  const forbidden = () => {
    throw new Error("Unexpected asset or migration operation");
  };
  const modules: Record<string, unknown> = {
    "@tauri-apps/api/core": {
      invoke: async (command: string, args: Record<string, unknown>) => {
        if (command === "read_creation_snapshot")
          return { status: "missing", snapshot: null };
        assert.equal(command, "write_creation_snapshot");
        codec.decodeSnapshot(args.snapshot);
        writes.push({ command, args });
      },
    },
    "./assetRepository.ts": { loadStoredAsset: forbidden },
    "./snapshotAssets.ts": assets,
    "../local-service/client.ts": {},
    "../local-service/connection.ts": { readCompanionConnection: () => null },
    "./model.ts": {
      ...model,
      serializeCreationSnapshot: (value: model.CreationSnapshot) => {
        serializations++;
        return model.serializeCreationSnapshot(value);
      },
    },
    "./snapshotCodec.ts": codec,
    "./chatMigration.ts": {},
    "./indexedChatMigration.ts": {},
  };
  const exports = {} as typeof import("../../src/features/creation/storage.ts");
  const source = readFileSync(
    new URL("../../src/features/creation/storage.ts", import.meta.url),
    "utf8",
  );
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      window,
      require: (id: string) => {
        const allModules = featureEntryMocks(modules);
        assert(id in allModules, `Unexpected dependency: ${id}`);
        return allModules[id];
      },
    },
  );
  await exports.loadCreationSnapshot();
  delete window.__TAURI_INTERNALS__;
  return {
    api: exports,
    values,
    writes,
    serializations: () => serializations,
    native: () => {
      window.__TAURI_INTERNALS__ = {};
    },
  };
}

test("every Web preview is immediately recoverable with one authority validation and canonicalization", async () => {
  const fixture = await harness();
  const initial = snapshot();
  const key = `${model.CREATION_STORAGE_KEY}:pending`;
  for (let step = 1; step <= 100; step++) {
    const value = {
      ...initial,
      revision: 7 + step,
      projects: initial.projects.map((project) => ({
        ...project,
        canvas: { ...project.canvas, positions: { image: { x: step, y: 0 } } },
      })),
    };
    fixture.api.persistCreationSnapshotSync(value);
    const journal = JSON.parse(fixture.values.get(key)!);
    assert.equal(journal.baseRevision, null);
    assert.equal(journal.snapshot.revision, 7 + step);
    assert.equal(journal.snapshot.projects[0].canvas.positions.image.x, step);
    assert.equal(
      Object.hasOwn(journal.snapshot.projects[0], "messages"),
      false,
    );
    assert.equal(
      Object.hasOwn(journal.snapshot.projects[0], "composerDraft"),
      false,
    );
    assert.equal(
      journal.snapshot.projects[0].chats[initial.projects[0].activeChatId!]
        .draft.prompt,
      "Keep my draft",
    );
    assert.equal(fixture.api.pendingRecoveryDraft()!.revision, 7 + step);
    codec.decodeSnapshot(journal.snapshot);
  }
  assert.equal(fixture.serializations(), 100);
});

test("oversized Web journals keep the prior recovery draft and conflicting authority cannot overwrite it", async () => {
  const fixture = await harness();
  const initial = snapshot();
  fixture.api.persistCreationSnapshotSync(initial);
  const key = `${model.CREATION_STORAGE_KEY}:pending`;
  const original = fixture.values.get(key);
  fixture.api.persistCreationSnapshotSync({
    ...initial,
    revision: 8,
    homeDraft: {
      ...initial.homeDraft,
      prompt: "x".repeat(4_000_000),
    },
  });
  assert.equal(fixture.values.get(key), original);
  const unsafe = {
    ...initial,
    revision: 9,
    projects: [
      {
        ...initial.projects[0],
        composerDraft: {
          ...initial.projects[0].composerDraft,
          prompt: "UNSYNCHRONIZED PRIVATE DRAFT",
        },
      },
    ],
  };
  assert.throws(
    () => fixture.api.persistCreationSnapshotSync(unsafe),
    /权威|迁移/,
  );
  assert.equal(fixture.values.get(key), original);
  assert.equal(fixture.writes.length, 0);
});

test("Desktop skips the synchronous journal and performs one canonicalization before the CAS write", async () => {
  const fixture = await harness();
  fixture.native();
  const value = snapshot();
  fixture.api.persistCreationSnapshotSync(value);
  assert.equal(fixture.values.size, 0);
  assert.equal(fixture.serializations(), 0);
  await fixture.api.persistCreationSnapshotAsync(value);
  assert.equal(fixture.serializations(), 1);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.writes[0].args.expectedRevision, null);
  const stored = fixture.writes[0].args.snapshot as model.CreationSnapshot;
  assert.equal(stored.revision, 7);
  assert.equal(Object.hasOwn(stored.projects[0], "composerDraft"), false);
  assert.equal(value.projects[0].composerDraft.prompt, "Keep my draft");
  assert.equal(fixture.values.size, 0);
  await assert.rejects(
    fixture.api.persistCreationSnapshotAsync({
      ...value,
      projects: [
        {
          ...value.projects[0],
          composerDraft: {
            ...value.projects[0].composerDraft,
            prompt: "UNSYNCHRONIZED PRIVATE DRAFT",
          },
        },
      ],
    }),
    /权威|迁移/,
  );
  assert.equal(fixture.writes.length, 1);
});
