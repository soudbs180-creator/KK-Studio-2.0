import type { ReactNode } from "react";
import TaskPanel from "./TaskPanel";
import type { CreationTask } from "../../features/creation/model";
import "../../styles/canvas-hud.css";

/** Screen-space controls wrap together when the usable canvas becomes narrow. */
export default function CanvasHud({
  projectStatus,
  chatOpen,
  onChat,
  onConfigure,
  onOpenTasks,
  tasks,
  onCancelTask,
  onRetryTask,
  children,
}: {
  projectStatus?: ReactNode;
  chatOpen: boolean;
  onChat: () => void;
  onConfigure: () => void;
  onOpenTasks?: () => void;
  tasks?: CreationTask[];
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      className="canvas-hud"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="canvas-hud-actions">
        <TaskPanel
          onConfigure={onConfigure}
          onOpenTasks={onOpenTasks}
          tasks={tasks}
          onCancelTask={onCancelTask}
          onRetryTask={onRetryTask}
        />
        {projectStatus}
      </div>
      <div className="canvas-hud-right">
        {children}
        <button
          className={`chat-reopen ${chatOpen ? "only-narrow" : ""}`}
          aria-label="打开对话"
          title="打开对话"
          onClick={onChat}
        >
          <img
            src="/design/figma/chat-close.svg"
            width={18}
            height={18}
            alt=""
            draggable={false}
          />
        </button>
      </div>
    </div>
  );
}
