import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import { emptyMobileSnapshot } from "../src/core/mobileModel.ts";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE mobile_snapshots(account TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)",
  );
  const originals = new Map<string, Uint8Array>();
  let failSave = false;
  const driver = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async getFirstAsync<T>(
      sql: string,
      ...params: (string | number)[]
    ): Promise<T | null> {
      return (db.prepare(sql).get(...params) ?? null) as T | null;
    },
    async runAsync(sql: string, ...params: (string | number)[]) {
      if (failSave) throw new Error("Injected durable failure");
      return { changes: Number(db.prepare(sql).run(...params).changes) };
    },
  };
  const create = () =>
    new MobileRepository({
      accountId: "alice",
      backend: new SqliteSnapshotBackend(driver),
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
  return {
    create,
    db,
    originals,
    fail: (value: boolean) => {
      failSave = value;
    },
  };
}

test("proposal durable failure preserves pending approval and original bytes instead of publishing success", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  const asset = await r.storeOriginal({
    bytes: new Uint8Array([1, 2]),
    mime: "application/octet-stream",
    name: "Original",
    provenance: { source: "import" },
  });
  let s = await r.create("Pending"),
    p = s.projects[0];
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "canvas",
      title: "Asset",
      operations: [
        {
          type: "add_node",
          node: {
            id: "asset-node",
            kind: "file",
            x: 0,
            y: 0,
            assetId: asset.id,
          },
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  const proposal = p.canvasProposals![0];
  f.fail(true);
  await assert.rejects(
    r.local.approveProposal(p.id, proposal.id, proposal.revision, p.revision),
    /durable failure/i,
  );
  await assert.rejects(
    r.local.createLibrary({
      kind: "role",
      name: "Frozen",
      content: "Preserved",
    }),
    /frozen/i,
  );
  f.fail(false);
  s = await r.load();
  p = s.projects[0];
  assert.equal(p.canvas.nodes.length, 0);
  assert.equal(p.canvasProposals![0].status, "pending");
  assert.deepEqual(await r.readOriginal(asset.id), new Uint8Array([1, 2]));
});

test("proposal references protect original deletion and hash damage prevents local approval", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  const asset = await r.storeOriginal({
    bytes: new Uint8Array([1, 2]),
    mime: "application/octet-stream",
    name: "Original",
    provenance: { source: "import" },
  });
  let s = await r.create("Pending"),
    p = s.projects[0];
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "canvas",
      title: "Asset",
      operations: [
        {
          type: "add_node",
          node: {
            id: "asset-node",
            kind: "file",
            x: 0,
            y: 0,
            assetId: asset.id,
          },
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  await assert.rejects(r.deleteOriginal(asset.id), /referenced/i);
  f.originals.set(`alice/${asset.id}`, new Uint8Array([9, 9]));
  await assert.rejects(
    r.local.approveProposal(p.id, p.canvasProposals![0].id, 0, p.revision),
    /hash/i,
  );
  s = await r.load();
  assert.equal(s.projects[0].canvas.nodes.length, 0);
  assert.equal(s.projects[0].canvasProposals![0].status, "pending");
  assert.equal(s.projects[0].tasks.length, 0);
});

test("legacy schema version1 snapshots load with optional advanced fields absent", async () => {
  const f = fixture(),
    legacy = emptyMobileSnapshot();
  f.db
    .prepare("INSERT INTO mobile_snapshots VALUES (?,?,?)")
    .run("alice", 0, JSON.stringify(legacy));
  const r = f.create(),
    s = await r.load();
  assert.deepEqual(s, legacy);
  assert.equal(s.library, undefined);
  const next = await r.local.createLibrary({
    kind: "skill-instruction",
    name: "Instructions",
    content: "No executable tools",
  });
  assert.equal(next.library?.[0].kind, "skill-instruction");
});

test("strict portable project preflight rejects malformed proposals and edit cycles before activation", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Boundaries"),
    p = s.projects[0];
  s = await r.appendMessage(
    p.id,
    {
      id: "source",
      projectId: p.id,
      conversationId: "c",
      role: "user",
      text: "Source",
      createdAt: 100,
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.editMessage(p.id, "source", "Derivative", p.revision);
  p = s.projects[0];
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "canvas",
      title: "Preview",
      operations: [
        {
          type: "add_node",
          node: { id: "n", kind: "text", x: 0, y: 0, text: "N" },
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  const backup = await r.backup(p.id);
  const cases: [string[], unknown][] = [
    [
      ["project", "canvasProposals", "0", "operations", "0", "node", "apiKey"],
      "blocked",
    ],
    [
      ["project", "canvasProposals", "0", "operations"],
      [{ type: "eval", code: "1+1" }],
    ],
    [
      ["project", "canvasProposals", "0", "operations", "0", "node", "taskId"],
      "missing",
    ],
    [["project", "canvasProposals", "0", "draft"], {}],
    [["project", "messages", "0", "editedFromId"], p.messages[1].id],
    [["project", "messages", "1", "model"], "foreign-model"],
    [["project", "pinned"], "yes"],
    [["project", "group"], "g".repeat(81)],
  ];
  for (const [path, value] of cases) {
    const malformed = JSON.parse(backup) as Record<string, unknown>;
    let cursor = malformed;
    for (const key of path.slice(0, -1))
      cursor = cursor[key] as Record<string, unknown>;
    cursor[path.at(-1)!] = value;
    await assert.rejects(r.preflightRestore(JSON.stringify(malformed)));
    await assert.rejects(r.restore(JSON.stringify(malformed)));
  }
  assert.equal((await r.load()).projects.length, 1);
  assert.equal(f.originals.size, 0);
});

test("instruction and proposal schemas reject arbitrary execution fields and bounded overflow", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Bounded"),
    p = s.projects[0];
  await assert.rejects(
    r.local.createLibrary({
      kind: new String("prompt"),
      name: "Not a scalar",
      content: "Text",
    } as never),
    /kind/i,
  );
  await assert.rejects(
    r.local.createLibrary({
      kind: "prompt",
      name: "Too large",
      content: "x".repeat(20001),
    }),
    /bounded/i,
  );
  await assert.rejects(
    r.local.createLibrary({
      kind: "skill-instruction",
      name: "Never exec",
      content: "Text",
      command: "whoami",
    } as never),
    /schema/i,
  );
  await assert.rejects(
    r.local.stageProposal(
      p.id,
      {
        kind: "canvas",
        title: "Unknown tool",
        operations: [{ type: "mcp", tool: "shell" }],
      } as never,
      p.revision,
    ),
    /unsupported/i,
  );
  await assert.rejects(
    r.local.stageProposal(
      p.id,
      {
        kind: "canvas",
        title: "Overflow",
        operations: Array.from({ length: 201 }, () => ({
          type: "remove_node",
          nodeId: "n",
        })),
      } as never,
      p.revision,
    ),
    /bounded/i,
  );
  await assert.rejects(
    r.local.applyCanvasOperations(
      p.id,
      [{ type: "set_viewport", viewport: { x: 0, y: 0, zoom: 0 } }],
      p.revision,
    ),
    /zoom/i,
  );
  await assert.rejects(
    r.local.applyCanvasOperations(
      p.id,
      [
        {
          type: "add_node",
          node: { id: "bad", kind: "text", x: Infinity, y: 0, text: "Bad" },
        },
      ],
      p.revision,
    ),
    /number/i,
  );
  s = await r.load();
  assert.equal(s.library, undefined);
  assert.equal(s.projects[0].canvasProposals, undefined);
  assert.equal(s.projects[0].revision, 0);
});

test("restored pending proposals require explicit refresh despite later project revision coincidence", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Source"),
    p = s.projects[0];
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "canvas",
      title: "Pending",
      operations: [
        {
          type: "add_node",
          node: { id: "note", kind: "text", x: 0, y: 0, text: "N" },
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.forkProject(p.id, p.revision);
  let restored = s.projects[1];
  const q = restored.canvasProposals![0];
  s = await r.local.setProjectMetadata(
    restored.id,
    { pinned: true },
    restored.revision,
  );
  restored = s.projects[1];
  assert.equal(restored.revision, q.baseProjectRevision);
  await assert.rejects(
    r.local.approveProposal(restored.id, q.id, 0, restored.revision),
    /refresh/i,
  );
  assert.equal(q.kind, "canvas");
  if (q.kind !== "canvas") throw new Error("Expected canvas");
  s = await r.local.updateProposal(
    restored.id,
    q.id,
    { kind: "canvas", title: "Explicit refresh", operations: q.operations },
    0,
    restored.revision,
  );
  restored = s.projects[1];
  s = await r.local.approveProposal(restored.id, q.id, 1, restored.revision);
  assert.equal(s.projects[1].canvas.nodes.length, 1);
  assert.equal(s.projects[1].canvasProposals![0].requiresRefresh, undefined);
});

test("fresh staged operations must have a complete valid preview before they can persist", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  const s = await r.create("Valid preview"),
    p = s.projects[0];
  await assert.rejects(
    r.local.stageProposal(
      p.id,
      {
        kind: "canvas",
        title: "Broken preview",
        operations: [
          {
            type: "add_node",
            node: { id: "present", kind: "text", x: 0, y: 0 },
          },
          {
            type: "add_edge",
            edge: { id: "broken", source: "present", target: "missing" },
          },
        ],
      },
      p.revision,
    ),
    /missing|edge/i,
  );
  const after = await r.load();
  assert.equal(after.projects[0].canvasProposals, undefined);
  assert.equal(after.projects[0].revision, 0);
});

test("legacy finite canvas coordinates and zoom remain readable while new local operation bounds stay explicit", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  const s = await r.create("Legacy canvas"),
    p = s.projects[0];
  p.canvas = {
    nodes: [
      { id: "legacy-node", kind: "text", x: 1e10, y: 1e10, text: "Old canvas" },
    ],
    edges: [],
    viewport: { x: 1e10, y: 0, zoom: 200 },
  };
  f.db
    .prepare("UPDATE mobile_snapshots SET payload=? WHERE account=?")
    .run(JSON.stringify(s), "alice");
  const reopened = f.create();
  assert.equal((await reopened.load()).projects[0].canvas.viewport.zoom, 200);
  await assert.rejects(
    reopened.local.applyCanvasOperations(
      p.id,
      [{ type: "move_node", nodeId: "legacy-node", x: 1e10, y: 0 }],
      p.revision,
    ),
    /number/i,
  );
});

test("library own-package preflight measures actual UTF8 bytes before independent import", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  const entries = Array.from({ length: 400 }, (_, index) => ({
    id: `entry-${index}`,
    kind: "prompt",
    name: "Bounded entry",
    content: "界".repeat(8000),
    revision: 0,
    createdAt: 100,
    updatedAt: 100,
  }));
  const payload = JSON.stringify({
    format: "kk-mobile-library",
    version: 1,
    entries,
  });
  assert.ok(payload.length < 8 * 1024 * 1024);
  assert.ok(Buffer.byteLength(payload, "utf8") > 8 * 1024 * 1024);
  await assert.rejects(r.local.preflightLibraryImport(payload), /limit/i);
  await assert.rejects(r.local.importLibrary(payload), /limit/i);
  assert.equal((await r.load()).library, undefined);
});
