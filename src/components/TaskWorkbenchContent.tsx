import type { ReviewComment } from "../domain/reviewWorkflow";
import type { ApprovalGate } from "../domain/agentWorkflow";
import type {
  CreationProject,
  CreationTask,
  CreationTaskOutput,
} from "../features/creation/index.ts";
import TaskWorkbenchExport from "./TaskWorkbenchExport";
import BatchMatrix from "./BatchMatrix";
import TaskWorkbenchReview from "./TaskWorkbenchReview";
import TaskWorkbenchStages, {
  type StagePlanActions,
} from "./TaskWorkbenchStages";
import { formatCostUsd } from "../features/creation/index.ts";
import { taskRetryAvailability } from "../features/creation/index.ts";
export { taskOutputsForDisplay as outputsFor } from "../features/creation/index.ts";

export type WorkbenchTab =
  "queue" | "prompt" | "generate" | "review" | "export" | "plan";

export function statusLabel(task: CreationTask): string {
  return task.status === "queued"
    ? task.error?.includes("暂停")
      ? "已暂停"
      : "排队中"
    : task.status === "running"
      ? "生成中"
      : task.status === "unknown"
        ? "受理状态不明 · 需核对供应商"
        : task.status === "partial"
          ? `部分完成 ${task.completedOutputs}/${task.requestedOutputs}`
          : task.status === "succeeded"
            ? "已完成"
            : task.status === "cancelled"
              ? "已取消"
              : task.status === "offline"
                ? "离线"
                : task.status === "interrupted"
                  ? "中断"
                  : task.status === "failed"
                    ? "失败"
                    : task.status;
}

export default function TaskWorkbenchContent({
  selected,
  outputs,
  tab,
  onPauseTask,
  canPauseTask,
  onCancelTask,
  onResumeTask,
  onRetryTask,
  onRetryOutput,
  gates,
  comments,
  onCommentsChange,
  project,
  onStageDecision,
  onRetryStage,
  onRequestPlanApproval,
  stageWriteDisabledReason,
}: {
  selected?: CreationTask;
  outputs: CreationTaskOutput[];
  tab: WorkbenchTab;
  onPauseTask: (taskId: string) => void;
  canPauseTask: (taskId: string) => boolean;
  onCancelTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onRetryOutput: (taskId: string, outputIndex: number) => void;
  gates: ApprovalGate[];
  comments: ReviewComment[];
  onCommentsChange: (comments: ReviewComment[]) => void;
  project?: CreationProject;
} & StagePlanActions) {
  if (tab === "plan")
    return (
      <TaskWorkbenchStages
        key={project?.id ?? "no-project"}
        project={project}
        onStageDecision={onStageDecision}
        onRetryStage={onRetryStage}
        onRequestPlanApproval={onRequestPlanApproval}
        stageWriteDisabledReason={stageWriteDisabledReason}
      />
    );
  if (!selected)
    return (
      <div className="task-workbench-empty">选择一个任务查看批量矩阵。</div>
    );
  const retry = taskRetryAvailability(selected, project?.tasks);
  const retryCandidate = [
    "failed",
    "partial",
    "cancelled",
    "offline",
    "interrupted",
  ].includes(selected.status);
  const retryReason =
    retryCandidate && !retry.indices.length ? retry.blockedReason : undefined;
  return (
    <>
      <div className="task-workbench-task-head">
        <div>
          <strong>{statusLabel(selected)}</strong>
          <span>
            {selected.model || "未选模型"} ·{" "}
            {selected.providerName ?? "连接未绑定"}
          </span>
        </div>
        <div className="task-workbench-actions">
          {selected.status === "running" && (
            <>
              {canPauseTask(selected.id) && (
                <button
                  type="button"
                  className="kk-button kk-button--secondary"
                  onClick={() => onPauseTask(selected.id)}
                >
                  暂停
                </button>
              )}
              <button
                type="button"
                className="kk-button kk-button--secondary"
                onClick={() => onCancelTask(selected.id)}
              >
                取消
              </button>
            </>
          )}
          {selected.status === "queued" && selected.error?.includes("暂停") && (
            <>
              <button
                type="button"
                className="kk-button kk-button--secondary"
                onClick={() => onResumeTask(selected.id)}
              >
                恢复
              </button>
              <button
                type="button"
                className="kk-button kk-button--secondary"
                onClick={() => onCancelTask(selected.id)}
              >
                取消
              </button>
            </>
          )}
          {retryCandidate && (
            <button
              type="button"
              className="kk-button kk-button--secondary"
              disabled={!retry.indices.length}
              title={retryReason}
              onClick={() => onRetryTask(selected.id)}
            >
              重试剩余
            </button>
          )}
        </div>
      </div>
      {retryReason && <p role="status">{retryReason}</p>}
      {tab === "queue" && (
        <div className="task-overview-grid">
          <div>
            <span>预计成本</span>
            <strong>{formatCostUsd(selected.estimatedCostUsd)}</strong>
            <small>供应商未回报价时只显示未知状态</small>
          </div>
          <div>
            <span>实际消耗</span>
            <strong>
              {selected.actualCostUsd == null
                ? "未接入"
                : `$${selected.actualCostUsd.toFixed(2)}`}
            </strong>
            <small>仅在供应商账单回传后显示</small>
          </div>
          <div>
            <span>隐私模式</span>
            <strong>
              {selected.privacyMode === "platform_backed"
                ? "平台模式"
                : selected.privacyMode === "local_only"
                  ? "仅本地"
                  : "BYOK 本地"}
            </strong>
            <small>
              {selected.privacyMode === "platform_backed"
                ? "数据会离开本机 · Prototype"
                : selected.privacyMode === "byok_local"
                  ? "结果保存在本机；请求会发送到指定 Provider"
                  : "素材保留在本机"}
            </small>
          </div>
        </div>
      )}
      {tab === "prompt" && (
        <div className="task-detail-card">
          <h3>Prompt</h3>
          <p className="task-prompt-copy">{selected.prompt || "暂无提示词"}</p>
          <div className="task-meta-row">
            <span>Prompt Hash</span>
            <code>
              {outputs.find((output) => output.promptHash)?.promptHash ??
                "归档结果后生成"}
            </code>
          </div>
          <div className="task-meta-row">
            <span>参考素材</span>
            <span>{selected.attachments.length} 项 · 不含密钥</span>
          </div>
        </div>
      )}
      {tab === "generate" && (
        <BatchMatrix
          task={selected}
          tasks={project?.tasks}
          outputs={outputs}
          onRetryOutput={onRetryOutput}
        />
      )}
      {tab === "review" && (
        <TaskWorkbenchReview selected={selected} gates={gates} />
      )}
      {tab === "export" && (
        <TaskWorkbenchExport
          key={selected.id}
          selected={selected}
          comments={comments}
          onChange={onCommentsChange}
        />
      )}
    </>
  );
}
