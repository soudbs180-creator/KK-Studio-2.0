import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { CreationTask } from "@kk-studio/creation-contracts";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE mobile_snapshots(account TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)",
  );
  const backend = new SqliteSnapshotBackend({
    async execAsync(sql) {
      db.exec(sql);
    },
    async getFirstAsync<T>(
      sql: string,
      ...params: (string | number)[]
    ): Promise<T | null> {
      return (db.prepare(sql).get(...params) ?? null) as T | null;
    },
    async runAsync(sql, ...params) {
      return { changes: Number(db.prepare(sql).run(...params).changes) };
    },
  });
  const create = () =>
    new MobileRepository({
      accountId: "alice",
      backend,
      originalStore: {
        async read() {
          throw new Error("No original");
        },
        async write() {
          throw new Error("Unexpected original write");
        },
        async remove() {
          throw new Error("Unexpected deletion");
        },
      },
      hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
      id: randomUUID,
      now: () => 100,
    });
  return { create, db };
}
const archived = (body: string): CreationTask => ({
  id: "task",
  idempotencyKey: "intent",
  kind: "text",
  prompt: "Captured",
  model: "m",
  status: "succeeded",
  submissionState: "terminal",
  createdAt: 100,
  updatedAt: 100,
  attachments: [],
  attempt: 1,
  requestedOutputs: 1,
  completedOutputs: 1,
  privacyMode: "byok_local",
  outputs: [
    { index: 0, status: "succeeded", model: "m", text: body, createdAt: 100 },
  ],
});

test("accepted long Unicode text archives intact in outputs and messages and survives reload and backup", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Long output"),
    p = s.projects[0];
  const body = "界".repeat(1_048_576);
  s = await r.appendTask(p.id, archived(body), p.revision);
  p = s.projects[0];
  s = await r.appendMessage(
    p.id,
    {
      id: "message",
      projectId: p.id,
      conversationId: "c",
      taskId: "task",
      role: "assistant",
      text: body,
      createdAt: 100,
    },
    p.revision,
  );
  p = s.projects[0];
  const raw = (
    f.db.prepare("SELECT payload FROM mobile_snapshots").get() as {
      payload: string;
    }
  ).payload;
  assert.ok(Buffer.byteLength(raw, "utf8") < 8 * 1024 * 1024);
  s = await f.create().load();
  assert.equal(s.projects[0].tasks[0].outputs?.[0].text, body);
  assert.equal(s.projects[0].messages[0].text, body);
  await r.preflightRestore(await r.backup(p.id));
});

test("result fields reject above accepted bound without widening prompt or error metadata", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  const s = await r.create("Bounded"),
    p = s.projects[0];
  await assert.rejects(
    r.appendTask(p.id, archived("x".repeat(1_048_577)), p.revision),
    /bounded/i,
  );
  await assert.rejects(
    r.appendMessage(
      p.id,
      {
        id: "message",
        projectId: p.id,
        conversationId: "c",
        role: "assistant",
        text: "x".repeat(1_048_577),
        createdAt: 100,
      },
      p.revision,
    ),
    /bounded/i,
  );
  await assert.rejects(
    r.appendTask(
      p.id,
      { ...archived("Accepted"), prompt: "x".repeat(200001) },
      p.revision,
    ),
    /bounded/i,
  );
  assert.equal((await r.load()).projects[0].tasks.length, 0);
});

test("actual UTF8 snapshot capacity rejects an overflowing Unicode append and retains durable prior messages", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Byte budget"),
    p = s.projects[0];
  const text = "界".repeat(100000);
  for (let index = 0; index < 27; index++) {
    s = await r.appendMessage(
      p.id,
      {
        id: `message-${index}`,
        projectId: p.id,
        conversationId: "c",
        role: "assistant",
        text,
        createdAt: 100,
      },
      p.revision,
    );
    p = s.projects[0];
  }
  const before = (
    f.db.prepare("SELECT payload FROM mobile_snapshots").get() as {
      payload: string;
    }
  ).payload;
  assert.ok(Buffer.byteLength(before, "utf8") < 8 * 1024 * 1024);
  await assert.rejects(
    r.appendMessage(
      p.id,
      {
        id: "overflow",
        projectId: p.id,
        conversationId: "c",
        role: "assistant",
        text,
        createdAt: 100,
      },
      p.revision,
    ),
    /snapshot exceeds limit/i,
  );
  assert.equal(
    (
      f.db.prepare("SELECT payload FROM mobile_snapshots").get() as {
        payload: string;
      }
    ).payload,
    before,
  );
  assert.equal((await f.create().load()).projects[0].messages.length, 27);
});
