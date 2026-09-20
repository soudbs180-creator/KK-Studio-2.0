import type { ReviewComment } from "../domain/reviewWorkflow";
import type { ApprovalGate } from "../domain/agentWorkflow";
import type {
  CreationTask,
  CreationTaskOutput,
} from "../features/creation/model";
import TaskWorkbenchExport from "./TaskWorkbenchExport";
import BatchMatrix from "./BatchMatrix";
import TaskWorkbenchReview from "./TaskWorkbenchReview";

export type WorkbenchTab =
  "queue" | "prompt" | "generate" | "review" | "export";

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

export function outputsFor(task: CreationTask): CreationTaskOutput[] {
  return task.outputs?.length
    ? task.outputs
    : Array.from({ length: task.requestedOutputs }, (_, index) => ({
        index,
        status:
          task.status === "succeeded"
            ? ("succeeded" as const)
            : task.status === "failed"
              ? ("failed" as const)
              : task.status === "cancelled"
                ? ("cancelled" as const)
                : task.status === "unknown"
                  ? ("unknown" as const)
                  : ("waiting" as const),
        model: task.model,
        provider: task.providerName,
        createdAt: task.createdAt,
      }));
}

export default function TaskWorkbenchContent({
  selected,
  outputs,
  tab,
  onPauseTask,
  onCancelTask,
  onResumeTask,
  onRetryTask,
  onRetryOutput,
  gates,
  comments,
  onCommentsChange,
}: {
  selected?: CreationTask;
  outputs: CreationTaskOutput[];
  tab: WorkbenchTab;
  onPauseTask: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onRetryOutput: (taskId: string, outputIndex: number) => void;
  gates: ApprovalGate[];
  comments: ReviewComment[];
  onCommentsChange: (comments: ReviewComment[]) => void;
}) {
  if (!selected)
    return (
      <div className="task-workbench-empty">选择一个任务查看批量矩阵。</div>
    );
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
              <button type="button" onClick={() => onPauseTask(selected.id)}>
                暂停
              </button>
              <button type="button" onClick={() => onCancelTask(selected.id)}>
                取消
              </button>
            </>
          )}
          {selected.status === "queued" && selected.error?.includes("暂停") && (
            <>
              <button type="button" onClick={() => onResumeTask(selected.id)}>
                恢复
              </button>
              <button type="button" onClick={() => onCancelTask(selected.id)}>
                取消
              </button>
            </>
          )}
          {[
            "failed",
            "partial",
            "cancelled",
            "offline",
            "interrupted",
          ].includes(selected.status) && (
            <button type="button" onClick={() => onRetryTask(selected.id)}>
              重试剩余
            </button>
          )}
        </div>
      </div>
      {tab === "queue" && (
        <div className="task-overview-grid">
          <div>
            <span>预计成本</span>
            <strong>
              {selected.estimatedCostUsd
                ? `$${selected.estimatedCostUsd.toFixed(2)}`
                : "未估算"}
            </strong>
            <small>Prototype 示例单价 $0.04/张 · 尚未取得供应商报价</small>
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
