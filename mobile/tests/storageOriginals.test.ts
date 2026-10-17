import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";

// A real SQLite CAS boundary; faults are injected below the repository.
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE mobile_snapshots (account TEXT PRIMARY KEY NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL)",
  );
  const blobs = new Map<string, Uint8Array>();
  let readFailure = false,
    writeFailure = false,
    originalFailure = false,
    deleteFailure = false;
  const backend = new SqliteSnapshotBackend({
    async execAsync(sql) {
      db.exec(sql);
    },
    async getFirstAsync<T>(
      sql: string,
      ...params: (string | number)[]
    ): Promise<T | null> {
      if (readFailure) throw new Error("disk read failed");
      return (db.prepare(sql).get(...params) ?? null) as T | null;
    },
    async runAsync(sql, ...params) {
      if (writeFailure) throw new Error("disk full");
      return { changes: Number(db.prepare(sql).run(...params).changes) };
    },
  });
  const originals = {
    async read(account: string, id: string) {
      const bytes = blobs.get(`${account}/${id}`);
      if (!bytes) throw new Error("original missing");
      return bytes.slice();
    },
    async write(account: string, id: string, bytes: Uint8Array) {
      if (originalFailure) throw new Error("original disk full");
      const key = `${account}/${id}`;
      if (blobs.has(key)) throw new Error("immutable original");
      blobs.set(key, bytes.slice());
    },
    async remove(account: string, id: string) {
      if (deleteFailure) throw new Error("delete disk failure");
      blobs.delete(`${account}/${id}`);
    },
  };
  const repo = (account = "alice") =>
    new MobileRepository({
      accountId: account,
      backend,
      originalStore: originals,
      hash: async (bytes: Uint8Array) =>
        createHash("sha256").update(bytes).digest("hex"),
      id: randomUUID,
      now: () => 100,
    });
  return {
    repo,
    db,
    blobs,
    faults: {
      read(value: boolean) {
        readFailure = value;
      },
      write(value: boolean) {
        writeFailure = value;
      },
      original(value: boolean) {
        originalFailure = value;
      },
      delete(value: boolean) {
        deleteFailure = value;
      },
    },
  };
}
const draft = {
  prompt: "keep me",
  model: "m",
  kind: "text" as const,
  attachments: [],
  approvalMode: "ask" as const,
  privacyMode: "byok_local" as const,
  outputCount: 1,
  updatedAt: 100,
};
const task = (status: "queued" | "running" | "succeeded" = "queued") => ({
  id: "task-1",
  prompt: "p",
  model: "m",
  kind: "text" as const,
  status,
  submissionState:
    status === "succeeded" ? ("terminal" as const) : ("intent" as const),
  createdAt: 10,
  updatedAt: 10,
  attachments: [],
  attempt: 1,
  requestedOutputs: 1,
  completedOutputs: status === "succeeded" ? 1 : 0,
  idempotencyKey: "intent-1",
  privacyMode: "byok_local" as const,
  outputs: [
    {
      index: 0,
      status:
        status === "succeeded"
          ? ("succeeded" as const)
          : status === "running"
            ? ("running" as const)
            : ("waiting" as const),
      model: "m",
      createdAt: 10,
      ...(status === "succeeded" ? { text: "archived answer" } : {}),
    },
  ],
});
test("E3-R2 backup without archived text result cannot pass preflight or activate", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  s = await r.appendTask(s.projects[0].id, task("succeeded"), 0);
  const backup = JSON.parse(await r.backup(s.projects[0].id));
  delete backup.project.tasks[0].outputs;
  const payload = JSON.stringify(backup);
  await assert.rejects(r.preflightRestore(payload), /output|archive|content/i);
  await assert.rejects(r.restore(payload), /output|archive|content/i);
  assert.equal((await r.load()).projects.length, 1);
});
test("E3-R3 repeated restore binds unmodified historical receipts through verified origin identities", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const actual = {
      kind: "actual" as const,
      source: "provider" as const,
      amount: 0.01,
      currency: "USD",
      providerId: "p",
      receiptId: "actual-1",
      receivedAt: 100,
      taskId: "task-1",
      idempotencyKey: "intent-1",
    },
    estimate = {
      ...actual,
      kind: "estimate" as const,
      receiptId: "estimate-1",
    };
  s = await r.appendTask(
    s.projects[0].id,
    {
      ...task("succeeded"),
      actualCostReceipt: actual,
      estimatedCostQuote: estimate,
    },
    0,
  );
  const payload = await r.backup(s.projects[0].id);
  for (const key of ["actualCostReceipt", "estimatedCostQuote"])
    for (const field of ["taskId", "idempotencyKey"]) {
      const bad = JSON.parse(payload);
      bad.project.tasks[0][key][field] = "foreign";
      await assert.rejects(r.preflightRestore(JSON.stringify(bad)), /receipt/i);
      await assert.rejects(r.restore(JSON.stringify(bad)), /receipt/i);
    }
  s = await r.restore(payload);
  const first = s.projects[1];
  s = await r.restore(await r.backup(first.id));
  const second = s.projects[2];
  assert.deepEqual(second.tasks[0].actualCostReceipt, actual);
  assert.deepEqual(second.tasks[0].estimatedCostQuote, estimate);
  assert.deepEqual(second.restoredFrom!.tasks[second.tasks[0].id], {
    taskId: "task-1",
    idempotencyKey: "intent-1",
  });
  const reloaded = await f.repo().load();
  assert.deepEqual(reloaded.projects[2].tasks[0].actualCostReceipt, actual);
});
test("E3-R4 whole backup preflight rejects malformed optional output metadata before activation", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  s = await r.appendTask(s.projects[0].id, task(), 0);
  const backup = await r.backup(s.projects[0].id),
    revision = s.revision;
  for (const [field, limit] of [
    ["provider", 200],
    ["promptHash", 200],
    ["error", 2000],
  ] as const)
    for (const value of [
      { payload: "arbitrary" },
      [],
      null,
      "x".repeat(limit + 1),
    ]) {
      const bad = JSON.parse(backup);
      bad.project.tasks[0].outputs[0][field] = value;
      const payload = JSON.stringify(bad);
      await assert.rejects(
        r.preflightRestore(payload),
        /text|metadata|corrupt/i,
      );
      await assert.rejects(r.restore(payload), /text|metadata|corrupt/i);
    }
  s = await r.load();
  assert.equal(s.revision, revision);
  assert.equal(s.projects.length, 1);
});
test("restart preserves identity, terminal results and uncertainty; unresolved project deletion is blocked", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const id = s.projects[0].id;
  s = await r.appendTask(id, task("running"), s.projects[0].revision);
  await assert.rejects(r.delete(id, s.projects[0].revision), /unresolved/i);
  const restarted = await f.repo().load();
  assert.equal(restarted.projects[0].tasks[0].status, "unknown");
  assert.equal(restarted.projects[0].tasks[0].idempotencyKey, "intent-1");
});
test("originals persist with hash identity and read corruption is visible", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const bytes = new TextEncoder().encode("hello");
  const asset = await r.storeOriginal({
    bytes,
    mime: "text/plain",
    name: "hello.txt",
    provenance: { source: "import" },
  });
  assert.equal(asset.id, "asset-2cf24dba5fb0a30e26e83b2a");
  assert.equal(
    asset.sha256,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
  assert.deepEqual(await r.readOriginal(asset.id), bytes);
  f.blobs.set(`alice/${asset.id}`, new Uint8Array([0]));
  await assert.rejects(r.readOriginal(asset.id), /hash|corrupt/i);
});
test("original write failure cannot publish metadata or a successful task output", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  f.faults.original(true);
  await assert.rejects(
    r.storeOriginal({
      bytes: new Uint8Array([1]),
      mime: "application/octet-stream",
      name: "x",
      provenance: { source: "import" },
    }),
    /disk full/,
  );
  assert.equal((await r.load()).assets.length, 0);
  await assert.rejects(
    r.appendTask(
      s.projects[0].id,
      {
        ...task("succeeded"),
        kind: "image",
        outputs: [
          {
            index: 0,
            status: "succeeded",
            assetId: "asset-000000000000000000000000",
            model: "m",
            createdAt: 10,
          },
        ],
      },
      s.projects[0].revision,
    ),
    /original|asset/i,
  );
});
test("draft and derivative references prevent physical original deletion", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const a = await r.storeOriginal({
    bytes: new Uint8Array([1]),
    mime: "application/octet-stream",
    name: "a",
    provenance: { source: "import" },
  });
  s = await r.load();
  await r.saveDraft(
    s.projects[0].id,
    {
      ...draft,
      attachments: [
        { id: "attachment-1", assetId: a.id, name: "a", mime: a.mime, size: 1 },
      ],
    },
    s.projects[0].revision,
  );
  await assert.rejects(r.deleteOriginal(a.id), /referenced/i);
  const child = await r.storeOriginal({
    bytes: new Uint8Array([2]),
    mime: a.mime,
    name: "child",
    parentAssetId: a.id,
    provenance: { source: "derivative" },
  });
  await assert.rejects(r.deleteOriginal(a.id), /referenced/i);
  assert.deepEqual(await r.readOriginal(child.id), new Uint8Array([2]));
});
test("backup preflight verifies every hash before writing and restore creates separate recovered identities", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const projectId = s.projects[0].id;
  const a = await r.storeOriginal({
    bytes: new Uint8Array([1]),
    mime: "application/octet-stream",
    name: "a",
    provenance: { source: "import" },
  });
  s = await r.load();
  s = await r.saveDraft(
    projectId,
    {
      ...draft,
      attachments: [
        { id: "attach", assetId: a.id, name: "a", mime: a.mime, size: 1 },
      ],
    },
    s.projects[0].revision,
  );
  s = await r.appendTask(projectId, task(), s.projects[0].revision);
  const backup = await r.backup(projectId);
  const bad = JSON.parse(backup);
  bad.originals[0].base64 = "Ag==";
  const before = (await r.load()).revision;
  await assert.rejects(r.restore(JSON.stringify(bad)), /hash/i);
  assert.equal((await r.load()).revision, before);
  const restored = await r.restore(backup);
  assert.equal(restored.projects.length, 2);
  const copy = restored.projects[1];
  assert.notEqual(copy.id, projectId);
  assert.notEqual(copy.tasks[0].id, "task-1");
  assert.notEqual(copy.tasks[0].idempotencyKey, "intent-1");
  assert.equal(copy.tasks[0].status, "interrupted");
  assert.equal(copy.composerDraft.prompt, "keep me");
});
test("unknown metadata fields cannot smuggle credentials into snapshots or backup", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const s = await r.create("A");
  await assert.rejects(
    r.saveDraft(
      s.projects[0].id,
      { ...draft, credentials: "private" } as typeof draft,
      0,
    ),
    /secret|unexpected|schema/i,
  );
  const payload = JSON.parse(await r.backup(s.projects[0].id));
  payload.project.tasks = [{ ...task(), status: "invented" }];
  await assert.rejects(r.restore(JSON.stringify(payload)), /status/i);
  assert.equal((await r.load()).projects.length, 1);
});
test("logical material removal retains referenced bytes and unreferenced physical deletion removes them", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const a = await r.storeOriginal({
    bytes: new Uint8Array([6]),
    mime: "application/octet-stream",
    name: "x",
    provenance: { source: "import" },
  });
  await r.removeMaterial(a.id);
  assert.deepEqual(await r.readOriginal(a.id), new Uint8Array([6]));
  await r.deleteOriginal(a.id);
  assert.equal(f.blobs.size, 0);
  assert.equal((await r.load()).assets.length, 0);
});
test("interrupted physical deletion retains a tombstone and blocks new references until retried", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const a = await r.storeOriginal({
    bytes: new Uint8Array([7]),
    mime: "application/octet-stream",
    name: "a",
    provenance: { source: "import" },
  });
  f.faults.delete(true);
  await assert.rejects(r.deleteOriginal(a.id), /delete disk failure/);
  s = await f.repo().load();
  assert.equal(s.assets[0].deleting, true);
  assert.equal(f.blobs.size, 1);
  await assert.rejects(
    r.saveDraft(
      s.projects[0].id,
      {
        ...draft,
        attachments: [
          {
            id: "att",
            assetId: a.id,
            name: a.name,
            mime: a.mime,
            size: a.size,
          },
        ],
      },
      s.projects[0].revision,
    ),
    /delet|missing|conflict/i,
  );
  f.faults.delete(false);
  await r.load();
  await r.deleteOriginal(a.id);
  assert.equal(f.blobs.size, 0);
});
test("batch deletion preflights all references before deleting any selected original", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const a = await r.storeOriginal({
    bytes: new Uint8Array([8]),
    mime: "application/octet-stream",
    name: "a",
    provenance: { source: "import" },
  });
  const b = await r.storeOriginal({
    bytes: new Uint8Array([9]),
    mime: a.mime,
    name: "b",
    provenance: { source: "import" },
  });
  s = await r.load();
  await r.attachMaterial(s.projects[0].id, b.id, s.projects[0].revision);
  await assert.rejects(r.deleteOriginals([a.id, b.id]), /referenced/);
  assert.equal(f.blobs.size, 2);
  assert.equal(
    (await r.load()).assets.some((a) => a.deleting),
    false,
  );
});
test("later reference corruption does not prevent saving an uncertain provider receipt", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const a = await r.storeOriginal({
    bytes: new Uint8Array([10]),
    mime: "application/octet-stream",
    name: "reference",
    provenance: { source: "import" },
  });
  s = await r.load();
  s = await r.appendTask(
    s.projects[0].id,
    {
      ...task("running"),
      submissionState: "submitted",
      attachments: [
        { id: "att", assetId: a.id, name: a.name, mime: a.mime, size: a.size },
      ],
    },
    s.projects[0].revision,
  );
  f.blobs.set(`alice/${a.id}`, new Uint8Array([11]));
  const receipt = {
    kind: "actual" as const,
    source: "provider" as const,
    amount: 0.01,
    currency: "USD",
    providerId: "p",
    receiptId: "receipt-1",
    receivedAt: 100,
    taskId: "task-1",
    idempotencyKey: "intent-1",
  };
  s = await r.updateTask(
    s.projects[0].id,
    {
      ...s.projects[0].tasks[0],
      status: "unknown",
      submissionState: "unknown",
      actualCostReceipt: receipt,
      error: "Archive needs recovery",
    },
    s.projects[0].revision,
  );
  assert.deepEqual(s.projects[0].tasks[0].actualCostReceipt, receipt);
  assert.equal(s.projects[0].tasks[0].status, "unknown");
  await assert.rejects(r.readOriginal(a.id), /corrupt/i);
});
test("restore rejects malformed shared image-edit payloads before activation", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const s = await r.create("A");
  const payload = JSON.parse(await r.backup(s.projects[0].id));
  payload.project.tasks = [
    {
      ...task(),
      imageEditContext: {
        originalPrompt: "p",
        referenceAssetIds: [],
        extraCredential: "private",
      },
    },
  ];
  await assert.rejects(
    r.restore(JSON.stringify(payload)),
    /schema|image|context|Unexpected/i,
  );
  assert.equal((await r.load()).projects.length, 1);
});
test("restored gateway receipts retain evidence but cannot query the original live job", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  await r.saveConnections([
    {
      id: "conn-1",
      name: "Gateway",
      provider: "KK",
      baseUrl: "https://example.com",
      protocol: "kk-image-jobs",
    },
  ]);
  let s = await r.create("A");
  s = await r.appendTask(
    s.projects[0].id,
    {
      ...task("running"),
      submissionState: "submitted",
      providerConnectionId: "conn-1",
    },
    0,
  );
  s = await r.saveExecutionReceipt(
    s.projects[0].id,
    {
      taskId: "task-1",
      connectionId: "conn-1",
      protocol: "kk-image-jobs",
      gatewayJobId: "job-1",
    },
    s.projects[0].revision,
  );
  s = await r.restore(await r.backup(s.projects[0].id));
  const restored = s.projects[1],
    receipt = restored.executionReceipts![0];
  assert.equal(receipt.gatewayJobId, "job-1");
  assert.equal(receipt.taskId, restored.tasks[0].id);
  assert.equal(receipt.originalTaskId, "task-1");
  assert.equal(receipt.readOnly, true);
  await assert.rejects(
    r.saveExecutionReceipt(
      restored.id,
      { ...receipt, readOnly: false },
      restored.revision,
    ),
    /restored|read.only/i,
  );
});
test("restoring a maximum-length project name remains a valid separate copy", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("x".repeat(200));
  s = await r.restore(await r.backup(s.projects[0].id));
  assert.equal(s.projects.length, 2);
  assert.ok(s.projects[1].name.endsWith("（恢复副本）"));
  assert.ok(s.projects[1].name.length <= 200);
});
