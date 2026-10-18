import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { chromium } from "@playwright/test";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import type { IndexedDbBackend } from "../src/storage/indexedDbBackend.ts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE mobile_snapshots(account TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)",
  );
  let clock = 100;
  const originals = new Map<string, Uint8Array>();
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
        async read(account, id) {
          const bytes = originals.get(`${account}/${id}`);
          assert.ok(bytes);
          return bytes.slice();
        },
        async write(account, id, bytes) {
          assert.ok(!originals.has(`${account}/${id}`));
          originals.set(`${account}/${id}`, bytes.slice());
        },
        async remove(account, id) {
          originals.delete(`${account}/${id}`);
        },
      },
      hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
      id: randomUUID,
      now: () => clock,
    });
  return {
    create,
    time: (now: number) => {
      clock = now;
    },
  };
}

async function source(r: MobileRepository) {
  await r.initialize();
  let s = await r.create("Clock source"),
    p = s.projects[0];
  const asset = await r.storeOriginal({
    bytes: new Uint8Array([1, 2]),
    mime: "application/octet-stream",
    name: "Immutable source",
    provenance: { source: "import" },
  });
  s = await r.attachMaterial(p.id, asset.id, p.revision);
  p = s.projects[0];
  s = await r.appendTask(
    p.id,
    {
      id: "completed",
      idempotencyKey: "completed-key",
      kind: "text",
      prompt: "Original input",
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
        {
          index: 0,
          status: "succeeded",
          model: "m",
          text: "Original output",
          createdAt: 100,
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.appendMessage(
    p.id,
    {
      id: "source-message",
      projectId: p.id,
      conversationId: "conversation",
      taskId: "completed",
      model: "m",
      role: "assistant",
      text: "Original output",
      createdAt: 100,
    },
    p.revision,
  );
  return { snapshot: s, asset };
}

test("SQLite clock rollback permits valid derivative edits without altering source messages tasks or originals", async () => {
  const f = fixture(),
    r = f.create(),
    { snapshot, asset } = await source(r),
    p = snapshot.projects[0];
  const original = p.messages[0],
    archived = p.tasks[0];
  f.time(90);
  const saved = await r.local.editMessage(
      p.id,
      original.id,
      "Edited derivative",
      p.revision,
    ),
    edited = saved.projects[0];
  assert.equal(edited.messages[1].createdAt, 100);
  assert.equal(edited.messages[1].editedFromId, original.id);
  assert.notEqual(edited.messages[1].id, original.id);
  assert.deepEqual(edited.messages[0], original);
  assert.deepEqual(edited.tasks[0], archived);
  assert.deepEqual(await r.readOriginal(asset.id), new Uint8Array([1, 2]));
  assert.equal(edited.updatedAt, 100);
  const reloaded = await f.create().load();
  assert.equal(reloaded.projects[0].messages[1].text, "Edited derivative");
  assert.deepEqual(reloaded.projects[0].messages[0], original);
});

test("editing after rollback preserves a newer project update timestamp and retains captured metadata", async () => {
  const f = fixture(),
    r = f.create(),
    { snapshot } = await source(r);
  let p = snapshot.projects[0];
  f.time(110);
  const newer = await r.local.setProjectMetadata(
    p.id,
    { group: "Retained group", pinned: true },
    p.revision,
  );
  p = newer.projects[0];
  assert.equal(p.updatedAt, 110);
  f.time(90);
  const saved = await r.local.editMessage(
    p.id,
    p.messages[0].id,
    "Derivative",
    p.revision,
  );
  assert.equal(saved.projects[0].updatedAt, 110);
  assert.equal(saved.projects[0].messages[1].createdAt, 100);
  assert.equal(saved.projects[0].group, "Retained group");
  assert.equal(saved.projects[0].pinned, true);
});

test("independent SQLite restore of a future-dated source remains editable with monotonic lineage", async () => {
  const f = fixture(),
    r = f.create(),
    { snapshot, asset } = await source(r);
  const p = snapshot.projects[0],
    backup = await r.backup(p.id);
  f.time(90);
  const restored = await r.restore(backup),
    copy = restored.projects[1],
    original = copy.messages[0],
    task = copy.tasks[0];
  assert.notEqual(copy.id, p.id);
  assert.notEqual(original.id, p.messages[0].id);
  assert.equal(original.createdAt, 100);
  const saved = await r.local.editMessage(
      copy.id,
      original.id,
      "Restored derivative",
      copy.revision,
    ),
    edited = saved.projects[1];
  assert.equal(edited.messages[1].createdAt, 100);
  assert.equal(edited.updatedAt, 100);
  assert.deepEqual(edited.messages[0], original);
  assert.deepEqual(edited.tasks[0], task);
  assert.deepEqual(await r.readOriginal(asset.id), new Uint8Array([1, 2]));
  const reloaded = await f.create().load();
  assert.equal(reloaded.projects[1].messages[1].text, "Restored derivative");
});

type BrowserFixtures = {
  MobileRepository: typeof MobileRepository;
  IndexedDbBackend: typeof IndexedDbBackend;
};
test("actual Edge reload and independent restore permit editing future messages without rewriting originals", async () => {
  const bundle = buildSync({
    stdin: {
      contents:
        "import {IndexedDbBackend} from './indexedDbBackend.ts'; import {MobileRepository} from './repository.ts'; globalThis.clockFixture={IndexedDbBackend,MobileRepository};",
      resolveDir: fileURLToPath(new URL("../src/storage/", import.meta.url)),
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
  }).outputFiles[0].text;
  const server = createServer((request, response) => {
    response.setHeader(
      "Content-Type",
      request.url === "/bundle.js" ? "text/javascript" : "text/html",
    );
    response.end(
      request.url === "/bundle.js"
        ? bundle
        : '<!doctype html><script src="/bundle.js"></script>',
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}`);
    const before = await page.evaluate(async () => {
      const { MobileRepository, IndexedDbBackend } = (
        globalThis as unknown as { clockFixture: BrowserFixtures }
      ).clockFixture;
      const storage = new IndexedDbBackend(),
        r = new MobileRepository({
          accountId: "alice",
          backend: storage,
          originalStore: storage,
          hash: async (bytes) =>
            Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
              ),
              (value) => value.toString(16).padStart(2, "0"),
            ).join(""),
          id: () => crypto.randomUUID(),
          now: () => 100,
        });
      await r.initialize();
      let s = await r.create("Future source"),
        p = s.projects[0];
      s = await r.appendMessage(
        p.id,
        {
          id: "source",
          projectId: p.id,
          conversationId: "conversation",
          role: "user",
          text: "Original future message",
          createdAt: 100,
        },
        p.revision,
      );
      p = s.projects[0];
      return { backup: await r.backup(p.id), projectId: p.id };
    });
    await page.reload();
    const after = await page.evaluate(async (before) => {
      const { MobileRepository, IndexedDbBackend } = (
        globalThis as unknown as { clockFixture: BrowserFixtures }
      ).clockFixture;
      const storage = new IndexedDbBackend(),
        r = new MobileRepository({
          accountId: "alice",
          backend: storage,
          originalStore: storage,
          hash: async (bytes) =>
            Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
              ),
              (value) => value.toString(16).padStart(2, "0"),
            ).join(""),
          id: () => crypto.randomUUID(),
          now: () => 90,
        });
      let s = await r.load(),
        p = s.projects[0];
      s = await r.local.editMessage(
        p.id,
        p.messages[0].id,
        "Local derivative",
        p.revision,
      );
      s = await r.restore(before.backup);
      p = s.projects[1];
      const source = p.messages[0];
      s = await r.local.editMessage(
        p.id,
        source.id,
        "Restored derivative",
        p.revision,
      );
      return {
        restoredId: p.id,
        sourceId: source.id,
        sourceText: source.text,
        sourceTime: source.createdAt,
        editTime: s.projects[1].messages[1].createdAt,
        updatedAt: s.projects[1].updatedAt,
        localTime: s.projects[0].messages[1].createdAt,
        taskCount: s.projects[1].tasks.length,
      };
    }, before);
    assert.notEqual(after.restoredId, before.projectId);
    assert.notEqual(after.sourceId, "source");
    assert.equal(after.sourceTime, 100);
    assert.equal(after.editTime, 100);
    assert.equal(after.localTime, 100);
    assert.equal(after.updatedAt, 100);
    assert.equal(after.taskCount, 0);
    await page.reload();
    const reload = await page.evaluate(async (restoredId) => {
      const { MobileRepository, IndexedDbBackend } = (
        globalThis as unknown as { clockFixture: BrowserFixtures }
      ).clockFixture;
      const storage = new IndexedDbBackend(),
        r = new MobileRepository({
          accountId: "alice",
          backend: storage,
          originalStore: storage,
          hash: async (bytes) =>
            Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
              ),
              (value) => value.toString(16).padStart(2, "0"),
            ).join(""),
          id: () => crypto.randomUUID(),
          now: () => 90,
        });
      const s = await r.load(),
        p = s.projects.find((p) => p.id === restoredId)!;
      return p.messages.map((m) => ({
        text: m.text,
        createdAt: m.createdAt,
        editedFromId: m.editedFromId ?? null,
      }));
    }, after.restoredId);
    assert.deepEqual(reload, [
      { text: "Original future message", createdAt: 100, editedFromId: null },
      {
        text: "Restored derivative",
        createdAt: 100,
        editedFromId: after.sourceId,
      },
    ]);
  } finally {
    await browser.close();
    server.close();
  }
});
