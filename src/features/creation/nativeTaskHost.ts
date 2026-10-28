import { invoke } from "@tauri-apps/api/core";
import {
  reconcileProjectCanvas,
  type ProjectCanvas,
} from "../../domain/projectCanvas.ts";
import type {
  ProviderAuthMode,
  ProviderProtocol,
} from "../../domain/providerProtocol.ts";
import { imageResultContext } from "../image-edit/context.ts";
import { createImageEditRuntime } from "../image-edit/editTasks.ts";
import { ImageEditMappingError } from "../image-edit/imageProcessing.ts";
import { editReceiptReason } from "../image-edit/recovery.ts";
import { loadStoredAsset, storeGeneratedAsset } from "./assetRepository.ts";
import { sameJson } from "./chatMigration.ts";
import type {
  CreationProject,
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";
import { readNativeAsset, usesNativeAssets } from "./nativeAssetAdapter.ts";
import { assertSynchronousProviderSubmission } from "./providerSubmission.ts";
import { reconcileRetryTaskParents } from "./taskRecovery.ts";
import { textTaskResult } from "./textTaskResult.ts";

/** The request crossing the Desktop TaskHost IPC boundary. It contains no API key. */
export interface NativeTaskHostRequest {
  imageEditRequired?: boolean;
  maskAssetId?: string;
  kind?: "image" | "text";
  concurrencyLimit?: number;
  taskId: string;
  idempotencyKey: string;
  baseUrl: string;
  credentialRef: string;
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
  model: string;
  prompt: string;
  outputIndices: number[];
  attachments: Array<{ assetId: string; name: string }>;
  providerName?: string;
  promptHash?: string;
  /** Resolved provider size label such as "1024x1024"; omitted means provider default. */
  size?: string;
}

export type NativeTaskStatus = "submitted" | "succeeded" | "failed" | "unknown";

export type NativeTaskOutputStatus =
  "pending" | "succeeded" | "unknown" | "failed";

export interface NativeTaskHostOutput {
  index: number;
  status: NativeTaskOutputStatus;
  assetId?: string;
  text?: string;
  error?: string;
}

export interface NativeTaskHostRecord {
  imageEditRequired?: boolean;
  taskId: string;
  idempotencyKey: string;
  status: NativeTaskStatus;
  outputIndices: number[];
  outputs: NativeTaskHostOutput[];
  failure?: string;
  updatedAt: number;
}

// A local fallback clock is not evidence of a newer native receipt.
const recordsWithNativeTimestamp = new WeakSet<NativeTaskHostRecord>();

const DESKTOP_UNAVAILABLE =
  "Desktop TaskHost 尚未接入或不可用（Prototype），本次未发送浏览器 Provider 请求。";
const INVALID_RECEIPT =
  "Desktop TaskHost 输出回执缺失、冲突或超出原任务范围，请先核对供应商；不会自动重复提交。";

export function usesNativeTaskHost(): boolean {
  return usesNativeAssets();
}

export function nativeTaskHostUnavailableError(): Error {
  return new Error(DESKTOP_UNAVAILABLE);
}

function requireNativeTaskHost(): void {
  if (!usesNativeTaskHost()) throw nativeTaskHostUnavailableError();
}

function extractRawOutputs(value: Record<string, unknown>): unknown[] {
  if (Array.isArray(value.outputs)) return value.outputs;
  if (value.outputs === undefined && Array.isArray(value.assetIds)) {
    const indices = Array.isArray(value.outputIndices)
      ? value.outputIndices
      : undefined;
    return value.assetIds.map((assetId, index) => ({
      index: indices ? (indices[index] ?? index) : index,
      status: "succeeded" as const,
      assetId: typeof assetId === "string" ? assetId : undefined,
      error: undefined,
    }));
  }
  return [];
}

function isValidRawOutput(output: unknown): output is Record<string, unknown> {
  if (output == null || typeof output !== "object") return false;
  const candidate = output as Record<string, unknown>;
  return (
    Number.isSafeInteger(candidate.index) &&
    (candidate.index as number) >= 0 &&
    ["pending", "submitted", "succeeded", "unknown", "failed"].includes(
      candidate.status as string,
    )
  );
}

function isInvalidOutputIndices(outputIndices: unknown): boolean {
  if (outputIndices === undefined) return false;
  if (!Array.isArray(outputIndices)) return true;
  return outputIndices.some(
    (index) => !Number.isSafeInteger(index) || index < 0,
  );
}

function isRecordMalformed(
  value: Record<string, unknown>,
  rawOutputsCount: number,
  validOutputsCount: number,
): boolean {
  // Do not discard malformed entries and then accept the remaining receipt.
  return (
    (value.imageEditRequired !== undefined &&
      typeof value.imageEditRequired !== "boolean") ||
    (value.outputs !== undefined && !Array.isArray(value.outputs)) ||
    validOutputsCount !== rawOutputsCount ||
    isInvalidOutputIndices(value.outputIndices) ||
    !["submitted", "succeeded", "unknown", "failed"].includes(
      value.status as string,
    )
  );
}

function normalizeNativeOutput(
  output: Record<string, unknown>,
): NativeTaskHostOutput {
  return {
    index: output.index as number,
    status:
      output.status === "succeeded" ||
      output.status === "unknown" ||
      output.status === "failed"
        ? output.status
        : ("pending" as const),
    assetId: typeof output.assetId === "string" ? output.assetId : undefined,
    text:
      "text" in output &&
      typeof output.text === "string" &&
      new TextEncoder().encode(output.text).length <= 32768
        ? output.text
        : undefined,
    error: typeof output.error === "string" ? output.error : undefined,
  };
}

function extractRecordFailure(
  failure: unknown,
  malformed: boolean,
): string | undefined {
  if (malformed) return INVALID_RECEIPT;
  if (typeof failure === "string") return failure;
  if (
    failure &&
    typeof failure === "object" &&
    typeof (failure as { message?: unknown }).message === "string"
  ) {
    return (failure as { message: string }).message;
  }
  return undefined;
}

function normalizeRecordStatus(
  status: unknown,
  malformed: boolean,
): NativeTaskStatus {
  if (malformed) return "unknown";
  if (status === "succeeded" || status === "failed" || status === "unknown") {
    return status;
  }
  return "submitted";
}

function normalizeRecord(input: unknown): NativeTaskHostRecord {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const rawOutputs = extractRawOutputs(value);
  const validOutputs = rawOutputs.filter(isValidRawOutput);
  const malformed = isRecordMalformed(
    value,
    rawOutputs.length,
    validOutputs.length,
  );
  const outputs = validOutputs.map(normalizeNativeOutput);
  const nativeUpdatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : undefined;
  const record: NativeTaskHostRecord = {
    imageEditRequired:
      typeof value.imageEditRequired === "boolean"
        ? value.imageEditRequired
        : undefined,
    taskId: typeof value.taskId === "string" ? value.taskId : "",
    idempotencyKey:
      typeof value.idempotencyKey === "string" ? value.idempotencyKey : "",
    status: normalizeRecordStatus(value.status, malformed),
    outputIndices: Array.isArray(value.outputIndices)
      ? value.outputIndices.filter((index): index is number =>
          Number.isSafeInteger(index),
        )
      : outputs.map((output) => output.index),
    outputs: malformed ? [] : outputs,
    failure: extractRecordFailure(value.failure, malformed),
    updatedAt: nativeUpdatedAt ?? Date.now(),
  };
  if (nativeUpdatedAt !== undefined) recordsWithNativeTimestamp.add(record);
  return record;
}

/** Quarantine an inconsistent receipt before either live or recovered output is applied. */
export function validateNativeTaskRecord(
  record: NativeTaskHostRecord,
  task: Pick<CreationTask, "id" | "idempotencyKey" | "requestedOutputs"> &
    Partial<Pick<CreationTask, "imageEdit" | "imageEditContext" | "prompt">>,
  submittedOutputIndices?: readonly number[],
): NativeTaskHostRecord {
  const declared = new Set(record.outputIndices);
  const received = new Set(record.outputs.map((output) => output.index));
  const identityMismatch =
    record.taskId !== task.id || record.idempotencyKey !== task.idempotencyKey;
  const invalidOutputs =
    declared.size === 0 ||
    declared.size !== record.outputIndices.length ||
    received.size !== record.outputs.length ||
    declared.size !== received.size ||
    record.outputIndices.some(
      (index) =>
        !Number.isSafeInteger(index) ||
        index < 0 ||
        index >= task.requestedOutputs ||
        !received.has(index),
    ) ||
    (submittedOutputIndices !== undefined &&
      (submittedOutputIndices.length !== declared.size ||
        submittedOutputIndices.some((index) => !declared.has(index))));
  const editFailure = editReceiptReason(
    { ...task, prompt: task.prompt ?? "" },
    record.imageEditRequired,
  );
  if (!identityMismatch && !invalidOutputs && !editFailure) return record;
  const failure = identityMismatch
    ? "Desktop TaskHost 回执的任务身份不匹配，请先核对供应商；不会自动重复提交。"
    : (editFailure ?? INVALID_RECEIPT);
  const outputIndices = submittedOutputIndices
    ? [...submittedOutputIndices]
    : Array.from({ length: task.requestedOutputs }, (_, index) => index);
  return {
    imageEditRequired: record.imageEditRequired,
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    status: "unknown",
    outputIndices,
    outputs: outputIndices.map((index) => ({
      index,
      status: "unknown",
      error: failure,
    })),
    failure,
    updatedAt: record.updatedAt,
  };
}

export async function submitNativeTask(
  request: NativeTaskHostRequest,
): Promise<NativeTaskHostRecord> {
  requireNativeTaskHost();
  assertSynchronousProviderSubmission(request.baseUrl, request.model);
  const record = await invoke<NativeTaskHostRecord>("task_host_submit", {
    request,
  });
  return normalizeRecord(record);
}

export async function getNativeTask(
  taskId: string,
): Promise<NativeTaskHostRecord | null> {
  requireNativeTaskHost();
  let record: NativeTaskHostRecord | NativeTaskHostRecord[] | null;
  try {
    record = await invoke<NativeTaskHostRecord | null>("task_host_get", {
      taskId,
    });
  } catch {
    // Compatibility with the first Desktop host draft, which exposed a
    // single-task read command instead of task_host_get.
    record = await invoke<NativeTaskHostRecord | NativeTaskHostRecord[] | null>(
      "task_host_read",
      { taskId },
    );
  }
  const first = Array.isArray(record) ? record[0] : record;
  return first ? normalizeRecord(first) : null;
}

export async function listNativeTasks(): Promise<NativeTaskHostRecord[]> {
  requireNativeTaskHost();
  const records = await invoke<NativeTaskHostRecord[]>("task_host_list");
  return Array.isArray(records) ? records.map(normalizeRecord) : [];
}

export async function cancelNativeTask(
  taskId: string,
): Promise<NativeTaskHostRecord | null> {
  requireNativeTaskHost();
  const record = await invoke<NativeTaskHostRecord | null>("task_host_cancel", {
    taskId,
  });
  return record ? normalizeRecord(record) : null;
}

function outputStatus(
  status: NativeTaskHostOutput["status"],
): CreationTaskOutput["status"] {
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  if (status === "unknown") return "unknown";
  return "running";
}

function hasArchivedOutputEvidence(
  task: Pick<CreationTask, "kind">,
  output: Pick<CreationTaskOutput, "assetId" | "text" | "status">,
): boolean {
  if (output.status !== "succeeded") return false;
  if (task.kind !== "text") return Boolean(output.assetId);
  return Boolean(
    output.text?.trim() &&
    new TextEncoder().encode(output.text).length <= 32768,
  );
}

function taskMayHaveBeenSubmitted(task: CreationTask): boolean {
  return (
    task.submissionState === "submitted" ||
    task.submissionState === "unknown" ||
    task.status === "running" ||
    task.status === "unknown"
  );
}

async function fetchReconciliationRecords(
  snapshot: CreationSnapshot,
): Promise<NativeTaskHostRecord[]> {
  let records: NativeTaskHostRecord[];
  try {
    records = await listNativeTasks();
  } catch {
    records = [];
  }
  // The first Desktop host shipped `task_host_read` instead of an index list.
  // Probe submitted identities as a compatibility path; an absent record is
  // still handled conservatively below.
  const taskIds = snapshot.projects
    .flatMap((project) => project.tasks)
    .filter(taskMayHaveBeenSubmitted)
    .map((task) => task.id);
  if (!taskIds.length) return records;
  const probed = await Promise.all(
    taskIds.map(async (taskId) => {
      try {
        return await getNativeTask(taskId);
      } catch {
        return null;
      }
    }),
  );
  return [
    ...records,
    ...probed.filter(
      (record): record is NativeTaskHostRecord =>
        record != null &&
        !records.some((item) => item.taskId === record.taskId),
    ),
  ];
}

function markTaskWithMissingNativeRecord(task: CreationTask): {
  task: CreationTask;
  changed: boolean;
} {
  if (!taskMayHaveBeenSubmitted(task)) return { task, changed: false };
  if (
    task.status === "unknown" &&
    task.submissionState === "unknown" &&
    task.error?.includes("Desktop TaskHost")
  )
    return { task, changed: false };
  const outputs = task.outputs?.map((output) =>
    hasArchivedOutputEvidence(task, output)
      ? output
      : {
          ...output,
          status: "unknown" as const,
          error: "Desktop TaskHost 中没有找到原任务输出回执，请先核对供应商。",
        },
  );
  return {
    changed: true,
    task: {
      ...task,
      status: "unknown" as const,
      submissionState: "unknown" as const,
      error:
        "Desktop TaskHost 中没有找到原任务记录，请先核对供应商；不会自动重复提交。",
      outputs,
      completedOutputs:
        outputs?.filter((output) => output.status === "succeeded").length ??
        task.completedOutputs,
      updatedAt: Date.now(),
    },
  };
}

function reconcileAbsentNativeOutput(
  index: number,
  prior: CreationTaskOutput | undefined,
  task: CreationTask,
  native: NativeTaskHostRecord,
): CreationTaskOutput {
  if (prior && hasArchivedOutputEvidence(task, prior)) return prior;
  const status: CreationTaskOutput["status"] =
    native.status === "succeeded" || native.status === "unknown"
      ? "unknown"
      : native.status === "failed"
        ? "failed"
        : native.status === "submitted"
          ? "running"
          : (prior?.status ?? "waiting");
  const error =
    native.status === "succeeded"
      ? "原生任务完成但未返回该输出回执。"
      : native.status === "failed"
        ? (native.failure ?? "原生任务失败但未返回该输出回执。")
        : native.status === "unknown"
          ? (native.failure ?? "原生任务输出回执状态不明，请先核对供应商。")
          : prior?.error;
  return {
    ...(prior ?? {
      index,
      status: "waiting" as const,
      model: task.model,
      provider: task.providerName,
      createdAt: task.createdAt,
    }),
    status,
    error,
  };
}

type PresentOutputAnomalies = {
  missingImageAsset: boolean;
  missingText: boolean;
  terminalPendingOutput: boolean;
  uncertainPendingOutput: boolean;
  failedTerminalOutput: boolean;
};

function computePresentOutputAnomalies(
  task: CreationTask,
  native: NativeTaskHostRecord,
  nativeOutput: NativeTaskHostOutput,
  outputStatusValue: CreationTaskOutput["status"],
): PresentOutputAnomalies {
  return {
    missingImageAsset:
      task.kind !== "text" &&
      outputStatusValue === "succeeded" &&
      !nativeOutput.assetId,
    missingText:
      task.kind === "text" &&
      outputStatusValue === "succeeded" &&
      !nativeOutput.text?.trim(),
    terminalPendingOutput:
      native.status === "succeeded" && outputStatusValue === "running",
    uncertainPendingOutput:
      native.status === "unknown" && outputStatusValue === "running",
    failedTerminalOutput:
      native.status === "failed" && outputStatusValue === "running",
  };
}

function shouldKeepPriorArchivedOutput(
  prior: CreationTaskOutput | undefined,
  task: CreationTask,
  outputStatusValue: CreationTaskOutput["status"],
  anomalies: PresentOutputAnomalies,
): boolean {
  if (!prior || !hasArchivedOutputEvidence(task, prior)) return false;
  return (
    anomalies.missingImageAsset ||
    anomalies.missingText ||
    anomalies.terminalPendingOutput ||
    anomalies.uncertainPendingOutput ||
    anomalies.failedTerminalOutput ||
    outputStatusValue === "failed" ||
    outputStatusValue === "unknown"
  );
}

function resolvePresentOutputError(
  native: NativeTaskHostRecord,
  nativeOutput: NativeTaskHostOutput,
  anomalies: PresentOutputAnomalies,
): string | undefined {
  if (anomalies.missingImageAsset)
    return "原生任务完成但未返回该输出的素材标识。";
  if (anomalies.missingText) return "原生任务完成但未返回文案正文。";
  if (anomalies.terminalPendingOutput)
    return "原生任务完成但该输出没有终态回执。";
  if (anomalies.uncertainPendingOutput)
    return native.failure ?? "原生任务输出回执状态不明，请先核对供应商。";
  if (anomalies.failedTerminalOutput)
    return native.failure ?? "原生任务失败但该输出没有终态回执。";
  return nativeOutput.error;
}

function reconcilePresentNativeOutput(
  index: number,
  prior: CreationTaskOutput | undefined,
  nativeOutput: NativeTaskHostOutput,
  task: CreationTask,
  native: NativeTaskHostRecord,
): CreationTaskOutput {
  const outputStatusValue = outputStatus(nativeOutput.status);
  const anomalies = computePresentOutputAnomalies(
    task,
    native,
    nativeOutput,
    outputStatusValue,
  );
  if (
    prior &&
    shouldKeepPriorArchivedOutput(prior, task, outputStatusValue, anomalies)
  )
    return prior;
  const isUncertainAnomaly =
    anomalies.missingImageAsset ||
    anomalies.missingText ||
    anomalies.terminalPendingOutput ||
    anomalies.uncertainPendingOutput;
  return {
    index,
    status: isUncertainAnomaly
      ? "unknown"
      : anomalies.failedTerminalOutput
        ? "failed"
        : outputStatusValue,
    model: prior?.model ?? task.model,
    provider: prior?.provider ?? task.providerName,
    promptHash: prior?.promptHash,
    assetId: nativeOutput.assetId ?? prior?.assetId,
    text: nativeOutput.text ?? prior?.text,
    error: resolvePresentOutputError(native, nativeOutput, anomalies),
    createdAt: prior?.createdAt ?? task.createdAt,
  };
}

function reconcileTaskOutputs(
  task: CreationTask,
  native: NativeTaskHostRecord,
): CreationTaskOutput[] {
  const existing = task.outputs ?? [];
  const expectedOutputIndices = Array.from(
    new Set(
      Array.from({ length: task.requestedOutputs }, (_, index) => index).concat(
        native.outputIndices,
        native.outputs.map((output) => output.index),
        existing.map((output) => output.index),
      ),
    ),
  ).sort((left, right) => left - right);
  return expectedOutputIndices.map((index) => {
    const prior = existing.find((item) => item.index === index);
    const nativeOutput = native.outputs.find(
      (output) => output.index === index,
    );
    if (!nativeOutput) {
      return reconcileAbsentNativeOutput(index, prior, task, native);
    }
    return reconcilePresentNativeOutput(
      index,
      prior,
      nativeOutput,
      task,
      native,
    );
  });
}

function archiveTextOutputToItems(
  projectId: string,
  task: CreationTask,
  output: CreationTaskOutput,
  items: CreationProject["items"],
): boolean {
  try {
    const resultItem = textTaskResult(
      projectId,
      task,
      output.index,
      output.text ?? "",
    );
    const index = items.findIndex((item) => item.id === resultItem.id);
    // An existing result belongs to the user: its text/title may
    // have been edited since the original provider journal entry.
    if (index >= 0) return false;
    items.push(resultItem);
    return true;
  } catch {
    output.status = "unknown";
    output.error = "原生文本结果缺失或无效，请先核对任务。";
    return false;
  }
}

async function shouldReusePriorImageOutput(
  task: CreationTask,
  resultId: string,
  priorOutput: CreationTaskOutput | undefined,
  output: CreationTaskOutput,
  items: CreationProject["items"],
): Promise<boolean> {
  if (
    task.imageEdit &&
    priorOutput?.status === "failed" &&
    priorOutput.error?.includes("无法可靠映射")
  ) {
    Object.assign(output, priorOutput);
    return true;
  }
  // A protected composite is durable evidence; never reapply an old
  // native crop over a result or draft already owned by the user.
  if (
    priorOutput?.status === "succeeded" &&
    priorOutput.assetId &&
    (task.resultItemId ||
      items.some(
        (item) => item.id === resultId && item.assetId === priorOutput.assetId,
      ))
  ) {
    const archived = await readNativeAsset(priorOutput.assetId);
    if (archived) {
      Object.assign(output, priorOutput);
      return true;
    }
  }
  return false;
}

function upsertImageResultItem(
  resultId: string,
  task: CreationTask,
  outputIndex: number,
  asset: { assetId: string; parentId?: string; preview: string },
  items: CreationProject["items"],
): boolean {
  const resultItem = {
    id: resultId,
    title: `图片结果 ${outputIndex + 1}`,
    description: `${task.model} · 已归档 ${asset.assetId}`,
    kind: "image" as const,
    prompt: task.prompt,
    model: task.model,
    providerConnectionId: task.providerConnectionId,
    imageEditDraft: task.imageEdit?.document,
    imageEditContext: imageResultContext(task, asset.assetId),
    assetId: asset.assetId,
    parentAssetId: asset.parentId,
    preview: asset.preview,
    generationStatus: "ready" as const,
    updatedAt: Date.now(),
    result: {
      id: resultId,
      kind: "image" as const,
      title: `图片结果 ${outputIndex + 1}`,
      src: asset.preview,
      description: `来自 ${task.providerName ?? "已配置模型"} 的已归档图片结果`,
      source: "provider" as const,
    },
  };
  const index = items.findIndex((item) => item.id === resultId);
  if (index >= 0) {
    if (items[index].assetId === resultItem.assetId) return false;
    items[index] = resultItem;
    return true;
  }
  items.push(resultItem);
  return true;
}

async function archiveImageOutputToItems(
  project: CreationProject,
  task: CreationTask,
  output: CreationTaskOutput,
  existing: CreationTaskOutput[],
  items: CreationProject["items"],
): Promise<boolean> {
  if (!output.assetId) return false;
  try {
    const resultId = `${project.id}-${task.id}-result-${output.index + 1}`;
    const priorOutput = existing.find(
      (candidate) => candidate.index === output.index,
    );
    if (
      await shouldReusePriorImageOutput(
        task,
        resultId,
        priorOutput,
        output,
        items,
      )
    ) {
      return false;
    }
    const rawAsset = await readNativeAsset(output.assetId);
    const asset = rawAsset
      ? await composeNativeEditAsset(task, rawAsset, project.tasks)
      : null;
    if (!asset) {
      output.status = "unknown";
      output.error = "原生任务已完成，但本地素材原件尚未找到。";
      return false;
    }
    output.assetId = asset.assetId;
    return upsertImageResultItem(resultId, task, output.index, asset, items);
  } catch (error) {
    output.status =
      error instanceof ImageEditMappingError ? "failed" : "unknown";
    output.error =
      error instanceof ImageEditMappingError
        ? error.message
        : "原生任务已完成，但本地素材原件读取失败。";
    return false;
  }
}

async function archiveSucceededOutputs(
  project: CreationProject,
  task: CreationTask,
  native: NativeTaskHostRecord,
  outputs: CreationTaskOutput[],
  items: CreationProject["items"],
): Promise<boolean> {
  const existing = task.outputs ?? [];
  const succeeded = outputs.filter(
    (output) =>
      output.status === "succeeded" &&
      native.outputs.some(
        (candidate) =>
          candidate.index === output.index && candidate.status === "succeeded",
      ),
  );
  let changed = false;
  for (const output of succeeded) {
    if (task.kind === "text") {
      if (archiveTextOutputToItems(project.id, task, output, items)) {
        changed = true;
      }
      continue;
    }
    if (
      await archiveImageOutputToItems(project, task, output, existing, items)
    ) {
      changed = true;
    }
  }
  return changed;
}

function deriveReconciledTaskStatus(
  task: CreationTask,
  native: NativeTaskHostRecord,
  outputs: CreationTaskOutput[],
  completed: number,
  hasUnknown: boolean,
): CreationTask["status"] {
  if (hasUnknown) return "unknown";
  const hasFailed = outputs.some(
    (output) => output.status === "failed" || output.status === "cancelled",
  );
  const completeArchivedEvidence =
    completed === task.requestedOutputs &&
    (native.status === "succeeded" || native.status === "failed");
  if (completeArchivedEvidence) return "succeeded";
  if (native.status === "succeeded") {
    if (completed === task.requestedOutputs) return "succeeded";
    if (!hasFailed) return "unknown";
    return completed > 0 ? "partial" : "failed";
  }
  if (native.status === "failed") {
    return completed > 0 ? "partial" : "failed";
  }
  return "running";
}

function buildReconciledTask(
  projectId: string,
  task: CreationTask,
  native: NativeTaskHostRecord,
  outputs: CreationTaskOutput[],
): CreationTask {
  const hasUnknown =
    native.status === "unknown" ||
    outputs.some((output) => output.status === "unknown");
  const completed = outputs.filter(
    (output) => output.status === "succeeded",
  ).length;
  const status = deriveReconciledTaskStatus(
    task,
    native,
    outputs,
    completed,
    hasUnknown,
  );
  const firstSucceeded = outputs.find(
    (output) => output.status === "succeeded",
  );
  return {
    ...task,
    status,
    submissionState:
      status === "running"
        ? "submitted"
        : status === "unknown"
          ? "unknown"
          : "terminal",
    submittedAt: task.submittedAt ?? native.updatedAt,
    outputs,
    completedOutputs: completed,
    resultItemId: firstSucceeded
      ? `${projectId}-${task.id}-result-${firstSucceeded.index + 1}`
      : task.resultItemId,
    error:
      status === "succeeded"
        ? undefined
        : hasUnknown
          ? (outputs.find((output) => output.status === "unknown")?.error ??
            native.failure ??
            "原生任务受理状态不明，请先核对供应商；不会自动重复提交。")
          : native.failure,
    updatedAt: native.updatedAt,
  };
}

function isTaskUnchanged(task: CreationTask, nextTask: CreationTask): boolean {
  return (
    task.status === nextTask.status &&
    task.submissionState === nextTask.submissionState &&
    task.submittedAt === nextTask.submittedAt &&
    task.error === nextTask.error &&
    task.updatedAt === nextTask.updatedAt &&
    JSON.stringify(task.outputs ?? []) ===
      JSON.stringify(nextTask.outputs ?? [])
  );
}

async function reconcileSingleTask(
  project: CreationProject,
  task: CreationTask,
  items: CreationProject["items"],
  byTaskId: ReadonlyMap<string, NativeTaskHostRecord>,
  byIdempotency: ReadonlyMap<string, NativeTaskHostRecord>,
  newerNativeReceipts: Set<CreationTask>,
  onlyTaskIds?: readonly string[],
): Promise<{ task: CreationTask; changed: boolean }> {
  if (onlyTaskIds && !onlyTaskIds.includes(task.id))
    return { task, changed: false };
  const candidate =
    byTaskId.get(task.id) ?? byIdempotency.get(task.idempotencyKey);
  const native = candidate
    ? validateNativeTaskRecord(candidate, task)
    : undefined;
  if (
    candidate &&
    recordsWithNativeTimestamp.has(candidate) &&
    native &&
    native.updatedAt > task.updatedAt
  ) {
    newerNativeReceipts.add(task);
  }
  if (!native) return markTaskWithMissingNativeRecord(task);
  const outputs = reconcileTaskOutputs(task, native);
  const itemsChanged = await archiveSucceededOutputs(
    project,
    task,
    native,
    outputs,
    items,
  );
  const nextTask = buildReconciledTask(project.id, task, native, outputs);
  if (!itemsChanged && isTaskUnchanged(task, nextTask)) {
    return { task, changed: false };
  }
  return { task: nextTask, changed: true };
}

function resolveReconcileSourceItemId(
  projectId: string,
  task: CreationTask,
  items: CreationProject["items"],
): string | undefined {
  if (task.sourceItemId !== undefined) {
    return items.some((item) => item.id === task.sourceItemId)
      ? task.sourceItemId
      : undefined;
  }
  const sourceItemId =
    items.find((item) => item.id === `${projectId}-prompt`)?.id ??
    items.find((item) => item.kind === "image" && !item.result)?.id;
  return sourceItemId && items.some((item) => item.id === sourceItemId)
    ? sourceItemId
    : undefined;
}

function syncSourceItemGenerationStatuses(
  projectId: string,
  tasks: CreationTask[],
  items: CreationProject["items"],
): boolean {
  const sourceStates = new Map<string, "clear" | "pending" | "error">();
  const priority = { clear: 0, pending: 1, error: 2 } as const;
  for (const task of tasks) {
    const sourceItemId = resolveReconcileSourceItemId(projectId, task, items);
    if (!sourceItemId) continue;
    const uncertain =
      task.status === "unknown" ||
      task.submissionState === "unknown" ||
      task.outputs?.some((output) => output.status === "unknown");
    const state =
      uncertain || task.status === "failed" || task.status === "offline"
        ? ("error" as const)
        : task.status === "running" || task.status === "queued"
          ? ("pending" as const)
          : ("clear" as const);
    const currentState = sourceStates.get(sourceItemId);
    if (!currentState || priority[state] > priority[currentState])
      sourceStates.set(sourceItemId, state);
  }
  let changed = false;
  for (const [sourceItemId, sourceState] of sourceStates) {
    const sourceIndex = items.findIndex((item) => item.id === sourceItemId);
    if (sourceIndex < 0) continue;
    const nextGenerationStatus =
      sourceState === "error"
        ? ("error" as const)
        : sourceState === "pending"
          ? ("pending" as const)
          : undefined;
    if (items[sourceIndex].generationStatus === nextGenerationStatus) continue;
    items[sourceIndex] = {
      ...items[sourceIndex],
      generationStatus: nextGenerationStatus,
    };
    changed = true;
  }
  return changed;
}

function upsertCanvasResultEdge(
  canvas: ProjectCanvas,
  sourceItemId: string,
  target: string,
): boolean {
  const preferredId = `result-${target}`;
  const existingEdgeIndex = canvas.edges.findIndex(
    (edge) => edge.target === target && edge.kind === "result",
  );
  if (existingEdgeIndex >= 0) {
    const existingEdge = canvas.edges[existingEdgeIndex];
    if (existingEdge.source === sourceItemId) return false;
    const edgeId = canvas.edges.some(
      (edge, index) =>
        index !== existingEdgeIndex &&
        edge.id === preferredId &&
        edge.target !== target,
    )
      ? `result-${sourceItemId}-${target}`
      : preferredId;
    canvas.edges[existingEdgeIndex] = {
      ...existingEdge,
      id: edgeId,
      source: sourceItemId,
      target,
      kind: "result",
    };
    return true;
  }
  const edgeId = canvas.edges.some((edge) => edge.id === preferredId)
    ? `result-${sourceItemId}-${target}`
    : preferredId;
  canvas.edges.push({
    id: edgeId,
    source: sourceItemId,
    target,
    kind: "result",
  });
  return true;
}

function syncCanvasResultEdges(
  projectId: string,
  tasks: CreationTask[],
  items: CreationProject["items"],
  canvas: ProjectCanvas,
): boolean {
  let changed = false;
  for (const task of tasks) {
    const sourceItemId = resolveReconcileSourceItemId(projectId, task, items);
    if (!sourceItemId) continue;
    for (const output of task.outputs ?? []) {
      if (output.status !== "succeeded") continue;
      const target = `${projectId}-${task.id}-result-${output.index + 1}`;
      if (!items.some((item) => item.id === target)) continue;
      if (upsertCanvasResultEdge(canvas, sourceItemId, target)) {
        changed = true;
      }
    }
  }
  return changed;
}

async function reconcileProjectNativeTasks(
  project: CreationProject,
  byTaskId: ReadonlyMap<string, NativeTaskHostRecord>,
  byIdempotency: ReadonlyMap<string, NativeTaskHostRecord>,
  newerNativeReceipts: Set<CreationTask>,
  onlyTaskIds?: readonly string[],
): Promise<{ project: CreationProject; changed: boolean }> {
  let projectChanged = false;
  const items = [...project.items];
  const tasks = await Promise.all(
    project.tasks.map(async (task) => {
      const reconciled = await reconcileSingleTask(
        project,
        task,
        items,
        byTaskId,
        byIdempotency,
        newerNativeReceipts,
        onlyTaskIds,
      );
      if (reconciled.changed) projectChanged = true;
      return reconciled.task;
    }),
  );
  if (syncSourceItemGenerationStatuses(project.id, tasks, items)) {
    projectChanged = true;
  }
  const canvas = reconcileProjectCanvas(project.canvas, items);
  if (syncCanvasResultEdges(project.id, tasks, items, canvas)) {
    projectChanged = true;
  }
  if (!projectChanged) return { project, changed: false };
  return {
    project: { ...project, items, tasks, canvas, updatedAt: Date.now() },
    changed: true,
  };
}

function preserveUnchangedProjects(
  snapshot: CreationSnapshot,
  reconciled: CreationSnapshot,
  newerNativeReceipts: ReadonlySet<CreationTask>,
): CreationSnapshot {
  // An older parent receipt can be undone by retry aggregation. Compare the
  // complete result with the input before publishing only audit-time changes.
  const finalProjects = reconciled.projects.map((project, projectIndex) => {
    const original = snapshot.projects[projectIndex];
    if (project === original) return original;
    let tasks = project.tasks.map((task, taskIndex) => {
      const originalTask = original.tasks[taskIndex];
      if (task === originalTask || newerNativeReceipts.has(originalTask))
        return task;
      return sameJson(
        JSON.parse(
          JSON.stringify({ ...task, updatedAt: originalTask.updatedAt }),
        ),
        JSON.parse(JSON.stringify(originalTask)),
      )
        ? originalTask
        : task;
    });
    if (tasks.every((task, index) => task === original.tasks[index]))
      tasks = original.tasks;
    const candidate = tasks === project.tasks ? project : { ...project, tasks };
    return sameJson(
      JSON.parse(
        JSON.stringify({ ...candidate, updatedAt: original.updatedAt }),
      ),
      JSON.parse(JSON.stringify(original)),
    )
      ? original
      : candidate;
  });
  return finalProjects.some(
    (project, index) => project !== snapshot.projects[index],
  )
    ? { ...reconciled, projects: finalProjects }
    : snapshot;
}

/**
 * Reconciles native records before normal interruption recovery. A submitted
 * task missing from the host index is deliberately treated as unknown so a
 * restart can never create a second provider submission.
 */
export async function reconcileNativeTasks(
  snapshot: CreationSnapshot,
  onlyTaskIds?: readonly string[],
): Promise<CreationSnapshot> {
  if (!usesNativeTaskHost()) return snapshot;
  const records = await fetchReconciliationRecords(snapshot);
  const byTaskId = new Map(records.map((record) => [record.taskId, record]));
  const byIdempotency = new Map(
    records.map((record) => [record.idempotencyKey, record]),
  );
  const newerNativeReceipts = new Set<CreationTask>();
  let changed = false;
  const projects = await Promise.all(
    snapshot.projects.map(async (project) => {
      const result = await reconcileProjectNativeTasks(
        project,
        byTaskId,
        byIdempotency,
        newerNativeReceipts,
        onlyTaskIds,
      );
      if (result.changed) changed = true;
      return result.project;
    }),
  );
  const reconciled = reconcileRetryTaskParents(
    changed
      ? { ...snapshot, projects, revision: snapshot.revision + 1 }
      : snapshot,
  );
  if (reconciled === snapshot) return snapshot;
  return preserveUnchangedProjects(snapshot, reconciled, newerNativeReceipts);
}

const { composeNativeEditAsset } = createImageEditRuntime({
  read: loadStoredAsset,
  write: storeGeneratedAsset,
});
