import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  comfyFixture,
  asReceipt,
  actualPromptId,
  submissionId,
} from "./storageComfyFixture.ts";
import { parseSnapshot } from "../src/storage/validation.ts";

test("a submitted Comfy task cannot acquire its first capture after the intended send boundary", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready();
    let p = (await repo.load()).projects[0];
    p = (
      await repo.updateTask(
        projectId,
        { ...p.tasks[0], status: "running", submissionState: "submitted" },
        p.revision,
      )
    ).projects[0];
    const before = f.raw();
    await assert.rejects(
      repo.saveExecutionReceipt(
        projectId,
        asReceipt(f.receipt(projectId)),
        p.revision,
      ),
      /durable intent capture/i,
    );
    assert.equal(f.raw(), before);
  } finally {
    f.close();
  }
});

test("Comfy intent is durable with the exact workflow before any caller submission", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready();
    const capture = f.receipt(projectId),
      p = (await repo.load()).projects[0];
    const saved = await repo.saveExecutionReceipt(
      projectId,
      asReceipt(capture),
      p.revision,
    );
    const durable = JSON.parse(f.raw());
    assert.deepEqual(durable.projects[0].executionReceipts[0], capture);
    assert.equal(saved.projects[0].tasks[0].submissionState, "intent");
    // A new repository can recover startup intent; it does not create a submitted job.
    const reloaded = await f.create().load();
    assert.equal(reloaded.projects[0].tasks[0].status, "interrupted");
    assert.equal(reloaded.projects[0].tasks[0].submissionState, "intent");
    assert.deepEqual(reloaded.projects[0].executionReceipts![0], capture);
  } finally {
    f.close();
  }
});

test("Comfy prompt hint upgrades once to the confirmed server identity and cannot be replaced", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready();
    let p = (await repo.load()).projects[0];
    const capture = f.receipt(projectId);
    p = (
      await repo.saveExecutionReceipt(projectId, asReceipt(capture), p.revision)
    ).projects[0];
    p = (
      await repo.updateTask(
        projectId,
        {
          ...p.tasks[0],
          status: "running",
          submissionState: "submitted",
          submittedAt: 100,
        },
        p.revision,
      )
    ).projects[0];
    const confirmed = {
      ...capture,
      providerRequestId: actualPromptId,
      comfy: {
        ...capture.comfy,
        promptId: actualPromptId,
        promptIdConfirmed: true,
        queueNumber: 4,
      },
    };
    p = (
      await repo.saveExecutionReceipt(
        projectId,
        confirmed as unknown as Parameters<typeof repo.saveExecutionReceipt>[1],
        p.revision,
      )
    ).projects[0];
    const before = f.raw();
    for (const candidate of [
      { ...confirmed, comfy: { ...confirmed.comfy, promptId: randomUUID() } },
      { ...confirmed, providerRequestId: randomUUID() },
      { ...confirmed, comfy: { ...confirmed.comfy, promptIdConfirmed: false } },
      { ...confirmed, comfy: { ...confirmed.comfy, queueNumber: 5 } },
      {
        ...confirmed,
        comfy: {
          ...confirmed.comfy,
          identity: { ...confirmed.comfy.identity, workflowRevision: 8 },
        },
      },
      {
        ...confirmed,
        comfy: {
          ...confirmed.comfy,
          identity: { ...confirmed.comfy.identity, capturedAt: 101 },
        },
      },
      {
        ...confirmed,
        comfy: {
          ...confirmed.comfy,
          identity: {
            ...confirmed.comfy.identity,
            workflow: {
              "1": {
                class_type: "SaveImage",
                inputs: { filename_prefix: "Replacement" },
              },
            },
          },
        },
      },
    ]) {
      await assert.rejects(
        repo.saveExecutionReceipt(
          projectId,
          candidate as unknown as Parameters<
            typeof repo.saveExecutionReceipt
          >[1],
          p.revision,
        ),
        /Comfy|captured|identity|receipt/i,
      );
      assert.equal(f.raw(), before);
    }
    const reloaded = await f.create().load();
    assert.deepEqual(reloaded.projects[0].executionReceipts![0], confirmed);
    assert.equal(reloaded.projects[0].tasks[0].submissionState, "unknown");
  } finally {
    f.close();
  }
});

test("Comfy unknown requested hint survives reload while definite preacceptance rejection stays terminal", async () => {
  for (const state of ["unknown", "terminal"] as const) {
    const f = comfyFixture();
    try {
      const { repo, projectId } = await f.ready();
      let p = (await repo.load()).projects[0];
      const capture = f.receipt(projectId);
      p = (
        await repo.saveExecutionReceipt(
          projectId,
          asReceipt(capture),
          p.revision,
        )
      ).projects[0];
      p = (
        await repo.updateTask(
          projectId,
          {
            ...p.tasks[0],
            status: state === "unknown" ? "unknown" : "failed",
            submissionState: state,
            error: "Recorded result",
          },
          p.revision,
        )
      ).projects[0];
      await repo.saveExecutionReceipt(
        projectId,
        asReceipt(capture),
        p.revision,
      );
      const reload = await f.create().load();
      assert.equal(reload.projects[0].tasks[0].submissionState, state);
      assert.equal(
        reload.projects[0].tasks[0].status,
        state === "unknown" ? "unknown" : "failed",
      );
      assert.deepEqual(reload.projects[0].executionReceipts![0], capture);
      if (state === "unknown")
        await assert.rejects(
          repo.updateTask(
            projectId,
            { ...p.tasks[0], status: "queued", submissionState: "intent" },
            (await repo.load()).projects[0].revision,
          ),
          /uncertain/i,
        );
    } finally {
      f.close();
    }
  }
});

test("Comfy capture bindings reject wrong project, task UUID, connection, route and output count without durable change", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready(),
      p = (await repo.load()).projects[0],
      capture = f.receipt(projectId),
      before = f.raw();
    for (const candidate of [
      { ...capture, connectionId: "foreign" },
      {
        ...capture,
        comfy: {
          ...capture.comfy,
          identity: { ...capture.comfy.identity, projectId: "foreign" },
        },
      },
      {
        ...capture,
        comfy: {
          ...capture.comfy,
          identity: { ...capture.comfy.identity, submissionId: randomUUID() },
        },
      },
      {
        ...capture,
        comfy: {
          ...capture.comfy,
          identity: { ...capture.comfy.identity, connectionId: "foreign" },
        },
      },
      {
        ...capture,
        comfy: {
          ...capture.comfy,
          identity: {
            ...capture.comfy.identity,
            baseUrl: "https://foreign.example",
          },
        },
      },
      { ...capture, comfy: { ...capture.comfy, requestedOutputs: 2 } },
      { ...capture, comfy: { ...capture.comfy, promptId: actualPromptId } },
      { ...capture, comfy: { ...capture.comfy, promptIdConfirmed: true } },
      { ...capture, comfy: { ...capture.comfy, queueNumber: 0 } },
    ]) {
      await assert.rejects(
        repo.saveExecutionReceipt(projectId, asReceipt(candidate), p.revision),
        /Comfy|connection|identity|intent|output|hint/i,
      );
      assert.equal(f.raw(), before);
    }
  } finally {
    f.close();
  }
});

test("Comfy backup, multiple restores and forks retain original workflow identity as read-only history", async () => {
  const f = comfyFixture();
  try {
    const { repo, projectId } = await f.ready();
    let p = (await repo.load()).projects[0];
    const capture = f.receipt(projectId);
    p = (
      await repo.saveExecutionReceipt(projectId, asReceipt(capture), p.revision)
    ).projects[0];
    p = (
      await repo.updateTask(
        projectId,
        { ...p.tasks[0], status: "running", submissionState: "submitted" },
        p.revision,
      )
    ).projects[0];
    const accepted = {
      ...capture,
      comfy: {
        ...capture.comfy,
        promptId: actualPromptId,
        promptIdConfirmed: true,
        queueNumber: 0,
      },
    };
    await repo.saveExecutionReceipt(projectId, asReceipt(accepted), p.revision);
    const exported = await repo.backup(projectId);
    assert.ok(!exported.includes("vault-only"));
    await repo.preflightRestore(exported);
    let s = await repo.restore(exported),
      copy = s.projects[1];
    for (let repeat = 0; repeat < 3; repeat++) {
      const historical = copy
        .executionReceipts![0] as unknown as typeof accepted & {
        readOnly: boolean;
        originalTaskId: string;
      };
      assert.equal(historical.readOnly, true);
      assert.equal(historical.originalTaskId, submissionId);
      assert.equal(historical.taskId, copy.tasks[0].id);
      assert.notEqual(copy.tasks[0].id, submissionId);
      assert.notEqual(copy.tasks[0].idempotencyKey, submissionId);
      assert.equal(copy.tasks[0].providerConnectionId, undefined);
      assert.deepEqual(historical.comfy, accepted.comfy);
      assert.equal(
        (copy.restoredFrom as unknown as { originalProjectId: string })
          .originalProjectId,
        projectId,
      );
      const before = f.raw();
      await assert.rejects(
        repo.saveExecutionReceipt(
          copy.id,
          { ...historical, readOnly: false } as unknown as Parameters<
            typeof repo.saveExecutionReceipt
          >[1],
          copy.revision,
        ),
        /read.only|restored/i,
      );
      assert.equal(f.raw(), before);
      const portable = await repo.backup(copy.id);
      await repo.preflightRestore(portable);
      s =
        repeat === 1
          ? await repo.local.forkProject(copy.id, copy.revision)
          : await repo.restore(portable);
      copy = s.projects[s.projects.length - 1];
      assert.deepEqual(
        parseSnapshot(f.raw()).projects[s.projects.length - 1],
        copy,
      );
    }
    const pristine = f.create();
    assert.equal((await pristine.load()).projects.length, 5);
  } finally {
    f.close();
  }
});
