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

test("library apply protects failed retained input before any draft or project mutation", async () => {
  const f = fixture(),
    project = await ready(f),
    scope = f.app.context().accountId;
  await f.app.local.saveLibrary(
    { kind: "prompt", name: "Library prompt", content: "Replace input" },
    undefined,
    undefined,
    scope,
  );
  const entry = f.app.getState().snapshot!.library![0];
  f.fail(true);
  await assert.rejects(
    f.app.saveDraft(project, {
      ...f.app.getDraft(project),
      prompt: "Retained private draft",
    }),
  );
  f.fail(false);
  await f.app.reloadStorage();
  const revision = f.app.getState().snapshot!.revision;
  await assert.rejects(
    f.app.local.applyLibrary(entry.id, project, "replace", scope),
    /保留草稿/,
  );
  assert.equal(f.app.getDraft(project).prompt, "Retained private draft");
  assert.equal(f.app.getState().snapshot!.revision, revision);
  assert.equal(f.calls, 0);
});
test("role and skill library entries apply as explicit draft text without tools or generation", async () => {
  const f = fixture(),
    project = await ready(f),
    scope = f.app.context().accountId;
  await f.app.saveDraft(project, {
    ...f.app.getDraft(project),
    prompt: "User request",
    model: "chosen-model",
  });
  for (const kind of ["role", "skill-instruction"] as const) {
    await f.app.local.saveLibrary(
      { kind, name: kind, content: "Only supplied instructions" },
      undefined,
      undefined,
      scope,
    );
    const entry = f.app
      .getState()
      .snapshot!.library!.find((e) => e.kind === kind)!;
    await f.app.local.applyLibrary(entry.id, project, "append", scope);
  }
  await f.app.reloadStorage();
  assert.match(f.app.getDraft(project).prompt, /User request/);
  assert.match(f.app.getDraft(project).prompt, /Only supplied instructions/);
  assert.equal(f.app.getDraft(project).model, "chosen-model");
  assert.equal(f.calls, 0);
  assert.equal(f.app.getState().snapshot!.projects[0].tasks.length, 0);
});
test("library import preflight stays bound to the captured account and creates independent entries", async () => {
  const f = fixture();
  await ready(f);
  const scope = f.app.context().accountId;
  await f.app.local.saveLibrary(
    {
      kind: "template",
      name: "Original template",
      content: "Keep {{variable}} literal",
    },
    undefined,
    undefined,
    scope,
  );
  const payload = await f.app.local.exportLibrary(undefined, scope),
    plan = await f.app.local.preflightLibrary(payload, scope);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://another.example");
  await assert.rejects(f.app.local.importLibrary(plan), /账号|会话/);
  assert.equal(f.app.getState().snapshot!.library?.length ?? 0, 0);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example");
  await f.app.local.importLibrary(plan);
  const entries = f.app.getState().snapshot!.library!;
  assert.equal(entries.length, 2);
  assert.notEqual(entries[0].id, entries[1].id);
  assert.equal(entries[1].content, entries[0].content);
});
test("project grouping and pinning remain durable and stale account actions are rejected", async () => {
  const f = fixture(),
    project = await ready(f),
    scope = f.app.context().accountId;
  await f.app.local.setProjectMetadata(
    project,
    { group: "Work", pinned: true },
    scope,
  );
  await f.app.reloadStorage();
  assert.equal(f.app.getState().snapshot!.projects[0].group, "Work");
  assert.equal(f.app.getState().snapshot!.projects[0].pinned, true);
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  await assert.rejects(
    f.app.local.setProjectMetadata(project, { group: "Wrong realm" }, scope),
    /账号|会话/,
  );
  assert.equal(f.app.getState().snapshot!.projects.length, 0);
});
test("library editor retains failed input within its identity realm and saves only its captured entry revision", async () => {
  const f = fixture();
  await ready(f);
  const scope = f.app.context().accountId;
  await f.app.local.saveLibrary({
    kind: "prompt",
    name: "Original",
    content: "Saved baseline",
  });
  const entry = f.app.getState().snapshot!.library![0];
  const edit = f.app.local.openLibraryEdit(entry.id, scope);
  edit.input.content = "Unsaved private input";
  f.app.local.rememberLibraryEdit(entry.id, edit, scope);
  f.fail(true);
  await assert.rejects(f.app.local.saveLibraryEdit(entry.id, edit, scope));
  f.fail(false);
  await f.app.reloadStorage();
  await f.app.logout();
  await f.app.login("alice", "pw", "https://another.example");
  assert.equal(f.app.local.openLibraryEdit("new").input.content, "");
  assert.throws(
    () => f.app.local.openLibraryEdit(entry.id, scope),
    /账号|会话/,
  );
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example");
  const retained = f.app.local.openLibraryEdit(entry.id, scope);
  assert.equal(retained.input.content, "Unsaved private input");
  await f.app.local.saveLibrary(
    { kind: entry.kind, name: entry.name, content: "Updated saved version" },
    entry.id,
    entry.revision,
    scope,
  );
  await assert.rejects(
    f.app.local.saveLibraryEdit(entry.id, retained, scope),
    /version|revision|版本|冲突/i,
  );
  assert.equal(
    f.app.getState().snapshot!.library![0].content,
    "Updated saved version",
  );
  assert.equal(
    f.app.local.openLibraryEdit(entry.id, scope).input.content,
    "Unsaved private input",
  );
  await f.app.reloadStorage();
  retained.baseRevision = f.app.getState().snapshot!.library![0].revision;
  f.app.local.rememberLibraryEdit(entry.id, retained, scope);
  await f.app.local.saveLibraryEdit(entry.id, retained, scope);
  assert.equal(
    f.app.getState().snapshot!.library![0].content,
    "Unsaved private input",
  );
  assert.equal(
    f.app.local.openLibraryEdit(entry.id, scope).baseline.content,
    "Unsaved private input",
  );
  assert.equal(f.calls, 0);
});
test("global search locates all five local record types and excludes removed projections", async () => {
  const f = fixture(),
    project = await ready(f),
    ctx = f.app.context();
  await f.app.local.saveLibrary({
    kind: "prompt",
    name: "Needle prompt",
    content: "Searchable content",
  });
  await f.app.renameProject(project, "Needle project");
  await f.app.mutate(ctx, (repo, s) =>
    repo.appendMessage(
      project,
      {
        id: randomUUID(),
        projectId: project,
        conversationId: project,
        role: "user",
        text: "Needle message",
        createdAt: Date.now(),
      },
      s.projects[0].revision,
    ),
  );
  await f.app.mutate(ctx, (repo, s) =>
    repo.appendTask(
      project,
      {
        id: randomUUID(),
        idempotencyKey: randomUUID(),
        kind: "text",
        model: "local-fixture-model",
        prompt: "Needle task",
        status: "queued",
        submissionState: "intent",
        privacyMode: "byok_local",
        attempt: 1,
        requestedOutputs: 1,
        completedOutputs: 0,
        attachments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        outputs: [
          {
            index: 0,
            status: "waiting",
            model: "local-fixture-model",
            createdAt: Date.now(),
          },
        ],
      },
      s.projects[0].revision,
    ),
  );
  const asset = await ctx.repo.storeOriginal({
    name: "Needle image.png",
    mime: "image/png",
    provenance: { source: "import" },
    bytes: new Uint8Array(
      readFileSync(new URL("../assets/favicon.png", import.meta.url)),
    ),
  });
  await f.app.reloadStorage();
  const result = f.app.local.search("needle");
  assert.deepEqual(
    new Set(result.map((r) => r.kind)),
    new Set(["library", "project", "message", "task", "asset"]),
  );
  assert.ok(result.every((r) => r.id && r.title));
  const msg = ctx.snapshot.projects[0].messages[0];
  await f.app.mutate(ctx, (repo, s) =>
    repo.local.deleteMessage(project, msg.id, s.projects[0].revision),
  );
  assert.ok(!f.app.local.search("needle").some((r) => r.kind === "message"));
  await f.app.mutate(ctx, (repo) => repo.removeMaterial(asset.id));
  assert.ok(!f.app.local.search("needle").some((r) => r.kind === "asset"));
  assert.equal(f.app.local.search("").length, 0);
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  assert.equal(f.app.local.search("needle").length, 0);
});
test("library create-and-apply rejects stale identity before creating a project", async () => {
  const f = fixture();
  await ready(f);
  const scope = f.app.context().accountId;
  await f.app.local.saveLibrary({
    kind: "prompt",
    name: "New creation",
    content: "Only a draft",
  });
  const entry = f.app.getState().snapshot!.library![0];
  await f.app.logout();
  await f.app.login("bob", "pw", "https://identity.example");
  await assert.rejects(
    f.app.local.newProjectFromLibrary(entry.id, "replace", scope),
    /账号|会话/,
  );
  assert.equal(f.app.getState().snapshot!.projects.length, 0);
  await f.app.logout();
  await f.app.login("alice", "pw", "https://identity.example");
  await f.app.local.newProjectFromLibrary(entry.id, "replace", scope);
  const created = f.app
    .getState()
    .snapshot!.projects.find((p) => p.name === "New creation")!;
  assert.equal(created.composerDraft.prompt, "Only a draft");
  assert.equal(created.tasks.length, 0);
  assert.equal(f.calls, 0);
});
test("a simultaneous project switch cannot retarget the library-created draft", async () => {
  const f = fixture(),
    original = await ready(f);
  await f.app.local.saveLibrary({
    kind: "prompt",
    name: "Captured creation",
    content: "Captured draft text",
  });
  const entry = f.app.getState().snapshot!.library![0];
  await Promise.all([
    f.app.local.newProjectFromLibrary(entry.id, "replace"),
    f.app.openProject(original),
  ]);
  const projects = f.app.getState().snapshot!.projects;
  assert.equal(
    projects.find((p) => p.name === "Captured creation")!.composerDraft.prompt,
    "Captured draft text",
  );
  assert.equal(
    projects.find((p) => p.id === original)!.composerDraft.prompt,
    "",
  );
});
