import test from "node:test";
import assert from "node:assert/strict";
import {
  createStageExecution,
  createStageOrchestrator,
  createAgentHost,
} from "../../src/features/agent/index.ts";
import { createProject, createTask } from "../../src/domain/creationModel.ts";
import { captureCanvasMedia } from "../../src/features/creation/mediaTaskInput.ts";
import { stageGenerationParameters } from "../../src/domain/stageGenerationParameters.ts";
import { CanvasMcpServer } from "../../src/domain/canvasOperations.ts";
import { createCanvasOperationFixture } from "../support/canvasOperationFixture.ts";

function fixture(retry = false) {
  let project = createProject({
    prompt: "script",
    model: "video-test",
    kind: "video",
    attachments: [],
  });
  const getProject = () => project;
  const commit = (next: typeof project) => {
    project = next;
  };
  const orchestrator = createStageOrchestrator({ getProject, commit });
  const stamp = Date.now();
  const plan = orchestrator.upsertPlan({
    id: "plan",
    title: "test",
    projectId: project.id,
    createdBy: "user",
    stages: [
      {
        name: "S",
        goal: "goal",
        workItems: [
          {
            id: "w",
            kind: "video",
            prompt: "prompt",
            model: "video-test",
            params: {
              duration: 8,
              ratio: "9:16",
              quality: "1080p",
              count: 2,
              soundEnabled: true,
            },
            dependencies: [],
            status: "queued",
            createdAt: stamp,
            updatedAt: stamp,
            ...(retry ? { sourceNodeId: "node", taskId: "old" } : {}),
          },
        ],
      },
    ],
  });
  if (retry)
    project.tasks = [
      {
        ...createTask(project),
        id: "old",
        status: "failed",
        sourceItemId: "node",
      },
    ];
  return {
    getProject,
    commit,
    orchestrator,
    plan,
    resolveConnection: () => "approved-connection",
  };
}
test("stage signs the mandate and passes the approved media/count to the real task entry", async () => {
  const f = fixture();
  let submitted = false;
  const execution = createStageExecution({
    ...f,
    flush: async () => {},
    cancelTask: () => {},
    generate: async (node) => {
      assert.equal(node.providerConnectionId, "approved-connection");
      assert.deepEqual(captureCanvasMedia(node), {
        kind: "video",
        duration: 8,
        aspectRatio: "9:16",
        resolution: "1080p",
        audio: true,
      });
      assert.equal(node.parameters?.count, "2");
      assert.equal(
        f.getProject().stagePlans![0].stages[0].executionMandate?.authorizedBy,
        "User",
      );
      const project = f.getProject(),
        task = {
          ...createTask(project),
          id: "accepted",
          status: "succeeded" as const,
          sourceItemId: node.id,
        };
      f.commit({ ...project, tasks: [...project.tasks, task] });
      submitted = true;
      return { taskId: task.id };
    },
  });
  await execution.execute(f.getProject().id, {
    planId: f.plan.id,
    stageIndex: 0,
    expectedRevision: f.plan.revision,
  });
  assert.equal(submitted, true);
  const stage = f.getProject().stagePlans![0].stages[0];
  assert.equal(stage.workItems[0].taskId, "accepted");
  assert.equal(stage.status, "result_review");
});
test("stage retry rechecks scope after persistence before dispatching a paid retry", async () => {
  const f = fixture(true);
  let flushes = 0,
    retried = false;
  const execution = createStageExecution({
    ...f,
    cancelTask: () => {},
    generate: async () => {
      throw new Error("must not submit");
    },
    flush: async () => {
      if (++flushes === 2) f.commit({ ...f.getProject(), id: "other" });
    },
    retryTask: () => {
      retried = true;
      return undefined;
    },
  });
  await assert.rejects(
    execution.execute(f.getProject().id, {
      planId: f.plan.id,
      stageIndex: 0,
      expectedRevision: f.plan.revision,
    }),
    /切换/,
  );
  assert.equal(retried, false);
});

test("rejecting a completed result creates a fresh execution and retains the old task", async () => {
  const f = fixture();
  let calls = 0;
  const execution = createStageExecution({
    ...f,
    flush: async () => {},
    cancelTask: () => {},
    generate: async (node) => {
      const project = f.getProject();
      const task = {
        ...createTask(project),
        id: `execution-${++calls}`,
        sourceItemId: node.id,
        status: "succeeded" as const,
      };
      f.commit({ ...project, tasks: [...project.tasks, task] });
      return { taskId: task.id };
    },
  });
  await execution.execute(f.getProject().id, {
    planId: f.plan.id,
    stageIndex: 0,
    expectedRevision: f.plan.revision,
  });
  const completed = f.getProject().stagePlans![0];
  const oldSource = completed.stages[0].workItems[0].sourceNodeId;
  f.orchestrator.decideStage({
    planId: f.plan.id,
    stageIndex: 0,
    expectedRevision: completed.revision,
    gate: "result",
    decision: "reject",
  });
  const revised = f.getProject().stagePlans![0];
  assert.equal(revised.stages[0].workItems[0].taskId, undefined);
  await execution.execute(f.getProject().id, {
    planId: f.plan.id,
    stageIndex: 0,
    expectedRevision: revised.revision,
  });
  assert.equal(calls, 2);
  assert.notEqual(
    f.getProject().stagePlans![0].stages[0].workItems[0].sourceNodeId,
    oldSource,
  );
  assert.equal(f.getProject().tasks.length, 2);
});

test("explicitly unblocking a cancelled stage requeues work without submitting it", () => {
  const f = fixture();
  const cancelled = f.orchestrator.updateWorkItem({
    planId: f.plan.id,
    stageIndex: 0,
    workItemId: "w",
    expectedRevision: f.plan.revision,
    status: "cancelled",
  });
  const blocked = f.orchestrator.markStageBlocked(
    f.plan.id,
    0,
    cancelled.revision,
  );
  const resumed = f.orchestrator.retryStage(f.plan.id, 0, blocked.revision);
  assert.equal(resumed.stages[0].workItems[0].status, "queued");
  assert.equal(f.getProject().tasks.length, 0);
});
test("unsupported stage parameters fail instead of silently selecting provider defaults", () => {
  assert.throws(() =>
    stageGenerationParameters({ kind: "video", params: { duration: 7 } }),
  );
  assert.throws(() =>
    stageGenerationParameters({ kind: "text", params: { temperature: 1 } }),
  );
  assert.throws(() =>
    stageGenerationParameters({ kind: "image", params: { count: 11 } }),
  );
});
test("legacy Agent operations cannot change inputs or generate from locked targets", async () => {
  let project = createProject({
    prompt: "",
    kind: "text",
    model: "text-test",
    attachments: [],
  });
  project.items = [
    { id: "a", kind: "text", title: "A", description: "", prompt: "text" },
    {
      id: "b",
      kind: "text",
      title: "B",
      description: "",
      prompt: "text",
      model: "text-test",
      canvasPresentation: { locked: true },
    },
  ];
  project.canvas.edges = [{ id: "edge", source: "a", target: "b" }];
  let generations = 0;
  const host = createAgentHost({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
    modelAllowlist: ["text-test"],
    generate: async () => {
      generations++;
      return { taskId: "bad" };
    },
  });
  for (const op of [
    { type: "connect_nodes", fromNodeId: "a", toNodeId: "b" },
    { type: "delete_connections", ids: ["edge"] },
    { type: "delete_connections", all: true },
    { type: "run_generation", nodeId: "b", mode: "text" },
  ] as const) {
    const result = await host.applyOps([op]);
    assert.equal(result.applied.length, 0);
    assert.match(result.rejected[0].reason, /锁定/);
  }
  assert.equal(generations, 0);
  assert.equal(project.canvas.edges.length, 1);
});
test("atomic attachment rejects duplicate endpoints without committing an unreadable canvas", () => {
  const bridge = createCanvasOperationFixture([
    { id: "a", kind: "image", title: "A", description: "", assetId: "asset-a" },
    { id: "b", kind: "image", title: "B", description: "" },
  ]);
  const state = bridge.getState();
  state.canvas.edges = [
    { id: "existing", source: "a", target: "b", kind: "reference" },
  ];
  bridge.commit(state);
  const result = new CanvasMcpServer(bridge).executeOp({
    op: "add_asset_attachment",
    payload: { id: "b", sourceId: "a", slot: "主体" },
  });
  assert.equal(result.success, false);
  assert.equal(bridge.getState().canvas.edges.length, 1);
});
