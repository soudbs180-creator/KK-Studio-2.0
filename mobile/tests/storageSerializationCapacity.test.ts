import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { CreationTask } from "@kk-studio/creation-contracts";
import {
  emptyMobileSnapshot,
  newMobileDraft,
  type MobileSnapshot,
} from "../src/core/mobileModel.ts";
import { MobileRepository } from "../src/storage/repository.ts";
import type { SnapshotBackend } from "../src/storage/ports.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import { parseSnapshot } from "../src/storage/validation.ts";

const maximumBytes = 8 * 1024 * 1024;
const queuedTask: CreationTask = {
  id: "task",
  idempotencyKey: "intent",
  kind: "text",
  prompt: "Preserved input",
  model: "m",
  status: "queued",
  submissionState: "intent",
  createdAt: 100,
  updatedAt: 100,
  attachments: [],
  attempt: 1,
  requestedOutputs: 1,
  completedOutputs: 0,
  privacyMode: "byok_local",
  outputs: [{ index: 0, status: "waiting", model: "m", createdAt: 100 }],
};

function snapshot(revision: number, recover = false): MobileSnapshot {
  const value = emptyMobileSnapshot();
  value.revision = revision;
  value.activeProjectId = "project";
  value.projects = [
    {
      id: "project",
      name: "Preserved creation",
      revision,
      createdAt: 100,
      updatedAt: 100,
      composerDraft: newMobileDraft(100),
      tasks: recover ? [structuredClone(queuedTask)] : [],
      messages: [0, 1, 2].map((index) => ({
        id: `message-${index}`,
        projectId: "project",
        conversationId: "conversation",
        role: "assistant",
        text: index < 2 ? "界".repeat(1_048_576) : "",
        createdAt: 100,
      })),
      assetIds: [],
      canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  ];
  return value;
}

function exactPayload(value: MobileSnapshot, byteCount: number): string {
  const remaining =
    byteCount - Buffer.byteLength(JSON.stringify(value), "utf8");
  assert.ok(remaining >= 0);
  // Three-byte BMP plus a four-byte surrogate pair keeps UTF-16 below the byte cap.
  value.projects[0].messages[2].text =
    "界😀".repeat(Math.floor(remaining / 7)) + "x".repeat(remaining % 7);
  const payload = JSON.stringify(value);
  assert.equal(Buffer.byteLength(payload, "utf8"), byteCount);
  parseSnapshot(payload);
  return payload;
}

function fixture(initial: string, useSqlite = false) {
  const db = useSqlite ? new DatabaseSync(":memory:") : undefined;
  let payload = initial,
    writeCalls = 0;
  let storage: SnapshotBackend;
  if (db) {
    db.exec(
      "CREATE TABLE mobile_snapshots(account TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)",
    );
    db.prepare("INSERT INTO mobile_snapshots VALUES (?,?,?)").run(
      "alice",
      JSON.parse(initial).revision,
      initial,
    );
    storage = new SqliteSnapshotBackend({
      async execAsync(sql) {
        db.exec(sql);
      },
      async getFirstAsync<T>(sql: string, ...parameters: (string | number)[]) {
        return (db.prepare(sql).get(...parameters) ?? null) as T | null;
      },
      async runAsync(sql, ...parameters) {
        return { changes: Number(db.prepare(sql).run(...parameters).changes) };
      },
    });
  } else {
    // The repository port permits a CAS implementation without a second parser.
    storage = {
      async read() {
        return payload;
      },
      async compareAndSwap(_account, revision, next) {
        if (JSON.parse(payload).revision !== revision) return false;
        payload = next;
        return true;
      },
    };
  }
  const backend: SnapshotBackend = {
    read: (account) => storage.read(account),
    async compareAndSwap(account, revision, next) {
      writeCalls++;
      return storage.compareAndSwap(account, revision, next);
    },
  };
  const create = () =>
    new MobileRepository({
      accountId: "alice",
      backend,
      originalStore: {
        async read() {
          throw new Error("No original expected");
        },
        async write() {
          throw new Error("Unexpected original write");
        },
        async remove() {
          throw new Error("Unexpected original deletion");
        },
      },
      hash: async () => "0".repeat(64),
      id: randomUUID,
      now: () => 100,
    });
  return {
    create,
    async durable() {
      return storage.read("alice");
    },
    get writeCalls() {
      return writeCalls;
    },
    close() {
      db?.close();
    },
  };
}

for (const revision of [9, 99]) {
  test(`ordinary commit rejects final UTF8 overflow at revision ${revision} without invoking CAS`, async () => {
    const before = exactPayload(snapshot(revision), maximumBytes),
      f = fixture(before),
      repo = f.create();
    await repo.load();
    await assert.rejects(repo.open("project"), /Snapshot exceeds limit/i);
    assert.equal(f.writeCalls, 0);
    assert.equal(await f.durable(), before);
    assert.equal((await f.create().load()).revision, revision);
  });

  test(`ordinary commit accepts exact final UTF8 capacity at revision ${revision + 1}`, async () => {
    const before = exactPayload(snapshot(revision), maximumBytes - 1),
      f = fixture(before),
      repo = f.create();
    await repo.load();
    const saved = await repo.open("project"),
      after = (await f.durable())!;
    assert.equal(Buffer.byteLength(after, "utf8"), maximumBytes);
    assert.equal(saved.revision, revision + 1);
    assert.equal(f.writeCalls, 1);
    assert.deepEqual(await f.create().load(), saved);
    assert.equal(
      saved.projects[0].messages[2].text,
      JSON.parse(before).projects[0].messages[2].text,
    );
  });

  test(`startup recovery rejects final UTF8 overflow at revision ${revision} and retains readable queued input`, async () => {
    const before = exactPayload(snapshot(revision, true), maximumBytes),
      f = fixture(before),
      repo = f.create();
    await assert.rejects(repo.load(), /Snapshot exceeds limit/i);
    assert.equal(f.writeCalls, 0);
    assert.equal(await f.durable(), before);
    const retained = parseSnapshot((await f.durable())!);
    assert.equal(retained.revision, revision);
    assert.equal(retained.projects[0].tasks[0].status, "queued");
    assert.equal(retained.projects[0].tasks[0].prompt, "Preserved input");
    await assert.rejects(repo.open("project"), /Storage frozen/i);
    await assert.rejects(f.create().load(), /Snapshot exceeds limit/i);
    assert.equal(await f.durable(), before);
  });

  test(`startup recovery accepts exact final UTF8 capacity at revision ${revision + 1} and only recovers once`, async () => {
    const value = snapshot(revision, true),
      expected = structuredClone(value);
    // Independently describe the queued-intent recovery contract and metadata growth.
    expected.revision++;
    expected.projects[0].revision++;
    expected.projects[0].tasks[0] = {
      ...queuedTask,
      status: "interrupted",
      error: "应用关闭时任务尚未提交，可使用原任务身份重试。",
    };
    const growth =
      Buffer.byteLength(JSON.stringify(expected), "utf8") -
      Buffer.byteLength(JSON.stringify(value), "utf8");
    assert.ok(growth > 1);
    const before = exactPayload(value, maximumBytes - growth),
      f = fixture(before),
      saved = await f.create().load(),
      after = (await f.durable())!;
    assert.equal(Buffer.byteLength(after, "utf8"), maximumBytes);
    assert.equal(saved.revision, revision + 1);
    assert.equal(saved.projects[0].revision, revision + 1);
    assert.equal(saved.projects[0].tasks[0].status, "interrupted");
    assert.equal(saved.projects[0].tasks[0].submissionState, "intent");
    assert.equal(
      saved.projects[0].messages[2].text,
      JSON.parse(before).projects[0].messages[2].text,
    );
    assert.deepEqual(await f.create().load(), saved);
    assert.equal(f.writeCalls, 1);
    assert.equal(await f.durable(), after);
  });
}

test("SQLite already protects durable bytes and repository now rejects before the backend CAS", async () => {
  const before = exactPayload(snapshot(9), maximumBytes),
    f = fixture(before, true);
  try {
    const repo = f.create();
    await repo.load();
    await assert.rejects(repo.open("project"), /Snapshot exceeds limit/i);
    assert.equal(await f.durable(), before);
    assert.equal((await f.create().load()).revision, 9);
    assert.equal(f.writeCalls, 0);
  } finally {
    f.close();
  }
});
