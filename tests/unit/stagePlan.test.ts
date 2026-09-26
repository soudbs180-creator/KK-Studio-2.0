import assert from "node:assert/strict";
import test from "node:test";
import {
  StagePlanError,
  casAdvanceStage,
  createStagePlan,
  normalizeStagePlan,
  normalizeStagePlans,
  pendingStageApprovals,
  retryStageWorkItems,
  stageApprovalGateFor,
  stagePlanProgress,
  stagePlanSummary,
  stageWorkItemCounts,
  type StagePlan,
} from "../../src/domain/stagePlan.ts";

function workItem(id: string, overrides: Record<string, unknown> = {}) {
  const stamp = Date.now();
  return {
    id,
    kind: "image" as const,
    prompt: `prompt-${id}`,
    dependencies: [],
    status: "queued" as const,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function samplePlan(): StagePlan {
  return createStagePlan({
    title: "同一主体三条视频",
    projectId: "project-1",
    createdBy: "agent",
    stages: [
      {
        name: "规划与审批",
        goal: "确认角色与镜头清单",
        approvalGate: "plan",
        workItems: [workItem("wi-plan-1", { kind: "text" })],
      },
      {
        name: "生成三条视频",
        goal: "同一角色三条视频",
        workItems: [
          workItem("wi-v1"),
          workItem("wi-v2", { kind: "video" }),
          workItem("wi-v3", { kind: "video" }),
        ],
      },
    ],
  });
}

test("createStagePlan assigns indexes, doing status and revision 0", () => {
  const plan = samplePlan();
  assert.equal(plan.revision, 0);
  assert.equal(plan.stages.length, 2);
  assert.deepEqual(
    plan.stages.map((stage) => stage.index),
    [0, 1],
  );
  assert.ok(plan.stages.every((stage) => stage.status === "doing"));
  assert.equal(plan.stages[0].approvalGate, "plan");
});

test("createStagePlan rejects empty or oversized stage lists", () => {
  assert.throws(
    () =>
      createStagePlan({
        title: "t",
        projectId: "p",
        createdBy: "user",
        stages: [],
      }),
    StagePlanError,
  );
});

test("createStagePlan rejects a plan that storage normalization would discard", () => {
  assert.throws(
    () =>
      createStagePlan({
        title: "无效工作项",
        projectId: "project-1",
        createdBy: "agent",
        stages: [
          {
            name: "生成",
            goal: "输出",
            workItems: [workItem("w", { prompt: "" })],
          },
        ],
      }),
    /Stage 计划无效/,
  );
});

test("stage plans reject duplicate work item IDs across stages", () => {
  assert.throws(
    () =>
      createStagePlan({
        title: "重复工作项",
        projectId: "project-1",
        createdBy: "agent",
        stages: [
          { name: "规划", goal: "生成文本", workItems: [workItem("same")] },
          { name: "执行", goal: "生成图片", workItems: [workItem("same")] },
        ],
      }),
    /Stage 计划无效/,
  );
  const valid = samplePlan();
  const duplicate = {
    ...valid,
    stages: valid.stages.map((stage, index) =>
      index === 1
        ? {
            ...stage,
            workItems: stage.workItems.map((item, workIndex) =>
              workIndex === 0
                ? { ...item, id: valid.stages[0].workItems[0].id }
                : item,
            ),
          }
        : stage,
    ),
  };
  assert.equal(normalizeStagePlan(duplicate), null);
});

test("stage plan normalization rejects duplicate stage indexes", () => {
  const valid = samplePlan();
  const duplicate = {
    ...valid,
    stages: valid.stages.map((stage, index) =>
      index === 1 ? { ...stage, index: valid.stages[0].index } : stage,
    ),
  };
  assert.equal(normalizeStagePlan(duplicate), null);
});

test("stage plan collection keeps only the first duplicate plan ID", () => {
  const valid = samplePlan();
  const duplicate = { ...valid, title: "second copy" };
  assert.deepEqual(normalizeStagePlans([valid, duplicate]), [valid]);
});

test("casAdvanceStage advances doing to plan_review/result_review/blocked", () => {
  const plan = samplePlan();
  const reviewed = casAdvanceStage(plan, 0, "doing", "plan_review");
  assert.equal(reviewed.stages[0].status, "plan_review");
  assert.equal(reviewed.revision, 1);
  const blocked = casAdvanceStage(plan, 1, "doing", "blocked");
  assert.equal(blocked.stages[1].status, "blocked");
});

test("casAdvanceStage rejects stale expected status (concurrent write)", () => {
  const plan = samplePlan();
  assert.throws(
    () => casAdvanceStage(plan, 0, "result_review", "done"),
    /当前状态为 doing/,
  );
  assert.throws(
    () => casAdvanceStage(plan, 0, "doing", "done"),
    StagePlanError,
  );
});

test("casAdvanceStage rejects unknown stage and illegal transitions", () => {
  const plan = samplePlan();
  assert.throws(() => casAdvanceStage(plan, 9, "doing", "done"), /不存在/);
  const done = casAdvanceStage(plan, 0, "doing", "plan_review");
  const approved = casAdvanceStage(done, 0, "plan_review", "doing");
  const finished = casAdvanceStage(approved, 0, "doing", "result_review");
  const terminal = casAdvanceStage(finished, 0, "result_review", "done");
  assert.throws(
    () => casAdvanceStage(terminal, 0, "done", "doing"),
    /不允许从 done 迁移/,
  );
});

test("stageApprovalGateFor maps status to gate and null otherwise", () => {
  const plan = samplePlan();
  const reviewing = casAdvanceStage(plan, 0, "doing", "plan_review");
  assert.equal(stageApprovalGateFor(reviewing.stages[0]), "plan");
  const done = casAdvanceStage(plan, 0, "doing", "result_review");
  assert.equal(stageApprovalGateFor(done.stages[0]), "result");
  assert.equal(stageApprovalGateFor(plan.stages[0]), null);
});

test("pendingStageApprovals lists waiting gates only", () => {
  const plan = samplePlan();
  assert.deepEqual(pendingStageApprovals(plan), []);
  const waiting = casAdvanceStage(plan, 0, "doing", "plan_review");
  assert.deepEqual(pendingStageApprovals(waiting), [
    { stageIndex: 0, gate: "plan" },
  ]);
});

test("stagePlanProgress counts done/blocked/inFlight/pending", () => {
  const plan = samplePlan();
  assert.deepEqual(stagePlanProgress(plan), {
    total: 2,
    done: 0,
    blocked: 0,
    inFlight: 2,
    pendingApprovals: 0,
  });
  const progressed = casAdvanceStage(plan, 0, "doing", "plan_review");
  assert.equal(stagePlanProgress(progressed).pendingApprovals, 1);
  const withDone = casAdvanceStage(progressed, 0, "plan_review", "doing");
  const terminal = casAdvanceStage(withDone, 0, "doing", "result_review");
  const finished = casAdvanceStage(terminal, 0, "result_review", "done");
  assert.deepEqual(stagePlanProgress(finished).done, 1);
});

test("retryStageWorkItems requeues only failed/partial items", () => {
  const plan = samplePlan();
  const failed: StagePlan = {
    ...plan,
    stages: plan.stages.map((stage, index) =>
      index === 1
        ? {
            ...stage,
            workItems: [
              workItem("wi-v1", { status: "failed", error: "timeout" }),
              workItem("wi-v2", { status: "partial" }),
              workItem("wi-v3", { status: "succeeded" }),
            ],
          }
        : stage,
    ),
  };
  const retried = retryStageWorkItems(failed, 1);
  assert.equal(retried.stages[1].workItems[0].status, "queued");
  assert.equal(retried.stages[1].workItems[0].error, undefined);
  assert.equal(retried.stages[1].workItems[1].status, "queued");
  assert.equal(retried.stages[1].workItems[2].status, "succeeded");
  assert.throws(() => retryStageWorkItems(plan, 9), /不存在/);
});

test("stageWorkItemCounts aggregates per-status counts", () => {
  const plan = samplePlan();
  const mixed: StagePlan = {
    ...plan,
    stages: [
      {
        ...plan.stages[1],
        workItems: [
          workItem("a", { status: "failed" }),
          workItem("b", { status: "running" }),
          workItem("c", { status: "succeeded" }),
        ],
      },
    ],
  };
  assert.deepEqual(stageWorkItemCounts(mixed.stages[0]), {
    total: 3,
    succeeded: 1,
    failed: 1,
    partial: 0,
    queued: 0,
    running: 1,
    cancelled: 0,
  });
});

test("stagePlanSummary includes approval hint and progress", () => {
  const plan = samplePlan();
  const waiting = casAdvanceStage(plan, 0, "doing", "plan_review");
  const summary = stagePlanSummary(waiting);
  assert.match(summary, /0\/2 阶段完成/);
  assert.match(summary, /等待计划审批/);
});

test("normalizeStagePlan rebuilds valid plans and drops invalid ones", () => {
  const plan = samplePlan();
  assert.ok(normalizeStagePlan(plan));
  assert.equal(normalizeStagePlan(null), null);
  assert.equal(normalizeStagePlan({ id: 1 }), null);
  assert.deepEqual(normalizeStagePlans([plan, null, { bad: true }]).length, 1);
});
