import { useState, type ReactNode } from "react";
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
  viewMode: controlledViewMode,
  onViewModeChange,
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
  viewMode?: "canvas" | "browser";
  onViewModeChange?: (mode: "canvas" | "browser") => void;
  children: ReactNode;
}) {
  const [internalViewMode, setInternalViewMode] = useState<
    "canvas" | "browser"
  >("canvas");
  const viewMode = controlledViewMode ?? internalViewMode;

  const handleModeChange = (mode: "canvas" | "browser") => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  return (
    <div
      className="canvas-hud"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="canvas-hud-actions">{projectStatus}</div>
      <div className="canvas-hud-right">
        {children}
        <TaskPanel
          onConfigure={onConfigure}
          onOpenTasks={onOpenTasks}
          tasks={tasks}
          onCancelTask={onCancelTask}
          onRetryTask={onRetryTask}
        />
        <div
          className="canvas-view-mode-toggle"
          role="radiogroup"
          aria-label="视图切换"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "canvas"}
            className={`canvas-view-mode-btn ${viewMode === "canvas" ? "active" : ""}`}
            onClick={() => handleModeChange("canvas")}
          >
            画布
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === "browser"}
            className={`canvas-view-mode-btn ${viewMode === "browser" ? "active" : ""}`}
            onClick={() => handleModeChange("browser")}
          >
            浏览器
          </button>
        </div>
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
