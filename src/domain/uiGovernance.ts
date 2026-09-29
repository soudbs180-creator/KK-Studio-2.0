/**
 * Runtime contract for the generation UI.
 *
 * The values mirror the approved Figma state matrix.  Components should ask
 * this module for a state and allowed actions instead of inventing local
 * disabled rules for buttons, keyboard shortcuts or menus.
 */

export type GenerationUiState =
  | "idle"
  | "editing"
  | "validation-error"
  | "ready"
  | "queued"
  | "running"
  | "success"
  | "failure"
  | "cancelled"
  | "offline"
  | "service-unconfigured";

export type GenerationTaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface GenerationContext {
  prompt: string;
  inputValid?: boolean;
  modelConfigured: boolean;
  quotaAvailable: boolean;
  online: boolean;
  serviceConfigured: boolean;
  validationError?: string;
  taskStatus?: GenerationTaskStatus;
}

export type GenerationAction =
  | "input"
  | "upload"
  | "select-model"
  | "edit"
  | "clear"
  | "open-settings"
  | "save-draft"
  | "submit"
  | "view-task"
  | "view-progress"
  | "cancel"
  | "view"
  | "download"
  | "recreate"
  | "favorite"
  | "retry"
  | "view-reason"
  | "feedback"
  | "resubmit"
  | "view-record"
  | "edit-local"
  | "view-cache"
  | "read-setup";

const ACTIONS: Record<GenerationUiState, readonly GenerationAction[]> = {
  idle: ["input", "upload", "select-model"],
  editing: ["edit", "upload", "clear"],
  "validation-error": ["edit", "open-settings"],
  ready: ["submit", "save-draft"],
  queued: ["view-task", "cancel"],
  running: ["view-task", "view-progress", "cancel"],
  success: ["view", "download", "recreate", "favorite"],
  failure: ["retry", "view-reason", "feedback"],
  cancelled: ["resubmit", "view-record"],
  offline: ["edit-local", "view-cache"],
  "service-unconfigured": ["open-settings", "read-setup"],
};

const DISABLED_REASONS: Partial<Record<GenerationUiState, string>> = {
  idle: "请先输入创作内容。",
  editing: "请补全内容、模型和参数后再提交。",
  "validation-error": "请先修正标记的参数错误。",
  queued: "任务已排队，请等待完成或先取消当前任务。",
  running: "任务正在生成，请等待完成或先取消当前任务。",
  failure: "空结果不可下载，请先查看原因并重试。",
  cancelled: "原任务已取消，请重新提交新的任务。",
  offline: "当前离线，提交和云端同步不可用。",
  "service-unconfigured": "请先在设置中配置模型服务。",
};

function fromTaskStatus(status: GenerationTaskStatus): GenerationUiState {
  switch (status) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "succeeded":
      return "success";
    case "failed":
      return "failure";
    case "cancelled":
      return "cancelled";
  }
}

export function getGenerationUiState(
  context: GenerationContext,
): GenerationUiState {
  if (context.taskStatus) return fromTaskStatus(context.taskStatus);
  if (!context.online) return "offline";
  if (!context.serviceConfigured || !context.modelConfigured)
    return "service-unconfigured";
  if (context.validationError) return "validation-error";
  if (!context.prompt.trim()) return "idle";
  if (context.inputValid === false || !context.quotaAvailable) return "editing";
  return "ready";
}

export function getAllowedActions(
  state: GenerationUiState,
): readonly GenerationAction[] {
  return ACTIONS[state];
}

export function getDisabledReason(state: GenerationUiState): string | undefined {
  return DISABLED_REASONS[state];
}

export function canSubmitGeneration(state: GenerationUiState): boolean {
  return state === "ready";
}

