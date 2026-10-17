import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import type { CreationTask } from "@kk-studio/creation-contracts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE mobile_snapshots(account TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)",
  );
  const originals = new Map<string, Uint8Array>();
  const driver = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async getFirstAsync<T>(
      sql: string,
      ...parameters: (string | number)[]
    ): Promise<T | null> {
      return (db.prepare(sql).get(...parameters) ?? null) as T | null;
    },
    async runAsync(sql: string, ...parameters: (string | number)[]) {
      return { changes: Number(db.prepare(sql).run(...parameters).changes) };
    },
  };
  const create = (allowLoopbackHttp = false) =>
    new MobileRepository({
      accountId: "alice",
      allowLoopbackHttp,
      backend: new SqliteSnapshotBackend(driver, { allowLoopbackHttp }),
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
      now: () => 100,
    });
  return { create, db };
}
const connection = (baseUrl: string) => ({
  id: "dev-connection",
  name: "Development fixture",
  provider: "Fixture",
  baseUrl,
  protocol: "openai-compatible" as const,
});
const task = (baseUrl: string): CreationTask => ({
  id: "dev-task",
  idempotencyKey: "dev-intent",
  kind: "text",
  prompt: "fixture input",
  model: "fixture-model",
  status: "queued",
  submissionState: "intent",
  createdAt: 100,
  updatedAt: 100,
  attachments: [],
  attempt: 1,
  requestedOutputs: 1,
  completedOutputs: 0,
  privacyMode: "byok_local",
  providerConnectionId: "dev-connection",
  providerBaseUrl: baseUrl,
  outputs: [
    { index: 0, status: "waiting", model: "fixture-model", createdAt: 100 },
  ],
});

test("transport defaults keep production HTTPS and reject external/private/spoof HTTP even in development", async () => {
  const f = fixture(),
    production = f.create();
  await production.initialize();
  for (const url of [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://[::1]:8000",
  ])
    await assert.rejects(production.saveConnections([connection(url)]));
  const development = f.create(true);
  await development.load();
  for (const url of [
    "http://example.com",
    "http://192.168.1.2",
    "http://10.0.0.1",
    "http://localhost.attacker.test",
    "http://127.0.0.1.attacker.test",
    "http://user:secret@localhost",
    "http://localhost?api_key=secret",
    "http://localhost/#secret",
  ])
    await assert.rejects(development.saveConnections([connection(url)]));
  assert.equal((await production.load()).connections.length, 0);
});
test("explicit development loopback policy persists metadata/task and supports reload and bounded backup restore", async () => {
  for (const url of [
    "http://localhost:8000/v1",
    "http://127.0.0.1:8000/v1",
    "http://[::1]:8000/v1",
  ]) {
    const f = fixture(),
      r = f.create(true);
    await r.initialize();
    await r.saveConnections([connection(url)]);
    let s = await r.create("Development project");
    s = await r.appendTask(s.projects[0].id, task(url), 0);
    const reopened = f.create(true);
    s = await reopened.load();
    assert.equal(s.connections[0].baseUrl, url);
    assert.equal(s.projects[0].tasks[0].providerBaseUrl, url);
    assert.equal(s.projects[0].tasks[0].status, "interrupted");
    s = await reopened.updateTask(
      s.projects[0].id,
      {
        ...s.projects[0].tasks[0],
        status: "succeeded",
        submissionState: "terminal",
        completedOutputs: 1,
        outputs: [
          {
            index: 0,
            status: "succeeded",
            model: "fixture-model",
            text: "Archived fixture result",
            createdAt: 100,
          },
        ],
      },
      s.projects[0].revision,
    );
    const backup = await reopened.backup(s.projects[0].id);
    assert.ok(!backup.includes("allowLoopbackHttp"));
    await reopened.preflightRestore(backup);
    s = await reopened.restore(backup);
    assert.equal(s.projects.length, 2);
    assert.equal(s.projects[1].tasks[0].providerBaseUrl, url);
  }
});
test("production reads reject development transport explicitly while preserving the entire original snapshot", async () => {
  const f = fixture(),
    dev = f.create(true);
  await dev.initialize();
  await dev.saveConnections([connection("http://localhost:8000")]);
  const original = await dev.storeOriginal({
    bytes: new Uint8Array([1, 2, 3]),
    mime: "application/octet-stream",
    name: "retained-original",
    provenance: { source: "import" },
  });
  const before = (
    f.db.prepare("SELECT payload FROM mobile_snapshots").get() as {
      payload: string;
    }
  ).payload;
  const production = f.create();
  await assert.rejects(
    production.initialize(),
    (error) =>
      error instanceof Error &&
      error.name === "StoragePolicyError" &&
      !/corrupt/i.test(error.message),
  );
  await assert.rejects(production.create("overwrite"), /frozen/i);
  assert.equal(
    (
      f.db.prepare("SELECT payload FROM mobile_snapshots").get() as {
        payload: string;
      }
    ).payload,
    before,
  );
  assert.equal(
    (await dev.load()).connections[0].baseUrl,
    "http://localhost:8000",
  );
  assert.deepEqual(
    await dev.readOriginal(original.id),
    new Uint8Array([1, 2, 3]),
  );
});
test("backup content cannot enable a policy and production restore never activates development task routes", async () => {
  const f = fixture(),
    dev = f.create(true);
  await dev.initialize();
  let s = await dev.create("Development project");
  s = await dev.appendTask(s.projects[0].id, task("http://127.0.0.1:8000"), 0);
  const payload = await dev.backup(s.projects[0].id),
    production = f.create();
  await assert.rejects(
    production.initialize(),
    (error) => error instanceof Error && error.name === "StoragePolicyError",
  );
  await assert.rejects(
    production.preflightRestore(payload),
    (error) => error instanceof Error && error.name === "StoragePolicyError",
  );
  await assert.rejects(production.restore(payload));
  const injected = JSON.parse(payload);
  injected.allowLoopbackHttp = true;
  await assert.rejects(
    dev.preflightRestore(JSON.stringify(injected)),
    /schema/i,
  );
  assert.equal((await dev.load()).projects.length, 1);
});
