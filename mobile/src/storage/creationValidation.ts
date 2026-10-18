import {
  unifiedTaskStatuses,
  CANVAS_REFERENCE_SLOTS,
  normalizeTaskCostReceipt,
  type CreationDraft,
  type CreationTask,
} from "@kk-studio/creation-contracts";
import {
  LIMITS,
  invariant,
  object,
  id,
  text,
  integer,
  array,
  keys,
  assertNoSecrets,
  validateUrl,
} from "./schemaPrimitives.ts";
import type { StorageValidationPolicy } from "./schemaPrimitives.ts";
import { MAX_MOBILE_TEXT_RESULT_CHARS } from "../core/resultLimits.ts";
import {
  validateImageEditContext,
  validateImageEditSnapshot,
} from "./imageEditValidation.ts";
const statuses = new Set<string>(unifiedTaskStatuses);
const outputStatuses = new Set([
  "waiting",
  "running",
  "unknown",
  "succeeded",
  "failed",
  "cancelled",
]);
export function validateDraft(value: unknown): asserts value is CreationDraft {
  object(value);
  assertNoSecrets(value);
  keys(value, [
    "prompt",
    "model",
    "kind",
    "attachments",
    "approvalMode",
    "privacyMode",
    "outputCount",
    "updatedAt",
    "providerConnectionId",
  ]);
  text(value.prompt);
  text(value.model, 200);
  invariant(
    ["text", "image", "video", "audio"].includes(String(value.kind)),
    "Corrupt draft kind",
  );
  invariant(
    value.approvalMode === "auto" || value.approvalMode === "ask",
    "Corrupt approval mode",
  );
  invariant(
    ["local_only", "byok_local", "platform_backed"].includes(
      String(value.privacyMode),
    ),
    "Corrupt privacy",
  );
  integer(value.outputCount);
  invariant(
    value.outputCount >= 1 && value.outputCount <= 32,
    "Corrupt output count",
  );
  integer(value.updatedAt);
  array(value.attachments, 32);
  if (value.providerConnectionId !== undefined) id(value.providerConnectionId);
  for (const a of value.attachments) {
    object(a);
    keys(a, ["id", "assetId", "name", "mime", "size", "role", "dataUrl"]);
    id(a.id);
    invariant(
      a.assetId !== undefined,
      "Persist an original asset before attaching it",
    );
    id(a.assetId);
    text(a.name, 500);
    text(a.mime, 100);
    integer(a.size);
    invariant(a.size <= LIMITS.originalBytes, "Attachment too large");
    invariant(
      a.role === undefined ||
        CANVAS_REFERENCE_SLOTS.some((role) => role === a.role),
      "Corrupt reference role",
    );
    invariant(
      a.dataUrl === undefined,
      "Persist an original asset before attaching it",
    );
  }
}
export function validateTask(
  value: unknown,
  receiptIdentity?: Pick<CreationTask, "id" | "idempotencyKey">,
  policy: StorageValidationPolicy = {},
): asserts value is CreationTask {
  object(value);
  assertNoSecrets(value);
  keys(value, [
    "imageEdit",
    "imageEditContext",
    "id",
    "sourceItemId",
    "prompt",
    "model",
    "kind",
    "status",
    "submissionState",
    "submittedAt",
    "error",
    "resultItemId",
    "createdAt",
    "updatedAt",
    "attachments",
    "attempt",
    "requestedOutputs",
    "completedOutputs",
    "completedOutputIndices",
    "idempotencyKey",
    "batchId",
    "privacyMode",
    "providerConnectionId",
    "providerCredentialRef",
    "providerBaseUrl",
    "providerName",
    "imageSize",
    "outputs",
    "estimatedCostUsd",
    "actualCostUsd",
    "estimatedCostQuote",
    "actualCostReceipt",
    "approvedGates",
    "retryOfTaskId",
    "retryOutputIndices",
  ]);
  id(value.id);
  id(value.idempotencyKey);
  text(value.prompt);
  text(value.model, 200);
  invariant(statuses.has(String(value.status)), "Corrupt task status");
  invariant(
    ["text", "image", "video", "audio"].includes(String(value.kind)),
    "Corrupt task kind",
  );
  invariant(
    value.submissionState === undefined ||
      ["intent", "submitted", "unknown", "terminal"].includes(
        String(value.submissionState),
      ),
    "Corrupt submission state",
  );
  for (const k of [
    "createdAt",
    "updatedAt",
    "attempt",
    "requestedOutputs",
    "completedOutputs",
  ])
    integer(value[k]);
  invariant(
    value.status !== "succeeded" ||
      value.completedOutputs === value.requestedOutputs,
    "Successful task count must match archived outputs",
  );
  if (value.imageEdit !== undefined) validateImageEditSnapshot(value.imageEdit);
  if (value.imageEditContext !== undefined)
    validateImageEditContext(value.imageEditContext);
  if (value.approvedGates !== undefined) {
    array(value.approvedGates, 5);
    for (const gate of value.approvedGates)
      invariant(
        [
          "high_cost_batch",
          "remote_transfer",
          "overwrite_original",
          "external_share",
          "account_or_billing_change",
        ].includes(String(gate)),
        "Corrupt approval gate",
      );
  }
  invariant(
    Number(value.requestedOutputs) >= 1 &&
      Number(value.requestedOutputs) <= 32 &&
      Number(value.completedOutputs) <= Number(value.requestedOutputs),
    "Corrupt output count",
  );
  validateDraft({
    prompt: value.prompt,
    model: value.model,
    kind: value.kind,
    privacyMode: value.privacyMode,
    attachments: value.attachments,
    approvalMode: "ask",
    outputCount: value.requestedOutputs,
    updatedAt: value.updatedAt,
  });
  if (value.providerBaseUrl !== undefined)
    validateUrl(value.providerBaseUrl, policy);
  for (const key of [
    "sourceItemId",
    "resultItemId",
    "batchId",
    "providerConnectionId",
    "providerCredentialRef",
    "retryOfTaskId",
  ])
    if (value[key] !== undefined) id(value[key]);
  for (const key of ["error", "providerName", "imageSize"])
    if (value[key] !== undefined) text(value[key], 2000);
  if (value.submittedAt !== undefined) integer(value.submittedAt);
  for (const key of ["completedOutputIndices", "retryOutputIndices"])
    if (value[key] !== undefined) {
      array(value[key], 32);
      const slots = new Set();
      for (const index of value[key]) {
        integer(index);
        invariant(
          index <
            (key === "retryOutputIndices"
              ? 32
              : Number(value.requestedOutputs)) && !slots.has(index),
          "Corrupt task output indices",
        );
        slots.add(index);
      }
    }
  for (const key of ["actualCostUsd", "estimatedCostUsd"])
    if (value[key] !== undefined)
      invariant(
        typeof value[key] === "number" &&
          Number.isFinite(value[key]) &&
          Number(value[key]) >= 0,
        "Corrupt cost",
      );
  for (const key of ["actualCostReceipt", "estimatedCostQuote"])
    if (value[key] !== undefined)
      invariant(
        normalizeTaskCostReceipt(
          value[key],
          receiptIdentity ?? {
            id: value.id,
            idempotencyKey: value.idempotencyKey,
          },
          key === "actualCostReceipt" ? "actual" : "estimate",
        ),
        "Corrupt cost receipt",
      );
  invariant(
    value.outputs !== undefined,
    "Mobile task requires an explicit archived output vector",
  );
  if (value.outputs !== undefined) {
    array(value.outputs, 32);
    invariant(
      value.outputs.length === value.requestedOutputs,
      "Mobile output vector count mismatch",
    );
    const indices = new Set();
    for (const o of value.outputs) {
      object(o);
      keys(o, [
        "index",
        "status",
        "assetId",
        "text",
        "model",
        "provider",
        "promptHash",
        "error",
        "createdAt",
      ]);
      integer(o.index);
      invariant(
        Number(o.index) < Number(value.requestedOutputs) &&
          !indices.has(o.index),
        "Corrupt output index",
      );
      indices.add(o.index);
      invariant(outputStatuses.has(String(o.status)), "Corrupt output status");
      text(o.model, 200);
      integer(o.createdAt);
      if (o.assetId !== undefined) id(o.assetId);
      if (o.text !== undefined) text(o.text, MAX_MOBILE_TEXT_RESULT_CHARS);
      for (const field of ["provider", "promptHash"])
        if (o[field] !== undefined) text(o[field], 200);
      if (o.error !== undefined) text(o.error, 2000);
      invariant(
        o.status !== "succeeded" ||
          value.kind !== "text" ||
          (typeof o.text === "string" && o.text.trim().length > 0),
        "Successful text output requires nonempty archived text",
      );
      invariant(
        o.status !== "succeeded" ||
          o.assetId !== undefined ||
          (value.kind === "text" && typeof o.text === "string"),
        "Successful output requires archived content",
      );
    }
    invariant(
      value.outputs.filter((o) => {
        object(o);
        return o.status === "succeeded";
      }).length === value.completedOutputs,
      "Completed output count differs from archived slots",
    );
  }
}
