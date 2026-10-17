import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  applicationComfyFixture,
  comfyGraph,
} from "./applicationComfyFixture.ts";

test("Comfy real HTTP submit is preceded by SQLite task+capture, actual prompt receipt survives restart and originals archive without new POST", async () => {
  const { getComfyWorkflows } =
    await import("../src/application/comfyWorkflows.ts");
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
    assert.equal((await flow.health(id, scope)).generationVerified, false);
    assert.deepEqual(await flow.listModels(id, "checkpoints", scope), [
      "fixture",
    ]);
    const graph = comfyGraph();
    const plan = await flow.prepare(projectId, id, graph, 1, 1, scope);
    graph["1"].inputs.model = "edited-after-plan";
    f.onSubmit(() => {
      const project = f.raw().projects[0];
      assert.equal(project.tasks[0].submissionState, "submitted");
      assert.equal(project.executionReceipts[0].comfy.promptIdConfirmed, false);
      assert.deepEqual(
        project.executionReceipts[0].comfy.identity.workflow,
        plan.workflow,
      );
      assert.equal(
        project.executionReceipts[0].comfy.identity.capturedAt,
        plan.capturedAt,
      );
    });
    const submission = flow.submit(plan);
    await assert.rejects(flow.submit(plan), /进行中|已/);
    const taskId = await submission;
    await assert.rejects(flow.submit(plan), /already|重复|已/);
    const stored = f.app.context().snapshot.projects[0].executionReceipts![0];
    assert.equal(stored.providerRequestId, f.actualId);
    // A metadata edit cannot reroute an already accepted task or reuse its credential elsewhere.
    await f.app.mutate(f.app.context(), (repo, snapshot) =>
      repo.saveConnections(
        snapshot.connections.map((c) => ({
          ...c,
          baseUrl: "http://127.0.0.1:1",
          credentialRef: "unrelated-new-vault",
        })),
      ),
    );
    const restarted = f.create();
    await restarted.start();
    const again = getComfyWorkflows(restarted);
    assert.equal(again.canRecover(taskId, scope), true);
    await again.recover(taskId, scope);
    const task = restarted.context().snapshot.projects[0].tasks[0];
    assert.equal(task.status, "succeeded");
    assert.equal(task.completedOutputs, 1);
    assert.equal(task.submissionState, "terminal");
    assert.equal(restarted.context().snapshot.assets[0].mime, "image/png");
    const asset = restarted.context().snapshot.assets[0];
    assert.equal(
      createHash("sha256")
        .update(await restarted.context().repo.readOriginal(asset.id))
        .digest("hex"),
      asset.sha256,
    );
    assert.equal(again.canRecover(taskId, scope), false);
    assert.ok(!JSON.stringify(f.raw()).includes("PUBLIC-TEST-ONLY"));
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
    assert.ok(f.calls.includes(`GET /history/${f.actualId}`));
  } finally {
    await f.close();
  }
});

test("Comfy failed durable intent prevents paid POST; original archive failure is recoverable without resubmission", async () => {
  const { getComfyWorkflows } =
    await import("../src/application/comfyWorkflows.ts");
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
    const plan = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    f.failCas(true);
    await assert.rejects(flow.submit(plan));
    f.failCas(false);
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 0);
    const next = await flow.prepare(projectId, id, comfyGraph(), 1, 1, scope);
    const taskId = await flow.submit(next);
    f.failOriginal(true);
    await assert.rejects(flow.poll(taskId, scope));
    f.failOriginal(false);
    assert.equal(flow.canRecover(taskId, scope), true);
    await flow.recover(taskId, scope);
    assert.equal(
      f.app.context().snapshot.projects[0].tasks[0].status,
      "succeeded",
    );
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
  } finally {
    await f.close();
  }
});
