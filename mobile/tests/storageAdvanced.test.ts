import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";
import { newMobileDraft } from "../src/core/mobileModel.ts";

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
      ...params: (string | number)[]
    ): Promise<T | null> {
      return (db.prepare(sql).get(...params) ?? null) as T | null;
    },
    async runAsync(sql: string, ...params: (string | number)[]) {
      return { changes: Number(db.prepare(sql).run(...params).changes) };
    },
  };
  const create = (accountId = "alice") =>
    new MobileRepository({
      accountId,
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
  return { create, db };
}

test("account library CRUD preserves distinct instructions and imports independent bounded copies", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  for (const kind of [
    "prompt",
    "template",
    "role",
    "skill-instruction",
  ] as const)
    await r.local.createLibrary({
      kind,
      name: kind,
      content: `Captured ${kind}`,
    });
  let s = await r.load();
  assert.equal(s.library?.length, 4);
  const first = s.library![0];
  s = await r.local.updateLibrary(
    first.id,
    { kind: "prompt", name: "Edited", content: "New instruction" },
    first.revision,
  );
  assert.equal(s.library![0].revision, 1);
  await assert.rejects(
    r.local.updateLibrary(
      first.id,
      { kind: "prompt", name: "Stale", content: "Lost" },
      0,
    ),
    /revision/i,
  );
  const pkg = await r.local.exportLibrary();
  assert.equal((await r.local.preflightLibraryImport(pkg)).entryCount, 4);
  const bob = f.create("bob");
  await bob.initialize();
  s = await bob.local.importLibrary(pkg);
  assert.equal(s.library?.length, 4);
  assert.ok(
    s.library!.every(
      (e) =>
        !JSON.parse(pkg).entries.some((old: { id: string }) => old.id === e.id),
    ),
  );
  await r.local.deleteLibrary(first.id, 1);
  assert.equal((await r.load()).library?.length, 3);
  assert.equal((await f.create("bob").load()).library?.length, 4);
  const bad = JSON.parse(pkg);
  bad.entries[0].apiKey = "never-store";
  await assert.rejects(
    bob.local.preflightLibraryImport(JSON.stringify(bad)),
    /secret|schema/i,
  );
  delete bad.entries[0].apiKey;
  bad.entries[0] = { ...bad.entries[0], kind: "mcp-executable" };
  await assert.rejects(bob.local.importLibrary(JSON.stringify(bad)), /kind/i);
  assert.equal((await bob.load()).library?.length, 4);
});

test("project grouping pins favorites and edited/deleted messages persist without changing source output", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Original"),
    p = s.projects[0];
  s = await r.local.setProjectMetadata(
    p.id,
    { group: "Work", pinned: true },
    p.revision,
  );
  p = s.projects[0];
  const a = await r.storeOriginal({
    bytes: new Uint8Array([3, 4]),
    mime: "application/octet-stream",
    name: "Original",
    provenance: { source: "import" },
  });
  s = await r.local.setAssetFavorite(a.id, true);
  assert.equal(s.assets[0].favorite, true);
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
          text: "Immutable output",
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
      id: "message",
      projectId: p.id,
      conversationId: "conversation",
      taskId: "completed",
      role: "assistant",
      text: "Immutable output",
      createdAt: 100,
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.editMessage(
    p.id,
    "message",
    "Editable derivative",
    p.revision,
  );
  p = s.projects[0];
  const derivative = p.messages[1];
  assert.equal(derivative.editedFromId, "message");
  s = await r.local.deleteMessage(p.id, "message", p.revision);
  s = await f.create().load();
  p = s.projects[0];
  assert.equal(p.group, "Work");
  assert.equal(p.pinned, true);
  assert.equal(p.messages[0].text, "Immutable output");
  assert.equal(p.messages[0].deletedAt, 100);
  assert.equal(p.messages[1].text, "Editable derivative");
  assert.equal(p.tasks[0].outputs?.[0].text, "Immutable output");
  assert.deepEqual(await r.readOriginal(a.id), new Uint8Array([3, 4]));
});

test("canvas proposal preview is pure approval atomic and stale proposals require refresh", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Canvas"),
    p = s.projects[0];
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "canvas",
      title: "Add note",
      operations: [
        {
          type: "add_node",
          node: { id: "note", kind: "text", x: 1, y: 2, text: "Original note" },
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  const proposal = p.canvasProposals![0];
  assert.equal(proposal.kind, "canvas");
  if (proposal.kind !== "canvas") throw new Error("Expected canvas proposal");
  const preview = r.local.previewProposal(p.id, proposal.id);
  assert.equal(preview.canvas.nodes.length, 1);
  assert.equal((await r.load()).projects[0].canvas.nodes.length, 0);
  s = await r.local.setProjectMetadata(
    p.id,
    { group: "Later change" },
    p.revision,
  );
  p = s.projects[0];
  assert.equal(r.local.previewProposal(p.id, proposal.id).stale, true);
  await assert.rejects(
    r.local.approveProposal(p.id, proposal.id, 0, p.revision),
    /refresh|stale/i,
  );
  s = await r.local.updateProposal(
    p.id,
    proposal.id,
    { kind: "canvas", title: "Refreshed", operations: proposal.operations },
    0,
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.approveProposal(p.id, proposal.id, 1, p.revision);
  p = s.projects[0];
  assert.equal(p.canvas.nodes[0].text, "Original note");
  assert.equal(p.canvasProposals![0].status, "approved");
  assert.equal(p.tasks.length, 0);
  await assert.rejects(
    r.local.approveProposal(p.id, proposal.id, 1, p.revision),
    /pending/i,
  );
  s = await f.create().load();
  assert.equal(s.projects[0].canvasProposals![0].status, "approved");
});

test("canvas operations preflight all references and finite types before publishing any changes", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Canvas"),
    p = s.projects[0];
  await assert.rejects(
    r.local.applyCanvasOperations(
      p.id,
      [
        {
          type: "add_node",
          node: { id: "safe", kind: "text", x: 1, y: 2, text: "Never publish" },
        },
        {
          type: "add_edge",
          edge: { id: "invalid", source: "safe", target: "missing" },
        },
      ],
      p.revision,
    ),
  );
  assert.equal((await r.load()).projects[0].canvas.nodes.length, 0);
  await assert.rejects(
    r.local.applyCanvasOperations(
      p.id,
      [{ type: "shell", command: "whoami" }] as never,
      p.revision,
    ),
  );
  await assert.rejects(
    r.local.applyCanvasOperations(
      p.id,
      [
        {
          type: "add_node",
          node: {
            id: "badasset",
            kind: "image",
            x: 0,
            y: 0,
            assetId: "missing",
          },
        },
      ],
      p.revision,
    ),
  );
  s = await r.local.applyCanvasOperations(
    p.id,
    [
      {
        type: "add_node",
        node: { id: "a", kind: "text", x: 0, y: 0, text: "A" },
      },
      {
        type: "add_node",
        node: { id: "b", kind: "text", x: 1, y: 1, text: "B" },
      },
      { type: "add_edge", edge: { id: "ab", source: "a", target: "b" } },
      { type: "move_node", nodeId: "a", x: 2, y: 3 },
      { type: "edit_text", nodeId: "b", text: "Derivative" },
      { type: "set_viewport", viewport: { x: 10, y: 20, zoom: 2 } },
    ],
    p.revision,
  );
  p = s.projects[0];
  assert.equal(p.canvas.edges.length, 1);
  assert.equal(p.canvas.nodes[0].x, 2);
  assert.equal(p.canvas.viewport.zoom, 2);
  s = await r.local.applyCanvasOperations(
    p.id,
    [{ type: "remove_node", nodeId: "a" }],
    p.revision,
  );
  assert.equal(s.projects[0].canvas.edges.length, 0);
});

test("generation approval saves only a captured composer draft and reject or withdrawal creates no tasks", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Approvals"),
    p = s.projects[0];
  const draft = {
    ...newMobileDraft(100),
    prompt: "Captured proposal",
    model: "m",
  };
  s = await r.local.stageProposal(
    p.id,
    { kind: "generation", title: "Prepare creation", draft },
    p.revision,
  );
  p = s.projects[0];
  draft.prompt = "Caller mutation";
  s = await r.local.approveProposal(
    p.id,
    p.canvasProposals![0].id,
    0,
    p.revision,
  );
  p = s.projects[0];
  assert.equal(p.composerDraft.prompt, "Captured proposal");
  assert.equal(p.tasks.length, 0);
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "generation",
      title: "Reject",
      draft: { ...draft, prompt: "Never submit" },
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.rejectProposal(
    p.id,
    p.canvasProposals![1].id,
    0,
    p.revision,
  );
  p = s.projects[0];
  assert.equal(p.composerDraft.prompt, "Captured proposal");
  s = await r.local.stageProposal(
    p.id,
    { kind: "canvas", title: "Withdraw", operations: [] },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.withdrawProposal(
    p.id,
    p.canvasProposals![2].id,
    0,
    p.revision,
  );
  assert.equal(s.projects[0].canvasProposals![2].status, "withdrawn");
  assert.equal(s.projects[0].tasks.length, 0);
});

test("fork carries project metadata and independent message/proposal lineage while restored pending actions cannot activate", async () => {
  const f = fixture(),
    r = f.create();
  await r.initialize();
  let s = await r.create("Fork source"),
    p = s.projects[0];
  s = await r.local.setProjectMetadata(
    p.id,
    { group: "Group", pinned: true },
    p.revision,
  );
  p = s.projects[0];
  s = await r.appendMessage(
    p.id,
    {
      id: "original",
      projectId: p.id,
      conversationId: "conversation",
      role: "user",
      text: "Original",
      createdAt: 100,
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.editMessage(p.id, "original", "Derivative", p.revision);
  p = s.projects[0];
  s = await r.local.stageProposal(
    p.id,
    {
      kind: "canvas",
      title: "Pending note",
      operations: [
        {
          type: "add_node",
          node: {
            id: "pending-node",
            kind: "text",
            x: 0,
            y: 0,
            text: "Pending",
          },
        },
      ],
    },
    p.revision,
  );
  p = s.projects[0];
  s = await r.local.forkProject(p.id, p.revision);
  const fork = s.projects[1];
  assert.notEqual(fork.id, p.id);
  assert.equal(fork.group, "Group");
  assert.equal(fork.pinned, true);
  assert.notEqual(fork.messages[0].id, p.messages[0].id);
  assert.equal(fork.messages[1].editedFromId, fork.messages[0].id);
  assert.notEqual(fork.canvasProposals![0].id, p.canvasProposals![0].id);
  assert.equal(fork.canvasProposals![0].requiresRefresh, true);
  await assert.rejects(
    r.local.approveProposal(
      fork.id,
      fork.canvasProposals![0].id,
      0,
      fork.revision,
    ),
    /refresh|stale/i,
  );
  assert.equal((await r.load()).projects[1].canvas.nodes.length, 0);
});

test("advanced feature CAS conflicts are visible and cannot replace another writer's library or metadata", async () => {
  const f = fixture(),
    a = f.create();
  await a.initialize();
  let s = await a.create("Shared"),
    p = s.projects[0];
  const b = f.create();
  await b.load();
  await b.local.createLibrary({
    kind: "prompt",
    name: "Retained",
    content: "Other writer",
  });
  await assert.rejects(
    a.local.setProjectMetadata(p.id, { pinned: true }, p.revision),
    /conflict/i,
  );
  await assert.rejects(
    a.local.createLibrary({
      kind: "role",
      name: "Frozen",
      content: "Not published",
    }),
    /frozen/i,
  );
  s = await a.load();
  assert.equal(s.library?.[0].name, "Retained");
  assert.equal(s.projects[0].pinned, undefined);
});
