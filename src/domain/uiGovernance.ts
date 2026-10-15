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
  "queued" | "running" | "succeeded" | "failed" | "cancelled";

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

export function getDisabledReason(
  state: GenerationUiState,
): string | undefined {
  return DISABLED_REASONS[state];
}

export function canSubmitGeneration(state: GenerationUiState): boolean {
  return state === "ready";
}

/** Presentation derives from receipts and the existing project save state. */
export function getGenerationProgressLabels(context: {
  task?: {
    status:
      GenerationTaskStatus | "unknown" | "partial" | "offline" | "interrupted";
    submissionState?: "intent" | "submitted" | "unknown" | "terminal";
    completedOutputs: number;
    requestedOutputs: number;
    error?: string;
    outputs?: readonly { status: string }[];
  };
  saveState:
    "loading" | "saved" | "saving" | "read_error" | "write_error" | "conflict";
  resultSaving?: boolean;
}): { taskLabel: string; saveLabel: string } {
  const { task, saveState, resultSaving } = context;
  const saveLabels = {
    loading: "读取中…",
    saved: "已保存",
    saving: "保存中…",
    read_error: "读取保护 · 尚未保存，请查看恢复提示",
    write_error: "保存失败 · 请查看恢复提示",
    conflict: "保存冲突 · 请查看恢复提示",
  };
  let saveLabel = saveLabels[saveState];
  if (!task) return { taskLabel: "", saveLabel };
  const uncertain =
    task.status === "unknown" ||
    task.submissionState === "unknown" ||
    task.outputs?.some((output) => output.status === "unknown");
  if (uncertain) {
    if (saveState === "saved") saveLabel = "任务记录已保存 · 结果需核对";
    return {
      taskLabel: task.error ?? "受理状态不明 · 请核对任务与素材库",
      saveLabel,
    };
  }
  const saveFailed = ["read_error", "write_error", "conflict"].includes(
    saveState,
  );
  let taskLabel: string;
  switch (task.status) {
    case "queued":
      taskLabel = task.error?.includes("暂停") ? "已暂停" : "排队中";
      break;
    case "running":
      taskLabel = resultSaving
        ? saveFailed
          ? "结果已返回 · 保存需核对"
          : saveState === "loading"
            ? "结果已返回 · 等待项目读取"
            : "结果已返回，正在保存"
        : task.completedOutputs > 0
          ? `生成中（已归档 ${task.completedOutputs}/${task.requestedOutputs}）`
          : "生成中";
      if (resultSaving && !saveFailed && saveState !== "loading")
        saveLabel = "结果保存中…";
      break;
    case "succeeded":
      taskLabel =
        saveState === "saved"
          ? "生成已完成 · 结果已保存到本机"
          : saveState === "saving"
            ? "生成已完成 · 结果已返回，正在保存"
            : "生成已完成 · 结果保存需核对";
      break;
    case "partial":
      taskLabel =
        `部分完成（${task.completedOutputs}/${task.requestedOutputs}）` +
        (saveState === "saved"
          ? " · 已保存已归档结果"
          : saveFailed
            ? " · 保存需核对"
            : saveState === "loading"
              ? " · 等待项目读取"
              : " · 正在保存结果");
      break;
    case "cancelled":
      taskLabel = "已取消";
      break;
    case "offline":
      taskLabel = "网络断开";
      break;
    case "interrupted":
      taskLabel = "上次任务未完成";
      break;
    default:
      taskLabel = `失败：${task.error ?? "请重试"}`;
  }
  return { taskLabel, saveLabel };
}
