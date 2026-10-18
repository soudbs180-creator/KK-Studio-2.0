import { nonempty, record, ServiceError } from "./httpClient.ts";
import type {
  ComfyIdentity,
  ComfySubmissionReceipt,
  ComfyImageOutput,
  ComfyPollReceipt,
} from "./comfyTypes.ts";
export const COMFY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function parseComfyAcceptance(
  value: unknown,
  identity: ComfyIdentity,
): ComfySubmissionReceipt {
  if (
    !record(value) ||
    typeof value.prompt_id !== "string" ||
    !COMFY_UUID.test(value.prompt_id) ||
    !record(value.node_errors) ||
    Object.keys(value.node_errors).length ||
    typeof value.number !== "number" ||
    !Number.isFinite(value.number)
  )
    throw new ServiceError("INVALID_COMFY_ACCEPTANCE");
  return Object.freeze({
    identity,
    promptId: value.prompt_id,
    promptIdConfirmed: true,
    queueNumber: value.number,
    submissionState: "submitted" as const,
  });
}
export function validComfyOutput(output: ComfyImageOutput) {
  const segment = (value: string) =>
    value.length > 0 &&
    value.length <= 255 &&
    value !== "." &&
    value !== ".." &&
    !/[\x00-\x1f\\/:?%#]/.test(value);
  if (
    !COMFY_UUID.test(output.promptId) ||
    !nonempty(output.connectionId) ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(output.nodeId) ||
    !Number.isInteger(output.index) ||
    output.index < 0 ||
    output.index >= 100 ||
    typeof output.filename !== "string" ||
    !segment(output.filename) ||
    typeof output.subfolder !== "string" ||
    output.subfolder.length > 1024 ||
    (output.subfolder && !output.subfolder.split("/").every(segment)) ||
    !["output", "temp"].includes(output.type)
  )
    throw new ServiceError("INVALID_COMFY_OUTPUT_DESCRIPTOR");
}
export function parseComfyHistory(
  value: unknown,
  receipt: ComfySubmissionReceipt,
): ComfyPollReceipt | null {
  if (!record(value)) throw new ServiceError("INVALID_COMFY_HISTORY");
  if (!(receipt.promptId in value)) return null;
  const entry = value[receipt.promptId];
  if (
    !record(entry) ||
    !record(entry.status) ||
    typeof entry.status.completed !== "boolean" ||
    !["success", "error"].includes(String(entry.status.status_str)) ||
    !Array.isArray(entry.status.messages) ||
    entry.status.messages.length > 1000 ||
    !record(entry.outputs)
  )
    throw new ServiceError("INVALID_COMFY_HISTORY");
  const outputs: ComfyImageOutput[] = [];
  if (Object.keys(entry.outputs).length > 200)
    throw new ServiceError("INVALID_COMFY_HISTORY");
  for (const [nodeId, node] of Object.entries(entry.outputs)) {
    if (!record(node)) throw new ServiceError("INVALID_COMFY_HISTORY");
    if (node.images === undefined) continue;
    if (!Array.isArray(node.images))
      throw new ServiceError("INVALID_COMFY_HISTORY");
    for (const image of node.images) {
      if (
        !record(image) ||
        typeof image.filename !== "string" ||
        typeof image.subfolder !== "string" ||
        (image.type !== "output" && image.type !== "temp")
      )
        throw new ServiceError("INVALID_COMFY_OUTPUT_DESCRIPTOR");
      const output: ComfyImageOutput = {
        index: outputs.length,
        nodeId,
        promptId: receipt.promptId,
        connectionId: receipt.identity.connectionId,
        filename: image.filename,
        subfolder: image.subfolder,
        type: image.type,
      };
      validComfyOutput(output);
      outputs.push(output);
    }
  }
  let interrupted = false;
  for (const message of entry.status.messages) {
    if (
      !Array.isArray(message) ||
      message.length !== 2 ||
      typeof message[0] !== "string" ||
      !record(message[1])
    )
      throw new ServiceError("INVALID_COMFY_HISTORY_EVENT");
    if (
      message[1].prompt_id !== undefined &&
      message[1].prompt_id !== receipt.promptId
    )
      throw new ServiceError("COMFY_HISTORY_ID_CHANGED");
    if (
      message[0] === "execution_interrupted" &&
      message[1].prompt_id === receipt.promptId
    )
      interrupted = true;
  }
  const status =
    !entry.status.completed && entry.status.status_str !== "error"
      ? "running"
      : entry.status.status_str === "error"
        ? interrupted
          ? "cancelled"
          : outputs.length
            ? "partial"
            : "failed"
        : outputs.length
          ? "succeeded"
          : "failed";
  return {
    receipt,
    status,
    outputs,
    ...(status === "failed" || status === "partial"
      ? {
          errorCode: outputs.length
            ? "COMFY_EXECUTION_PARTIAL"
            : entry.status.status_str === "success"
              ? "COMFY_IMAGE_OUTPUT_MISSING"
              : "COMFY_EXECUTION_FAILED",
        }
      : {}),
  };
}
export function parseComfyQueue(
  value: unknown,
  receipt: ComfySubmissionReceipt,
): ComfyPollReceipt {
  if (
    !record(value) ||
    !Array.isArray(value.queue_running) ||
    !Array.isArray(value.queue_pending) ||
    value.queue_running.length + value.queue_pending.length > 10_000
  )
    throw new ServiceError("INVALID_COMFY_QUEUE");
  const contains = (items: unknown[]) => {
    for (const item of items)
      if (
        !Array.isArray(item) ||
        item.length < 2 ||
        typeof item[1] !== "string"
      )
        throw new ServiceError("INVALID_COMFY_QUEUE");
    return items.some(
      (item) => Array.isArray(item) && item[1] === receipt.promptId,
    );
  };
  const running = contains(value.queue_running);
  const pending = contains(value.queue_pending);
  return {
    receipt,
    status: running ? "running" : pending ? "queued" : "unknown",
    outputs: [],
  };
}
