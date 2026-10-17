import type { CreationTask, CreationTaskOutput } from "./creation.ts";

/**
 * Once an HTTP request has started, aborting the browser fetch cannot prove
 * that the provider did not accept it. Keep this transition separate from
 * pre-submit cancellation so callers cannot accidentally make an uncertain
 * request retryable.
 */
export function abortedAfterProviderSubmission(options: {
  durableSubmission: boolean;
  providerRequestStarted: boolean;
  nativeTaskHost: boolean;
  aborted: boolean;
}): boolean {
  return (
    options.durableSubmission &&
    options.aborted &&
    (options.providerRequestStarted || options.nativeTaskHost)
  );
}

/** A native submit call may have reached the host even when its response was lost. */
export function submissionMayHaveBeenAccepted(options: {
  durableSubmission: boolean;
  providerRequestStarted: boolean;
  nativeTaskHost: boolean;
  nativeSubmissionStarted: boolean;
}): boolean {
  return (
    options.durableSubmission ||
    options.providerRequestStarted ||
    (options.nativeTaskHost && options.nativeSubmissionStarted)
  );
}

/** Ordinary retry is forbidden once a provider may have accepted the task. */
export function canRetryTask(
  task: Pick<CreationTask, "status" | "submissionState">,
): boolean {
  if (
    task.status === "unknown" ||
    task.submissionState === "unknown" ||
    task.submissionState === "submitted"
  )
    return false;
  return ["partial", "failed", "offline", "cancelled", "interrupted"].includes(
    task.status,
  );
}

/**
 * Select output slots that are safe to submit again. Unknown and in-flight
 * slots are excluded; an interrupted intent is safe only when it never passed
 * the durable submission boundary.
 */
export function retryableOutputIndices(
  task: Pick<CreationTask, "status" | "submissionState" | "outputs">,
  outputs: CreationTaskOutput[],
  outputIndex?: number,
): number[] {
  if (!canRetryTask(task)) return [];
  const interruptedIntent =
    task.status === "interrupted" &&
    task.submissionState !== "submitted" &&
    task.submissionState !== "unknown";
  const legacyOutputs = !task.outputs?.length;
  return outputs
    .filter(
      (output) =>
        output.status === "failed" ||
        output.status === "cancelled" ||
        ((interruptedIntent || legacyOutputs) &&
          (output.status === "waiting" || output.status === "running")),
    )
    .filter((output) => outputIndex == null || output.index === outputIndex)
    .map((output) => output.index);
}

/** Keep successfully delivered batch slots when a different result fails validation. */
export function preserveAcceptedOutputsOnDeliveryFailure(
  outputs: CreationTaskOutput[],
  projectId: string,
  taskId: string,
  rejectedDeliveryIds: ReadonlySet<string>,
  error: string,
): CreationTaskOutput[] {
  return outputs.map((output) => {
    if (
      output.status !== "succeeded" ||
      !rejectedDeliveryIds.has(
        `${projectId}-${taskId}-result-${output.index + 1}`,
      )
    )
      return output;
    return {
      ...output,
      status: "unknown" as const,
      error,
    };
  });
}

/** A provider result that cannot be archived is not safe to submit again. */
export function markArchiveFailuresUnknown(
  outputs: CreationTaskOutput[],
  failedIndices: ReadonlySet<number>,
  error: string,
): CreationTaskOutput[] {
  return outputs.map((output) =>
    failedIndices.has(output.index) && output.status !== "succeeded"
      ? { ...output, status: "unknown" as const, error }
      : output,
  );
}

/** Recover a single durable task without interpreting any platform storage or source UI. */
export function recoverInterruptedTask(
  task: CreationTask,
  now: number,
): CreationTask {
  if (task.status !== "queued" && task.status !== "running") return task;
  const uncertain =
    task.status === "running" ||
    task.submissionState === "submitted" ||
    task.submissionState === "unknown";
  return {
    ...task,
    status: uncertain ? "unknown" : "interrupted",
    submissionState: uncertain ? "unknown" : "intent",
    error: uncertain
      ? "应用关闭时供应商受理状态不明，请先核对供应商，不会自动重复提交。"
      : "应用关闭时任务尚未提交，可使用原任务身份重试。",
    updatedAt: now,
  };
}
