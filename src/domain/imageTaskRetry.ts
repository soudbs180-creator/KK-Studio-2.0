import {
  canRetryTask,
  retryableOutputIndices,
  retryBlockedOutputIndices,
} from "./creationRecovery.ts";
import type { CreationTask, CreationTaskOutput } from "./creationTypes.ts";

/** Preserve the workbench's legacy output labels without inventing receipts. */
export function taskOutputsForDisplay(
  task: CreationTask,
): CreationTaskOutput[] {
  const completed = new Set(
    task.completedOutputIndices?.length
      ? task.completedOutputIndices
      : Array.from(
          { length: Math.min(task.completedOutputs, task.requestedOutputs) },
          (_, index) => index,
        ),
  );
  return task.outputs?.length
    ? task.outputs
    : Array.from({ length: task.requestedOutputs }, (_, index) => ({
        index,
        status: completed.has(index)
          ? ("succeeded" as const)
          : task.status === "failed"
            ? ("failed" as const)
            : task.status === "cancelled"
              ? ("cancelled" as const)
              : task.status === "unknown"
                ? ("unknown" as const)
                : ("waiting" as const),
        model: task.model,
        provider: task.providerName,
        createdAt: task.createdAt,
      }));
}

function submissionReason(task: CreationTask): string {
  if (task.status === "unknown" || task.submissionState === "unknown")
    return "供应商受理状态不明，请先核对结果；不会重复提交。";
  if (task.submissionState === "submitted")
    return "任务已提交，请等待或核对供应商回执；不会重复提交。";
  return "当前没有可安全重试的剩余输出，请先核对结果。";
}

/** Mirror the executor's root-slot fences, returning the selected task's local indices. */
export function taskRetryAvailability(
  task: CreationTask,
  tasks: readonly CreationTask[] = [task],
): { indices: number[]; blockedReason?: string } {
  if (!canRetryTask(task))
    return { indices: [], blockedReason: submissionReason(task) };
  let mapped = retryableOutputIndices(task, taskOutputsForDisplay(task)).map(
    (index) => ({ local: index, root: index }),
  );
  if (!mapped.length)
    return { indices: [], blockedReason: submissionReason(task) };
  let root = task;
  const visited = new Set<string>();
  while (root.retryOfTaskId && !visited.has(root.id)) {
    visited.add(root.id);
    const parent = tasks.find(
      (candidate) => candidate.id === root.retryOfTaskId,
    );
    if (!parent) break;
    mapped = mapped.map((slot) => ({
      ...slot,
      root: root.retryOutputIndices?.[slot.root] ?? slot.root,
    }));
    root = parent;
  }
  if (!canRetryTask(root))
    return { indices: [], blockedReason: submissionReason(root) };
  const safeRoot = new Set(
    retryableOutputIndices(root, taskOutputsForDisplay(root)),
  );
  const eligible = mapped.filter((slot) => safeRoot.has(slot.root));
  const blocked = new Set(retryBlockedOutputIndices(tasks, root.id));
  const available = eligible.filter((slot) => !blocked.has(slot.root));
  return {
    indices: available.map((slot) => slot.local),
    blockedReason:
      available.length < eligible.length
        ? "已有重试任务正在进行或已受理，请先核对结果，勿重复提交。"
        : eligible.length < mapped.length
          ? "所选输出在原任务中已完成或不能安全重试，请先核对结果。"
          : undefined,
  };
}
