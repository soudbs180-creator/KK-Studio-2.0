import { useMemo, useState } from "react";
import type { ReviewComment } from "../domain/reviewWorkflow";
import type { CreationProject } from "../features/creation/model";
import { requiredApprovalGates } from "../domain/agentWorkflow";
import TaskWorkbenchContent, {
  outputsFor,
  statusLabel,
  type WorkbenchTab,
} from "./TaskWorkbenchContent";

export default function TaskWorkbench({
  project,
  onClose,
  onConfigure,
  onCancelTask,
  onPauseTask,
  onResumeTask,
  onRetryTask,
  onRetryOutput,
  onCommentsChange,
}: {
  project?: CreationProject;
  onClose: () => void;
  onConfigure: () => void;
  onCancelTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onRetryTask: (taskId: string) => void;
  onRetryOutput: (taskId: string, outputIndex: number) => void;
  onCommentsChange: (comments: ReviewComment[]) => void;
}) {
  const [tab, setTab] = useState<WorkbenchTab>("queue");
  const [selectedId, setSelectedId] = useState(project?.tasks.at(-1)?.id ?? "");
  const tasks = project?.tasks ?? [];
  const selected = tasks.find((task) => task.id === selectedId) ?? tasks.at(-1);
  const outputs = selected ? outputsFor(selected) : [];
  const gates = useMemo(
    () =>
      selected
        ? requiredApprovalGates({
            privacyMode: selected.privacyMode,
            requestedOutputs: selected.requestedOutputs,
            providerBaseUrl: selected.providerBaseUrl,
          })
        : [],
    [selected],
  );
  return (
    <section className="task-workbench" data-testid="task-workbench">
      <header className="task-workbench-header">
        <div>
          <span className="task-workbench-eyebrow">
            TASK WORKBENCH · PROTOTYPE
          </span>
          <h2>任务工作台</h2>
          <p>{project?.name ?? "尚未选择项目"} · 队列、批量结果与来源检查</p>
        </div>
        <button
          type="button"
          className="task-workbench-close"
          aria-label="关闭任务工作台"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="task-workbench-layout">
        <aside className="task-queue" aria-label="任务队列">
          <div className="task-queue-heading">
            <span>Queue</span>
            <strong>{tasks.length}</strong>
          </div>
          {tasks.length ? (
            tasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className={`task-queue-item ${selected?.id === task.id ? "is-selected" : ""}`}
                aria-pressed={selected?.id === task.id}
                onClick={() => setSelectedId(task.id)}
              >
                <span>{task.model || "未选模型"}</span>
                <small>{statusLabel(task)}</small>
              </button>
            ))
          ) : (
            <p className="task-queue-empty">
              暂无任务。连接模型后可从画布提交。
            </p>
          )}
          {!tasks.length && (
            <button
              type="button"
              className="primary-button"
              onClick={onConfigure}
            >
              配置模型连接
            </button>
          )}
          {(project?.reviewComments ?? []).some(
            (entry) => entry.reviewTaskId,
          ) && (
            <div className="task-review-queue">
              <h3>Review Tasks</h3>
              {project?.reviewComments
                ?.filter((entry) => entry.reviewTaskId)
                .map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    onClick={() => {
                      setSelectedId(entry.sourceTaskId);
                      setTab("export");
                    }}
                  >
                    <strong>
                      {entry.status === "done" ? "已完成" : "待处理"} ·{" "}
                      {entry.assignee}
                    </strong>
                    <span>{entry.content}</span>
                  </button>
                ))}
            </div>
          )}
        </aside>
        <div className="task-workbench-main">
          <nav
            className="task-workbench-tabs"
            role="tablist"
            aria-label="任务阶段"
          >
            {(
              [
                "queue",
                "prompt",
                "generate",
                "review",
                "export",
              ] as WorkbenchTab[]
            ).map((value) => (
              <button
                type="button"
                role="tab"
                key={value}
                aria-selected={tab === value}
                className={tab === value ? "is-active" : ""}
                onClick={() => setTab(value)}
              >
                {value === "queue"
                  ? "Queue"
                  : value === "prompt"
                    ? "Prompt"
                    : value === "generate"
                      ? "Generate"
                      : value === "review"
                        ? "Review"
                        : "Export"}
              </button>
            ))}
          </nav>
          <TaskWorkbenchContent
            selected={selected}
            outputs={outputs}
            tab={tab}
            onPauseTask={onPauseTask}
            onCancelTask={onCancelTask}
            onResumeTask={onResumeTask}
            onRetryTask={onRetryTask}
            onRetryOutput={onRetryOutput}
            gates={gates}
            comments={project?.reviewComments ?? []}
            onCommentsChange={onCommentsChange}
          />
        </div>
      </div>
      <footer className="task-workbench-footer">
        Prototype ·
        成本、审批、评论与导出状态均以本地任务快照为准；真实供应商账单和公网分享尚未接入。
      </footer>
    </section>
  );
}
