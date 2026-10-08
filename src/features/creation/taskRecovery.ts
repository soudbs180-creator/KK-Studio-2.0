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

/**
 * Returns root output slots that already have a retry child in flight or in
 * an uncertain/accepted state. These slots must remain fenced even when the
 * parent snapshot has not yet been merged (for example after a browser
 * restart between the child write and its completion callback).
 */
export function retryBlockedOutputIndices(
  tasks: readonly Pick<
    CreationTask,
    | "id"
    | "retryOfTaskId"
    | "retryOutputIndices"
    | "status"
    | "submissionState"
    | "outputs"
    | "completedOutputs"
    | "completedOutputIndices"
    | "requestedOutputs"
  >[],
  rootTaskId: string,
): number[] {
  const blocked = new Set<number>();
  const rootTask = tasks.find((task) => task.id === rootTaskId);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const rootOutputCount = rootTask?.requestedOutputs ?? 0;
  if (rootTask && !rootTask.outputs?.length) {
    const completed = rootTask.completedOutputIndices?.length
      ? rootTask.completedOutputIndices
      : Array.from(
          {
            length: Math.min(
              rootTask.completedOutputs,
              rootTask.requestedOutputs,
            ),
          },
          (_, index) => index,
        );
    completed.forEach((index) => blocked.add(index));
  }
  const mapToRootIndex = (
    childId: string,
    localIndex: number,
  ): number | undefined => {
    let current = tasksById.get(childId);
    let index = localIndex;
    const visited = new Set<string>();
    while (current?.retryOfTaskId) {
      if (visited.has(current.id)) return undefined;
      visited.add(current.id);
      const indices = current.retryOutputIndices;
      if (!indices?.length || index < 0 || index >= indices.length)
        return undefined;
      index = indices[index];
      if (current.retryOfTaskId === rootTaskId) return index;
      current = tasksById.get(current.retryOfTaskId);
    }
    return undefined;
  };
  const isDescendantOfRoot = (childId: string): boolean => {
    let current = tasksById.get(childId);
    const visited = new Set<string>();
    while (current?.retryOfTaskId) {
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      if (current.retryOfTaskId === rootTaskId) return true;
      current = tasksById.get(current.retryOfTaskId);
    }
    return false;
  };
  const blockAllRootSlots = () => {
    for (let index = 0; index < rootOutputCount; index++) blocked.add(index);
  };
  for (const child of tasks) {
    if (!child.retryOfTaskId || !isDescendantOfRoot(child.id)) continue;
    const indices = child.retryOutputIndices ?? [];
    const uncertainTask =
      child.status === "unknown" ||
      child.submissionState === "unknown" ||
      child.submissionState === "submitted";
    const safeInterrupted =
      child.status === "interrupted" && child.submissionState === "intent";
    const localIndices = new Set<number>([
      ...indices.map((_, localIndex) => localIndex),
      ...(child.outputs?.map((output) => output.index) ?? []),
    ]);
    if (!child.outputs?.length) {
      const completed = child.completedOutputIndices?.length
        ? child.completedOutputIndices
        : Array.from(
            {
              length: Math.min(child.completedOutputs, indices.length),
            },
            (_, index) => index,
          );
      completed.forEach((index) => localIndices.add(index));
    }
    const malformedTerminalSuccess =
      child.status === "succeeded" && child.submissionState === "terminal";
    if (!indices.length) {
      if (
        !safeInterrupted &&
        (uncertainTask ||
          malformedTerminalSuccess ||
          child.status === "queued" ||
          child.status === "running" ||
          child.outputs?.some(
            (output) =>
              output.status === "waiting" || output.status === "running",
          ))
      )
        blockAllRootSlots();
      continue;
    }
    if (uncertainTask || malformedTerminalSuccess) {
      for (const localIndex of localIndices) {
        const rootIndex = mapToRootIndex(child.id, localIndex);
        if (rootIndex === undefined) blockAllRootSlots();
        else blocked.add(rootIndex);
      }
      if (!localIndices.size) blockAllRootSlots();
    }
    indices.forEach((_, localIndex) => {
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
      if (inFlight || accepted) {
        const rootIndex = mapToRootIndex(child.id, localIndex);
        if (rootIndex === undefined) blockAllRootSlots();
        else blocked.add(rootIndex);
      }
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
    | "outputs"
    | "requestedOutputs"
    | "status"
    | "submissionState"
    | "error"
    | "model"
    | "providerName"
    | "createdAt"
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
  const terminalRetryReceipt =
    input.retry.submissionState === "terminal" &&
    retryIndices.length > 0 &&
    retryIndices.every((_, localIndex) => {
      const output = retryOutputs.find(
        (candidate) => candidate.index === localIndex,
      );
      return (
        output !== undefined &&
        ["succeeded", "failed", "cancelled"].includes(output.status)
      );
    });
  const parentOutputs = input.parent.outputs;
  const outputIndices = new Set<number>([
    ...Array.from(
      { length: input.parent.requestedOutputs },
      (_, index) => index,
    ),
    ...parentOutputs.map((output) => output.index),
    ...retryIndices,
  ]);
  const outputTemplate = parentOutputs[0] ?? retryOutputs[0];
  let uncertain = retryIsUncertain;
  const unknownMessage =
    input.retry.error ??
    "重试任务受理状态不明，请先核对供应商；不会自动重复提交。";
  const outputs = Array.from(outputIndices)
    .sort((left, right) => left - right)
    .map((index) => {
      const original = parentOutputs.find((output) => output.index === index);
      const retryIndex = retryIndices.indexOf(index);
      const replacement =
        retryIndex >= 0
          ? retryOutputs.find((candidate) => candidate.index === retryIndex)
          : undefined;
      if (!original && !replacement) {
        if (
          retryIndex >= 0 &&
          input.retry.submissionState === "terminal" &&
          (input.retry.status === "failed" ||
            input.retry.status === "cancelled")
        )
          return {
            index,
            status: input.retry.status,
            model: outputTemplate?.model ?? input.parent.model,
            provider: outputTemplate?.provider ?? input.parent.providerName,
            createdAt: outputTemplate?.createdAt ?? input.parent.createdAt,
            error: input.retry.error,
          } satisfies CreationTaskOutput;
        uncertain = true;
        return {
          index,
          status: "unknown" as const,
          model: outputTemplate?.model ?? input.parent.model,
          provider: outputTemplate?.provider ?? input.parent.providerName,
          createdAt: outputTemplate?.createdAt ?? input.parent.createdAt,
          error: "原任务输出回执缺失，请先核对供应商。",
        } satisfies CreationTaskOutput;
      }
      if (!original && replacement)
        return { ...replacement, index } satisfies CreationTaskOutput;
      if (!replacement) {
        if (
          retryIndex >= 0 &&
          input.retry.submissionState === "terminal" &&
          (input.retry.status === "failed" ||
            input.retry.status === "cancelled") &&
          original!.status !== "succeeded"
        )
          return {
            ...original!,
            status: (input.retry.status === "cancelled"
              ? "cancelled"
              : "failed") as CreationTaskOutput["status"],
            error: input.retry.error,
          } satisfies CreationTaskOutput;
        if (retryIsUncertain && retryIndex >= 0) {
          uncertain = true;
          return {
            ...original!,
            status: "unknown" as const,
            error: unknownMessage,
          };
        }
        return original!;
      }
      if (replacement.status === "succeeded") return { ...replacement, index };
      if (replacement.status === "unknown" || retryIsUncertain) {
        uncertain = true;
        return {
          ...original!,
          ...replacement,
          index,
          status: "unknown" as const,
          error: replacement.error ?? unknownMessage,
        };
      }
      if (
        input.retry.submissionState === "terminal" &&
        (replacement.status === "failed" ||
          replacement.status === "cancelled") &&
        original!.status !== "succeeded"
      )
        return { ...replacement, index };
      return original!;
    });
  const parentWasUncertain =
    input.parent.status === "unknown" ||
    input.parent.submissionState === "unknown";
  const resolvedParentUncertainty =
    parentWasUncertain &&
    !retryIsUncertain &&
    input.retry.submissionState === "terminal" &&
    terminalRetryReceipt &&
    outputs.every((output) => output.status !== "unknown");
  uncertain = resolvedParentUncertainty
    ? false
    : uncertain || parentWasUncertain;
  uncertain ||= outputs.some((output) => output.status === "unknown");
  const completedOutputs = outputs.filter(
    (output) => output.status === "succeeded",
  ).length;
  const allOutputsTerminal =
    outputs.length >= input.parent.requestedOutputs &&
    outputs.every((output) =>
      ["succeeded", "failed", "cancelled"].includes(output.status),
    );
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
        : resolvedParentUncertainty || allOutputsTerminal
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
    let passChanged = true;
    let pass = 0;
    while (passChanged && pass++ <= project.tasks.length) {
      passChanged = false;
      for (const persistedChild of project.tasks) {
        const child =
          tasks.find((candidate) => candidate.id === persistedChild.id) ??
          persistedChild;
        if (!child.retryOfTaskId) continue;
        const parentIndex = tasks.findIndex(
          (candidate) => candidate.id === child.retryOfTaskId,
        );
        if (parentIndex < 0) continue;
        const parent = tasks[parentIndex];
        // Legacy snapshots may retain only a completion count. Keep that
        // evidence without inventing an output vector; terminal retry receipts
        // add exact slot identities so a restart cannot submit them again.
        if (!parent.outputs?.length) {
          const retryIndices = child.retryOutputIndices ?? [];
          const retrySuccessIndices: number[] = [];
          const childTerminalIndices = new Set<number>();
          let retryReceiptComplete =
            child.submissionState === "terminal" && retryIndices.length > 0;
          for (
            let localIndex = 0;
            localIndex < retryIndices.length;
            localIndex++
          ) {
            const rootIndex = retryIndices[localIndex];
            const output = child.outputs?.find(
              (candidate) => candidate.index === localIndex,
            );
            if (
              output &&
              ["succeeded", "failed", "cancelled"].includes(output.status)
            ) {
              childTerminalIndices.add(rootIndex);
              if (output.status === "succeeded")
                retrySuccessIndices.push(rootIndex);
              continue;
            }
            if (
              !child.outputs?.length &&
              (child.status === "failed" || child.status === "cancelled")
            ) {
              childTerminalIndices.add(rootIndex);
              continue;
            }
            if (
              !child.outputs?.length &&
              child.status === "succeeded" &&
              localIndex < child.completedOutputs
            ) {
              childTerminalIndices.add(rootIndex);
              retrySuccessIndices.push(rootIndex);
              continue;
            }
            retryReceiptComplete = false;
          }
          const parentWasUncertain =
            parent.status === "unknown" || parent.submissionState === "unknown";
          const uncertainChild =
            child.status === "unknown" ||
            child.submissionState === "unknown" ||
            child.submissionState === "submitted" ||
            child.outputs?.some((output) => output.status === "unknown") ||
            !retryReceiptComplete;
          const priorIndices = new Set(parent.completedOutputIndices ?? []);
          if (!parent.completedOutputIndices?.length)
            for (
              let index = 0;
              index <
              Math.min(parent.completedOutputs, parent.requestedOutputs);
              index++
            )
              priorIndices.add(index);
          const nextIndices = Array.from(
            new Set([...priorIndices, ...retrySuccessIndices]),
          ).sort((left, right) => left - right);
          const nextCompletedOutputs = Math.min(
            parent.requestedOutputs,
            Math.max(parent.completedOutputs, nextIndices.length),
          );
          const coverageIndices = new Set([
            ...priorIndices,
            ...childTerminalIndices,
          ]);
          const parentUncertaintyResolved =
            !parentWasUncertain ||
            (retryReceiptComplete &&
              coverageIndices.size >= parent.requestedOutputs);
          const nextStatus =
            uncertainChild || !parentUncertaintyResolved
              ? ("unknown" as const)
              : nextCompletedOutputs >= parent.requestedOutputs
                ? ("succeeded" as const)
                : nextCompletedOutputs > 0
                  ? ("partial" as const)
                  : parentUncertaintyResolved
                    ? ("failed" as const)
                    : parent.status;
          const nextSubmissionState =
            uncertainChild || !parentUncertaintyResolved
              ? ("unknown" as const)
              : ["succeeded", "partial", "failed", "cancelled"].includes(
                    nextStatus,
                  )
                ? ("terminal" as const)
                : parent.submissionState;
          const nextParent: CreationTask = {
            ...parent,
            status: nextStatus,
            submissionState: nextSubmissionState,
            completedOutputs: nextCompletedOutputs,
            completedOutputIndices:
              parent.completedOutputIndices?.length ||
              retrySuccessIndices.length > 0
                ? nextIndices
                : parent.completedOutputIndices,
            error: uncertainChild
              ? (child.error ??
                "重试任务受理状态不明，请先核对供应商；不会自动重复提交。")
              : !parentUncertaintyResolved
                ? (parent.error ??
                  "原任务受理状态不明，请先核对供应商；不会自动重复提交。")
                : nextStatus === "succeeded"
                  ? undefined
                  : retrySuccessIndices.length > 0 && nextStatus === "partial"
                    ? `${nextCompletedOutputs}/${parent.requestedOutputs} 张已归档，可重试未归档结果。`
                    : (child.error ?? parent.error),
            updatedAt: now,
          };
          const previousComparable = JSON.stringify({
            status: parent.status,
            submissionState: parent.submissionState,
            completedOutputs: parent.completedOutputs,
            completedOutputIndices: parent.completedOutputIndices,
            error: parent.error,
          });
          const nextComparable = JSON.stringify({
            status: nextParent.status,
            submissionState: nextParent.submissionState,
            completedOutputs: nextParent.completedOutputs,
            completedOutputIndices: nextParent.completedOutputIndices,
            error: nextParent.error,
          });
          if (previousComparable === nextComparable) continue;
          tasks = tasks.map((task, index) =>
            index === parentIndex ? nextParent : task,
          );
          changed = projectChanged = passChanged = true;
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
        changed = projectChanged = passChanged = true;
      }
    }
    const nextItems = reconcileSourceGenerationStatuses({ ...project, tasks });
    if (nextItems !== project.items) projectChanged = true;
    return projectChanged
      ? { ...project, tasks, items: nextItems, updatedAt: now }
      : project;
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

function reconcileSourceGenerationStatuses(
  project: CreationProject,
): CreationProject["items"] {
  const states = new Map<string, "clear" | "pending" | "error">();
  const priority = { clear: 0, pending: 1, error: 2 } as const;
  for (const task of project.tasks) {
    const sourceItemId =
      task.sourceItemId !== undefined
        ? project.items.some((item) => item.id === task.sourceItemId)
          ? task.sourceItemId
          : undefined
        : historicalSourceItemId(project);
    if (!sourceItemId) continue;
    const uncertain =
      task.status === "unknown" ||
      task.submissionState === "unknown" ||
      task.outputs?.some((output) => output.status === "unknown");
    const relevant =
      uncertain ||
      task.status === "running" ||
      task.status === "queued" ||
      task.status === "failed" ||
      task.status === "offline" ||
      task.status === "interrupted" ||
      task.status === "partial" ||
      task.status === "succeeded" ||
      task.status === "cancelled" ||
      task.submissionState === "submitted";
    if (
      !relevant ||
      (task.status === "queued" && task.submissionState === "intent")
    )
      continue;
    const state =
      uncertain ||
      task.status === "failed" ||
      task.status === "offline" ||
      task.status === "interrupted"
        ? ("error" as const)
        : task.status === "running" ||
            task.status === "queued" ||
            task.submissionState === "submitted"
          ? ("pending" as const)
          : ("clear" as const);
    const current = states.get(sourceItemId);
    if (!current || priority[state] > priority[current])
      states.set(sourceItemId, state);
  }
  let changed = false;
  const items = project.items.map((item) => {
    const state = states.get(item.id);
    if (!state) return item;
    const generationStatus =
      state === "error"
        ? ("error" as const)
        : state === "pending"
          ? ("pending" as const)
          : undefined;
    if (item.generationStatus === generationStatus) return item;
    changed = true;
    return { ...item, generationStatus };
  });
  return changed ? items : project.items;
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
          task.status === "running" ||
          task.submissionState === "submitted" ||
          task.submissionState === "unknown";
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
