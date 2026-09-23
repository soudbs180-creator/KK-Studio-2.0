import { useRef, type Dispatch, type SetStateAction } from "react";
import TaskDetail from "./TaskDetail";
import type {
  CreationTask,
  CreationTaskStatus,
} from "../../features/creation/model";

export type TaskFilter = "全部" | "执行中" | "未完成" | "失败";

export type PrototypeTask = {
  id: string;
  status: CreationTaskStatus | "completed" | "running";
  date?: string;
  duration?: string;
  statusLabel?: string;
  image: string;
  previewOnLoad?: boolean;
  task?: CreationTask;
};

export function tasksForFilter(
  tasks: PrototypeTask[],
  filter: TaskFilter,
): PrototypeTask[] {
  if (filter === "全部") return tasks;
  if (filter === "执行中")
    return tasks.filter(
      (task) => task.status === "running" || task.status === "queued",
    );
  if (filter === "未完成")
    return tasks.filter(
      (task) => task.status !== "completed" && task.status !== "succeeded",
    );
  return tasks.filter(
    (task) =>
      task.status === "failed" ||
      task.status === "offline" ||
      task.status === "interrupted" ||
      task.status === "unknown",
  );
}

export function TaskPanelPopover({
  demo = false,
  tab,
  setTab,
  visibleTasks,
  selectedTask,
  setSelectedTask,
  onOpenTasks,
  onCancelTask,
  onRetryTask,
  onDismiss,
}: {
  demo?: boolean;
  tab: TaskFilter;
  setTab: Dispatch<SetStateAction<TaskFilter>>;
  visibleTasks: PrototypeTask[];
  selectedTask: PrototypeTask | null;
  setSelectedTask: Dispatch<SetStateAction<PrototypeTask | null>>;
  onOpenTasks?: () => void;
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onDismiss: () => void;
}) {
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section
      className="task-panel"
      aria-label="任务列表"
      data-node-id="396:938"
      data-name="Runtime / Tasks"
    >
      <div
        className="task-panel-heading"
        data-node-id="398:25710"
        data-name="标题"
      >
        <span data-node-id="398:25592">
          {demo ? "任务状态 · 本地演示" : "任务状态"}
        </span>
        <button
          className="task-panel-close"
          type="button"
          aria-label="关闭任务列表"
          onClick={onDismiss}
        >
          <img
            src="/design/figma/task-close.svg"
            width={7}
            height={7}
            alt=""
            draggable={false}
          />
        </button>
      </div>
      <div
        className="task-panel-tabs"
        data-node-id="398:25690"
        data-name="任务栏选择"
      >
        {(["全部", "执行中", "未完成", "失败"] as TaskFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            className={"task-tab " + (tab === value ? "active" : "")}
            aria-pressed={tab === value}
            onClick={() => {
              setSelectedTask(null);
              setTab(value);
            }}
          >
            {value}
          </button>
        ))}
      </div>
      {visibleTasks.length > 0 ? (
        <div
          className="task-grid"
          data-node-id="398:25593"
          data-name="如果有生成出来的图片展示"
        >
          {visibleTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className={`task-card ${task.status === "running" ? "is-running" : ""} ${task.previewOnLoad ? "is-previewed" : ""}`}
              aria-label={
                task.task
                  ? `查看任务 ${task.id}`
                  : task.status === "running"
                    ? "查看正在生成中的演示任务"
                    : `查看演示任务 ${task.date}`
              }
              aria-expanded={selectedTask?.id === task.id}
              onClick={(event) => {
                detailTrigger.current = event.currentTarget;
                setSelectedTask(selectedTask?.id === task.id ? null : task);
              }}
              title={
                task.task
                  ? `${task.statusLabel} · ${task.task.providerName ?? "连接未绑定"}`
                  : "本地演示任务 · 不会上传或保存到服务器"
              }
            >
              <span className="task-card-thumb">
                <img
                  className="task-card-image"
                  src={task.image}
                  width={10}
                  height={10}
                  alt=""
                  draggable={false}
                />
                {task.previewOnLoad && (
                  <span className="task-card-preview">点击查看</span>
                )}
              </span>
              <span className="task-card-info">
                {task.task || task.status === "running" ? (
                  <span className="task-card-status">{task.statusLabel}</span>
                ) : (
                  <>
                    <span className="task-card-title">{task.date}</span>
                    <span className="task-card-status">{task.duration}</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="task-filter-empty" role="status">
          暂无{tab}任务
        </div>
      )}
      {selectedTask && (
        <TaskDetail
          selectedTask={selectedTask}
          onCancelTask={onCancelTask}
          onRetryTask={onRetryTask}
          onClose={() => setSelectedTask(null)}
          trigger={detailTrigger}
        />
      )}
      {onOpenTasks && (
        <button
          type="button"
          className="task-workbench-link"
          onClick={() => {
            onDismiss();
            onOpenTasks();
          }}
        >
          打开任务工作台
        </button>
      )}
    </section>
  );
}
