import assert from "node:assert/strict";
import test from "node:test";
import { createStageOrchestrator } from "../../src/features/agent/orchestrator.ts";
import {
  StagePlanError,
  normalizeStagePlan,
} from "../../src/domain/stagePlan.ts";
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

function currentRevision(
  orchestrator: ReturnType<typeof createStageOrchestrator>,
  planId: string,
): number {
  return orchestrator.getPlan(planId)!.revision;
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

test("replaying an existing plan preserves completed stages and assets", () => {
  const { orchestrator, read } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "plan",
    currentRevision(orchestrator, plan.id),
  );
  const approved = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  const withAsset = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: approved.revision,
    status: "running",
  });
  const succeeded = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: withAsset.revision,
    status: "succeeded",
    assetId: "asset-0123456789abcdef01234567",
  });
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "result",
    currentRevision(orchestrator, plan.id),
  );
  const finished = orchestrator.completeStage(
    plan.id,
    0,
    currentRevision(orchestrator, plan.id),
  );
  const beforeReplay = read();

  const replayed = orchestrator.upsertPlan(planInput("p"));
  assert.deepEqual(replayed, finished);
  assert.strictEqual(read(), beforeReplay);
  assert.equal(replayed.revision, succeeded.revision + 2);
  assert.equal(replayed.stages[0].status, "done");
  assert.equal(
    replayed.stages[0].workItems[0].assetId,
    "asset-0123456789abcdef01234567",
  );

  assert.throws(
    () => orchestrator.upsertPlan({ ...planInput("p"), title: "另一个计划" }),
    /已存在/,
  );
  assert.strictEqual(read(), beforeReplay);
});

test("plan_patch_stage rejects invalid input without persisting a plan", () => {
  const invalidStages: unknown[] = [
    [
      {
        name: "缺少提示词",
        goal: "检查",
        workItems: [{ id: "w", kind: "text" }],
      },
    ],
    [
      {
        name: "空提示词",
        goal: "检查",
        workItems: [{ id: "w", kind: "text", prompt: "" }],
      },
    ],
    [null],
    [{ name: "空工作项", goal: "检查", workItems: [null] }],
    [
      {
        name: "无效类型",
        goal: "检查",
        workItems: [{ id: "w", kind: "unknown", prompt: "生成" }],
      },
    ],
    [
      {
        name: "空工作项 id",
        goal: "检查",
        workItems: [{ id: "", kind: "text", prompt: "生成" }],
      },
    ],
    [
      {
        name: "超长提示词",
        goal: "检查",
        workItems: [{ id: "w", kind: "text", prompt: "x".repeat(4001) }],
      },
    ],
    [
      {
        name: "太多工作项",
        goal: "检查",
        workItems: Array.from({ length: 129 }, (_, index) => ({
          id: `w-${index}`,
          kind: "text",
          prompt: "生成",
        })),
      },
    ],
    [
      {
        name: "缺失依赖",
        goal: "检查",
        workItems: [
          { id: "w", kind: "text", prompt: "生成", dependencies: ["missing"] },
        ],
      },
    ],
    [
      {
        name: "循环依赖",
        goal: "检查",
        workItems: [
          { id: "a", kind: "text", prompt: "A", dependencies: ["b"] },
          { id: "b", kind: "text", prompt: "B", dependencies: ["a"] },
        ],
      },
    ],
  ];
  for (const stages of invalidStages) {
    const { orchestrator, read } = harness();
    const before = read();
    const result = orchestrator.planTools()[2].invoke({
      id: "invalid-plan",
      title: "无效计划",
      stages,
    });
    assert.equal(result.ok, false, JSON.stringify(stages).slice(0, 80));
    assert.strictEqual(read(), before);
    assert.equal(read().stagePlans?.length ?? 0, 0);
  }

  const { orchestrator, read } = harness();
  const before = read();
  assert.equal(
    orchestrator.planTools()[2].invoke({
      id: "",
      title: "空计划 id",
      stages: [
        {
          name: "生成",
          goal: "检查",
          workItems: [{ id: "w", kind: "text", prompt: "生成" }],
        },
      ],
    }).ok,
    false,
  );
  assert.strictEqual(read(), before);
});

test("plan_patch_stage rejects duplicate work item IDs without writing", () => {
  const { orchestrator, read } = harness();
  const before = read();
  const result = orchestrator.planTools()[2].invoke({
    id: "duplicate-plan",
    title: "重复 ID",
    stages: [
      {
        name: "规划",
        goal: "先规划",
        workItems: [{ id: "same", kind: "text", prompt: "规划" }],
      },
      {
        name: "执行",
        goal: "再生成",
        workItems: [{ id: "same", kind: "image", prompt: "生成" }],
      },
    ],
  });
  assert.equal(result.ok, false);
  assert.strictEqual(read(), before);
});

test("plan_patch_stage is durable and replay cannot reset progress", () => {
  const { orchestrator, read } = harness();
  const patch = orchestrator.planTools()[2];
  const input = {
    id: "durable-plan",
    title: "有效计划",
    stages: [
      {
        name: "生成",
        goal: "一张图",
        workItems: [{ id: "w", kind: "image", prompt: "蓝色球体" }],
      },
    ],
  };
  assert.equal(patch.invoke(input).ok, true);
  const plan = orchestrator.getPlan(input.id)!;
  assert.ok(normalizeStagePlan(plan));
  const running = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "w",
    expectedRevision: plan.revision,
    status: "running",
  });
  orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "w",
    expectedRevision: running.revision,
    status: "succeeded",
  });
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "result",
    currentRevision(orchestrator, plan.id),
  );
  orchestrator.completeStage(
    plan.id,
    0,
    currentRevision(orchestrator, plan.id),
  );
  const beforeReplay = read();

  assert.equal(patch.invoke(input).ok, true);
  assert.strictEqual(read(), beforeReplay);
  assert.equal(orchestrator.getPlan(input.id)?.stages[0].status, "done");
  assert.equal(orchestrator.getPlan(input.id)?.revision, 4);

  assert.equal(patch.invoke({ ...input, title: "改写" }).ok, false);
  assert.strictEqual(read(), beforeReplay);
});

test("upsertPlan refuses plans beyond the storage limit", () => {
  const { orchestrator, read } = harness();
  for (let index = 0; index < 64; index += 1) {
    orchestrator.upsertPlan({ ...planInput("p"), id: `plan-${index}` });
  }
  const before = read();
  assert.throws(
    () => orchestrator.upsertPlan({ ...planInput("p"), id: "plan-64" }),
    /64 个上限/,
  );
  assert.strictEqual(read(), before);
  assert.equal(read().stagePlans?.length, 64);
});

test("requestStageApproval moves doing to plan_review with CAS", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const waiting = orchestrator.requestStageApproval(
    plan.id,
    0,
    "plan",
    currentRevision(orchestrator, plan.id),
  );
  assert.equal(waiting.stages[0].status, "plan_review");
  assert.throws(
    () =>
      orchestrator.requestStageApproval(
        plan.id,
        0,
        "plan",
        currentRevision(orchestrator, plan.id),
      ),
    /当前状态为 plan_review/,
  );
});

test("plan-gated work cannot run or enter result review before host approval", () => {
  const { orchestrator, read } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const before = read();
  assert.throws(
    () =>
      orchestrator.updateWorkItem({
        planId: plan.id,
        stageIndex: 0,
        workItemId: "wi-0",
        expectedRevision: plan.revision,
        status: "running",
      }),
    /计划审批/,
  );
  assert.throws(
    () =>
      orchestrator.requestStageApproval(
        plan.id,
        0,
        "result",
        currentRevision(orchestrator, plan.id),
      ),
    /计划审批/,
  );
  assert.strictEqual(read(), before);
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "plan",
    currentRevision(orchestrator, plan.id),
  );
  const approved = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  assert.ok(approved.stages[0].planApprovedAt);
  assert.equal(
    orchestrator.updateWorkItem({
      planId: plan.id,
      stageIndex: 0,
      workItemId: "wi-0",
      expectedRevision: approved.revision,
      status: "running",
    }).stages[0].workItems[0].status,
    "running",
  );
});

test("queued work cannot be reported as a completed stage", () => {
  const { orchestrator, read } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const before = read();
  assert.throws(
    () =>
      orchestrator.requestStageApproval(
        plan.id,
        1,
        "result",
        currentRevision(orchestrator, plan.id),
      ),
    /工作项/,
  );
  assert.strictEqual(read(), before);
});

test("stage tool rejects an old revision after the same status returns", () => {
  const { orchestrator, read } = harness();
  const base = planInput("p");
  const plan = orchestrator.upsertPlan({
    ...base,
    stages: [{ ...base.stages[1], workItems: [] }],
  });
  const update = orchestrator.planTools()[1];
  const request = {
    planId: plan.id,
    stageIndex: 0,
    expectedStatus: "doing",
    expectedRevision: plan.revision,
    nextStatus: "result_review",
  };
  assert.equal(update.invoke(request).ok, true);
  orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "result",
    decision: "reject",
  });
  const before = read();
  assert.equal(update.invoke(request).ok, false);
  assert.strictEqual(read(), before);
});

test("host approval rejects a stale result review after rejection and resubmission", () => {
  const { orchestrator, read } = harness();
  const base = planInput("p");
  const plan = orchestrator.upsertPlan({
    ...base,
    stages: [{ ...base.stages[1], workItems: [] }],
  });
  const firstReview = orchestrator.requestStageApproval(
    plan.id,
    0,
    "result",
    plan.revision,
  );
  const rejected = orchestrator.decideStage({
    planId: plan.id,
    stageIndex: 0,
    gate: "result",
    decision: "reject",
    expectedRevision: firstReview.revision,
  });
  assert.throws(
    () =>
      orchestrator.requestStageApproval(plan.id, 0, "result", plan.revision),
    /revision|并发冲突/,
  );
  const secondReview = orchestrator.requestStageApproval(
    plan.id,
    0,
    "result",
    rejected.revision,
  );
  const before = read();
  assert.throws(
    () =>
      orchestrator.decideStage({
        planId: plan.id,
        stageIndex: 0,
        gate: "result",
        decision: "approve",
        expectedRevision: firstReview.revision,
      }),
    /revision|并发冲突/,
  );
  assert.strictEqual(read(), before);
  assert.equal(secondReview.stages[0].status, "result_review");
});

test("dependent work cannot start before its prerequisite succeeds", () => {
  const { orchestrator, read } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const before = read();
  assert.throws(
    () =>
      orchestrator.updateWorkItem({
        planId: plan.id,
        stageIndex: 1,
        workItemId: "wi-1",
        expectedRevision: plan.revision,
        status: "running",
      }),
    /依赖/,
  );
  assert.strictEqual(read(), before);
});

test("decideStage approve plan continues doing; reject blocks", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "plan",
    currentRevision(orchestrator, plan.id),
  );
  const approved = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  assert.equal(approved.stages[0].status, "doing");
  assert.ok(approved.stages[0].planApprovedAt);
  const separate = harness().orchestrator;
  const pending = separate.upsertPlan(planInput("p"));
  separate.requestStageApproval(
    pending.id,
    0,
    "plan",
    currentRevision(separate, pending.id),
  );
  const rejected = separate.decideStage({
    planId: pending.id,
    expectedRevision: currentRevision(separate, pending.id),
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
        expectedRevision: currentRevision(orchestrator, plan.id),
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
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "plan",
    currentRevision(orchestrator, plan.id),
  );
  const approved = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  const runningFirst = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: approved.revision,
    status: "running",
  });
  orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: runningFirst.revision,
    status: "succeeded",
  });
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "result",
    currentRevision(orchestrator, plan.id),
  );
  const done = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "result",
    decision: "approve",
  });
  assert.equal(done.stages[0].status, "done");
  const runningSecond = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 1,
    workItemId: "wi-1",
    expectedRevision: done.revision,
    status: "running",
  });
  orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 1,
    workItemId: "wi-1",
    expectedRevision: runningSecond.revision,
    status: "succeeded",
  });
  orchestrator.requestStageApproval(
    plan.id,
    1,
    "result",
    currentRevision(orchestrator, plan.id),
  );
  const bounced = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 1,
    gate: "result",
    decision: "reject",
  });
  assert.equal(bounced.stages[1].status, "doing");
});

test("markStageBlocked and retryStage requeue only failed work items", () => {
  const { orchestrator } = harness();
  const base = planInput("p");
  const plan = orchestrator.upsertPlan({
    ...base,
    stages: [
      base.stages[0],
      {
        ...base.stages[1],
        workItems: [{ ...base.stages[1].workItems[0], dependencies: [] }],
      },
    ],
  });
  const running = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 1,
    workItemId: "wi-1",
    expectedRevision: plan.revision,
    status: "running",
  });
  orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 1,
    workItemId: "wi-1",
    expectedRevision: running.revision,
    status: "failed",
    error: "timeout",
  });
  const blocked = orchestrator.markStageBlocked(
    plan.id,
    1,
    currentRevision(orchestrator, plan.id),
  );
  assert.equal(blocked.stages[1].status, "blocked");
  const retried = orchestrator.retryStage(
    plan.id,
    1,
    currentRevision(orchestrator, plan.id),
  );
  assert.equal(retried.stages[1].status, "doing");
  assert.equal(retried.stages[1].workItems[0].status, "queued");
  assert.equal(retried.stages[1].workItems[0].error, undefined);
});

test("late work results cannot overwrite an approved plan", () => {
  const { orchestrator, read } = harness();
  const stale = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(
    stale.id,
    0,
    "plan",
    currentRevision(orchestrator, stale.id),
  );
  const approved = orchestrator.decideStage({
    planId: stale.id,
    expectedRevision: currentRevision(orchestrator, stale.id),
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  const running = orchestrator.updateWorkItem({
    planId: stale.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: approved.revision,
    status: "running",
  });
  orchestrator.updateWorkItem({
    planId: stale.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: running.revision,
    status: "succeeded",
  });
  orchestrator.requestStageApproval(
    stale.id,
    0,
    "result",
    currentRevision(orchestrator, stale.id),
  );
  orchestrator.completeStage(
    stale.id,
    0,
    currentRevision(orchestrator, stale.id),
  );
  const before = read();
  assert.throws(
    () =>
      orchestrator.updateWorkItem({
        planId: stale.id,
        stageIndex: 0,
        workItemId: "wi-0",
        expectedRevision: stale.revision,
        status: "running",
      }),
    /revision|并发冲突/,
  );
  assert.strictEqual(read(), before);
  assert.equal(orchestrator.getPlan(stale.id)?.stages[0].status, "done");
});

test("approvalSummary lists pending gates across plans", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  orchestrator.requestStageApproval(
    plan.id,
    0,
    "plan",
    currentRevision(orchestrator, plan.id),
  );
  assert.deepEqual(orchestrator.approvalSummary(), [
    { planId: plan.id, stageIndex: 0, gate: "plan", revision: 1 },
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
  assert.equal(status.revision, plan.revision);
  const update = tools[1].invoke({
    planId: plan.id,
    stageIndex: 0,
    expectedRevision: plan.revision,
    expectedStatus: "doing",
    nextStatus: "plan_review",
  });
  assert.equal(update.ok, true);
  assert.equal(
    tools[1].invoke({
      planId: plan.id,
      stageIndex: 0,
      expectedStatus: "doing",
      nextStatus: "blocked",
    }).ok,
    false,
  );
  const bad = tools[1].invoke({
    planId: plan.id,
    stageIndex: 0,
    expectedRevision: plan.revision,
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

test("Agent plan tool cannot approve or unblock its own stages", () => {
  const { orchestrator } = harness();
  const plan = orchestrator.upsertPlan(planInput("p"));
  const update = orchestrator.planTools()[1];

  assert.equal(
    update.invoke({
      planId: plan.id,
      stageIndex: 0,
      expectedRevision: plan.revision,
      expectedStatus: "doing",
      nextStatus: "plan_review",
    }).ok,
    true,
  );
  assert.equal(
    update.invoke({
      planId: plan.id,
      stageIndex: 0,
      expectedRevision: plan.revision + 1,
      expectedStatus: "plan_review",
      nextStatus: "doing",
    }).ok,
    false,
  );
  assert.equal(orchestrator.getPlan(plan.id)?.stages[0].status, "plan_review");
  const approved = orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "plan",
    decision: "approve",
  });
  const running = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: approved.revision,
    status: "running",
  });
  const succeeded = orchestrator.updateWorkItem({
    planId: plan.id,
    stageIndex: 0,
    workItemId: "wi-0",
    expectedRevision: running.revision,
    status: "succeeded",
  });

  assert.equal(
    update.invoke({
      planId: plan.id,
      stageIndex: 0,
      expectedRevision: succeeded.revision,
      expectedStatus: "doing",
      nextStatus: "result_review",
    }).ok,
    true,
  );
  assert.equal(
    update.invoke({
      planId: plan.id,
      stageIndex: 0,
      expectedRevision: succeeded.revision + 1,
      expectedStatus: "result_review",
      nextStatus: "done",
    }).ok,
    false,
  );
  assert.equal(
    orchestrator.getPlan(plan.id)?.stages[0].status,
    "result_review",
  );
  orchestrator.decideStage({
    planId: plan.id,
    expectedRevision: currentRevision(orchestrator, plan.id),
    stageIndex: 0,
    gate: "result",
    decision: "approve",
  });
  assert.equal(orchestrator.getPlan(plan.id)?.stages[0].status, "done");

  orchestrator.markStageBlocked(
    plan.id,
    1,
    currentRevision(orchestrator, plan.id),
  );
  assert.equal(
    update.invoke({
      planId: plan.id,
      stageIndex: 1,
      expectedRevision: orchestrator.getPlan(plan.id)?.revision,
      expectedStatus: "blocked",
      nextStatus: "doing",
    }).ok,
    false,
  );
  assert.equal(orchestrator.getPlan(plan.id)?.stages[1].status, "blocked");
});
