import { useEffect, useRef, useState } from "react";
import {
  pendingStageApprovals,
  stagePlanProgress,
  type StageStatus,
} from "../domain/stagePlan";
import type { CreationProject } from "../features/creation/model";
import type { StageDecisionInput } from "../features/agent/orchestrator";
import StagePlanDetail from "./StagePlanDetail";

export const stageStatusLabels: Record<StageStatus, string> = {
  doing: "待执行 / 执行中",
  plan_review: "等待计划审批",
  blocked: "已阻断",
  result_review: "等待结果审批",
  done: "已完成",
};

export interface StagePlanActions {
  onStageDecision: (
    projectId: string,
    input: StageDecisionInput,
  ) => Promise<void>;
  onRetryStage: (
    projectId: string,
    planId: string,
    stageIndex: number,
    expectedRevision: number,
  ) => Promise<void>;
  onRequestPlanApproval: (
    projectId: string,
    planId: string,
    stageIndex: number,
    expectedRevision: number,
  ) => Promise<void>;
  stageWriteDisabledReason?: string;
}

export default function TaskWorkbenchStages({
  project,
  onStageDecision,
  onRetryStage,
  onRequestPlanApproval,
  stageWriteDisabledReason,
}: StagePlanActions & { project?: CreationProject }) {
  const [planId, setPlanId] = useState("");
  const [stageIndex, setStageIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const plans = project?.stagePlans ?? [];
  const plan = plans.find((item) => item.id === planId) ?? plans[0];
  const pending = plan ? pendingStageApprovals(plan) : [];
  const stage =
    plan?.stages.find((item) => item.index === stageIndex) ??
    plan?.stages.find((item) => item.index === pending[0]?.stageIndex) ??
    plan?.stages[0];
  const progress = plan ? stagePlanProgress(plan) : null;

  async function run(action: () => Promise<void>) {
    if (busyRef.current || stageWriteDisabledReason) return;
    busyRef.current = true;
    if (stage) setStageIndex(stage.index);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (mounted.current) setNotice("阶段状态已保存到当前项目。");
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : "阶段操作失败。");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section
      className="stage-plan-panel"
      aria-label="阶段计划"
      data-testid="stage-plan-panel"
    >
      {!project || !plan || !stage || !progress ? (
        <div className="stage-plan-empty">
          <h3>暂无阶段计划</h3>
          <p>打开或导入包含阶段计划的项目后，可在这里审阅计划与结果。</p>
          <p>计划自动创建和自动执行尚未接入；现有生成任务仍在 Queue 中查看。</p>
        </div>
      ) : (
        <>
          <header className="stage-plan-heading">
            <label>
              选择阶段计划
              <select
                value={plan.id}
                disabled={busy}
                onChange={(event) => {
                  setPlanId(event.target.value);
                  setStageIndex(null);
                  setError("");
                  setNotice("");
                }}
              >
                {plans.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {progress.done} / {progress.total} 阶段已完成 ·{" "}
              {progress.pendingApprovals} 项待审批
            </p>
          </header>
          <ol className="stage-plan-timeline" aria-label="计划阶段">
            {plan.stages.map((item, index) => (
              <li key={item.index}>
                <button
                  type="button"
                  aria-pressed={item.index === stage.index}
                  onClick={() => setStageIndex(item.index)}
                >
                  <strong>
                    阶段 {index + 1}：{item.name}
                  </strong>
                  <span>{stageStatusLabels[item.status]}</span>
                </button>
              </li>
            ))}
          </ol>
          {stageWriteDisabledReason && (
            <p className="stage-plan-error" role="alert">
              {stageWriteDisabledReason}
            </p>
          )}
          {error && (
            <div className="stage-plan-error" role="alert">
              <p>{error}</p>
              <p>请查看最新阶段状态；保存失败时请先处理项目恢复提示。</p>
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
          <StagePlanDetail
            key={`${plan.id}-${stage.index}`}
            plan={plan}
            stage={stage}
            busy={busy}
            disabledReason={stageWriteDisabledReason}
            onDecision={(input) =>
              run(() => onStageDecision(project.id, input))
            }
            onRetry={() =>
              run(() =>
                onRetryStage(project.id, plan.id, stage.index, plan.revision),
              )
            }
            onRequestPlanApproval={() =>
              run(() =>
                onRequestPlanApproval(
                  project.id,
                  plan.id,
                  stage.index,
                  plan.revision,
                ),
              )
            }
          />
        </>
      )}
    </section>
  );
}
