import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationComfyFixture,
  comfyGraph,
} from "./applicationComfyFixture.ts";
import { getComfyWorkflows } from "../src/application/comfyWorkflows.ts";

test("Comfy exact intent/markSubmitted CAS failures cause zero POST; receipt CAS failure retains actual ID for recovery before any query", async () => {
  for (const failAt of [2, 3, 4]) {
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
      f.failAfterCas(failAt);
      await assert.rejects(flow.submit(plan));
      assert.equal(
        f.calls.filter((c) => c === "POST /prompt").length,
        failAt === 4 ? 1 : 0,
      );
      f.failCas(false);
      if (failAt === 4) {
        assert.equal(
          f.raw().projects[0].executionReceipts[0].comfy.promptIdConfirmed,
          false,
        );
        await flow.recover(plan.submissionId, scope);
        assert.equal(
          f.app.context().snapshot.projects[0].executionReceipts![0]
            .providerRequestId,
          f.actualId,
        );
        assert.equal(
          f.app.context().snapshot.projects[0].tasks[0].status,
          "succeeded",
        );
        assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
        assert.ok(f.calls.includes(`GET /history/${f.actualId}`));
        assert.ok(!f.calls.includes(`GET /history/${plan.submissionId}`));
      }
    } finally {
      await f.close();
    }
  }
});

test("Comfy running preview outputs do not archive as originals; terminal count shortfall never claims complete", async () => {
  for (const count of [1, 2]) {
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
      const plan = await flow.prepare(
          projectId,
          id,
          comfyGraph(),
          1,
          count,
          scope,
        ),
        taskId = await flow.submit(plan);
      f.historyCompleted(false);
      await flow.poll(taskId, scope);
      assert.equal(f.calls.filter((c) => c.startsWith("GET /view?")).length, 0);
      assert.equal(f.app.context().snapshot.assets.length, 0);
      f.historyCompleted(true);
      await flow.recover(taskId, scope);
      const task = f.app.context().snapshot.projects[0].tasks[0];
      assert.equal(task.completedOutputs, 1);
      assert.equal(task.status, count === 1 ? "succeeded" : "partial");
      assert.equal(task.submissionState, count === 1 ? "terminal" : "unknown");
      assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
    } finally {
      await f.close();
    }
  }
});
