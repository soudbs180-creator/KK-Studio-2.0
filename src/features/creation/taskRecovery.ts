import type {
  CreationProject,
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";

const INTERRUPTIBLE_STATUSES = new Set(["queued", "running"]);

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

/**
 * Returns root output slots that already have a retry child in flight or in
 * an uncertain/accepted state. These slots must remain fenced even when the
 * parent snapshot has not yet been merged (for example after a browser
 * restart between the child write and its completion callback).
 */
export function retryBlockedOutputIndices(
  tasks: readonly Pick<
    CreationTask,
    | "retryOfTaskId"
    | "retryOutputIndices"
    | "status"
    | "submissionState"
    | "outputs"
  >[],
  rootTaskId: string,
): number[] {
  const blocked = new Set<number>();
  for (const child of tasks) {
    if (child.retryOfTaskId !== rootTaskId) continue;
    const indices = child.retryOutputIndices ?? [];
    const uncertainTask =
      child.status === "unknown" ||
      child.submissionState === "unknown" ||
      child.submissionState === "submitted";
    const safeInterrupted =
      child.status === "interrupted" && child.submissionState === "intent";
    indices.forEach((rootIndex, localIndex) => {
      const output =
        child.outputs?.find((candidate) => candidate.index === localIndex) ??
        child.outputs?.[localIndex];
      const inFlight =
        !safeInterrupted &&
        (child.status === "queued" ||
          child.status === "running" ||
          output?.status === "waiting" ||
          output?.status === "running");
      const accepted =
        output?.status === "succeeded" || output?.status === "unknown";
      if (uncertainTask || inFlight || accepted) blocked.add(rootIndex);
    });
  }
  return [...blocked];
}

/**
 * Propagate a retry child's terminal result back to its source task.
 *
 * A provider-accepted or delivery-invalid retry is uncertain even when other
 * outputs in the same retry succeeded. Keeping that uncertainty on the source
 * task prevents the Batch Matrix from offering an ordinary duplicate retry.
 */
export function mergeRetryTaskState(input: {
  parent: Pick<
    CreationTask,
    "outputs" | "requestedOutputs" | "status" | "submissionState" | "error"
  > & { outputs: CreationTaskOutput[] };
  retry: Pick<
    CreationTask,
    "outputs" | "retryOutputIndices" | "status" | "submissionState" | "error"
  >;
}): Pick<
  CreationTask,
  "outputs" | "completedOutputs" | "status" | "submissionState" | "error"
> {
  const retryOutputs = input.retry.outputs ?? [];
  const retryIndices = input.retry.retryOutputIndices ?? [];
  const missingSucceededOutput =
    input.retry.status === "succeeded" &&
    retryIndices.length > 0 &&
    retryIndices.some(
      (_, localIndex) =>
        !retryOutputs.some((output) => output.index === localIndex),
    );
  const retryIsUncertain =
    input.retry.status === "unknown" ||
    input.retry.submissionState === "unknown" ||
    missingSucceededOutput ||
    retryOutputs.some((output) => output.status === "unknown");
  const priorUnknownOutputs = input.parent.outputs.filter(
    (output) => output.status === "unknown",
  );
  const resolvedParentUncertainty =
    !retryIsUncertain &&
    input.retry.submissionState === "terminal" &&
    priorUnknownOutputs.length > 0 &&
    priorUnknownOutputs.every((output) => {
      const retryIndex = retryIndices.indexOf(output.index);
      const replacement = retryOutputs.find(
        (candidate) => candidate.index === retryIndex,
      );
      return (
        retryIndex >= 0 &&
        replacement !== undefined &&
        ["succeeded", "failed", "cancelled"].includes(replacement.status)
      );
    });
  let uncertain =
    (!resolvedParentUncertainty && input.parent.status === "unknown") ||
    (!resolvedParentUncertainty &&
      input.parent.submissionState === "unknown") ||
    retryIsUncertain;
  const unknownMessage =
    input.retry.error ??
    "重试任务受理状态不明，请先核对供应商；不会自动重复提交。";
  const outputs = input.parent.outputs.map((original) => {
    const retryIndex = retryIndices.indexOf(original.index);
    const replacement =
      retryIndex >= 0
        ? retryOutputs.find((candidate) => candidate.index === retryIndex)
        : undefined;
    if (!replacement) {
      if (retryIsUncertain && retryIndex >= 0) {
        uncertain = true;
        return {
          ...original,
          status: "unknown" as const,
          error: unknownMessage,
        };
      }
      return original;
    }
    if (replacement.status === "succeeded")
      return { ...replacement, index: original.index };
    if (replacement.status === "unknown" || retryIsUncertain) {
      uncertain = true;
      return {
        ...original,
        ...replacement,
        index: original.index,
        status: "unknown" as const,
        error: replacement.error ?? unknownMessage,
      };
    }
    if (
      original.status === "unknown" &&
      input.retry.submissionState === "terminal" &&
      (replacement.status === "failed" || replacement.status === "cancelled")
    )
      return { ...replacement, index: original.index };
    return original;
  });
  uncertain ||= outputs.some((output) => output.status === "unknown");
  const completedOutputs = outputs.filter(
    (output) => output.status === "succeeded",
  ).length;
  if (uncertain) {
    return {
      outputs,
      completedOutputs,
      status: "unknown",
      submissionState: "unknown",
      error:
        outputs.find((output) => output.status === "unknown")?.error ??
        unknownMessage,
    };
  }
  const status =
    completedOutputs === input.parent.requestedOutputs
      ? ("succeeded" as const)
      : completedOutputs > 0
        ? ("partial" as const)
        : resolvedParentUncertainty
          ? ("failed" as const)
          : input.parent.status;
  return {
    outputs,
    completedOutputs,
    status,
    submissionState: resolvedParentUncertainty
      ? "terminal"
      : input.parent.submissionState,
    error:
      status === "succeeded"
        ? undefined
        : `${completedOutputs}/${input.parent.requestedOutputs} 张已归档，可重试未归档结果。`,
  };
}

/**
 * Reconciles persisted retry children into their source task before the UI
 * offers another retry. This closes the restart window where a child had
 * already crossed the durable submission boundary but its live callback had
 * not yet merged the result into the parent task.
 */
export function reconcileRetryTaskParents(
  snapshot: CreationSnapshot,
  now = Date.now(),
): CreationSnapshot {
  let changed = false;
  const projects = snapshot.projects.map((project) => {
    let tasks = project.tasks;
    let projectChanged = false;
    for (const child of project.tasks) {
      if (!child.retryOfTaskId) continue;
      const parentIndex = tasks.findIndex(
        (candidate) => candidate.id === child.retryOfTaskId,
      );
      if (parentIndex < 0) continue;
      const parent = tasks[parentIndex];
      // Legacy snapshots may retain only a completion count. Do not erase it
      // by inventing an empty output vector; an uncertain child still fences
      // the parent, while known terminal children leave its evidence intact.
      if (!parent.outputs?.length) {
        const uncertainChild =
          child.status === "unknown" ||
          child.submissionState === "unknown" ||
          child.submissionState === "submitted" ||
          child.outputs?.some((output) => output.status === "unknown");
        if (!uncertainChild) continue;
        if (parent.status === "unknown" && parent.submissionState === "unknown")
          continue;
        tasks = tasks.map((task, index) =>
          index === parentIndex
            ? {
                ...parent,
                status: "unknown",
                submissionState: "unknown",
                error:
                  child.error ??
                  "重试任务受理状态不明，请先核对供应商；不会自动重复提交。",
                updatedAt: now,
              }
            : task,
        );
        changed = projectChanged = true;
        continue;
      }
      const reconciliationRetry =
        child.submissionState === "submitted"
          ? {
              ...child,
              status: "unknown" as const,
              submissionState: "unknown" as const,
            }
          : child;
      const merged = mergeRetryTaskState({
        parent: { ...parent, outputs: parent.outputs ?? [] },
        retry: reconciliationRetry,
      });
      const nextParent: CreationTask = {
        ...parent,
        ...merged,
        updatedAt: now,
      };
      const previousComparable = JSON.stringify({
        outputs: parent.outputs ?? [],
        completedOutputs: parent.completedOutputs,
        status: parent.status,
        submissionState: parent.submissionState,
        error: parent.error,
      });
      const nextComparable = JSON.stringify({
        outputs: nextParent.outputs ?? [],
        completedOutputs: nextParent.completedOutputs,
        status: nextParent.status,
        submissionState: nextParent.submissionState,
        error: nextParent.error,
      });
      if (previousComparable === nextComparable) continue;
      tasks = tasks.map((task, index) =>
        index === parentIndex ? nextParent : task,
      );
      changed = projectChanged = true;
    }
    return projectChanged ? { ...project, tasks, updatedAt: now } : project;
  });
  return changed
    ? { ...snapshot, projects, revision: snapshot.revision + 1 }
    : snapshot;
}

function isInterruptible(status: string): boolean {
  return INTERRUPTIBLE_STATUSES.has(status);
}

/**
 * Selects the conservative source used by tasks written before sourceItemId
 * existed. A project root remains the historical anchor; projects without it
 * use the first unmaterialized image card rather than marking every image.
 */
function historicalSourceItemId(project: CreationProject): string | undefined {
  const rootId = `${project.id}-prompt`;
  if (project.items.some((item) => item.id === rootId)) return rootId;
  return project.items.find((item) => item.kind === "image" && !item.result)
    ?.id;
}

function interruptedSourceIds(project: CreationProject): Set<string> {
  const ids = new Set<string>();
  const fallback = historicalSourceItemId(project);
  for (const task of project.tasks) {
    if (!isInterruptible(task.status)) continue;
    if (task.sourceItemId !== undefined && task.sourceItemId !== "") {
      // An explicit but deleted source must not fall back to an unrelated node.
      if (project.items.some((item) => item.id === task.sourceItemId))
        ids.add(task.sourceItemId);
    } else if (fallback) {
      ids.add(fallback);
    }
  }
  return ids;
}

/**
 * Converts tasks that were active at shutdown into recoverable states and
 * marks only their known source nodes as failed. A running/submitted task is
 * conservative: the provider may already have accepted it, so it becomes
 * `unknown` and cannot be sent through the ordinary retry path.
 */
export function recoverInterruptedTasks(
  snapshot: CreationSnapshot,
  now = Date.now(),
): CreationSnapshot {
  let interruptedAny = false;
  const projects = snapshot.projects.map((project) => {
    const interrupted = project.tasks.some((task) =>
      isInterruptible(task.status),
    );
    if (!interrupted) return project;
    interruptedAny = true;
    const sourceIds = interruptedSourceIds(project);
    return {
      ...project,
      tasks: project.tasks.map((task) => {
        if (!isInterruptible(task.status)) return task;
        const uncertain =
          task.status === "running" || task.submissionState === "submitted";
        return {
          ...task,
          status: uncertain ? ("unknown" as const) : ("interrupted" as const),
          submissionState: uncertain
            ? ("unknown" as const)
            : ("intent" as const),
          error: uncertain
            ? "应用关闭时供应商受理状态不明，请先核对供应商，不会自动重复提交。"
            : "应用关闭时任务尚未提交，可使用原任务身份重试。",
          updatedAt: now,
        };
      }),
      items: project.items.map((item) =>
        sourceIds.has(item.id)
          ? { ...item, generationStatus: "error" as const }
          : item,
      ),
      updatedAt: now,
    };
  });
  return reconcileRetryTaskParents(
    {
      ...snapshot,
      revision: interruptedAny ? snapshot.revision + 1 : snapshot.revision,
      projects,
    },
    now,
  );
}
