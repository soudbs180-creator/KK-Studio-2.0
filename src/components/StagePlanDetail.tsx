import { useEffect, useState } from "react";
import {
  stageApprovalGateFor,
  stageWorkItemCounts,
  type Stage,
  type StagePlan,
  type StageWorkItemStatus,
} from "../domain/stagePlan";
import type { StageDecisionInput } from "../features/agent/orchestrator";

const workStatusLabels: Record<StageWorkItemStatus, string> = {
  queued: "待执行",
  running: "执行中",
  partial: "部分成功",
  succeeded: "已成功",
  failed: "失败",
  cancelled: "已取消",
};

export default function StagePlanDetail({
  plan,
  stage,
  busy,
  disabledReason,
  onDecision,
  onRetry,
  onRequestPlanApproval,
}: {
  plan: StagePlan;
  stage: Stage;
  busy: boolean;
  disabledReason?: string;
  onDecision: (input: StageDecisionInput) => Promise<void>;
  onRetry: () => Promise<void>;
  onRequestPlanApproval: () => Promise<void>;
}) {
  const [rework, setRework] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    setRework(false);
    setSelectedIds([]);
  }, [plan.revision]);
  const gate = stageApprovalGateFor(stage);
  const counts = stageWorkItemCounts(stage);
  const disabled = busy || Boolean(disabledReason);
  const needsPlanApproval =
    stage.approvalGate === "plan" && stage.planApprovedAt === undefined;
  const decide = (decision: "approve" | "reject", ids?: string[]) => {
    if (!gate) return;
    void onDecision({
      planId: plan.id,
      stageIndex: stage.index,
      expectedRevision: plan.revision,
      gate,
      decision,
      ...(ids ? { reworkItems: ids.map((id) => ({ id })) } : {}),
    });
  };
  return (
    <section
      className="stage-plan-detail"
      aria-label={`阶段详情：${stage.name}`}
    >
      <h3>{stage.name}</h3>
      <p>{stage.goal}</p>
      <p>
        {counts.succeeded} / {counts.total} 工作项已成功 · {counts.failed}{" "}
        项失败 · 版本 {plan.revision}
      </p>
      {stage.resultSummary && <p>{stage.resultSummary}</p>}
      <ul className="stage-work-items">
        {stage.workItems.map((item) => (
          <li key={item.id}>
            <strong>
              {item.id} · {item.kind} · {workStatusLabels[item.status]}
            </strong>
            <p>{item.prompt}</p>
            {item.reworkPrompt && <p>返工指令：{item.reworkPrompt}</p>}
            {item.dependencies.length > 0 && (
              <p>依赖：{item.dependencies.join("、")}</p>
            )}
            {item.assetId && <p>归档资产：{item.assetId}</p>}
            {item.error && (
              <p className="stage-plan-error">失败原因：{item.error}</p>
            )}
          </li>
        ))}
      </ul>
      {stage.status === "doing" && (
        <>
          <p className="stage-plan-guidance">
            {needsPlanApproval
              ? "计划审批尚未通过，请重新提交计划审批。"
              : "计划自动执行尚未接入；审批不会自动提交或重复创建生成任务。"}
          </p>
          {needsPlanApproval && (
            <div className="stage-plan-actions">
              <button
                type="button"
                className="primary-button"
                disabled={disabled}
                onClick={() => void onRequestPlanApproval()}
              >
                {busy ? "保存中…" : "重新提交计划审批"}
              </button>
            </div>
          )}
        </>
      )}
      {gate && !rework && (
        <div className="stage-plan-actions">
          <button
            type="button"
            className="primary-button"
            disabled={disabled}
            onClick={() => decide("approve")}
          >
            {busy ? "保存中…" : gate === "plan" ? "批准计划" : "批准结果"}
          </button>
          <button
            type="button"
            className="ui-button"
            disabled={disabled}
            onClick={() => {
              if (gate === "plan") decide("reject");
              else {
                setSelectedIds(stage.workItems.map((item) => item.id));
                setRework(true);
              }
            }}
          >
            {gate === "plan" ? "拒绝计划" : "返工结果"}
          </button>
        </div>
      )}
      {rework && gate === "result" && (
        <div className="stage-rework-confirm">
          <h4>
            {stage.workItems.length ? "确认返工范围" : "确认拒绝阶段结果"}
          </h4>
          <p>
            {stage.workItems.length
              ? "所选工作项及依赖它们的后续结果将重新审阅；原始提示词保留。"
              : "当前阶段没有工作项；拒绝后将撤回阶段摘要，等待重新审阅。"}
          </p>
          {stage.workItems.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                disabled={disabled}
                onChange={(event) =>
                  setSelectedIds((ids) =>
                    event.target.checked
                      ? [...ids, item.id]
                      : ids.filter((id) => id !== item.id),
                  )
                }
              />
              返工 {item.id}
            </label>
          ))}
          {stage.workItems.length > 0 && !selectedIds.length && (
            <p>请至少选择一个返工工作项。</p>
          )}
          <div className="stage-plan-actions">
            <button
              type="button"
              className="primary-button"
              disabled={
                disabled || (stage.workItems.length > 0 && !selectedIds.length)
              }
              onClick={() => decide("reject", selectedIds)}
            >
              {stage.workItems.length ? "确认返工" : "确认拒绝阶段结果"}
            </button>
            <button
              type="button"
              className="ui-button"
              disabled={busy}
              onClick={() => setRework(false)}
            >
              取消返工
            </button>
          </div>
        </div>
      )}
      {stage.status === "blocked" && (
        <div className="stage-plan-actions">
          <button
            type="button"
            className="primary-button"
            disabled={disabled}
            onClick={() => void onRetry()}
          >
            解除阻断
          </button>
          <p>
            只重置失败或部分成功的工作项；已成功结果保留，不会自动提交生成。
          </p>
        </div>
      )}
    </section>
  );
}
