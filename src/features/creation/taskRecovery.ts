import type {
  CreationProject,
  CreationSnapshot,
  CreationTask,
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
export function canRetryTask(task: CreationTask): boolean {
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
  return {
    ...snapshot,
    revision: interruptedAny ? snapshot.revision + 1 : snapshot.revision,
    projects,
  };
}
