import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATION_STORAGE_KEY,
  serializeCreationSnapshot,
  type CreationSnapshot,
} from "../../src/features/creation/model.ts";
import {
  sha256Hex,
  migrateSnapshotV2ToV3,
} from "../../src/features/creation/chatMigration.ts";
import {
  loadCreationSnapshot,
  persistCreationSnapshotAsync,
  pendingRecoveryDraft,
} from "../../src/features/creation/storage.ts";

function fixture(initial: Record<string, unknown>, failKey?: string) {
  const records = new Map(Object.entries(structuredClone(initial)));
  const writes: string[] = [];
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  let beforeWrite: (() => void) | undefined;
  const storage = (values: Map<string, string>) => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const factory = {
    open: () => {
      const open = {
        onsuccess: undefined as (() => void) | undefined,
        result: {
          close: () => {},
          transaction: (_name: string, mode: string) => {
            if (mode === "readwrite") {
              beforeWrite?.();
              beforeWrite = undefined;
            }
            const staged = new Map(records);
            let pending = 0,
              aborted = false,
              scheduled = false;
            const transaction = {
              oncomplete: undefined as (() => void) | undefined,
              onabort: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
              error: null,
              abort: () => {
                aborted = true;
                queueMicrotask(() => transaction.onabort?.());
              },
              objectStore: () => ({
                get: (key: string) => {
                  pending++;
                  const request = {
                    result: undefined as unknown,
                    onsuccess: undefined as (() => void) | undefined,
                  };
                  queueMicrotask(() => {
                    request.result = structuredClone(staged.get(key));
                    request.onsuccess?.();
                    if (!--pending && !scheduled && mode === "readwrite") {
                      scheduled = true;
                      queueMicrotask(() => {
                        if (aborted) return;
                        records.clear();
                        for (const [key, value] of staged)
                          records.set(key, value);
                        transaction.oncomplete?.();
                      });
                    }
                  });
                  return request;
                },
                put: (value: unknown, key: string) => {
                  if (key === failKey)
                    throw new Error(`simulated write failure: ${key}`);
                  writes.push(key);
                  staged.set(key, structuredClone(value));
                },
                add: (value: unknown, key: string) => {
                  if (key === failKey || staged.has(key))
                    throw new Error(`immutable archive collision: ${key}`);
                  writes.push(key);
                  staged.set(key, structuredClone(value));
                },
              }),
            };
            return transaction;
          },
        },
      };
      queueMicrotask(() => open.onsuccess?.());
      return open;
    },
  } as unknown as IDBFactory;
  return {
    records,
    writes,
    local,
    session,
    factory,
    window: {
      localStorage: storage(local),
      sessionStorage: storage(session),
    } as unknown as Window & typeof globalThis,
    race: (action: () => void) => {
      beforeWrite = action;
    },
  };
}

function legacy() {
  return {
    version: 2,
    revision: 7,
    activeProjectId: "p",
    homeDraft: {},
    extra: "root",
    projects: [
      {
        id: "p",
        items: [],
        messages: [],
        agentThreadId: "original-thread",
        composerDraft: { prompt: "unassigned", attachments: [] },
        activeChatId: "one",
        chats: {
          one: {
            id: "one",
            name: "One",
            createdAt: 1,
            updatedAt: 1,
            draft: {},
            messages: [],
            mainAgent: "codex",
            modelAllowlist: [],
          },
          two: {
            id: "two",
            name: "Two",
            createdAt: 2,
            updatedAt: 2,
            draft: {},
            messages: [],
            mainAgent: "codex",
            modelAllowlist: [],
          },
        },
      },
    ],
  };
}

async function withFixture(
  f: ReturnType<typeof fixture>,
  action: () => Promise<void>,
) {
  const oldWindow = globalThis.window,
    oldIndexed = globalThis.indexedDB;
  globalThis.window = f.window;
  globalThis.indexedDB = f.factory;
  try {
    await action();
  } finally {
    globalThis.window = oldWindow;
    globalThis.indexedDB = oldIndexed;
  }
}

test("IDB migration atomically archives every source, preserves the thread and reopens editable", async () => {
  const original = legacy(),
    oldBackup = { ...legacy(), revision: 6 };
  const f = fixture({ snapshot: original, backup: oldBackup });
  const localRaw = JSON.stringify(original, null, 2);
  f.local.set(CREATION_STORAGE_KEY, localRaw);
  const journalRaw = JSON.stringify({ baseRevision: 7, snapshot: original });
  f.session.set(`${CREATION_STORAGE_KEY}:pending`, journalRaw);
  await withFixture(f, async () => {
    const loaded = await loadCreationSnapshot(true);
    assert.equal(loaded.readOnlyReason, undefined);
    assert.equal(loaded.snapshot.version, 3);
    assert.equal(
      loaded.snapshot.projects[0].chats!["legacy-codex"].agentThreadId,
      "original-thread",
    );
    assert.equal(
      loaded.snapshot.projects[0].chats!.one.agentThreadId,
      undefined,
    );
    assert.deepEqual(f.records.get("backup"), f.records.get("snapshot"));
    assert.deepEqual(f.records.get("formatMarker"), {
      formatVersion: 2,
      minWriterVersion: 2,
    });
    for (const raw of [
      JSON.stringify(original),
      JSON.stringify(oldBackup),
      localRaw,
      journalRaw,
    ])
      assert.equal(
        (
          f.records.get(`chat-migration:archive:${sha256Hex(raw)}`) as {
            rawBytes: string;
          }
        ).rawBytes,
        raw,
      );
    assert.equal(f.session.get(`${CREATION_STORAGE_KEY}:pending`), journalRaw);
    const reopened = await loadCreationSnapshot(true);
    assert.deepEqual(
      serializeCreationSnapshot(reopened.snapshot),
      serializeCreationSnapshot(loaded.snapshot),
    );
    const next = { ...loaded.snapshot, revision: loaded.snapshot.revision + 1 };
    await persistCreationSnapshotAsync(next);
    assert.equal(
      (f.records.get("snapshot") as CreationSnapshot).revision,
      next.revision,
    );
    assert.equal(
      Object.hasOwn(
        (f.records.get("snapshot") as CreationSnapshot).projects[0],
        "composerDraft",
      ),
      false,
    );
  });
});

test("IDB failure at either barrier or marker rolls back archives and keeps weak originals", async () => {
  for (const key of ["backup", "snapshot", "formatMarker"]) {
    const original = legacy();
    const f = fixture({ snapshot: original, backup: original }, key);
    const raw = JSON.stringify(original, null, 1);
    f.local.set(CREATION_STORAGE_KEY, raw);
    await withFixture(f, async () => {
      await assert.rejects(loadCreationSnapshot(), /failure/);
      assert.deepEqual(
        [...f.records],
        Object.entries({ snapshot: original, backup: original }),
      );
      assert.equal(f.local.get(CREATION_STORAGE_KEY), raw);
      await assert.rejects(
        persistCreationSnapshotAsync({
          ...original,
          revision: 8,
        } as CreationSnapshot),
      );
    });
  }
});

test("IDB migration rejects a concurrent source change before any publication", async () => {
  const original = legacy();
  const f = fixture({ snapshot: original });
  const newer = { ...legacy(), revision: 8 };
  f.race(() => f.records.set("snapshot", newer));
  await withFixture(f, async () => {
    await assert.rejects(loadCreationSnapshot(), /变化/);
    assert.deepEqual(f.records.get("snapshot"), newer);
    assert.deepEqual(f.writes, []);
  });
});

test("future main, backup, marker, local and journal reject before migration writes", async () => {
  for (const source of [
    "snapshot",
    "backup",
    "formatMarker",
    "local",
    "journal",
  ]) {
    const original = legacy(),
      future = { ...legacy(), version: 99 };
    const f = fixture({
      snapshot: original,
      ...(source === "backup" ? { backup: future } : {}),
      ...(source === "formatMarker"
        ? { formatMarker: { formatVersion: 99, minWriterVersion: 99 } }
        : {}),
    });
    if (source === "snapshot") f.records.set("snapshot", future);
    if (source === "local")
      f.local.set(CREATION_STORAGE_KEY, JSON.stringify(future));
    if (source === "journal")
      f.session.set(
        `${CREATION_STORAGE_KEY}:pending`,
        JSON.stringify({ snapshot: future }),
      );
    const before = structuredClone([...f.records]);
    await withFixture(f, async () => {
      try {
        assert.ok((await loadCreationSnapshot()).readOnlyReason);
      } catch (error) {
        assert.match(String(error), /不受支持/);
      }
      assert.deepEqual([...f.records], before);
      assert.deepEqual(f.writes, []);
    });
  }
});

test("an upgraded IDB rejects v3-to-v2 writes and a concurrent lower backup", async () => {
  const original = {
    version: 2,
    revision: 1,
    activeProjectId: null,
    homeDraft: {},
    projects: [],
  };
  const f = fixture({ snapshot: original, backup: original });
  await withFixture(f, async () => {
    const loaded = await loadCreationSnapshot();
    const main = structuredClone(f.records.get("snapshot"));
    f.writes.length = 0;
    await assert.rejects(
      persistCreationSnapshotAsync({
        ...loaded.snapshot,
        version: 2,
        revision: 3,
      }),
      /降级/,
    );
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.records.get("snapshot"), main);
    f.records.set("backup", original);
    await assert.rejects(
      persistCreationSnapshotAsync({ ...loaded.snapshot, revision: 3 }),
      /屏障/,
    );
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.records.get("backup"), original);
    assert.deepEqual(f.records.get("snapshot"), main);
  });
});

test("format2 raw v3 legacy roots migrate from raw records with archives before editing", async () => {
  const source = legacy();
  const raw = {
    ...source,
    version: 3,
    projects: [
      {
        ...source.projects[0],
        agentThreadId: undefined,
        composerDraft: { prompt: "root", attachments: [] },
        messages: [{ id: "root-m", role: "user", content: "root" }],
        chats: {
          one: {
            ...source.projects[0].chats.one,
            draft: { prompt: "chat" },
            messages: [{ id: "chat-m", role: "user", content: "chat" }],
          },
        },
      },
    ],
  };
  delete raw.projects[0].agentThreadId;
  const original = JSON.stringify(raw);
  for (const fail of [undefined, "formatMarker"]) {
    const f = fixture(
      {
        snapshot: raw,
        backup: raw,
        formatMarker: { formatVersion: 2, minWriterVersion: 2 },
      },
      fail,
    );
    await withFixture(f, async () => {
      if (fail) {
        await assert.rejects(loadCreationSnapshot(), /failure/);
        assert.equal(JSON.stringify(f.records.get("snapshot")), original);
        assert.equal(JSON.stringify(f.records.get("backup")), original);
        assert.equal(
          [...f.records.keys()].some((key) =>
            key.startsWith("chat-migration:archive:"),
          ),
          false,
        );
        return;
      }
      const loaded = await loadCreationSnapshot();
      assert.equal(loaded.readOnlyReason, undefined);
      assert.equal(loaded.snapshot.projects[0].chats!.one.draft.prompt, "chat");
      assert.equal(
        loaded.snapshot.projects[0].chats!["legacy-history"].draft.prompt,
        "root",
      );
      assert.deepEqual(
        loaded.snapshot.projects[0].chats!["legacy-history"].messages,
        raw.projects[0].messages,
      );
      assert.equal(
        (
          f.records.get(`chat-migration:archive:${sha256Hex(original)}`) as {
            rawBytes: string;
          }
        ).rawBytes,
        original,
      );
      assert.equal(
        Object.hasOwn(
          (f.records.get("snapshot") as CreationSnapshot).projects[0],
          "composerDraft",
        ),
        false,
      );
      await persistCreationSnapshotAsync({
        ...loaded.snapshot,
        revision: loaded.snapshot.revision + 1,
      });
      assert.equal(
        (await loadCreationSnapshot()).snapshot.projects[0].chats![
          "legacy-history"
        ].draft.prompt,
        "root",
      );
    });
  }
});

test("unselected raw v3 legacy recovery sources remain readable and cannot be consumed by saving", async () => {
  const canonical = migrateSnapshotV2ToV3(legacy() as never);
  const rawRecovery = { ...legacy(), version: 3 };
  for (const source of ["backup", "local", "journal"]) {
    const f = fixture({
      snapshot: canonical,
      backup: source === "backup" ? rawRecovery : canonical,
      formatMarker: { formatVersion: 2, minWriterVersion: 2 },
    });
    if (source === "local")
      f.local.set(CREATION_STORAGE_KEY, JSON.stringify(rawRecovery));
    const key = `${CREATION_STORAGE_KEY}:pending`;
    const journal = JSON.stringify({ snapshot: rawRecovery, baseRevision: 7 });
    if (source === "journal") f.session.set(key, journal);
    const before = JSON.stringify([...f.records]);
    await withFixture(f, async () => {
      const loaded = await loadCreationSnapshot(true);
      assert.match(loaded.readOnlyReason!, /旧聊天权威/);
      assert.equal(
        loaded.recoveryDraft!.projects[0].chats!["legacy-history"].draft.prompt,
        "unassigned",
      );
      await assert.rejects(
        persistCreationSnapshotAsync({
          ...loaded.snapshot,
          revision: loaded.snapshot.revision + 1,
        }),
      );
      assert.equal(JSON.stringify([...f.records]), before);
      assert.deepEqual(f.writes, []);
      if (source === "journal") {
        assert.equal(f.session.get(key), journal);
        assert.equal(
          pendingRecoveryDraft()!.projects[0].chats!["legacy-history"].draft
            .prompt,
          "unassigned",
        );
      }
    });
  }
});
