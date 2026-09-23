import assert from "node:assert/strict";
import test from "node:test";
import { createStageOrchestrator } from "../../src/features/agent/orchestrator.ts";
import { StagePlanError } from "../../src/domain/stagePlan.ts";
import {
  createProject,
  type CreationProject,
} from "../../src/features/creation/model.ts";

const input = {
  prompt: "同一主体三条视频",
  model: "video-test",
  kind: "image" as const,
  attachments: [],
  privacyMode: "byok_local" as const,
  outputCount: 1,
};

function harness() {
  let project: CreationProject = createProject(input);
  const orchestrator = createStageOrchestrator({
    getProject: () => project,
    commit: (next) => {
      project = next;
    },
  });
  return { orchestrator, read: () => project };
}

function planInput(projectId: string) {
  const stamp = Date.now();
  return {
    id: "plan-test-1",
    title: "同一主体三条视频",
    projectId,
    createdBy: "agent" as const,
    stages: [
      {
        name: "规划与审批",
        goal: "确认镜头清单",
        approvalGate: "plan" as const,
        workItems: [
          {
            id: "wi-0",
            kind: "text" as const,
            prompt: "写分镜",
            dependencies: [],
            status: "queued" as const,
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      },
      {
        name: "生成三条视频",
        goal: "同一角色三条视频",
        workItems: [
          {
            id: "wi-1",
            kind: "video" as const,
            prompt: "镜头一",
            dependencies: ["wi-0"],
            status: "queued" as const,
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
      },
    ],
  };
}

test("upsertPlan persists a plan into the project (idempotent by id)", () => {
  const { orchestrator, read } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  assert.equal(plan.id, "plan-test-1");
  assert.equal(read().stagePlans?.length, 1);
  const again = orchestrator.upsertPlan(planInput("p"));
  assert.equal(again.id, "plan-test-1");
  assert.equal(read().stagePlans?.length, 1);
});

test("requestStageApproval moves doing to plan_review with CAS", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const waiting = orchestrator.requestStageApproval(plan.id, 0, "plan");
  assert.equal(waiting.stages[0].status, "plan_review");
  assert.throws(
    () => orchestrator.requestStageApproval(plan.id, 0, "plan"),
    /当前状态为 plan_review/,
  );
});

test("decideStage approve plan continues doing; reject blocks", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(plan.id, 0, "plan");
  const approved = orchestrator.decideStage({
    planId: plan.id,
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  assert.equal(approved.stages[0].status, "doing");
  orchestrator.requestStageApproval(plan.id, 0, "plan");
  const rejected = orchestrator.decideStage({
    planId: plan.id,
    stageIndex: 0,
    gate: "plan",
    decision: "reject",
  });
  assert.equal(rejected.stages[0].status, "blocked");
});

test("decideStage cannot approve a stage not in review", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  assert.throws(
    () =>
      orchestrator.decideStage({
        planId: plan.id,
        stageIndex: 0,
        gate: "plan",
        decision: "approve",
      }),
    StagePlanError,
  );
});

test("result gate completes on approve and returns to doing on reject", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(plan.id, 0, "result");
  const done = orchestrator.decideStage({
    planId: plan.id,
    stageIndex: 0,
    gate: "result",
    decision: "approve",
  });
  assert.equal(done.stages[0].status, "done");
  orchestrator.requestStageApproval(plan.id, 1, "result");
  const bounced = orchestrator.decideStage({
    planId: plan.id,
    stageIndex: 1,
    gate: "result",
    decision: "reject",
  });
  assert.equal(bounced.stages[1].status, "doing");
});

test("markStageBlocked and retryStage requeue only failed work items", () => {
  const { orchestrator, read } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const blocked = orchestrator.markStageBlocked(plan.id, 1);
  assert.equal(blocked.stages[1].status, "blocked");
  const project = read();
  const current = project.stagePlans![0];
  const failedPlan = {
    ...current,
    stages: current.stages.map((stage) =>
      stage.index === 1
        ? {
            ...stage,
            workItems: [
              {
                ...stage.workItems[0],
                status: "failed" as const,
                error: "timeout",
              },
            ],
          }
        : stage,
    ),
  };
  orchestrator.persistPlan(failedPlan);
  const retried = orchestrator.retryStage(plan.id, 1);
  assert.equal(retried.stages[1].status, "doing");
  assert.equal(retried.stages[1].workItems[0].status, "queued");
  assert.equal(retried.stages[1].workItems[0].error, undefined);
});

test("approvalSummary lists pending gates across plans", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(plan.id, 0, "plan");
  assert.deepEqual(orchestrator.approvalSummary(), [
    { planId: plan.id, stageIndex: 0, gate: "plan" },
  ]);
});

test("planTools expose the four plan tools with working invocations", () => {
  const { orchestrator } = harness();
  const tools = orchestrator.planTools();
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "plan_get_stage_status",
      "plan_update_stage_state",
      "plan_patch_stage",
      "plan_replan",
    ],
  );
  const plan = orchestrator.upsertPlan(planInput("p"));
  const status = tools[0].invoke({ planId: plan.id });
  assert.equal(status.ok, true);
  assert.equal((status as { stages: unknown[] }).stages.length, 2);
  const update = tools[1].invoke({
    planId: plan.id,
    stageIndex: 0,
    expectedStatus: "doing",
    nextStatus: "plan_review",
  });
  assert.equal(update.ok, true);
  const bad = tools[1].invoke({
    planId: plan.id,
    stageIndex: 0,
    expectedStatus: "invalid",
    nextStatus: "doing",
  });
  assert.equal(bad.ok, false);
  const replan = tools[3].invoke({ planId: plan.id });
  assert.equal(replan.ok, true);
  assert.deepEqual(
    (replan as { failedWorkItems: unknown[] }).failedWorkItems,
    [],
  );
});
