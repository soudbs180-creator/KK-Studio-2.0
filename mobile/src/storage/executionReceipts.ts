import type { CreationTask } from "@kk-studio/creation-contracts";
import type {
  MobileSnapshot,
  MobileProject,
  MobileExecutionReceipt,
  MobileAsset,
} from "../core/mobileModel.ts";
import {
  array,
  id,
  invariant,
  keys,
  object,
  LIMITS,
  type StorageValidationPolicy,
} from "./schemaPrimitives.ts";
import {
  comfyOrigin,
  validateComfyCapture,
  validateComfyTaskBinding,
  validateComfyCaptureUpdate,
} from "./comfyCapture.ts";

function validateReceipt(
  value: unknown,
  policy: StorageValidationPolicy = {},
): asserts value is MobileExecutionReceipt {
  object(value);
  keys(value, [
    "taskId",
    "connectionId",
    "protocol",
    "gatewayJobId",
    "providerRequestId",
    "readOnly",
    "originalTaskId",
    "comfy",
  ]);
  id(value.taskId);
  id(value.connectionId);
  invariant(
    value.protocol === "openai-compatible" ||
      value.protocol === "kk-image-jobs" ||
      value.protocol === "comfyui",
    "Corrupt execution protocol",
  );
  for (const key of ["gatewayJobId", "providerRequestId", "originalTaskId"])
    if (value[key] !== undefined) id(value[key]);
  invariant(
    value.readOnly === undefined || typeof value.readOnly === "boolean",
    "Corrupt receipt access",
  );
  invariant(
    !value.readOnly || typeof value.originalTaskId === "string",
    "Restored receipt origin required",
  );
  invariant(
    value.gatewayJobId === undefined || value.protocol === "kk-image-jobs",
    "Gateway receipt protocol mismatch",
  );
  if (value.protocol === "comfyui") validateComfyCapture(value.comfy, policy);
  else
    invariant(
      value.comfy === undefined,
      "Comfy capture requires Comfy protocol",
    );
}
export function validateExecutionReceipts(
  value: unknown,
  tasks: CreationTask[],
  restoredFrom?: MobileProject["restoredFrom"],
  projectId?: string,
  policy: StorageValidationPolicy = {},
  assets?: ReadonlyMap<string, MobileAsset>,
): void {
  if (value === undefined) return;
  array(value, LIMITS.tasks);
  const ids = new Set<string>();
  for (const receipt of value) {
    validateReceipt(receipt, policy);
    invariant(!ids.has(receipt.taskId), "Duplicate execution receipt");
    ids.add(receipt.taskId);
    const task = tasks.find((t) => t.id === receipt.taskId);
    invariant(task, "Execution receipt task missing");
    const origin = restoredFrom?.tasks[receipt.taskId];
    if (receipt.readOnly)
      invariant(
        origin?.taskId === receipt.originalTaskId,
        "Restored receipt origin mismatch",
      );
    else {
      invariant(!origin, "Restored execution receipt must be read-only");
      invariant(
        task.providerConnectionId === receipt.connectionId,
        "Execution receipt captured connection mismatch",
      );
    }
    if (receipt.protocol === "comfyui") {
      invariant(projectId, "Comfy project identity required");
      validateComfyTaskBinding(
        receipt,
        task,
        projectId,
        restoredFrom,
        policy,
        assets,
      );
    }
  }
}
export function applyExecutionReceipt(
  snapshot: MobileSnapshot,
  project: MobileProject,
  receipt: MobileExecutionReceipt,
  policy: StorageValidationPolicy = {},
): void {
  validateReceipt(receipt, policy);
  const task = project.tasks.find((t) => t.id === receipt.taskId);
  invariant(task, "Execution receipt task missing");
  invariant(
    !project.restoredFrom?.tasks[receipt.taskId] &&
      !receipt.readOnly &&
      !receipt.originalTaskId,
    "Restored execution receipt is read-only",
  );
  invariant(
    task.providerConnectionId === receipt.connectionId,
    "Execution receipt captured connection mismatch",
  );
  invariant(
    ["submitted", "unknown", "terminal"].includes(task.submissionState ?? "") ||
      (receipt.protocol === "comfyui" &&
        task.submissionState === "intent" &&
        task.status === "queued"),
    "Execution receipt requires durable submitted task",
  );
  const previous = project.executionReceipts?.find(
    (r) => r.taskId === receipt.taskId,
  );
  const capturedComfy =
    receipt.protocol === "comfyui" &&
    previous?.protocol === "comfyui" &&
    previous.comfy;
  const connection = snapshot.connections.find(
    (c) => c.id === receipt.connectionId,
  );
  if (!capturedComfy) {
    invariant(connection, "Execution receipt connection missing");
    invariant(
      connection.protocol === undefined ||
        connection.protocol === receipt.protocol,
      "Execution receipt captured protocol mismatch",
    );
  }
  if (receipt.protocol === "comfyui") {
    validateComfyTaskBinding(
      receipt,
      task,
      project.id,
      project.restoredFrom,
      policy,
      new Map(snapshot.assets.map((asset) => [asset.id, asset])),
    );
    if (capturedComfy) {
      invariant(
        capturedComfy.outputs !== undefined ||
          receipt.comfy!.outputs === undefined ||
          task.completedOutputs === 0,
        "Cannot infer Comfy output slots after legacy originals were archived",
      );
      validateComfyCaptureUpdate(capturedComfy, receipt.comfy!);
    } else {
      invariant(
        connection?.protocol === "comfyui" &&
          comfyOrigin(connection.baseUrl, policy) ===
            receipt.comfy!.identity.baseUrl,
        "Comfy captured connection route mismatch",
      );
      invariant(
        task.submissionState === "intent" &&
          task.status === "queued" &&
          !receipt.comfy!.promptIdConfirmed,
        "Comfy requires durable intent capture before submission",
      );
    }
  }
  if (previous) {
    for (const key of [
      "connectionId",
      "protocol",
      "gatewayJobId",
      "providerRequestId",
    ] as const)
      if (previous[key] !== undefined)
        invariant(
          previous[key] === receipt[key],
          "Captured execution receipt identity cannot change",
        );
  }
  project.executionReceipts = [
    ...(project.executionReceipts ?? []).filter(
      (r) => r.taskId !== receipt.taskId,
    ),
    JSON.parse(JSON.stringify(receipt)) as MobileExecutionReceipt,
  ];
}
