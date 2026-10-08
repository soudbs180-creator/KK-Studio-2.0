import { useState } from "react";
import {
  stageApprovalGateFor,
  stagePlanProgress,
  stageWorkItemCounts,
  type StageApprovalGate,
  type StagePlan,
} from "../domain/stagePlan";
import type { StageDecisionInput } from "../features/agent/orchestrator";

const STAGE_STATUS_LABELS: Record<
  StagePlan["stages"][number]["status"],
  string
> = {
  doing: "执行中",
  plan_review: "计划审批",
  blocked: "已阻断",
  result_review: "结果审批",
  done: "已完成",
};

const GATE_LABELS: Record<StageApprovalGate, string> = {
  plan: "计划",
  result: "结果",
};

function handleLabel(gate: StageApprovalGate, decision: "approve" | "reject") {
  if (gate === "plan") return decision === "approve" ? "批准计划" : "阻止计划";
  return decision === "approve" ? "批准结果" : "退回返工";
}

export default function TaskWorkbenchStages({
  plans,
  onDecision,
}: {
  plans: StagePlan[];
  onDecision: (input: StageDecisionInput) => void;
}) {
  const [error, setError] = useState("");
  function decide(
    plan: StagePlan,
    stageIndex: number,
    gate: StageApprovalGate,
    decision: "approve" | "reject",
  ): void {
    setError("");
    try {
      onDecision({
        planId: plan.id,
        stageIndex,
        gate,
        decision,
        expectedRevision: plan.revision,
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "审批未写入，请刷新后重试。",
      );
    }
  }

  return (
    <div className="stage-plan-panel" data-testid="stage-plan-panel">
      {error && (
        <p className="stage-plan-error" role="alert">
          {error}
        </p>
      )}
      {!plans.length ? (
        <div className="task-workbench-empty">当前项目暂无编排计划。</div>
      ) : (
        plans.map((plan) => {
          const progress = stagePlanProgress(plan);
          return (
            <section className="stage-plan-card" key={plan.id}>
              <header className="stage-plan-header">
                <div>
                  <h3>{plan.title}</h3>
                  <p>
                    {progress.done}/{progress.total} 阶段完成 · revision{" "}
                    {plan.revision}
                  </p>
                </div>
                <span className="stage-plan-progress">
                  {progress.pendingApprovals
                    ? `待审批 ${progress.pendingApprovals}`
                    : "无待审批"}
                </span>
              </header>
              <ol className="stage-plan-stages">
                {plan.stages.map((stage) => {
                  const gate = stageApprovalGateFor(stage);
                  const counts = stageWorkItemCounts(stage);
                  return (
                    <li className="stage-plan-stage" key={stage.index}>
                      <div className="stage-plan-stage-head">
                        <div>
                          <strong>
                            {stage.index + 1}. {stage.name}
                          </strong>
                          <span>{stage.goal}</span>
                        </div>
                        <span
                          className={`stage-status stage-status-${stage.status}`}
                        >
                          {STAGE_STATUS_LABELS[stage.status]}
                        </span>
                      </div>
                      <div className="stage-plan-stage-meta">
                        <span>
                          工作项 {counts.succeeded}/{counts.total} 成功
                          {counts.failed ? ` · 失败 ${counts.failed}` : ""}
                        </span>
                        {gate && (
                          <div className="stage-plan-actions">
                            <span>{GATE_LABELS[gate]}门</span>
                            <button
                              type="button"
                              onClick={() =>
                                decide(plan, stage.index, gate, "reject")
                              }
                            >
                              {handleLabel(gate, "reject")}
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() =>
                                decide(plan, stage.index, gate, "approve")
                              }
                            >
                              {handleLabel(gate, "approve")}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
