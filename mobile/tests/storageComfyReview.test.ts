import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MobileExecutionReceipt } from "../src/core/mobileModel.ts";
import {
  comfyFixture,
  asReceipt,
  actualPromptId,
} from "./storageComfyFixture.ts";

async function captured() {
  const f = comfyFixture(),
    { repo, projectId } = await f.ready(),
    capture = f.receipt(projectId);
  capture.comfy.identity.workflow = {
    "1": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "Captured", image: ["2", 0] },
      _meta: { title: "Output" },
    },
    "2": { class_type: "SourceImage", inputs: { width: 512, height: 256 } },
  } as typeof capture.comfy.identity.workflow;
  let p = (await repo.load()).projects[0];
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
  const accepted: MobileExecutionReceipt = {
    ...asReceipt(capture),
    providerRequestId: actualPromptId,
    comfy: {
      ...capture.comfy,
      promptId: actualPromptId,
      promptIdConfirmed: true,
      queueNumber: 1,
    },
  };
  return { f, repo, projectId, capture, accepted, project: p };
}

function reordered<T>(value: T): T {
  if (Array.isArray(value)) return value.map((child) => reordered(child)) as T;
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, child]) => [key, reordered(child)]),
    ) as T;
  return value;
}

test("file SQLite close and reopen preserves reordered confirmed Comfy receipt with deleted current metadata", async () => {
  const databasePath = join(
      mkdtempSync(join(tmpdir(), "kk-comfy-review-")),
      "capture.sqlite",
    ),
    f = comfyFixture({ databasePath });
  let closed = false;
  try {
    const { repo, projectId } = await f.ready(),
      capture = f.receipt(projectId);
    let p = (await repo.load()).projects[0];
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
    await repo.saveConnections([]);
    const accepted: MobileExecutionReceipt = reordered({
      ...asReceipt(capture),
      providerRequestId: actualPromptId,
      comfy: {
        ...capture.comfy,
        promptId: actualPromptId,
        promptIdConfirmed: true,
        queueNumber: 1,
      },
    });
    await repo.saveExecutionReceipt(projectId, accepted, p.revision);
    f.close();
    closed = true;
    const reopened = comfyFixture({ databasePath });
    try {
      const reloaded = await reopened.create().load();
      assert.equal(reloaded.projects[0].tasks[0].submissionState, "unknown");
      assert.equal(reloaded.connections.length, 0);
      assert.deepEqual(reloaded.projects[0].executionReceipts![0], accepted);
      assert.equal(
        reloaded.projects[0].tasks[0].providerBaseUrl,
        "https://comfy.example",
      );
    } finally {
      reopened.close();
    }
  } finally {
    if (!closed) f.close();
  }
});

test("semantically equal Comfy identities accept reordered identity, workflow nodes, inputs and metadata through durable restart", async () => {
  const { f, repo, projectId, accepted, project } = await captured();
  try {
    const equivalent = reordered(accepted);
    assert.notEqual(
      JSON.stringify(equivalent.comfy!.identity),
      JSON.stringify(accepted.comfy!.identity),
    );
    assert.deepEqual(equivalent, accepted);
    const saved = await repo.saveExecutionReceipt(
      projectId,
      equivalent,
      project.revision,
    );
    assert.deepEqual(saved.projects[0].executionReceipts![0], accepted);
    const restarted = await f.create().load();
    assert.equal(restarted.projects[0].tasks[0].status, "unknown");
    assert.equal(
      restarted.projects[0].executionReceipts![0].providerRequestId,
      actualPromptId,
    );
    assert.deepEqual(
      restarted.projects[0].executionReceipts![0].comfy!.identity.workflow,
      accepted.comfy!.identity.workflow,
    );
  } finally {
    f.close();
  }
});

test("Comfy comparison still rejects changed link-array sequence, values, deleted fields, metadata and captured time", async () => {
  const { f, repo, projectId, accepted, project } = await captured();
  try {
    let p = (
      await repo.saveExecutionReceipt(projectId, accepted, project.revision)
    ).projects[0];
    const mutations: ((receipt: MobileExecutionReceipt) => void)[] = [
      (r) => {
        r.comfy!.identity.workflow["1"].inputs.image = ["0", 2];
      },
      (r) => {
        r.comfy!.identity.workflow["2"].inputs.width = 256;
      },
      (r) => {
        delete r.comfy!.identity.workflow["2"].inputs.height;
      },
      (r) => {
        r.comfy!.identity.workflow["1"]._meta!.title = "Replacement";
      },
      (r) => {
        r.comfy!.identity.capturedAt = 101;
      },
      (r) => {
        r.comfy!.identity.workflowRevision++;
      },
      (r) => {
        r.comfy!.identity.baseUrl = "https://replacement.example";
      },
      (r) => {
        r.comfy!.identity.connectionId = "replacement";
      },
    ];
    const before = f.raw();
    for (const mutate of mutations) {
      const candidate = reordered(structuredClone(accepted));
      mutate(candidate);
      await assert.rejects(
        repo.saveExecutionReceipt(projectId, candidate, p.revision),
        /Comfy|captured|identity|route/i,
      );
      assert.equal(f.raw(), before);
    }
    p = (await repo.load()).projects[0];
    assert.equal(p.executionReceipts![0].comfy!.promptId, actualPromptId);
  } finally {
    f.close();
  }
});

for (const mutation of ["origin", "protocol", "deleted"] as const) {
  test(`accepted Comfy evidence survives ${mutation} of current metadata while preserving the captured route`, async () => {
    const { f, repo, projectId, accepted, capture } = await captured();
    try {
      const current = await repo.load();
      await repo.saveConnections(
        mutation === "deleted"
          ? []
          : current.connections.map((c) =>
              mutation === "origin"
                ? { ...c, baseUrl: "https://replacement.example" }
                : { ...c, protocol: "openai-compatible" as const },
            ),
      );
      const p = (await repo.load()).projects[0];
      const saved = await repo.saveExecutionReceipt(
        projectId,
        accepted,
        p.revision,
      );
      assert.equal(
        saved.projects[0].tasks[0].providerBaseUrl,
        capture.comfy.identity.baseUrl,
      );
      assert.deepEqual(saved.projects[0].executionReceipts![0], accepted);
      const restarted = await f.create().load();
      assert.equal(restarted.projects[0].tasks[0].submissionState, "unknown");
      assert.equal(
        restarted.projects[0].executionReceipts![0].comfy!.promptId,
        actualPromptId,
      );
      // Recovery on another instance advances CAS; refresh this writer before restore.
      await repo.load();
      const restored = (await repo.restore(await repo.backup(projectId)))
        .projects[1];
      assert.deepEqual(restored.executionReceipts![0].comfy, accepted.comfy);
      assert.equal(restored.executionReceipts![0].readOnly, true);
      assert.equal(restored.tasks[0].providerConnectionId, undefined);
      const before = f.raw();
      await assert.rejects(
        repo.saveExecutionReceipt(
          restored.id,
          { ...restored.executionReceipts![0], readOnly: false },
          restored.revision,
        ),
        /restored|read.only/i,
      );
      assert.equal(f.raw(), before);
    } finally {
      f.close();
    }
  });
}

for (const mutation of ["origin", "protocol", "deleted"] as const) {
  test(`first Comfy capture still requires matching live ${mutation} metadata`, async () => {
    const f = comfyFixture();
    try {
      const { repo, projectId } = await f.ready(),
        current = await repo.load();
      await repo.saveConnections(
        mutation === "deleted"
          ? []
          : current.connections.map((c) =>
              mutation === "origin"
                ? { ...c, baseUrl: "https://replacement.example" }
                : { ...c, protocol: "openai-compatible" as const },
            ),
      );
      const p = (await repo.load()).projects[0],
        before = f.raw();
      await assert.rejects(
        repo.saveExecutionReceipt(
          projectId,
          asReceipt(f.receipt(projectId)),
          p.revision,
        ),
        /connection|protocol|route/i,
      );
      assert.equal(f.raw(), before);
      assert.equal(
        (await f.create().load()).projects[0].executionReceipts,
        undefined,
      );
    } finally {
      f.close();
    }
  });
}

test("confirmed Comfy receipt rejects prompt replacement after metadata removal", async () => {
  const { f, repo, projectId, accepted, project } = await captured();
  try {
    await repo.saveExecutionReceipt(projectId, accepted, project.revision);
    await repo.saveConnections([]);
    const p = (await repo.load()).projects[0],
      before = f.raw();
    for (const candidate of [
      { ...accepted, comfy: { ...accepted.comfy!, promptIdConfirmed: false } },
      { ...accepted, comfy: { ...accepted.comfy!, queueNumber: 2 } },
      {
        ...accepted,
        providerRequestId: "33333333-3333-4333-8333-333333333333",
        comfy: {
          ...accepted.comfy!,
          promptId: "33333333-3333-4333-8333-333333333333",
        },
      },
    ]) {
      await assert.rejects(
        repo.saveExecutionReceipt(projectId, candidate, p.revision),
        /Comfy|identity|prompt/i,
      );
      assert.equal(f.raw(), before);
    }
  } finally {
    f.close();
  }
});
