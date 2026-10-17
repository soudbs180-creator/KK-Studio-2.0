import {
  retryableOutputIndices,
  type CreationTask,
} from "@kk-studio/creation-contracts";
import { invariant } from "./schemaPrimitives.ts";
const RETRY_INPUT_FIELDS: readonly (keyof CreationTask)[] = [
  "kind",
  "prompt",
  "model",
  "attachments",
  "privacyMode",
  "providerConnectionId",
  "providerCredentialRef",
  "providerBaseUrl",
  "providerName",
  "imageSize",
  "imageEdit",
  "imageEditContext",
  "sourceItemId",
];

/** Task progress changes state and receipts; captured request identity never changes. */
export function validateTaskUpdate(
  previous: CreationTask,
  next: CreationTask,
): void {
  invariant(
    previous.idempotencyKey === next.idempotencyKey,
    "Task submission identity changed",
  );
  if (
    previous.status === "unknown" ||
    ["submitted", "unknown"].includes(previous.submissionState ?? "")
  )
    invariant(
      next.submissionState === "submitted" ||
        next.submissionState === "unknown" ||
        next.submissionState === "terminal",
      "Uncertain submission cannot become a fresh intent or drop its state",
    );
  const captured: readonly (keyof CreationTask)[] = [
    "id",
    "prompt",
    "model",
    "kind",
    "createdAt",
    "attachments",
    "privacyMode",
    "requestedOutputs",
    "providerConnectionId",
    "providerCredentialRef",
    "providerBaseUrl",
    "providerName",
    "imageSize",
    "imageEdit",
    "imageEditContext",
    "sourceItemId",
    "retryOfTaskId",
    "retryOutputIndices",
  ];
  invariant(
    captured.every(
      (key) => JSON.stringify(previous[key]) === JSON.stringify(next[key]),
    ),
    "Captured task input changed",
  );
  for (const output of previous.outputs ?? [])
    if (output.status === "succeeded")
      invariant(
        JSON.stringify(next.outputs?.find((o) => o.index === output.index)) ===
          JSON.stringify(output),
        "Successful output cannot be replaced",
      );
  for (const key of ["actualCostReceipt", "estimatedCostQuote"] as const)
    if (previous[key])
      invariant(
        JSON.stringify(previous[key]) === JSON.stringify(next[key]),
        "Existing provider receipt cannot be replaced",
      );
}
/** Retry indices identify slots in the parent, rather than slots in the child vector. */
export function validateRetryLink(
  task: CreationTask,
  tasks: CreationTask[],
  requireSafe = false,
): void {
  if (task.retryOfTaskId === undefined && task.retryOutputIndices === undefined)
    return;
  const parent = tasks.find((t) => t.id === task.retryOfTaskId),
    indices = task.retryOutputIndices;
  invariant(
    parent && parent.id !== task.id && parent.kind === task.kind,
    "Retry parent missing or mismatched",
  );
  invariant(
    RETRY_INPUT_FIELDS.every(
      (key) => JSON.stringify(parent[key]) === JSON.stringify(task[key]),
    ),
    "Captured retry input changed; create a new task for different inputs",
  );
  invariant(
    indices &&
      indices.length === task.requestedOutputs &&
      indices.every((index) => index < parent.requestedOutputs),
    "Retry output indices exceed parent slots",
  );
  if (requireSafe) {
    const safe = retryableOutputIndices(parent, parent.outputs ?? []);
    invariant(
      indices.every((index) => safe.includes(index)),
      "Retry may only reference safe failed or cancelled parent slots",
    );
  }
}
