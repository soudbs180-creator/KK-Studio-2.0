import type { CreationTask } from "@kk-studio/creation-contracts";
import type { MobileComfyCapture } from "../core/comfyModel.ts";
import type {
  MobileExecutionReceipt,
  MobileProject,
  MobileAsset,
} from "../core/mobileModel.ts";
import {
  invariant,
  keys,
  object,
  id,
  integer,
  validateUrl,
  type StorageValidationPolicy,
} from "./schemaPrimitives.ts";
import { validateStoredComfyWorkflow } from "./comfyWorkflowSchema.ts";
import { sameComfyJson } from "../core/comfyIdentity.ts";
import {
  validateComfyOutputs,
  validateComfyOutputUpdate,
  validateComfyArchivedOutputs,
} from "./comfyOutputIdentity.ts";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function comfyOrigin(
  value: unknown,
  policy: StorageValidationPolicy = {},
): string {
  validateUrl(value, policy);
  const url = new URL(value as string);
  invariant(url.pathname === "/", "Comfy captured route must be an origin");
  return url.origin;
}
export function validateComfyCapture(
  value: unknown,
  policy: StorageValidationPolicy = {},
): asserts value is MobileComfyCapture {
  object(value);
  keys(value, [
    "identity",
    "requestedOutputs",
    "promptId",
    "promptIdConfirmed",
    "queueNumber",
    "outputs",
  ]);
  object(value.identity);
  const identity = value.identity;
  keys(identity, [
    "submissionId",
    "projectId",
    "connectionId",
    "baseUrl",
    "workflowRevision",
    "workflow",
    "capturedAt",
  ]);
  id(identity.submissionId);
  invariant(uuid.test(identity.submissionId), "Comfy submission UUID required");
  id(identity.projectId);
  id(identity.connectionId);
  invariant(
    comfyOrigin(identity.baseUrl, policy) === identity.baseUrl,
    "Comfy captured origin must be canonical",
  );
  integer(identity.workflowRevision);
  integer(identity.capturedAt);
  validateStoredComfyWorkflow(identity.workflow);
  integer(value.requestedOutputs);
  invariant(
    value.requestedOutputs >= 1 && value.requestedOutputs <= 32,
    "Corrupt Comfy output count",
  );
  id(value.promptId);
  invariant(uuid.test(value.promptId), "Comfy prompt UUID required");
  invariant(
    typeof value.promptIdConfirmed === "boolean",
    "Comfy prompt confirmation required",
  );
  if (value.queueNumber !== undefined) integer(value.queueNumber);
  validateComfyOutputs(value as unknown as MobileComfyCapture);
  invariant(
    value.promptIdConfirmed ||
      (value.promptId === identity.submissionId &&
        value.queueNumber === undefined),
    "Unconfirmed Comfy prompt must retain requested hint",
  );
}
export function validateComfyTaskBinding(
  receipt: MobileExecutionReceipt,
  task: CreationTask,
  projectId: string,
  restoredFrom?: MobileProject["restoredFrom"],
  policy: StorageValidationPolicy = {},
  assets?: ReadonlyMap<string, MobileAsset>,
): void {
  validateComfyCapture(receipt.comfy, policy);
  const capture = receipt.comfy,
    identity = capture.identity,
    origin = restoredFrom?.tasks[task.id];
  invariant(
    ["intent", "submitted", "unknown", "terminal"].includes(
      task.submissionState ?? "",
    ),
    "Comfy durable task submission state required",
  );
  invariant(
    identity.connectionId === receipt.connectionId &&
      capture.requestedOutputs === task.requestedOutputs,
    "Comfy captured connection/output identity mismatch",
  );
  invariant(
    comfyOrigin(task.providerBaseUrl, policy) === identity.baseUrl,
    "Comfy captured task route mismatch",
  );
  if (receipt.readOnly) {
    invariant(
      origin &&
        receipt.originalTaskId === origin.taskId &&
        identity.submissionId === origin.taskId &&
        identity.submissionId === origin.idempotencyKey &&
        identity.projectId ===
          (restoredFrom?.originalProjectId ?? restoredFrom?.projectId),
      "Comfy historical origin mismatch",
    );
    invariant(
      task.providerConnectionId === undefined &&
        task.providerCredentialRef === undefined,
      "Comfy restored connection cannot become executable",
    );
  } else {
    invariant(
      !origin &&
        !receipt.originalTaskId &&
        identity.projectId === projectId &&
        identity.submissionId === task.id &&
        identity.submissionId === task.idempotencyKey &&
        identity.connectionId === task.providerConnectionId,
      "Comfy captured task identity mismatch",
    );
  }
  invariant(
    receipt.gatewayJobId === undefined,
    "Comfy receipt cannot contain gateway identity",
  );
  invariant(
    receipt.providerRequestId === undefined ||
      (capture.promptIdConfirmed &&
        receipt.providerRequestId === capture.promptId),
    "Comfy provider prompt identity mismatch",
  );
  if (task.submissionState === "intent")
    invariant(
      ["queued", "interrupted"].includes(task.status) &&
        !capture.promptIdConfirmed &&
        capture.queueNumber === undefined &&
        receipt.providerRequestId === undefined,
      "Comfy intent cannot claim accepted prompt identity",
    );
  validateComfyArchivedOutputs(capture, task, assets);
}
export function validateComfyCaptureUpdate(
  previous: MobileComfyCapture,
  next: MobileComfyCapture,
): void {
  invariant(
    sameComfyJson(previous.identity, next.identity) &&
      previous.requestedOutputs === next.requestedOutputs,
    "Captured Comfy workflow identity cannot change",
  );
  validateComfyOutputUpdate(previous, next);
  if (previous.promptIdConfirmed)
    invariant(
      next.promptIdConfirmed &&
        previous.promptId === next.promptId &&
        previous.queueNumber === next.queueNumber,
      "Confirmed Comfy prompt identity cannot change",
    );
  else if (!next.promptIdConfirmed)
    invariant(
      previous.promptId === next.promptId && next.queueNumber === undefined,
      "Comfy requested prompt hint cannot change",
    );
}
