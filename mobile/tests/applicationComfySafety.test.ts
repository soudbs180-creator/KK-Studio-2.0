import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationComfyFixture,
  comfyGraph,
} from "./applicationComfyFixture.ts";
import { getComfyWorkflows } from "../src/application/comfyWorkflows.ts";

test("Comfy endpoint edit rechecks durable submitted jobs after vault storage waits", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      ctx = f.app.context(),
      scope = ctx.accountId,
      projectId = ctx.snapshot.projects[0].id;
    const id = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const plan = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    const set = ctx.vault.set.bind(ctx.vault);
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => (entered = resolve));
    let release!: () => void;
    const ready = new Promise<void>((resolve) => (release = resolve));
    ctx.vault.set = async (ref, value) => {
      entered();
      await ready;
      await set(ref, value);
    };
    const edit = flow
      .saveConnection(
        { id, name: "Edited", baseUrl: "http://127.0.0.1:1" },
        "PUBLIC-OTHER-FIXTURE",
        scope,
      )
      .then(
        (value) => value,
        (error) => error,
      );
    await waiting;
    await flow.submit(plan);
    release();
    const result = await edit;
    assert.ok(result instanceof Error);
    assert.match(result.message, /未核对|提交/);
    assert.equal(ctx.snapshot.connections[0].baseUrl, f.baseUrl);
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
  } finally {
    await f.close();
  }
});

test("Comfy accepted transport loss retains durable hint and explicit recovery never reposts or falsely cancels", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      scope = f.app.context().accountId,
      project = f.app.context().snapshot.projects[0];
    const id = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const plan = await flow.prepare(project.id, id, comfyGraph(), 1, 1, scope);
    f.dropSubmit(true);
    await assert.rejects(flow.submit(plan));
    const task = f.app.context().snapshot.projects[0].tasks[0];
    assert.equal(task.status, "unknown");
    assert.equal(flow.canRecover(task.id, scope), true);
    assert.equal((await flow.requestCancel(task.id, scope)).available, false);
    assert.equal((await flow.recover(task.id, scope)).status, "unknown");
    await assert.rejects(
      flow.prepare(project.id, id, comfyGraph(), 2, 1, scope),
      /核对原任务/,
    );
    await assert.rejects(flow.submit(plan));
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
    assert.ok(f.calls.includes(`GET /history/${plan.submissionId}`));
  } finally {
    await f.close();
  }
});

test("Comfy prepared plans cannot cross account epochs, edited endpoints, stale project CAS or backup readonly identity", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      scope = f.app.context().accountId,
      projectId = f.app.context().snapshot.projects[0].id;
    const id = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const stale = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    await f.app.mutate(f.app.context(), (repo, s) =>
      repo.saveDraft(
        projectId,
        { ...s.projects[0].composerDraft, prompt: "Edited" },
        s.projects[0].revision,
      ),
    );
    await assert.rejects(flow.submit(stale));
    const edited = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    await assert.rejects(
      flow.saveConnection(
        { id, name: "Edited", baseUrl: "http://127.0.0.1:1" },
        "",
        scope,
      ),
      /凭据/,
    );
    await flow.saveConnection(
      { id, name: "Edited", baseUrl: "http://127.0.0.1:1" },
      "PUBLIC-OTHER-FIXTURE",
      scope,
    );
    await assert.rejects(flow.submit(edited), /连接已变化/);
    await flow.saveConnection(
      { id, name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const epoch = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    await f.app.logout();
    await f.app.login("alice", "fixture", "https://identity.example");
    await assert.rejects(flow.submit(epoch), /会话已变化/);
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 0);
    const plan = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    const taskId = await flow.submit(plan);
    const ctx = f.app.context(),
      backup = await ctx.repo.backup(projectId);
    await f.app.mutate(ctx, (repo) => repo.restore(backup));
    const copy = ctx.snapshot.projects.find((p) => p.restoredFrom)?.tasks[0];
    assert.ok(copy);
    const before = f.calls.length;
    assert.equal(flow.canRecover(copy.id, scope), false);
    await assert.rejects(flow.poll(copy.id, scope));
    await assert.rejects(flow.requestCancel(copy.id, scope));
    assert.equal(f.calls.length, before);
    assert.equal(flow.canRecover(taskId, scope), true);
  } finally {
    await f.close();
  }
});

test("Comfy vault wait is account guarded; logout stops an approved request before HTTP dispatch", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      ctx = f.app.context(),
      scope = ctx.accountId,
      projectId = ctx.snapshot.projects[0].id;
    const id = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const plan = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    const get = ctx.vault.get.bind(ctx.vault);
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => (entered = resolve));
    let release!: () => void;
    const ready = new Promise<void>((resolve) => (release = resolve));
    ctx.vault.get = async (ref) => {
      entered();
      await ready;
      return get(ref);
    };
    const pending = flow.submit(plan).catch((error) => error);
    await waiting;
    await f.app.logout();
    release();
    await pending;
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 0);
    assert.equal(f.app.getState().auth, "signedOut");
  } finally {
    await f.close();
  }
});

test("Comfy cancellation only targets confirmed original job and does not claim cancellation or refund", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      scope = f.app.context().accountId,
      projectId = f.app.context().snapshot.projects[0].id;
    const id = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const plan = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope),
      taskId = await flow.submit(plan);
    const result = await flow.requestCancel(taskId, scope);
    assert.equal(result.cancelRequested, true);
    assert.equal(result.providerCancellationConfirmed, false);
    assert.equal(
      f.app.context().snapshot.projects[0].tasks[0].status,
      "unknown",
    );
    assert.ok(f.calls.includes(`POST /api/jobs/${f.actualId}/cancel`));
    assert.ok(!f.calls.some((c) => c.includes("/interrupt")));
  } finally {
    await f.close();
  }
});
