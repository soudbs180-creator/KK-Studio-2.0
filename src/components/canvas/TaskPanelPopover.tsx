import {
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import TaskDetail from "./TaskDetail";
import UiIcon from "../UiIcon";
import type {
  CreationTask,
  CreationTaskStatus,
} from "../../features/creation/index.ts";

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
  tasks,
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
  tasks?: readonly CreationTask[];
  setSelectedTask: Dispatch<SetStateAction<PrototypeTask | null>>;
  onOpenTasks?: () => void;
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onDismiss: () => void;
}) {
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const update = () => {
      const container = panel.parentElement;
      const trigger =
        container?.querySelector<HTMLButtonElement>(".task-button");
      if (!container || !trigger) return;
      const anchor = trigger.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      panel.style.top = `${anchor.bottom - origin.top - container.clientTop + 8}px`;
      panel.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - panel.offsetWidth - 8)) - origin.left - container.clientLeft}px`;
      const gap = parseFloat(getComputedStyle(panel).paddingBottom);
      const available = Math.max(
        0,
        window.innerHeight - panel.getBoundingClientRect().top - gap,
      );
      panel.style.setProperty(
        "--task-panel-available-height",
        `${available}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    const hud = panel.closest(".canvas-hud");
    if (hud) observer.observe(hud);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchedTasks = normalizedQuery
    ? visibleTasks.filter((task) => {
        const searchable = [
          task.id,
          task.status,
          task.statusLabel,
          task.date,
          task.duration,
          task.task?.prompt,
          task.task?.model,
          task.task?.kind,
          task.task?.providerName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();
        return searchable.includes(normalizedQuery);
      })
    : visibleTasks;
  return (
    <section
      ref={panelRef}
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
          <UiIcon name="close" size={20} />
        </button>
      </div>
      <label className="task-panel-search" data-node-id="1763:367">
        <span className="sr-only">搜索任务</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索任务"
          aria-label="搜索任务"
          spellCheck={false}
        />
      </label>
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
      {searchedTasks.length > 0 ? (
        <div
          className="task-grid"
          data-node-id="398:25593"
          data-name="如果有生成出来的图片展示"
        >
          {searchedTasks.map((task) => (
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
          {normalizedQuery ? "没有匹配的任务" : `暂无${tab}任务`}
        </div>
      )}
      {selectedTask && (
        <TaskDetail
          selectedTask={selectedTask}
          tasks={tasks}
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
