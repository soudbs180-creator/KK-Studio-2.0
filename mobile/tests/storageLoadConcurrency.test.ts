import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  const blobs = new Map<string, Uint8Array>();
  let readFailure: Error | undefined;
  let delay:
    | {
        remaining: number;
        entered: ReturnType<typeof Promise.withResolvers<void>>;
        release: ReturnType<typeof Promise.withResolvers<void>>;
      }
    | undefined;
  const backend = new SqliteSnapshotBackend({
    async execAsync(sql) {
      db.exec(sql);
    },
    async getFirstAsync<T>(sql: string, ...params: (string | number)[]) {
      if (readFailure) throw readFailure;
      const row = (db.prepare(sql).get(...params) ?? null) as T | null;
      if (delay && --delay.remaining === 0) {
        const held = delay;
        delay = undefined;
        held.entered.resolve();
        await held.release.promise;
      }
      return row;
    },
    async runAsync(sql, ...params) {
      return { changes: Number(db.prepare(sql).run(...params).changes) };
    },
  });
  const repo = new MobileRepository({
    accountId: "reload-race-fixture",
    backend,
    originalStore: {
      async read(account, id) {
        const bytes = blobs.get(`${account}/${id}`);
        if (!bytes) throw new Error("Original missing");
        return bytes.slice();
      },
      async write(account, id, bytes) {
        const key = `${account}/${id}`;
        assert.equal(blobs.has(key), false);
        blobs.set(key, bytes.slice());
      },
      async remove(account, id) {
        blobs.delete(`${account}/${id}`);
      },
    },
    hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
    id: randomUUID,
    now: Date.now,
  });
  return {
    db,
    repo,
    backend,
    holdRead(readNumber: number) {
      delay = {
        remaining: readNumber,
        entered: Promise.withResolvers<void>(),
        release: Promise.withResolvers<void>(),
      };
      return delay;
    },
    failReads(error?: Error) {
      readFailure = error;
    },
  };
}

for (const operation of ["load", "initialize"] as const) {
  test(`delayed ${operation} cannot replace a newer commit and freeze the next write`, async (t) => {
    const f = fixture();
    t.after(() => f.db.close());
    await f.backend.initialize();
    await f.repo.initialize();
    const original = await f.repo.create("Original project");
    const held = f.holdRead(operation === "initialize" ? 2 : 1);
    const reader = f.repo[operation]();
    await held.entered.promise;
    const writer = f.repo.create("Next project");
    // Drain work that can run while the selected SELECT result is still held.
    await new Promise<void>((resolve) => setImmediate(resolve));
    held.release.resolve();
    await reader;
    await writer;
    const saved = await f.repo.savePreferences({ theme: "dark" });
    assert.deepEqual(
      saved.projects.map((p) => p.name),
      ["Original project", "Next project"],
    );
    assert.equal(saved.projects[0].id, original.projects[0].id);
    assert.equal(saved.preferences.theme, "dark");
    assert.equal(saved.revision, 3);
    const durable = await f.backend.read("reload-race-fixture");
    assert.deepEqual(JSON.parse(durable!), saved);
  });
}

test("queued read failure preserves originals and freezes writes until a successful reload", async (t) => {
  const f = fixture();
  t.after(() => f.db.close());
  await f.backend.initialize();
  await f.repo.initialize();
  await f.repo.create("Preserved project");
  const bytes = new Uint8Array([5, 8, 13]);
  const asset = await f.repo.storeOriginal({
    bytes,
    mime: "application/octet-stream",
    name: "immutable.bin",
    provenance: { source: "import" },
  });
  const before = await f.backend.read("reload-race-fixture");
  const fault = new Error("Native read unavailable");
  f.failReads(fault);
  const failedRead = f.repo.load();
  const queuedWrite = f.repo.create("Must not be created");
  await assert.rejects(failedRead, (error) => error === fault);
  await assert.rejects(queuedWrite, /frozen/);
  f.failReads();
  await assert.rejects(f.repo.savePreferences({ theme: "dark" }), /frozen/);
  assert.equal(await f.backend.read("reload-race-fixture"), before);
  const reloaded = await f.repo.load();
  assert.equal(reloaded.projects.length, 1);
  assert.equal(reloaded.assets[0].id, asset.id);
  assert.deepEqual(await f.repo.readOriginal(asset.id), bytes);
  const saved = await f.repo.savePreferences({ theme: "dark" });
  assert.equal(saved.preferences.theme, "dark");
  assert.equal(saved.projects[0].name, "Preserved project");
});
