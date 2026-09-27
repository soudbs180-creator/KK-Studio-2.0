/**
 * 统一任务态契约（A3）：图片/文本/（未来）视频/音频共用同一任务模型。
 *
 * CreationTask（features/creation/model.ts）已承载统一状态、幂等、重试子集、
 * 成本与素材注册字段；本模块把这些语义收口为可复用纯函数与明确契约，
 * 供编排器、UI 与未来云端厂商适配器共同消费，避免各模态各自实现一套状态逻辑。
 */

import type { CreationTask, CreationTaskStatus } from "./model.ts";
import { canRetryTask } from "./taskRecovery.ts";

export { canRetryTask };

/** 统一任务态：与 CreationTaskStatus 对齐的 9 态，作为跨模态契约。 */
export const unifiedTaskStatuses: readonly CreationTaskStatus[] = [
  "queued",
  "running",
  "unknown",
  "partial",
  "succeeded",
  "failed",
  "cancelled",
  "offline",
  "interrupted",
] as const;

/** UI 排序：数字越小越靠前。unknown/offline/interrupted 属异常态，排最后。 */
const TASK_STATE_RANK: Record<CreationTaskStatus, number> = {
  queued: 0,
  running: 1,
  partial: 2,
  succeeded: 3,
  failed: 4,
  cancelled: 5,
  offline: 6,
  interrupted: 7,
  unknown: 8,
};

export function taskStateRank(status: CreationTaskStatus): number {
  return TASK_STATE_RANK[status] ?? 8;
}

/**
 * 失败只重试失败输出：返回需要重发的输出 index 列表。
 * 先通过既有受理门禁，再从失败任务中选取确定失败的子项。
 * unknown 输出不能当作失败重新提交。
 */
export function retryFailedOutputIndices(
  task: Pick<CreationTask, "status" | "submissionState" | "outputs">,
): number[] {
  if (!canRetryTask(task) || !Array.isArray(task.outputs)) return [];
  return task.outputs
    .filter((output) => output.status === "failed")
    .map((output) => output.index)
    .slice(0, 64);
}

/**
 * 成本估算：单价×数量。只产出非负有限估算；未取得报价时返回 undefined，
 * UI 必须明确标注为估算而非实际扣费。
 */
export function estimateTaskCostUsd(
  requestedOutputs: number,
  unitPriceUsd: number | undefined,
): number | undefined {
  if (
    !Number.isInteger(requestedOutputs) ||
    requestedOutputs < 1 ||
    requestedOutputs > 64
  )
    return undefined;
  if (typeof unitPriceUsd !== "number" || !Number.isFinite(unitPriceUsd))
    return undefined;
  if (unitPriceUsd <= 0) return undefined;
  const estimate = requestedOutputs * unitPriceUsd;
  return Number.isFinite(estimate) && estimate >= 0 ? estimate : undefined;
}

/** 成本展示文案：估算值标注口径；无估算时返回占位说明。 */
export function formatCostUsd(estimatedUsd: number | undefined): string {
  if (estimatedUsd === undefined || !Number.isFinite(estimatedUsd))
    return "尚未取得报价";
  return `约 $${estimatedUsd.toFixed(2)}（估算，非实际扣费）`;
}
