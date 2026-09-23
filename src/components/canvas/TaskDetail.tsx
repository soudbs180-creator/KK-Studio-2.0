import { useEffect, useRef, type RefObject } from "react";
import { useDismissible } from "../useDismissible";
import type { PrototypeTask } from "./TaskPanelPopover";

export default function TaskDetail({
  selectedTask,
  onCancelTask,
  onRetryTask,
  onClose,
  trigger,
}: {
  selectedTask: PrototypeTask;
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  onClose: () => void;
  trigger: RefObject<HTMLButtonElement>;
}) {
  const root = useRef<HTMLDivElement>(null);
  function close() {
    onClose();
    trigger.current?.focus({ preventScroll: true });
  }
  useDismissible(true, root, close, trigger);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
  }, [selectedTask.id]);
  return (
    <div ref={root} className="task-detail" role="dialog" aria-label="任务详情">
      <div className="task-detail-heading">
        <span>任务详情</span>
        <button type="button" aria-label="关闭任务详情" onClick={close}>
          <img
            src="/design/figma/task-close.svg"
            width={7}
            height={7}
            alt=""
            draggable={false}
          />
        </button>
      </div>
      <div className="task-detail-body">
        <img
          src={selectedTask.image}
          width={40}
          height={39}
          alt={selectedTask.task ? "任务结果预览" : "演示任务占位图"}
          draggable={false}
        />
        <div>
          <strong>
            {selectedTask.task
              ? selectedTask.task.status === "queued" &&
                selectedTask.task.error?.includes("暂停")
                ? "已暂停"
                : selectedTask.task.status === "unknown"
                  ? "受理状态不明 · 需核对供应商"
                  : selectedTask.statusLabel
              : selectedTask.status === "running"
                ? "正在生成中"
                : "已完成 · 本地演示"}
          </strong>
          <span>
            {selectedTask.task
              ? `${selectedTask.task.completedOutputs}/${selectedTask.task.requestedOutputs} 输出 · ${selectedTask.task.providerName ?? "连接未绑定"}`
              : `${selectedTask.date ?? "本次会话"}${selectedTask.duration ? ` · ${selectedTask.duration}` : ""}`}
          </span>
        </div>
      </div>
      {selectedTask.task &&
        (selectedTask.task.status === "running" ||
          selectedTask.task.status === "queued") &&
        onCancelTask && (
          <button
            type="button"
            className="task-detail-action"
            onClick={() => onCancelTask(selectedTask.task!.id)}
          >
            取消任务
          </button>
        )}
      {selectedTask.task &&
        ["failed", "partial", "cancelled", "offline", "interrupted"].includes(
          selectedTask.task.status,
        ) &&
        onRetryTask && (
          <button
            type="button"
            className="task-detail-action"
            onClick={() => onRetryTask(selectedTask.task!.id)}
          >
            重试任务
          </button>
        )}
      <p>
        {selectedTask.task
          ? selectedTask.task.status === "unknown"
            ? "供应商可能已受理；已暂停普通重试，请先在供应商侧核对。"
            : "任务来源、模型和结果仅来自当前本地快照。"
          : "Prototype · 固定测试素材，不上传或保存到服务器。"}
      </p>
    </div>
  );
}
