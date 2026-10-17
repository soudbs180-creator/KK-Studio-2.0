import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";

test("dispose drains admitted original CAS/readback and closes only its private SQLite connection once", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "kk-repository-lifetime-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const first = new DatabaseSync(join(directory, "creation.db"));
  const second = new DatabaseSync(join(directory, "creation.db"));
  let closed = 0;
  const backend = (db: DatabaseSync) =>
    new SqliteSnapshotBackend({
      async execAsync(sql) {
        db.exec(sql);
      },
      async getFirstAsync<T>(sql: string, ...args: (string | number)[]) {
        return (db.prepare(sql).get(...args) ?? null) as T | null;
      },
      async runAsync(sql, ...args) {
        return { changes: Number(db.prepare(sql).run(...args).changes) };
      },
    });
  const aBackend = backend(first),
    bBackend = backend(second);
  await aBackend.initialize();
  const entered = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();
  const originals = new Map<string, Uint8Array>();
  let pause = true;
  const options = {
    accountId: "owner-a",
    backend: aBackend,
    originalStore: {
      async read(_account: string, id: string) {
        return originals.get(id)!.slice();
      },
      async write(_account: string, id: string, bytes: Uint8Array) {
        originals.set(id, bytes.slice());
      },
      async remove(_account: string, id: string) {
        originals.delete(id);
      },
    },
    hash: async (bytes: Uint8Array) => {
      if (pause) {
        pause = false;
        entered.resolve();
        await released.promise;
      }
      return createHash("sha256").update(bytes).digest("hex");
    },
    id: randomUUID,
    now: Date.now,
    close: async () => {
      closed++;
      first.close();
    },
  };
  const a = new MobileRepository(options);
  await a.initialize();
  await a.create("Preserved project");
  const storing = a.storeOriginal({
    bytes: new Uint8Array([7, 9]),
    mime: "application/octet-stream",
    name: "retained.bin",
    provenance: { source: "import" },
  });
  await entered.promise;
  assert.equal(
    typeof a.dispose,
    "function",
    "repository must own an explicit dispose boundary",
  );
  const disposal = a.dispose();
  assert.equal(a.dispose(), disposal);
  await assert.rejects(a.create("Too late"), /disposed/i);
  assert.equal(closed, 0);
  released.resolve();
  const asset = await storing;
  await disposal;
  assert.equal(closed, 1);
  await assert.rejects(a.load(), /disposed/i);
  await assert.rejects(a.readOriginal(asset.id), /disposed/i);
  await assert.rejects(a.preflightRestore("{}"), /disposed/i);
  const b = new MobileRepository({
    ...options,
    backend: bBackend,
    close: async () => second.close(),
  });
  const retained = await b.load();
  assert.equal(retained.projects[0].name, "Preserved project");
  assert.equal(retained.assets[0].id, asset.id);
  assert.deepEqual(await b.readOriginal(asset.id), new Uint8Array([7, 9]));
  await b.create("Independent owner remains writable");
  await b.dispose();
  assert.equal(closed, 1);
});

test("failed private close is reported once and cannot reopen a disposed repository", async () => {
  const failure = new Error("Private connection close failed");
  let closes = 0;
  const repo = new MobileRepository({
    accountId: "fixture",
    backend: {
      async read() {
        return null;
      },
      async compareAndSwap() {
        return true;
      },
    },
    originalStore: {
      async read() {
        return new Uint8Array();
      },
      async write() {},
      async remove() {},
    },
    hash: async () => "",
    id: randomUUID,
    now: Date.now,
    close: async () => {
      closes++;
      throw failure;
    },
  });
  assert.equal(typeof repo.dispose, "function");
  const closing = repo.dispose();
  await assert.rejects(closing, (error) => error === failure);
  assert.equal(repo.dispose(), closing);
  await assert.rejects(repo.initialize(), /disposed/i);
  assert.equal(closes, 1);
});
