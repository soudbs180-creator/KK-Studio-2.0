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
export function applyArchivedCostReceipt(
  task: CreationTask,
  receipt: unknown,
): CreationTask {
  if (!isPlainCostReceipt(receipt)) return task;
  const result = applyTaskCostReceipt(task, receipt);
  return result.status === "rejected" ? task : result.task;
}
