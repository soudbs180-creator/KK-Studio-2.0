import test from "node:test";
import { ProposalWorkflows } from "../src/application/proposalWorkflows.ts";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { MobileRepository } from "../src/storage/repository.ts";
import { createSessionVault } from "../src/storage/sessionVault.ts";
import { createMobileApplication } from "../src/application/application.ts";
import type { AuthSession } from "../src/services/authTypes.ts";

function fixture() {
  const snapshots = new Map<string, string>(),
    bytes = new Map<string, Uint8Array>(),
    sessions = new Map<string, AuthSession>(),
    vaultId = randomUUID();
  let failed = false,
    calls = 0,
    now = Date.now();
  const repository = async (accountId: string) =>
    new MobileRepository({
      accountId,
      id: randomUUID,
      now: () => ++now,
      hash: async (b) => createHash("sha256").update(b).digest("hex"),
      backend: {
        async read(a) {
          return snapshots.get(a) ?? null;
        },
        async compareAndSwap(a, r, p) {
          if (failed) return false;
          const old = snapshots.get(a);
          if ((old ? JSON.parse(old).revision : null) !== r) return false;
          snapshots.set(a, p);
          return true;
        },
      },
      originalStore: {
        async read(a, id) {
          const b = bytes.get(`${a}/${id}`);
          if (!b) throw new Error("missing original");
          return b.slice();
        },
        async write(a, id, b) {
          bytes.set(`${a}/${id}`, b.slice());
        },
        async remove(a, id) {
          bytes.delete(`${a}/${id}`);
        },
      },
    });
  const app = createMobileApplication({
    repository,
    vault: (a) => createSessionVault(`${vaultId}/${a}`),
    identityDigest: async (value) =>
      createHash("sha256").update(value).digest("hex"),
    id: randomUUID,
    now: () => ++now,
    identity: (origin) => ({
      async login(input) {
        const s = {
          user: {
            id: input.email,
            email: input.email,
            displayName: input.email,
          },
          deviceId: input.deviceId,
          accessToken: "a".repeat(40),
          refreshToken: "r".repeat(40),
          accessExpiresAt: now + 600000,
          refreshExpiresAt: now + 3600000,
        };
        sessions.set(origin, s);
        return s;
      },
      async refresh() {
        return sessions.get(origin)!;
      },
      async me() {
        const s = sessions.get(origin)!;
        return { user: s.user, deviceId: s.deviceId };
      },
      async logout() {
        return { revoked: true };
      },
    }),
    provider: () => ({
      async probeModels(c) {
        return {
          connectionId: c.id,
          models: [],
          health: "reachable",
          generationVerified: false,
        };
      },
      async generateText() {
        calls++;
        throw new Error("No paid request allowed");
      },
      async generateImages() {
        calls++;
        throw new Error("No paid request allowed");
      },
    }),
  });
  return {
    app,
    proposals: new ProposalWorkflows(app),
    repository,
    snapshots,
    fail(value: boolean) {
      failed = value;
    },
    get calls() {
      return calls;
    },
  };
}
async function ready(f: ReturnType<typeof fixture>) {
  await f.app.start();
  await f.app.login("alice", "pw", "https://identity.example");
  await f.app.createProject("Draft project");
  return f.app.getState().snapshot!.projects[0].id;
}

test("approving a generation proposal changes only its captured draft and cannot run twice", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  await f.proposals.stage(
    project,
    {
      kind: "generation",
      title: "Draft proposal",
      draft: {
        ...f.app.getDraft(project),
        prompt: "Approved draft",
        model: "chosen",
      },
    },
    ctx.accountId,
  );
  const proposal = ctx.snapshot.projects[0].canvasProposals![0];
  const preview = f.proposals.preview(project, proposal.id, ctx.accountId);
  assert.equal(preview.draft!.prompt, "Approved draft");
  assert.equal(ctx.snapshot.projects[0].composerDraft.prompt, "");
  await f.proposals.approve(
    project,
    proposal.id,
    proposal.revision,
    proposal.baseProjectRevision,
    ctx.accountId,
  );
  assert.equal(f.app.getDraft(project).prompt, "Approved draft");
  assert.equal(ctx.snapshot.projects[0].tasks.length, 0);
  assert.equal(f.calls, 0);
  await assert.rejects(
    f.proposals.approve(
      project,
      proposal.id,
      proposal.revision,
      proposal.baseProjectRevision,
      ctx.accountId,
    ),
    /pending|version|revision|批准|版本/i,
  );
});
test("retained failed input blocks generation approval before any durable overwrite", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  await f.proposals.stage(
    project,
    {
      kind: "generation",
      title: "Draft proposal",
      draft: { ...f.app.getDraft(project), prompt: "Replace" },
    },
    ctx.accountId,
  );
  const q = ctx.snapshot.projects[0].canvasProposals![0];
  f.fail(true);
  await assert.rejects(
    f.app.saveDraft(project, {
      ...f.app.getDraft(project),
      prompt: "Private retained input",
    }),
  );
  f.fail(false);
  await f.app.reloadStorage();
  const before = ctx.snapshot.revision;
  await assert.rejects(
    f.proposals.approve(
      project,
      q.id,
      q.revision,
      q.baseProjectRevision,
      ctx.accountId,
    ),
    /保留|草稿/,
  );
  assert.equal(ctx.snapshot.revision, before);
  assert.equal(f.app.getDraft(project).prompt, "Private retained input");
  assert.equal(ctx.snapshot.projects[0].canvasProposals![0].status, "pending");
  assert.equal(f.calls, 0);
});
test("canvas proposal is preview-only until approval and stale versions require explicit refresh", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  await f.proposals.stage(
    project,
    {
      kind: "canvas",
      title: "One node",
      operations: [
        {
          type: "add_node",
          node: { id: "node-a", kind: "text", x: 10, y: 20, text: "Node text" },
        },
      ],
    },
    ctx.accountId,
  );
  let q = ctx.snapshot.projects[0].canvasProposals![0];
  assert.equal(
    f.proposals.preview(project, q.id, ctx.accountId).canvas.nodes.length,
    1,
  );
  assert.equal(ctx.snapshot.projects[0].canvas.nodes.length, 0);
  await f.app.renameProject(project, "Changed revision");
  assert.equal(f.proposals.preview(project, q.id, ctx.accountId).stale, true);
  await assert.rejects(
    f.proposals.approve(
      project,
      q.id,
      q.revision,
      q.baseProjectRevision,
      ctx.accountId,
    ),
  );
  await f.app.reloadStorage();
  await f.proposals.refresh(
    project,
    q.id,
    q.revision,
    ctx.snapshot.projects[0].revision,
    ctx.accountId,
  );
  q = ctx.snapshot.projects[0].canvasProposals![0];
  await f.proposals.approve(
    project,
    q.id,
    q.revision,
    q.baseProjectRevision,
    ctx.accountId,
  );
  assert.equal(ctx.snapshot.projects[0].canvas.nodes[0].text, "Node text");
  assert.equal(f.calls, 0);
});
test("proposal withdraw and cross-realm approval cannot execute local or provider effects", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  await f.proposals.stage(
    project,
    {
      kind: "canvas",
      title: "Withdraw",
      operations: [{ type: "set_viewport", viewport: { x: 1, y: 2, zoom: 2 } }],
    },
    ctx.accountId,
  );
  const q = ctx.snapshot.projects[0].canvasProposals![0];
  await f.proposals.finish(
    project,
    q.id,
    "withdrawn",
    q.revision,
    ctx.snapshot.projects[0].revision,
    ctx.accountId,
  );
  assert.equal(ctx.snapshot.projects[0].canvas.viewport.zoom, 1);
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  await assert.rejects(
    f.proposals.approve(
      project,
      q.id,
      q.revision,
      q.baseProjectRevision,
      ctx.accountId,
    ),
    /会话|账号/,
  );
  assert.equal(f.app.getState().snapshot!.projects.length, 0);
  assert.equal(f.calls, 0);
});
test("canvas editing preserves RAM input by realm and stale edits cannot be silently staged", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  const edit = f.proposals.openCanvasEdit(project, ctx.accountId);
  edit.operations.push({
    type: "add_node",
    node: {
      id: "retained-node",
      kind: "text",
      x: 1,
      y: 2,
      text: "Retained canvas input",
    },
  });
  f.proposals.rememberCanvasEdit(project, edit, ctx.accountId);
  await f.app.renameProject(project, "Updated name");
  assert.equal(
    f.proposals.previewCanvasEdit(project, edit, ctx.accountId).stale,
    true,
  );
  await assert.rejects(
    f.proposals.stageCanvasEdit(project, edit, ctx.accountId),
    /revision|version|冲突|版本/i,
  );
  await f.app.reloadStorage();
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  assert.throws(
    () => f.proposals.openCanvasEdit(project, ctx.accountId),
    /会话|账号/,
  );
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example");
  assert.equal(
    f.proposals.openCanvasEdit(project, ctx.accountId).operations.length,
    1,
  );
  const fresh = f.proposals.rebaseCanvasEdit(project, edit, ctx.accountId);
  await f.proposals.stageCanvasEdit(project, fresh, ctx.accountId);
  assert.equal(f.app.context().snapshot.projects[0].canvas.nodes.length, 0);
  assert.equal(
    f.app.context().snapshot.projects[0].canvasProposals![0].status,
    "pending",
  );
  assert.equal(
    f.proposals.openCanvasEdit(project, ctx.accountId).operations.length,
    0,
  );
  assert.equal(f.calls, 0);
});
test("a retained canvas edit protects its original before proposal persistence", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: new TextEncoder().encode("Canvas original"),
    name: "canvas.txt",
    mime: "text/plain",
    provenance: { source: "import" },
  });
  await f.app.reloadStorage();
  const edit = f.proposals.openCanvasEdit(project, ctx.accountId);
  edit.operations = [
    {
      type: "add_node",
      node: { id: "file-node", kind: "file", x: 0, y: 0, assetId: asset.id },
    },
  ];
  f.proposals.rememberCanvasEdit(project, edit, ctx.accountId);
  assert.match(
    f.app.materials.deletionReason([asset.id], ctx.accountId)!,
    /画布|引用/,
  );
  await assert.rejects(
    f.app.materials.remove([asset.id], "original", ctx.accountId),
    /画布|引用/,
  );
  assert.equal(
    new TextDecoder().decode(await ctx.repo.readOriginal(asset.id)),
    "Canvas original",
  );
  f.proposals.discardCanvasEdit(project, ctx.accountId);
  assert.equal(
    f.app.materials.deletionReason([asset.id], ctx.accountId),
    undefined,
  );
});
test("queued physical deletion rechecks a canvas reference added before the actual effect", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: new TextEncoder().encode("Queue protected original"),
    name: "queued.txt",
    mime: "text/plain",
    provenance: { source: "import" },
  });
  await f.app.reloadStorage();
  let release!: () => void;
  ctx.pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const removing = f.app.materials.remove(
    [asset.id],
    "original",
    ctx.accountId,
  );
  const edit = f.proposals.openCanvasEdit(project, ctx.accountId);
  edit.operations = [
    {
      type: "add_node",
      node: {
        id: "late-reference",
        kind: "file",
        x: 0,
        y: 0,
        assetId: asset.id,
      },
    },
  ];
  f.proposals.rememberCanvasEdit(project, edit, ctx.accountId);
  release();
  await assert.rejects(removing, /画布|引用/);
  assert.equal(
    new TextDecoder().decode(await ctx.repo.readOriginal(asset.id)),
    "Queue protected original",
  );
});
test("an executing original deletion blocks new RAM references until its result is durable", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: new TextEncoder().encode("Original under deletion"),
    name: "locked.txt",
    mime: "text/plain",
    provenance: { source: "import" },
  });
  await f.app.reloadStorage();
  let release!: () => void, entered!: () => void;
  const waiting = new Promise<void>((resolve) => {
      release = resolve;
    }),
    started = new Promise<void>((resolve) => {
      entered = resolve;
    });
  const deletion = ctx.repo.deleteOriginals.bind(ctx.repo);
  ctx.repo.deleteOriginals = async (ids) => {
    entered();
    await waiting;
    return deletion(ids);
  };
  const removing = f.app.materials.remove(
    [asset.id],
    "original",
    ctx.accountId,
  );
  await started;
  const edit = f.proposals.openCanvasEdit(project, ctx.accountId);
  edit.operations = [
    {
      type: "add_node",
      node: {
        id: "while-deleting",
        kind: "file",
        x: 0,
        y: 0,
        assetId: asset.id,
      },
    },
  ];
  try {
    assert.throws(
      () => f.proposals.rememberCanvasEdit(project, edit, ctx.accountId),
      /删除|原件/,
    );
  } finally {
    release();
    await removing;
  }
  assert.equal(
    f.proposals.openCanvasEdit(project, ctx.accountId).operations.length,
    0,
  );
});
