import type { CreationTask } from "../creation/model.ts";
/** Explicit regeneration creates a candidate, never repairs or replaces a delivered slot. */
export function imageRegeneration(
  task: CreationTask,
  now = Date.now(),
): CreationTask {
  const id = crypto.randomUUID();
  return {
    ...structuredClone(task),
    id: `image-regenerate-${id}`,
    status: "queued",
    submissionState: "intent",
    submittedAt: undefined,
    resultItemId: undefined,
    error: undefined,
    requestedOutputs: 1,
    completedOutputs: 0,
    outputs: [
      {
        index: 0,
        status: "waiting",
        model: task.model,
        provider: task.providerName,
        createdAt: now,
      },
    ],
    idempotencyKey: `regenerate-${id}`,
    batchId: `regenerate-${id}`,
    retryOfTaskId: undefined,
    retryOutputIndices: undefined,
    approvedGates: [],
    attempt: task.attempt + 1,
    createdAt: now,
    updatedAt: now,
  };
}
