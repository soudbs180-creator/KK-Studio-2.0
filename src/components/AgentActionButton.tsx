import { useEffect, useRef, type ReactElement } from "react";
import UiIcon from "./UiIcon";
import "../styles/agent-action-button.css";

export type AgentActionState =
  | "idle"
  | "executing"
  | "pausing"
  | "paused"
  | "resuming"
  | "completed";

export type AgentActionTransitionEvent =
  | "SEND"
  | "PAUSE_REQUEST"
  | "STEP_COMPLETED_PAUSE"
  | "RESUME_REQUEST"
  | "STEP_RESUMED"
  | "TASK_COMPLETED"
  | "RESET";

export const AGENT_ACTION_BUTTON_GEOMETRY = {
  desktopDiameter: 40,
  minTouchTarget: 44,
  iconSize: 20,
} as const;

export const DEFAULT_DEBOUNCE_MS = 300;
export const DEFAULT_COMPLETED_TIMEOUT_MS = 800;

export function transitionAgentActionState(
  current: AgentActionState,
  event: AgentActionTransitionEvent,
): AgentActionState {
  switch (current) {
    case "idle":
      return event === "SEND" ? "executing" : current;
    case "executing":
      if (event === "PAUSE_REQUEST") return "pausing";
      if (event === "TASK_COMPLETED") return "completed";
      return current;
    case "pausing":
      return event === "STEP_COMPLETED_PAUSE" ? "paused" : current;
    case "paused":
      return event === "RESUME_REQUEST" ? "resuming" : current;
    case "resuming":
      return event === "STEP_RESUMED" ? "executing" : current;
    case "completed":
      return event === "RESET" ? "idle" : current;
    default:
      return current;
  }
}

export function shouldDebounceClick(
  lastClickTime: number,
  currentTime: number,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): boolean {
  if (lastClickTime === 0) return false;
  return currentTime - lastClickTime < debounceMs;
}

export interface AgentActionButtonProps {
  state?: AgentActionState;
  hasContent?: boolean;
  hasDraft?: boolean;
  disabled?: boolean;
  debounceMs?: number;
  autoResetMs?: number;
  onSend?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onCompleted?: () => void;
  className?: string;
  size?: number;
  "aria-label"?: string;
}

export default function AgentActionButton({
  state = "idle",
  hasContent = false,
  hasDraft,
  disabled = false,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  autoResetMs = DEFAULT_COMPLETED_TIMEOUT_MS,
  onSend,
  onPause,
  onResume,
  onCompleted,
  className = "",
  "aria-label": customAriaLabel,
}: AgentActionButtonProps): ReactElement {
  const lastClickRef = useRef<number>(0);

  // Auto-reset completed state back to idle after duration
  useEffect(() => {
    if (state === "completed") {
      const timer = setTimeout(() => {
        onCompleted?.();
      }, autoResetMs);
      return () => clearTimeout(timer);
    }
  }, [state, autoResetMs, onCompleted]);

  const hasDraftOrContent = hasDraft ?? hasContent;
  const isPausingOrResuming = state === "pausing" || state === "resuming";
  const isCompleted = state === "completed";
  const isIdleDisabled = state === "idle" && (!hasDraftOrContent || disabled);
  const isButtonDisabled =
    disabled || isIdleDisabled || isPausingOrResuming || isCompleted;

  const handleClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (shouldDebounceClick(lastClickRef.current, now, debounceMs)) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }
    lastClickRef.current = now;

    if (state === "idle") {
      if (
        onSend &&
        (!e?.currentTarget?.form || e?.currentTarget?.type !== "submit")
      ) {
        e?.preventDefault?.();
        onSend();
      }
    } else if (state === "executing") {
      e?.preventDefault?.();
      onPause?.();
    } else if (state === "paused") {
      e?.preventDefault?.();
      onResume?.();
    }
  };

  const getAriaLabel = (): string => {
    if (customAriaLabel) return customAriaLabel;
    switch (state) {
      case "idle":
        return "发送消息";
      case "executing":
        return "暂停执行";
      case "pausing":
        return "正在暂停";
      case "paused":
        return "继续执行";
      case "resuming":
        return "正在恢复";
      case "completed":
        return "执行完成";
    }
  };

  const renderIcon = () => {
    switch (state) {
      case "idle":
        return (
          <img
            src="/design/figma/composer-send.svg"
            width={AGENT_ACTION_BUTTON_GEOMETRY.iconSize}
            height={AGENT_ACTION_BUTTON_GEOMETRY.iconSize}
            alt=""
            aria-hidden="true"
          />
        );
      case "executing":
        return (
          <UiIcon
            name="pause"
            size={AGENT_ACTION_BUTTON_GEOMETRY.iconSize}
          />
        );
      case "pausing":
      case "resuming":
        return <span className="agent-action-spinner" aria-hidden="true" />;
      case "paused":
        return (
          <UiIcon
            name="play"
            size={AGENT_ACTION_BUTTON_GEOMETRY.iconSize}
          />
        );
      case "completed":
        return (
          <UiIcon
            name="check"
            size={AGENT_ACTION_BUTTON_GEOMETRY.iconSize}
          />
        );
    }
  };

  return (
    <button
      type={state === "idle" && !onSend ? "submit" : "button"}
      className={`agent-action-button ${className}`.trim()}
      data-state={state}
      aria-label={getAriaLabel()}
      aria-busy={isPausingOrResuming}
      disabled={isButtonDisabled}
      onClick={handleClick}
    >
      {renderIcon()}
    </button>
  );
}
