import { useCallback, useRef, useState } from "react";
import { useDismissible } from "../useDismissible";
import type { CreationTask } from "../../features/creation/model";
import {
  TaskPanelPopover,
  tasksForFilter,
  type PrototypeTask,
  type TaskFilter,
} from "./TaskPanelPopover";

const PROTOTYPE_TASKS: PrototypeTask[] = [
  {
    id: "prototype-complete",
    status: "completed",
    date: "2026/9/5",
    duration: "50S",
    image: "/design/figma/task-placeholder-complete.png",
    previewOnLoad: true,
  },
  {
    id: "prototype-running",
    status: "running",
    statusLabel: "演示 · 生成中",
    image: "/design/figma/task-placeholder-running.png",
  },
];

function liveTaskCard(task: CreationTask): PrototypeTask {
  const statusLabel =
    task.status === "running"
      ? "正在生成中"
      : task.status === "queued"
        ? task.error?.includes("暂停")
          ? "已暂停"
          : "排队中"
        : task.status === "partial"
          ? `${task.completedOutputs}/${task.requestedOutputs} 张已完成`
          : task.status === "succeeded"
            ? "已完成"
            : task.status === "unknown"
              ? "受理状态不明 · 需核对"
              : task.status === "cancelled"
                ? "已取消"
                : task.status === "offline"
                  ? "网络断开"
                  : task.status === "interrupted"
                    ? "上次未完成"
                    : "失败，请重试";
  return {
    id: task.id,
    status: task.status,
    statusLabel,
    image:
      task.status === "running" || task.status === "queued"
        ? "/design/figma/task-placeholder-running.png"
        : "/design/figma/task-placeholder-complete.png",
    task,
  };
}

export default function TaskPanel({
  onOpenTasks,
  tasks = [],
  onCancelTask,
  onRetryTask,
}: {
  onConfigure: () => void;
  onOpenTasks?: () => void;
  tasks?: CreationTask[];
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TaskFilter>("全部");
  const [selectedTask, setSelectedTask] = useState<PrototypeTask | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => {
    setOpen(false);
    setSelectedTask(null);
    ref.current
      ?.querySelector<HTMLButtonElement>(".task-button")
      ?.focus({ preventScroll: true });
  }, []);
  useDismissible(open, ref, dismiss);
  const displayTasks = tasks.length ? tasks.map(liveTaskCard) : PROTOTYPE_TASKS;
  const visibleTasks = tasksForFilter(displayTasks, tab);

  return (
    <div
      className="task-list-wrapper"
      ref={ref}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        className="task-button"
        onClick={() => (open ? dismiss() : setOpen(true))}
        aria-expanded={open}
        aria-label="打开任务列表"
      >
        <img
          className="task-button-icon"
          src="/design/figma/task-clipboard.svg"
          width={14}
          height={14}
          alt=""
          draggable={false}
        />
        <span>任务列表</span>
      </button>
      {open && (
        <TaskPanelPopover
          demo={tasks.length === 0}
          tab={tab}
          setTab={setTab}
          visibleTasks={visibleTasks}
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          onOpenTasks={onOpenTasks}
          onCancelTask={onCancelTask}
          onRetryTask={onRetryTask}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
