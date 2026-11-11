import type { CreationTask } from "./model.ts";
import { applyTaskCostReceipt } from "./taskState.ts";

/** A cost receipt is an object. Token usage and arrays are not billing evidence. */
export function isPlainCostReceipt(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Apply one native host receipt at the provider-to-task archive boundary.
 * Invalid, conflicting, or cross-task evidence leaves the existing task cost
 * unchanged. Token counts are never converted into a price.
 */
/** Read an explicit provider quote. Token usage is never treated as a price. */
export function readStreamCostReceipt(
  payload: unknown,
): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return undefined;
  const receipt = (payload as Record<string, unknown>).costReceipt;
  return isPlainCostReceipt(receipt) ? receipt : undefined;
}

/** Keep the first explicit quote. A later frame cannot replace it. */
export function rememberCostReceipt(
  slot: { current: unknown },
  receipt: unknown,
): void {
  if (slot.current === undefined && isPlainCostReceipt(receipt))
    slot.current = receipt;
}

export function applyArchivedCostReceipt(
  task: CreationTask,
  receipt: unknown,
): CreationTask {
  if (!isPlainCostReceipt(receipt)) return task;
  const result = applyTaskCostReceipt(task, receipt);
  return result.status === "rejected" ? task : result.task;
}
