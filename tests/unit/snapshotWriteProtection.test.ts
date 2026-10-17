import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATION_STORAGE_KEY,
  createProject,
  emptySnapshot,
  projectChatExecutionBlockReason,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import {
  loadCreationSnapshot,
  persistCreationSnapshotAsync,
  persistCreationSnapshotSync,
} from "../../src/features/creation/storage.ts";

function unsafeSnapshot(): CreationSnapshot {
  const project = createProject({
    prompt: "",
    model: "",
    kind: "image",
    attachments: [],
  });
  const chat = Object.values(project.chats!)[0];
  project.chats = {
    ...project.chats,
    private: {
      ...chat,
      id: "private",
      isTemporary: true,
      draft: { ...chat.draft, prompt: "PRIVATE_TEMP_DRAFT" },
    },
  };
  project.activeChatId = "private";
  project.composerDraft.prompt = "PRIVATE_TEMP_DRAFT";
  return {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
    revision: 2,
  };
}

function storage() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  return {
    values,
    writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      values.set(key, value);
    },
    removeItem: (key: string) => {
      writes.push(key);
      values.delete(key);
    },
  };
}

test("native backup-only read protection also blocks an otherwise valid v2 main", async () => {
  const original = globalThis.window;
  const commands: string[] = [];
  globalThis.window = {
    __TAURI_INTERNALS__: {
      invoke: async (command: string) => {
        commands.push(command);
        return {
          status: "loaded",
          snapshot: emptySnapshot(),
          readOnlyReason: "未来格式备份仅供恢复查看",
        };
      },
    },
  } as unknown as Window & typeof globalThis;
  try {
    const loaded = await loadCreationSnapshot();
    assert.equal(loaded.snapshot.version, 2);
    assert.equal(loaded.readOnlyReason, "未来格式备份仅供恢复查看");
    await assert.rejects(
      persistCreationSnapshotAsync({ ...loaded.snapshot, revision: 1 }),
    );
    assert.deepEqual(commands, ["read_creation_snapshot"]);
  } finally {
    globalThis.window = original;
  }
});

test("native loading keeps unsafe historical snapshots readable without allowing a rewrite", async () => {
  const original = globalThis.window;
  const snapshot = unsafeSnapshot();
  const raw = JSON.stringify(snapshot);
  const commands: string[] = [];
  globalThis.window = {
    __TAURI_INTERNALS__: {
      invoke: async (command: string) => {
        commands.push(command);
        return { status: "loaded", snapshot };
      },
    },
  } as unknown as Window & typeof globalThis;
  try {
    const loaded = await loadCreationSnapshot();
    assert.ok(
      (loaded as typeof loaded & { readOnlyReason?: string }).readOnlyReason,
    );
    assert.equal(
      loaded.snapshot.projects[0].composerDraft.prompt,
      "PRIVATE_TEMP_DRAFT",
    );
    await assert.rejects(persistCreationSnapshotAsync(loaded.snapshot));
    assert.deepEqual(commands, ["read_creation_snapshot"]);
    assert.equal(JSON.stringify(snapshot), raw);
  } finally {
    globalThis.window = original;
  }
});

test("unsafe input is rejected before asset encoding, native writes or browser journals", async () => {
  const original = globalThis.window;
  const commands: string[] = [];
  const journal = storage();
  const settings = storage();
  globalThis.window = {
    __TAURI_INTERNALS__: {
      invoke: async (command: string) => {
        commands.push(command);
        return { status: "missing", snapshot: null };
      },
    },
  } as unknown as Window & typeof globalThis;
  try {
    await loadCreationSnapshot();
    await assert.rejects(persistCreationSnapshotAsync(unsafeSnapshot()));
    assert.deepEqual(commands, ["read_creation_snapshot"]);
    globalThis.window = {
      sessionStorage: journal,
      localStorage: settings,
    } as unknown as Window & typeof globalThis;
    persistCreationSnapshotSync(unsafeSnapshot());
    assert.deepEqual(journal.writes, []);
    assert.deepEqual(settings.writes, []);
  } finally {
    globalThis.window = original;
  }
});

test("preferDurable never consumes an unsupported recovery journal", async () => {
  const originalWindow = globalThis.window;
  const originalIndexed = globalThis.indexedDB;
  const journal = storage();
  const settings = storage();
  const key = `${CREATION_STORAGE_KEY}:pending`;
  const raw = JSON.stringify({
    baseRevision: null,
    snapshot: unsafeSnapshot(),
  });
  journal.values.set(key, raw);
  globalThis.window = {
    sessionStorage: journal,
    localStorage: settings,
  } as unknown as Window & typeof globalThis;
  globalThis.indexedDB = {
    open: () => {
      const request = {
        result: {
          transaction: () => ({
            objectStore: () => ({
              get: () => {
                const read = {
                  result: null,
                  onsuccess: null as (() => void) | null,
                };
                queueMicrotask(() => read.onsuccess?.());
                return read;
              },
            }),
          }),
          close: () => {},
        },
        onsuccess: null as (() => void) | null,
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  } as unknown as IDBFactory;
  try {
    const loaded = await loadCreationSnapshot(true);
    assert.equal(journal.getItem(key), raw);
    assert.deepEqual(journal.writes, []);
    assert.ok(
      (loaded as typeof loaded & { readOnlyReason?: string }).readOnlyReason,
    );
    await assert.rejects(persistCreationSnapshotAsync(emptySnapshot()));
    assert.deepEqual(settings.writes, []);
  } finally {
    globalThis.window = originalWindow;
    globalThis.indexedDB = originalIndexed;
  }
});

function indexedFixture(records: Map<string, unknown>) {
  const writes: string[] = [];
  return {
    writes,
    factory: {
      open: () => {
        const request = {
          result: {
            close: () => {},
            transaction: (_store: string, mode: string) => {
              let pending = 0;
              let aborted = false;
              const transaction = {
                oncomplete: null as (() => void) | null,
                onabort: null as (() => void) | null,
                onerror: null as (() => void) | null,
                error: null,
                abort: () => {
                  aborted = true;
                  queueMicrotask(() => transaction.onabort?.());
                },
                objectStore: () => ({
                  get: (key: string) => {
                    pending++;
                    const read = {
                      result: undefined as unknown,
                      onsuccess: null as (() => void) | null,
                    };
                    queueMicrotask(() => {
                      read.result = records.get(key);
                      read.onsuccess?.();
                      if (!--pending && mode === "readwrite")
                        queueMicrotask(() => {
                          if (!aborted) transaction.oncomplete?.();
                        });
                    });
                    return read;
                  },
                  put: (value: unknown, key: string) => {
                    writes.push(key);
                    records.set(key, value);
                  },
                }),
              };
              return transaction;
            },
          },
          onsuccess: null as (() => void) | null,
        };
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    } as unknown as IDBFactory,
  };
}

test("raw v2 chat identities cannot become writable through normalization", async () => {
  const originalWindow = globalThis.window;
  const originalIndexed = globalThis.indexedDB;
  const project = unsafeSnapshot().projects[0];
  delete project.chats!.private;
  project.activeChatId = Object.keys(project.chats!)[0];
  const valid = {
    ...emptySnapshot(),
    projects: [project],
    activeProjectId: project.id,
    revision: 1,
  };
  const malformed = [
    { ...project, activeChatId: "missing-chat" },
    { ...project, activeChatId: undefined },
    { ...project, chats: undefined },
    { ...project, chats: [] },
    { ...project, agentThreadId: "bad/root" },
    {
      ...project,
      agentThreadId: "valid-root",
      chats: {
        [project.activeChatId]: {
          ...project.chats![project.activeChatId],
          agentThreadId: "bad/thread",
        },
      },
    },
  ];
  try {
    for (const candidate of malformed) {
      const raw = { ...valid, projects: [candidate] };
      for (const source of [
        "snapshot",
        "backup",
        "local",
        "journal",
        "native",
      ]) {
        const records = new Map<string, unknown>([
          ["snapshot", source === "snapshot" ? raw : valid],
        ]);
        if (source === "backup") records.set("backup", raw);
        const fixture = indexedFixture(records);
        const local = storage(),
          journal = storage();
        if (source === "local")
          local.values.set(CREATION_STORAGE_KEY, JSON.stringify(raw));
        if (source === "journal")
          journal.values.set(
            `${CREATION_STORAGE_KEY}:pending`,
            JSON.stringify({ snapshot: raw }),
          );
        const commands: string[] = [];
        globalThis.window = (source === "native"
          ? {
              __TAURI_INTERNALS__: {
                invoke: async (command: string) => {
                  commands.push(command);
                  return { status: "loaded", snapshot: raw };
                },
              },
            }
          : {
              localStorage: local,
              sessionStorage: journal,
            }) as unknown as Window & typeof globalThis;
        globalThis.indexedDB = fixture.factory;
        try {
          const loaded = await loadCreationSnapshot(true);
          assert.ok(
            loaded.readOnlyReason,
            `${source} must retain raw identity protection`,
          );
        } catch (error) {
          assert.match(String(error), /项目|聊天/);
        }
        await assert.rejects(
          persistCreationSnapshotAsync({ ...valid, revision: 2 }),
        );
        assert.deepEqual(fixture.writes, []);
        assert.deepEqual(local.writes, []);
        assert.deepEqual(journal.writes, []);
        assert.deepEqual(
          commands,
          source === "native" ? ["read_creation_snapshot"] : [],
        );
      }
      assert.ok(projectChatExecutionBlockReason(candidate as typeof project));
    }
    const records = new Map<string, unknown>([["snapshot", valid]]);
    const fixture = indexedFixture(records);
    globalThis.window = {
      localStorage: storage(),
      sessionStorage: storage(),
    } as unknown as Window & typeof globalThis;
    globalThis.indexedDB = fixture.factory;
    await loadCreationSnapshot();
    records.set("snapshot", { ...valid, projects: [malformed[0]] });
    await assert.rejects(
      persistCreationSnapshotAsync({ ...valid, revision: 2 }),
    );
    assert.deepEqual(fixture.writes, []);
  } finally {
    globalThis.window = originalWindow;
    globalThis.indexedDB = originalIndexed;
  }
});

test("a v3 backup protects the older main and journal, including a concurrent backup change", async () => {
  const originalWindow = globalThis.window;
  const originalIndexed = globalThis.indexedDB;
  const original = { ...emptySnapshot(), revision: 1 };
  const backup = { ...unsafeSnapshot(), version: 3 };
  const backupBytes = JSON.stringify(backup);
  const records = new Map<string, unknown>([
    ["snapshot", original],
    ["backup", backup],
  ]);
  const fixture = indexedFixture(records);
  const journal = storage();
  const key = `${CREATION_STORAGE_KEY}:pending`;
  const rawJournal = JSON.stringify({
    baseRevision: 1,
    snapshot: { ...emptySnapshot(), revision: 2 },
  });
  journal.values.set(key, rawJournal);
  globalThis.window = {
    sessionStorage: journal,
    localStorage: storage(),
  } as unknown as Window & typeof globalThis;
  globalThis.indexedDB = fixture.factory;
  try {
    const loaded = await loadCreationSnapshot(true);
    assert.ok(loaded.readOnlyReason);
    assert.equal(loaded.recoveryDraft?.version, 3);
    assert.equal(journal.getItem(key), rawJournal);
    await assert.rejects(
      persistCreationSnapshotAsync({ ...original, revision: 2 }),
    );
    assert.deepEqual(fixture.writes, []);
    records.set("backup", original);
    await loadCreationSnapshot();
    records.set("backup", backup);
    await assert.rejects(
      persistCreationSnapshotAsync({ ...original, revision: 2 }),
      /仅供恢复查看/,
    );
    assert.deepEqual(fixture.writes, []);
    assert.equal(records.get("snapshot"), original);
    assert.equal(JSON.stringify(records.get("backup")), backupBytes);
    assert.equal(journal.getItem(key), rawJournal);
  } finally {
    globalThis.window = originalWindow;
    globalThis.indexedDB = originalIndexed;
  }
});

test("future writer markers block changes while supported v2 backups still save", async () => {
  const originalWindow = globalThis.window;
  const originalIndexed = globalThis.indexedDB;
  const original = { ...emptySnapshot(), revision: 1 };
  const records = new Map<string, unknown>([
    ["snapshot", original],
    ["backup", original],
    ["formatMarker", { formatVersion: 2, minWriterVersion: 2 }],
  ]);
  const fixture = indexedFixture(records);
  globalThis.window = {
    sessionStorage: storage(),
    localStorage: storage(),
  } as unknown as Window & typeof globalThis;
  globalThis.indexedDB = fixture.factory;
  try {
    assert.ok((await loadCreationSnapshot()).readOnlyReason);
    await assert.rejects(
      persistCreationSnapshotAsync({ ...original, revision: 2 }),
    );
    assert.deepEqual(fixture.writes, []);
    records.delete("formatMarker");
    assert.equal((await loadCreationSnapshot()).readOnlyReason, undefined);
    await persistCreationSnapshotAsync({ ...original, revision: 2 });
    assert.equal((records.get("snapshot") as CreationSnapshot).revision, 2);
    assert.equal((records.get("backup") as CreationSnapshot).revision, 1);
  } finally {
    globalThis.window = originalWindow;
    globalThis.indexedDB = originalIndexed;
  }
});
