import test from "node:test";
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

test("message edits retain source text and project forks create independent records", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  const messageId = randomUUID();
  await f.app.mutate(ctx, (repo, s) =>
    repo.appendMessage(
      project,
      {
        id: messageId,
        projectId: project,
        conversationId: project,
        role: "assistant",
        text: "Original response",
        model: "reported-model",
        createdAt: Date.now(),
      },
      s.projects[0].revision,
    ),
  );
  await f.app.projects.editMessage(
    project,
    messageId,
    "User edited response",
    ctx.snapshot.projects[0].revision,
    ctx.accountId,
  );
  const messages = ctx.snapshot.projects[0].messages;
  assert.equal(messages[0].text, "Original response");
  assert.equal(messages[1].editedFromId, messageId);
  assert.equal(messages[1].model, "reported-model");
  assert.equal(f.calls, 0);
  const exported = f.app.projects.exportText(project, ctx.accountId);
  assert.match(exported, /Original response/);
  assert.match(exported, /User edited response/);
  await f.app.projects.deleteMessage(
    project,
    messageId,
    ctx.snapshot.projects[0].revision,
    ctx.accountId,
  );
  assert.ok(
    !f.app.projects
      .exportText(project, ctx.accountId)
      .includes("Original response"),
  );
  await assert.rejects(
    f.app.projects.editMessage(
      project,
      messageId,
      "Resurrect",
      ctx.snapshot.projects[0].revision,
      ctx.accountId,
    ),
    /missing|deleted|移除|不存在/i,
  );
  await f.app.reloadStorage();
  await f.app.projects.fork(project, ctx.accountId);
  const fork = ctx.snapshot.projects.find((p) => p.id !== project)!;
  assert.ok(fork.restoredFrom);
  assert.equal(fork.messages[1].text, "User edited response");
  assert.notEqual(fork.messages[1].id, messages[1].id);
  assert.equal(f.calls, 0);
});

test("project restore plans are account-bound and retained draft blocks misleading backup", async () => {
  const f = fixture(),
    project = await ready(f),
    scope = f.app.context().accountId;
  const payload = await f.app.projects.backup(project, scope);
  const plan = await f.app.projects.preflight(payload, scope);
  assert.equal(plan.projectName, "Draft project");
  await f.app.logout();
  await f.app.login("alice", "pw", "https://another.example");
  await assert.rejects(f.app.projects.restore(plan), /账号|会话/);
  assert.equal(f.app.getState().snapshot!.projects.length, 0);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example");
  await f.app.projects.restore(plan);
  assert.equal(f.app.getState().snapshot!.projects.length, 2);
  assert.notEqual(f.app.getState().snapshot!.activeProjectId, project);
  f.fail(true);
  await assert.rejects(
    f.app.saveDraft(project, {
      ...f.app.getDraft(project),
      prompt: "Failed retained draft",
    }),
  );
  f.fail(false);
  await f.app.reloadStorage();
  await assert.rejects(f.app.projects.backup(project, scope), /保留|草稿/);
});

test("material favorites persist and a referenced member blocks the whole deletion batch", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  const a = await ctx.repo.storeOriginal({
    bytes: new TextEncoder().encode("Referenced original"),
    mime: "text/plain",
    name: "a.txt",
    provenance: { source: "import" },
  });
  const b = await ctx.repo.storeOriginal({
    bytes: new TextEncoder().encode("Unreferenced original"),
    mime: "text/plain",
    name: "b.txt",
    provenance: { source: "import" },
  });
  await f.app.reloadStorage();
  await f.app.materials.favorite([a.id, b.id], true, ctx.accountId);
  await f.app.reloadStorage();
  assert.ok(ctx.snapshot.assets.every((a) => a.favorite));
  await f.app.mutate(ctx, (repo, s) =>
    repo.attachMaterial(project, a.id, s.projects[0].revision),
  );
  assert.match(
    f.app.materials.deletionReason([a.id, b.id], ctx.accountId)!,
    /Draft project/,
  );
  await assert.rejects(
    f.app.materials.remove([a.id, b.id], "original", ctx.accountId),
    /引用/,
  );
  assert.equal(ctx.snapshot.assets.length, 2);
  assert.equal(
    new TextDecoder().decode(await ctx.repo.readOriginal(b.id)),
    "Unreferenced original",
  );
  await f.app.materials.remove([a.id, b.id], "hide", ctx.accountId);
  assert.ok(ctx.snapshot.assets.every((a) => a.hidden));
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  await assert.rejects(
    f.app.materials.favorite([a.id], false, ctx.accountId),
    /账号|会话/,
  );
});
test("message editor retains failed text in its realm and refuses an unreviewed new project revision", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context(),
    id = randomUUID();
  await f.app.mutate(ctx, (r, s) =>
    r.appendMessage(
      project,
      {
        id,
        projectId: project,
        conversationId: project,
        role: "user",
        text: "Source",
        createdAt: Date.now(),
      },
      s.projects[0].revision,
    ),
  );
  const edit = f.app.projects.openMessageEdit(project, id, ctx.accountId);
  edit.text = "Retained edit";
  f.app.projects.rememberMessageEdit(project, id, edit, ctx.accountId);
  await f.app.renameProject(project, "Concurrent rename");
  await assert.rejects(
    f.app.projects.saveMessageEdit(project, id, edit, ctx.accountId),
    /revision|version|冲突|版本/i,
  );
  await f.app.reloadStorage();
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  assert.throws(
    () => f.app.projects.openMessageEdit(project, id, ctx.accountId),
    /账号|会话/,
  );
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example");
  assert.equal(
    f.app.projects.openMessageEdit(project, id, ctx.accountId).text,
    "Retained edit",
  );
  edit.revision = f.app.context().snapshot.projects[0].revision;
  f.app.projects.rememberMessageEdit(project, id, edit, ctx.accountId);
  const newId = await f.app.projects.saveMessageEdit(
    project,
    id,
    edit,
    ctx.accountId,
  );
  assert.notEqual(newId, id);
  assert.equal(f.app.context().snapshot.projects[0].messages[0].text, "Source");
  assert.equal(
    f.app.context().snapshot.projects[0].messages[1].text,
    "Retained edit",
  );
});
test("batch cancellation stops after the last durable material change and reports completed items", async () => {
  const f = fixture();
  await ready(f);
  const ctx = f.app.context();
  const ids: string[] = [];
  for (const name of ["a", "b"])
    ids.push(
      (
        await ctx.repo.storeOriginal({
          bytes: new TextEncoder().encode(name),
          name: `${name}.txt`,
          mime: "text/plain",
          provenance: { source: "import" },
        })
      ).id,
    );
  await f.app.reloadStorage();
  const controller = new AbortController(),
    progress: number[] = [];
  await assert.rejects(
    f.app.materials.favorite(ids, true, ctx.accountId, {
      signal: controller.signal,
      onProgress(done) {
        progress.push(done);
        controller.abort();
      },
    }),
    /停止|取消/,
  );
  assert.deepEqual(progress, [1]);
  assert.equal(ctx.snapshot.assets[0].favorite, true);
  assert.equal(ctx.snapshot.assets[1].favorite, undefined);
  const shared: string[] = [];
  const shareController = new AbortController();
  await assert.rejects(
    f.app.materials.share(
      ids,
      async (repo, id) => {
        await repo.readOriginal(id);
        shared.push(id);
      },
      ctx.accountId,
      {
        signal: shareController.signal,
        onProgress() {
          shareController.abort();
        },
      },
    ),
    /停止|取消/,
  );
  assert.deepEqual(shared, [ids[0]]);
});
test("a late original read cannot be handed to a share sheet in another account", async () => {
  const f = fixture();
  await ready(f);
  const ctx = f.app.context();
  const asset = await ctx.repo.storeOriginal({
    bytes: new TextEncoder().encode("Private original"),
    name: "private.txt",
    mime: "text/plain",
    provenance: { source: "import" },
  });
  await f.app.reloadStorage();
  const read = ctx.repo.readOriginal.bind(ctx.repo);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let reading!: () => void;
  const entered = new Promise<void>((r) => (reading = r));
  ctx.repo.readOriginal = async (id) => {
    const bytes = await read(id);
    reading();
    await gate;
    return bytes;
  };
  const preparing = f.app.materials.originalForShare(asset.id, ctx.accountId);
  await entered;
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  release();
  await assert.rejects(preparing, /会话|账号/);
  assert.equal(f.app.getState().snapshot!.assets.length, 0);
});
