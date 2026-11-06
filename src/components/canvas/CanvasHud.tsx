import type { ReactNode } from "react";
import UiIcon from "../UiIcon";
import TaskPanel from "./TaskPanel";
import type { CreationTask } from "../../features/creation/index.ts";
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
  const viewMode = controlledViewMode ?? "canvas";

  return (
    <div
      className="canvas-hud"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="canvas-hud-left">
        <div
          className="canvas-view-mode-toggle"
          role="radiogroup"
          aria-label="视图切换"
          data-figma-node="563:1506"
        >
          <button
            type="button"
            role="radio"
            aria-label="画布"
            title="画布"
            aria-checked={viewMode === "canvas"}
            className={`canvas-view-mode-btn ${viewMode === "canvas" ? "active" : ""}`}
            onClick={() => onViewModeChange?.("canvas")}
          >
            <img src="/design/figma/canvas-view.svg" alt="" />
            {viewMode !== "canvas" && <span>画布</span>}
          </button>
          <button
            type="button"
            role="radio"
            aria-label="浏览器"
            title={onViewModeChange ? "浏览器" : "浏览器视图暂不可用"}
            disabled={!onViewModeChange}
            aria-checked={viewMode === "browser"}
            className={`canvas-view-mode-btn ${viewMode === "browser" ? "active" : ""}`}
            onClick={() => onViewModeChange?.("browser")}
          >
            <img src="/design/figma/browser-view.svg" alt="" />
            {viewMode !== "browser" && <span>浏览器</span>}
          </button>
        </div>
        <TaskPanel
          onConfigure={onConfigure}
          onOpenTasks={onOpenTasks}
          tasks={tasks}
          onCancelTask={onCancelTask}
          onRetryTask={onRetryTask}
        />
        <div className="canvas-hud-actions">{projectStatus}</div>
      </div>
      <div className="canvas-hud-right">
        {children}
        <button
          className={`chat-reopen ${chatOpen ? "only-narrow" : ""}`}
          aria-label="打开对话"
          title="打开对话"
          onClick={onChat}
        >
          <UiIcon name="message-square" size={28} />
        </button>
      </div>
    </div>
  );
}
