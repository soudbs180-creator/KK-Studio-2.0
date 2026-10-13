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

export type TaskCostReceiptKind = "estimate" | "actual";
export type TaskCostReceiptSource = "provider" | "fixture";

/**
 * Provider cost evidence is deliberately opaque and bounded. A fixture is a
 * useful contract test input, but it must never be projected into a billing
 * amount or treated as proof of a real provider charge.
 */
export interface TaskCostReceipt {
  kind: TaskCostReceiptKind;
  amount: number;
  currency: string;
  source: TaskCostReceiptSource;
  providerId: string;
  receiptId: string;
  receivedAt: number;
  taskId: string;
  idempotencyKey: string;
}

const MAX_TASK_COST_AMOUNT = 1_000_000_000;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:-]{1,120}$/;
const SAFE_RECEIPT_ID = /^[A-Za-z0-9._:-]{1,160}$/;

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function boundedOpaqueId(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

/** Normalize untrusted provider/fixture evidence; malformed or incomplete input stays unknown. */
export function normalizeTaskCostReceipt(
  value: unknown,
  task?: Pick<CreationTask, "id" | "idempotencyKey">,
  expectedKind?: TaskCostReceiptKind,
): TaskCostReceipt | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    !hasOnlyKeys(candidate, [
      "kind",
      "amount",
      "currency",
      "source",
      "providerId",
      "receiptId",
      "receivedAt",
      "taskId",
      "idempotencyKey",
    ])
  )
    return undefined;
  const kind =
    candidate.kind === "estimate" || candidate.kind === "actual"
      ? candidate.kind
      : undefined;
  const source =
    candidate.source === "provider" || candidate.source === "fixture"
      ? candidate.source
      : undefined;
  const amount = candidate.amount;
  const currency = candidate.currency;
  const providerId = boundedOpaqueId(candidate.providerId, SAFE_PROVIDER_ID);
  const receiptId = boundedOpaqueId(candidate.receiptId, SAFE_RECEIPT_ID);
  const taskId = boundedOpaqueId(candidate.taskId, SAFE_ID);
  const idempotencyKey = boundedOpaqueId(candidate.idempotencyKey, SAFE_ID);
  const receivedAt = candidate.receivedAt;
  if (
    !kind ||
    !source ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > MAX_TASK_COST_AMOUNT ||
    typeof currency !== "string" ||
    !/^[A-Z]{3}$/.test(currency) ||
    !providerId ||
    !receiptId ||
    !taskId ||
    !idempotencyKey ||
    typeof receivedAt !== "number" ||
    !Number.isSafeInteger(receivedAt) ||
    receivedAt < 0
  )
    return undefined;
  if (expectedKind && kind !== expectedKind) return undefined;
  if (task && (task.id !== taskId || task.idempotencyKey !== idempotencyKey))
    return undefined;
  return {
    kind,
    amount,
    currency,
    source,
    providerId,
    receiptId,
    receivedAt,
    taskId,
    idempotencyKey,
  };
}

export type TaskCostReceiptApplyResult =
  | { status: "applied"; task: CreationTask }
  | { status: "duplicate"; task: CreationTask }
  | {
      status: "rejected";
      reason: "receipt_invalid" | "task_mismatch" | "receipt_conflict";
      task: CreationTask;
    };

function isTaskMismatch(value: unknown, task: CreationTask): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (typeof candidate.taskId === "string" && candidate.taskId !== task.id) ||
    (typeof candidate.idempotencyKey === "string" &&
      candidate.idempotencyKey !== task.idempotencyKey)
  );
}

function isBillingEvidence(receipt: TaskCostReceipt): boolean {
  return receipt.source === "provider" && receipt.currency === "USD";
}

/** Apply one receipt exactly once; conflicting or cross-task evidence is rejected. */
export function applyTaskCostReceipt(
  task: CreationTask,
  value: unknown,
): TaskCostReceiptApplyResult {
  const receipt = normalizeTaskCostReceipt(value, task);
  if (!receipt) {
    return {
      status: "rejected",
      reason: isTaskMismatch(value, task) ? "task_mismatch" : "receipt_invalid",
      task,
    };
  }
  const existing =
    receipt.kind === "estimate"
      ? task.estimatedCostQuote
      : task.actualCostReceipt;
  if (existing) {
    return JSON.stringify(existing) === JSON.stringify(receipt)
      ? { status: "duplicate", task }
      : { status: "rejected", reason: "receipt_conflict", task };
  }
  const next: CreationTask = {
    ...task,
    ...(receipt.kind === "estimate"
      ? { estimatedCostQuote: receipt }
      : { actualCostReceipt: receipt }),
  };
  if (isBillingEvidence(receipt)) {
    if (receipt.kind === "estimate") next.estimatedCostUsd = receipt.amount;
    else next.actualCostUsd = receipt.amount;
  }
  return { status: "applied", task: next };
}

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
  if (
    estimatedUsd === undefined ||
    !Number.isFinite(estimatedUsd) ||
    estimatedUsd < 0 ||
    estimatedUsd > MAX_TASK_COST_AMOUNT
  )
    return "尚未取得报价";
  return `约 $${estimatedUsd.toFixed(2)}（估算，非实际扣费）`;
}
