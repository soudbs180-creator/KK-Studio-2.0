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
  const repo = (
    account = "alice",
    hash: (bytes: Uint8Array) => Promise<string> = async (bytes) =>
      createHash("sha256").update(bytes).digest("hex"),
  ) =>
    new MobileRepository({
      accountId: account,
      backend,
      originalStore: originals,
      hash,
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
test("E3-R2 text success needs durable nonempty output rather than counts or messages", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const s = await r.create("A"),
    p = s.projects[0];
  await assert.rejects(
    r.appendTask(
      p.id,
      { ...task("succeeded"), outputs: undefined },
      p.revision,
    ),
    /output|archive|content/i,
  );
  await assert.rejects(
    r.appendTask(
      p.id,
      {
        ...task("succeeded"),
        outputs: [
          {
            index: 0,
            status: "succeeded",
            text: "",
            model: "m",
            createdAt: 10,
          },
        ],
      },
      p.revision,
    ),
    /text|content|archive/i,
  );
  const saved = await r.appendTask(p.id, task("succeeded"), p.revision);
  assert.equal(saved.projects[0].messages.length, 0);
  const reloaded = await f.repo().load();
  assert.equal(
    reloaded.projects[0].tasks[0].outputs![0].text,
    "archived answer",
  );
});
test("E3-R3 live actual and estimate receipts reject foreign task and idempotency identities", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  const base = {
    source: "provider" as const,
    amount: 0.01,
    currency: "USD",
    providerId: "p",
    receiptId: "receipt-1",
    receivedAt: 100,
    taskId: "task-1",
    idempotencyKey: "intent-1",
  };
  const check = async (
    operation: (
      candidate: Parameters<MobileRepository["appendTask"]>[1],
    ) => Promise<unknown>,
  ) => {
    for (const key of ["actualCostReceipt", "estimatedCostQuote"] as const)
      for (const mismatch of ["taskId", "idempotencyKey"] as const) {
        const receipt = {
          ...base,
          kind:
            key === "actualCostReceipt"
              ? ("actual" as const)
              : ("estimate" as const),
          [mismatch]: "foreign",
        };
        await assert.rejects(
          operation({ ...task(), [key]: receipt }),
          /receipt/i,
        );
      }
  };
  await check((candidate) => r.appendTask(s.projects[0].id, candidate, 0));
  s = await r.appendTask(s.projects[0].id, task(), 0);
  await check((candidate) =>
    r.updateTask(s.projects[0].id, candidate, s.projects[0].revision),
  );
  assert.equal(
    (await r.load()).projects[0].tasks[0].actualCostReceipt,
    undefined,
  );
});
test("E3-R4 live output metadata rejects objects arrays null and oversized strings", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const s = await r.create("A");
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
      const candidate = {
        ...task(),
        outputs: [{ ...task().outputs[0], [field]: value }],
      };
      await assert.rejects(
        r.appendTask(
          s.projects[0].id,
          candidate as Parameters<MobileRepository["appendTask"]>[1],
          0,
        ),
        /text|metadata|corrupt/i,
      );
    }
  assert.equal((await r.load()).projects[0].tasks.length, 0);
});

test("missing and corrupt reads never become an empty writeable snapshot", async () => {
  const f = fixture(),
    r = f.repo();
  await assert.rejects(r.load(), /missing/i);
  await r.initialize();
  await r.create("A");
  f.db
    .prepare("UPDATE mobile_snapshots SET payload=? WHERE account=?")
    .run("{broken", "alice");
  await assert.rejects(r.load(), /corrupt/i);
  await assert.rejects(r.create("B"), /load|read|frozen/i);
  assert.equal(
    (
      f.db.prepare("SELECT payload FROM mobile_snapshots").get() as {
        payload: string;
      }
    ).payload,
    "{broken",
  );
});
test("durable draft reload and SQLite CAS prevent stale overwrites", async () => {
  const f = fixture(),
    a = f.repo(),
    b = f.repo();
  await a.initialize();
  let s = await a.create("A");
  const p = s.projects[0];
  await b.load();
  s = await a.saveDraft(p.id, draft, p.revision);
  await assert.rejects(b.rename(p.id, "stale", p.revision), /conflict/i);
  const reloaded = await f.repo().load();
  assert.equal(reloaded.projects[0].composerDraft.prompt, "keep me");
  assert.equal(reloaded.projects[0].name, "A");
  assert.equal(s.revision, reloaded.revision);
});
test("read/save failures preserve durable content and account switching isolates it", async () => {
  const f = fixture(),
    a = f.repo();
  await a.initialize();
  const s = await a.create("Alice");
  const p = s.projects[0];
  f.faults.write(true);
  await assert.rejects(a.saveDraft(p.id, draft, p.revision), /disk full/);
  f.faults.write(false);
  assert.equal((await a.load()).projects[0].composerDraft.prompt, "");
  f.faults.read(true);
  await assert.rejects(a.load(), /disk read/);
  await assert.rejects(a.rename(p.id, "lost", p.revision), /frozen|load|read/i);
  f.faults.read(false);
  const b = f.repo("bob");
  await b.initialize();
  assert.equal((await b.load()).projects.length, 0);
  assert.equal((await a.load()).projects[0].name, "Alice");
});
test("secret-shaped metadata and unsafe provider URLs are rejected", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  await assert.rejects(
    r.saveConnections([
      {
        id: "bad",
        name: "bad",
        baseUrl: "https://user:secret@example.com",
        provider: "p",
      },
    ]),
    /credential|url/i,
  );
  await assert.rejects(
    r.saveDraft(
      s.projects[0].id,
      { ...draft, apiKey: "private" } as typeof draft,
      s.projects[0].revision,
    ),
    /secret|credential/i,
  );
});
test("ambiguous snapshot save freezes further writes until a successful read", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const s = await r.create("A");
  f.faults.write(true);
  await assert.rejects(r.rename(s.projects[0].id, "B", 0), /disk full/);
  f.faults.write(false);
  await assert.rejects(r.create("C"), /frozen/);
  assert.equal((await r.load()).projects.length, 1);
});
test("concurrent first-use initialization preserves projects instead of resetting data", async () => {
  const f = fixture(),
    a = f.repo(),
    b = f.repo();
  await Promise.all([a.initialize(), b.initialize()]);
  const s = await a.create("preserved");
  await b.initialize();
  assert.equal((await b.load()).projects[0].id, s.projects[0].id);
});
test("snapshot publication failure retains immutable orphan bytes for exact retry", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  f.faults.write(true);
  const input = {
    bytes: new Uint8Array([4]),
    mime: "application/octet-stream",
    name: "a",
    provenance: { source: "import" as const },
  };
  await assert.rejects(r.storeOriginal(input), /disk full/);
  assert.equal(f.blobs.size, 1);
  f.faults.write(false);
  await r.load();
  assert.equal((await r.load()).assets.length, 0);
  const a = await r.storeOriginal(input);
  assert.deepEqual(await r.readOriginal(a.id), new Uint8Array([4]));
  assert.equal(f.blobs.size, 1);
});
test("uncertain submission cannot be changed back to a fresh retry intent", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  s = await r.appendTask(
    s.projects[0].id,
    { ...task("running"), submissionState: "submitted" },
    0,
  );
  const restarted = f.repo();
  s = await restarted.load();
  await assert.rejects(
    restarted.updateTask(
      s.projects[0].id,
      {
        ...s.projects[0].tasks[0],
        status: "queued",
        submissionState: "intent",
      },
      s.projects[0].revision,
    ),
    /uncertain|submission/i,
  );
});
test("terminal tasks remain terminal and queued intent becomes interrupted on restart", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  s = await r.appendTask(s.projects[0].id, task("succeeded"), 0);
  s = await r.appendTask(
    s.projects[0].id,
    { ...task(), id: "task-2", idempotencyKey: "intent-2" },
    s.projects[0].revision,
  );
  s = await f.repo().load();
  assert.equal(s.projects[0].tasks[0].status, "succeeded");
  assert.equal(s.projects[0].tasks[1].status, "interrupted");
  assert.equal(s.projects[0].tasks[1].submissionState, "intent");
});
test("draft timestamps distinguish newer edits even under a fixed device clock", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  s = await r.saveDraft(s.projects[0].id, draft, 0);
  const captured = s.projects[0].composerDraft.updatedAt;
  s = await r.saveDraft(
    s.projects[0].id,
    { ...draft, prompt: "new input" },
    s.projects[0].revision,
  );
  await assert.rejects(
    r.restoreDraft(s.projects[0].id, draft, captured, s.projects[0].revision),
    /Newer draft/i,
  );
  assert.equal((await r.load()).projects[0].composerDraft.prompt, "new input");
});
test("connection protocol and reported capabilities survive reload as bounded nonsecret metadata", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const connections = [
    {
      id: "provider-1",
      name: "P",
      provider: "P",
      baseUrl: "https://example.com/v1",
      protocol: "openai-compatible" as const,
      capabilities: {
        text: true,
        image: false,
        maxOutputs: 2,
        imageSizes: ["1024x1024"],
      },
    },
  ];
  await r.saveConnections(connections);
  assert.deepEqual((await f.repo().load()).connections, connections);
  await assert.rejects(
    r.saveConnections([
      {
        ...connections[0],
        capabilities: { ...connections[0].capabilities, maxOutputs: 100000 },
      },
    ]),
    /capabil|output/i,
  );
});
test("uncertain submission cannot drop its state or change captured routing/privacy", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  let s = await r.create("A");
  s = await r.appendTask(
    s.projects[0].id,
    { ...task("running"), submissionState: "submitted" },
    0,
  );
  await assert.rejects(
    r.updateTask(
      s.projects[0].id,
      {
        ...s.projects[0].tasks[0],
        status: "failed",
        submissionState: undefined,
      },
      s.projects[0].revision,
    ),
    /submission|uncertain/i,
  );
  await assert.rejects(
    r.updateTask(
      s.projects[0].id,
      { ...s.projects[0].tasks[0], privacyMode: "platform_backed" },
      s.projects[0].revision,
    ),
    /Captured/i,
  );
});
test("successful status cannot publish inconsistent output counts", async () => {
  const f = fixture(),
    r = f.repo();
  await r.initialize();
  const s = await r.create("A");
  await assert.rejects(
    r.appendTask(
      s.projects[0].id,
      { ...task("succeeded"), completedOutputs: 0 },
      0,
    ),
    /count|success/i,
  );
  assert.equal((await r.load()).projects[0].tasks.length, 0);
});
test("accepted gateway identity survives restart and cannot change captured task routing", async () => {
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
  const receipt = {
    taskId: "task-1",
    connectionId: "conn-1",
    protocol: "kk-image-jobs" as const,
    gatewayJobId: "job-1",
  };
  s = await r.saveExecutionReceipt(
    s.projects[0].id,
    receipt,
    s.projects[0].revision,
  );
  assert.deepEqual((await f.repo().load()).projects[0].executionReceipts, [
    receipt,
  ]);
  await assert.rejects(
    r.saveExecutionReceipt(
      s.projects[0].id,
      { ...receipt, gatewayJobId: "job-2" },
      s.projects[0].revision,
    ),
    /identity|captured|receipt/i,
  );
  await assert.rejects(
    r.saveExecutionReceipt(
      s.projects[0].id,
      { ...receipt, taskId: "forged" },
      s.projects[0].revision,
    ),
    /task/i,
  );
});
test("E3-R1 delayed original hash and concurrent reload cannot upgrade an old clone revision", async () => {
  const f = fixture();
  let entered!: () => void,
    release!: () => void,
    first = true;
  const paused = new Promise<void>((resolve) => {
      entered = resolve;
    }),
    released = new Promise<void>((resolve) => {
      release = resolve;
    });
  const a = f.repo("alice", async (bytes) => {
    if (first) {
      first = false;
      entered();
      await released;
    }
    return createHash("sha256").update(bytes).digest("hex");
  });
  await a.initialize();
  await a.create("existing");
  const b = f.repo();
  await b.load();
  const storing = a.storeOriginal({
    bytes: new Uint8Array([42]),
    mime: "application/octet-stream",
    name: "pending",
    provenance: { source: "import" },
  });
  await paused;
  await b.create("concurrent-new-project");
  const queuedRead = a.load();
  const before = await b.load();
  assert.deepEqual(
    before.projects.map((p) => p.name),
    ["existing", "concurrent-new-project"],
  );
  release();
  await assert.rejects(storing, /revision conflict/i);
  await queuedRead;
  const after = await f.repo().load();
  assert.deepEqual(
    after.projects.map((p) => p.name),
    ["existing", "concurrent-new-project"],
  );
  assert.equal(after.revision, before.revision);
  assert.equal(after.assets.length, 0);
  assert.equal(f.blobs.size, 1);
});
