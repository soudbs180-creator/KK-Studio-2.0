import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationComfyFixture,
  comfyGraph,
} from "./applicationComfyFixture.ts";
import { getComfyWorkflows } from "../src/application/comfyWorkflows.ts";
import type { MobileSnapshot } from "../src/core/mobileModel.ts";
import { parseSnapshot } from "../src/storage/validation.ts";
import { comfyOutputKey } from "../src/core/comfyIdentity.ts";

test("Comfy semantically different explicit API graph remains available while the original job is unknown", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      scope = f.app.context().accountId,
      projectId = f.app.context().snapshot.projects[0].id;
    const connection = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const first = await flow.prepare(
      projectId,
      connection,
      comfyGraph(),
      1,
      1,
      scope,
    );
    f.dropSubmit(true);
    await assert.rejects(flow.submit(first));
    f.dropSubmit(false);
    const changed = {
      ...comfyGraph(),
      "1": {
        class_type: "FixtureImage",
        inputs: { model: "fixture", invert: true },
      },
    };
    const second = await flow.prepare(
      projectId,
      connection,
      changed,
      2,
      1,
      scope,
    );
    await flow.submit(second);
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 2);
    assert.equal(f.raw().projects[0].tasks[0].submissionState, "unknown");
  } finally {
    await f.close();
  }
});

test("Comfy full slot mapping CAS failure blocks every byte request; explicit recovery preserves immutable mapped hash", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      scope = f.app.context().accountId,
      projectId = f.app.context().snapshot.projects[0].id;
    const connection = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const plan = await flow.prepare(
        projectId,
        connection,
        comfyGraph(),
        1,
        1,
        scope,
      ),
      id = await flow.submit(plan);
    f.failAfterCas(2);
    await assert.rejects(flow.poll(id, scope));
    assert.equal(f.calls.filter((c) => c.startsWith("GET /view?")).length, 0);
    assert.deepEqual(
      f.raw().projects[0].executionReceipts[0].comfy.outputs,
      [],
    );
    f.failCas(false);
    await flow.recover(id, scope);
    const stored = f.raw() as MobileSnapshot,
      row = stored.projects[0].executionReceipts![0].comfy!.outputs![0];
    assert.equal(row.slot, 0);
    assert.equal(row.filename, "fixture.png");
    assert.equal(row.sha256, stored.assets[0].sha256);
    assert.equal(
      stored.projects[0].tasks[0].outputs![0].assetId,
      stored.assets[0].id,
    );
    const tampered = structuredClone(stored);
    tampered.projects[0].executionReceipts![0].comfy!.outputs![0].sha256 =
      "f".repeat(64);
    assert.throws(
      () =>
        parseSnapshot(JSON.stringify(tampered), { allowLoopbackHttp: true }),
      /Comfy archived original hash/,
    );
    const backup = await f.app.context().repo.backup(projectId);
    await f.app.mutate(f.app.context(), (repo) => repo.restore(backup));
    const copy = f.app.context().snapshot.projects.at(-1)!;
    assert.deepEqual(
      copy.executionReceipts![0].comfy!.outputs,
      stored.projects[0].executionReceipts![0].comfy!.outputs,
    );
    assert.equal(flow.canRecover(copy.tasks[0].id, scope), false);
    assert.equal(f.calls.filter((c) => c === "POST /prompt").length, 1);
  } finally {
    await f.close();
  }
});

test("Comfy legacy partial without fixed mapping fails closed with explicit reason and preserves old task/assets with zero HTTP", async () => {
  const f = await applicationComfyFixture();
  try {
    const flow = getComfyWorkflows(f.app),
      scope = f.app.context().accountId,
      projectId = f.app.context().snapshot.projects[0].id;
    const connection = await flow.saveConnection(
      { name: "Fixture", baseUrl: f.baseUrl },
      "PUBLIC-TEST-ONLY",
      scope,
    );
    const plan = await flow.prepare(
        projectId,
        connection,
        comfyGraph(),
        1,
        2,
        scope,
      ),
      id = await flow.submit(plan);
    await flow.poll(id, scope);
    const legacy = f.raw() as MobileSnapshot;
    assert.equal(legacy.projects[0].tasks[0].completedOutputs, 1);
    delete legacy.projects[0].executionReceipts![0].comfy!.outputs;
    f.replaceRaw(legacy);
    const resumed = f.create();
    await resumed.start();
    const engine = getComfyWorkflows(resumed),
      before = f.calls.length,
      stored = f.raw();
    assert.equal(engine.canRecover(id, scope), false);
    assert.match(
      engine.recoveryUnavailableReason(id, scope) ?? "",
      /缺少固定输出身份映射/,
    );
    await assert.rejects(engine.recover(id, scope), /原任务和素材保留/);
    assert.equal(f.calls.length, before);
    assert.deepEqual(f.raw(), stored);
    assert.equal(
      resumed.context().snapshot.projects[0].tasks[0].status,
      "partial",
    );
    assert.equal(resumed.context().snapshot.assets.length, 1);
    const project = resumed.context().snapshot.projects[0],
      record = project.executionReceipts![0];
    const route = {
      nodeId: "2",
      filename: "fixture.png",
      subfolder: "",
      type: "output" as const,
    };
    await assert.rejects(
      resumed.context().repo.saveExecutionReceipt(
        projectId,
        {
          ...record,
          comfy: {
            ...record.comfy!,
            outputs: [
              {
                slot: 0,
                ...route,
                key: comfyOutputKey(route),
                sha256: resumed.context().snapshot.assets[0].sha256,
              },
            ],
          },
        },
        project.revision,
      ),
      /Cannot infer Comfy output slots/,
    );
    assert.deepEqual(f.raw(), stored);
  } finally {
    await f.close();
  }
});
