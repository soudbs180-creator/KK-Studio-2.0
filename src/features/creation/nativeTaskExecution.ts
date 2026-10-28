import React, { type SetStateAction } from "react";
import type { Asset } from "../../domain/assets.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { imageResultContext } from "../image-edit/context.ts";
import { createImageEditRuntime } from "../image-edit/editTasks.ts";
import { ImageEditMappingError } from "../image-edit/imageProcessing.ts";
import { loadStoredAsset, storeGeneratedAsset } from "./assetRepository.ts";
import type {
  CreationProject,
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";
import { readNativeAsset } from "./nativeAssetAdapter.ts";
import {
  cancelNativeTask,
  getNativeTask,
  submitNativeTask,
  validateNativeTaskRecord,
  type NativeTaskHostRecord,
  type NativeTaskStatus,
} from "./nativeTaskHost.ts";
import {
  assertSubmissionConnection,
  taskSubmissionBinding,
} from "./providerSubmission.ts";
import { textTaskResult } from "./textTaskResult.ts";
import { hasArchivedOutputEvidence } from "./useTaskExecution.ts";

export interface NativeFlowOptions {
  task: CreationTask;
  projectId: string;
  taskId: string;
  controller: AbortController;
  pendingIndices: number[];
  compiledPrompt: string;
  promptHash?: string;
  explicitRetry: boolean;
  createdItems: CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  setResultSaving: (saving: boolean) => void;
  publish: (
    status: CreationTask["status"],
    error?: string,
    submissionState?: CreationTask["submissionState"],
  ) => void;
  flushPublishedResult: () => Promise<void>;
  assertTextCurrent: () => void;
  nativeTaskRecords: React.MutableRefObject<
    Record<string, NativeTaskHostRecord>
  >;
  nativeCancelRequested: React.MutableRefObject<Set<string>>;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  getOutputs: () => CreationTaskOutput[];
  setOutputs: (outputs: CreationTaskOutput[]) => void;
  markSubmission: () => void;
}

export async function executeNativeFlow(
  options: NativeFlowOptions,
): Promise<void> {
  const {
    task,
    projectId,
    taskId,
    controller,
    pendingIndices,
    compiledPrompt,
    promptHash,
    explicitRetry,
    createdItems,
    setAssets,
    setResultSaving,
    publish,
    flushPublishedResult,
    assertTextCurrent,
    nativeTaskRecords,
    nativeCancelRequested,
    creationRef,
    getOutputs,
    markSubmission,
  } = options;

  if (controller.signal.aborted) throw new Error("任务已停止。");
  assertTextCurrent();

  const nativeConnection = assertSubmissionConnection(
    taskSubmissionBinding(task),
    {
      skipCapacity: true,
      explicitRetry: explicitRetry || Boolean(task.retryOfTaskId),
    },
  );
  const attachments = task.attachments.map((attachment) => {
    if (!attachment.assetId)
      throw new Error(
        "Desktop 参考图尚未归档到原生素材库，当前未提交原生任务。",
      );
    return { assetId: attachment.assetId, name: attachment.name };
  });

  markSubmission();
  let nativeRecord = await submitNativeTask({
    imageEditRequired: task.imageEdit
      ? true
      : task.imageEditContext
        ? false
        : undefined,
    kind: task.kind === "text" ? "text" : undefined,
    concurrencyLimit: nativeConnection?.concurrencyLimit,
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    baseUrl: task.providerBaseUrl!,
    protocol: task.providerProtocol,
    authMode: task.providerAuthMode,
    credentialRef: task.providerCredentialRef ?? "",
    model: task.model,
    prompt: compiledPrompt,
    outputIndices: pendingIndices,
    attachments,
    providerName: task.providerName,
    promptHash,
    size: task.imageSize,
    maskAssetId: task.imageEdit?.nativeMask
      ? task.imageEdit.maskAssetId
      : undefined,
  });

  nativeRecord = validateNativeTaskRecord(nativeRecord, task, pendingIndices);
  nativeTaskRecords.current[taskId] = nativeRecord;
  publish("running", undefined, "submitted");
  await flushPublishedResult();

  const applyRecord = async (
    incoming: NativeTaskHostRecord,
  ): Promise<NativeTaskHostRecord> => {
    const record = validateNativeTaskRecord(incoming, task, pendingIndices);
    nativeTaskRecords.current[taskId] = record;
    updateSavingStateOnNativeRecord(record, getOutputs(), setResultSaving);

    const recordOutputs = new Map(
      record.outputs.map((output) => [output.index, output]),
    );

    for (const output of getOutputs()) {
      const nativeOutput = recordOutputs.get(output.index);
      if (!nativeOutput) {
        handleMissingNativeOutput(task, output, record);
        continue;
      }
      await processSingleNativeOutput({
        task,
        projectId,
        taskId,
        output,
        nativeOutput,
        record,
        createdItems,
        setAssets,
        projects: creationRef.current.projects,
      });
    }

    await publishNativeRecordState({
      record,
      outputs: getOutputs(),
      requestedOutputs: task.requestedOutputs,
      publish,
      flushPublishedResult,
      setResultSaving,
    });
    return record;
  };

  if (nativeCancelRequested.current.has(taskId) || controller.signal.aborted) {
    await handleNativeCancellationOnStart({
      taskId,
      nativeRecord,
      nativeCancelRequested,
      applyRecord,
    });
    return;
  }

  nativeRecord = await applyRecord(nativeRecord);
  await pollNativeTaskUntilTerminal({
    taskId,
    controller,
    nativeRecord,
    nativeCancelRequested,
    applyRecord,
  });
}

function updateSavingStateOnNativeRecord(
  record: NativeTaskHostRecord,
  currentOutputs: CreationTaskOutput[],
  setResultSaving: (saving: boolean) => void,
): void {
  if (record.status === "unknown") {
    setResultSaving(false);
    return;
  }
  const hasNewSuccess = record.outputs.some(
    (output) =>
      output.status === "succeeded" &&
      currentOutputs.some(
        (prior) => prior.index === output.index && prior.status !== "succeeded",
      ),
  );
  setResultSaving(hasNewSuccess);
}

function handleMissingNativeOutput(
  task: CreationTask,
  output: CreationTaskOutput,
  record: NativeTaskHostRecord,
): void {
  if (hasArchivedOutputEvidence(task, output)) return;
  if (record.status === "succeeded") {
    output.status = "unknown";
    output.error = "原生任务完成但未返回该输出的素材标识。";
  } else if (record.status === "failed") {
    output.status = "failed";
    output.error = record.failure ?? "原生任务失败但未返回该输出回执。";
  }
}

export async function publishNativeRecordState(options: {
  record: NativeTaskHostRecord;
  outputs: CreationTaskOutput[];
  requestedOutputs: number;
  publish: (
    status: CreationTask["status"],
    error?: string,
    submissionState?: CreationTask["submissionState"],
  ) => void;
  flushPublishedResult: () => Promise<void>;
  setResultSaving: (saving: boolean) => void;
}): Promise<void> {
  const {
    record,
    outputs,
    requestedOutputs,
    publish,
    flushPublishedResult,
    setResultSaving,
  } = options;

  const uncertain =
    record.status === "unknown" ||
    outputs.some((output) => output.status === "unknown");
  const completed = outputs.filter(
    (output) => output.status === "succeeded",
  ).length;

  const status = resolveNativeStatus(
    record.status,
    completed,
    requestedOutputs,
    uncertain,
  );
  const unknownError = outputs.find(
    (output) => output.status === "unknown",
  )?.error;
  const errorMessage = resolveNativeErrorMessage(
    status,
    uncertain,
    record.failure,
    unknownError,
  );

  const submissionState: CreationTask["submissionState"] =
    uncertain || status === "running"
      ? uncertain
        ? "unknown"
        : "submitted"
      : "terminal";

  publish(status, errorMessage, submissionState);
  await flushPublishedResult();
  setResultSaving(false);
}

async function handleNativeCancellationOnStart(options: {
  taskId: string;
  nativeRecord: NativeTaskHostRecord;
  nativeCancelRequested: React.MutableRefObject<Set<string>>;
  applyRecord: (rec: NativeTaskHostRecord) => Promise<NativeTaskHostRecord>;
}): Promise<void> {
  const { taskId, nativeRecord, nativeCancelRequested, applyRecord } = options;
  nativeCancelRequested.current.add(taskId);
  await cancelNativeTask(taskId).catch((err) => {
    console.warn(
      "[nativeTaskExecution] cancelNativeTask on abort failed:",
      err,
    );
  });
  let record = (await getNativeTask(taskId)) ?? {
    ...nativeRecord,
    status: "unknown",
    failure: "已请求取消原生任务，供应商最终状态仍需核对；不会普通重试。",
  };
  if (record.status === "submitted") {
    record = {
      ...record,
      status: "unknown",
      failure: "已请求取消原生任务，供应商最终状态仍需核对；不会普通重试。",
    };
  }
  await applyRecord(record);
}

async function pollNativeTaskUntilTerminal(options: {
  taskId: string;
  controller: AbortController;
  nativeRecord: NativeTaskHostRecord;
  nativeCancelRequested: React.MutableRefObject<Set<string>>;
  applyRecord: (rec: NativeTaskHostRecord) => Promise<NativeTaskHostRecord>;
}): Promise<void> {
  const { taskId, controller, nativeCancelRequested, applyRecord } = options;

  let current = options.nativeRecord;
  while (current.status === "submitted") {
    if (controller.signal.aborted) {
      if (nativeCancelRequested.current.has(taskId)) {
        await applyRecord({
          ...current,
          status: "unknown",
          failure: "已请求取消原生任务，供应商最终状态仍需核对；不会普通重试。",
        });
        return;
      }
      throw new Error("任务已停止。");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const polled = await getNativeTask(taskId);
    current = polled ?? {
      ...current,
      status: "unknown",
      failure:
        "Desktop TaskHost 中没有找到原任务记录，请先核对供应商；不会自动重复提交。",
    };
    current = await applyRecord(current);
  }
}

export function resolveNativeStatus(
  recordStatus: NativeTaskStatus,
  completed: number,
  requestedOutputs: number,
  uncertain: boolean,
): CreationTask["status"] {
  if (uncertain) return "unknown";
  const terminal = recordStatus === "succeeded" || recordStatus === "failed";
  if (completed === requestedOutputs && terminal) return "succeeded";
  if (recordStatus === "succeeded") {
    return completed === requestedOutputs ? "succeeded" : "partial";
  }
  if (recordStatus === "failed") {
    return completed > 0 ? "partial" : "failed";
  }
  return "running";
}

export function resolveNativeErrorMessage(
  status: CreationTask["status"],
  uncertain: boolean,
  recordFailure?: string,
  unknownError?: string,
): string | undefined {
  if (uncertain) {
    return (
      unknownError ??
      recordFailure ??
      "原生任务受理状态不明，请先核对供应商；不会自动重复提交。"
    );
  }
  if (status === "failed") {
    return recordFailure ?? "原生任务失败，可检查供应商后重试。";
  }
  return undefined;
}

interface ProcessNativeOutputOptions {
  task: CreationTask;
  projectId: string;
  taskId: string;
  output: CreationTaskOutput;
  nativeOutput: NonNullable<NativeTaskHostRecord["outputs"]>[number];
  record: NativeTaskHostRecord;
  createdItems: CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  projects: CreationProject[];
}

function shouldPreserveArchivedEvidence(
  task: CreationTask,
  priorOutput: CreationTaskOutput,
  nativeOutput: NonNullable<NativeTaskHostRecord["outputs"]>[number],
  missingText: boolean,
): boolean {
  if (!hasArchivedOutputEvidence(task, priorOutput)) return false;
  if (nativeOutput.status === "unknown" || nativeOutput.status === "pending")
    return true;
  if (nativeOutput.status === "failed") return true;
  if (missingText) return true;
  if (
    task.kind !== "text" &&
    nativeOutput.status === "succeeded" &&
    !nativeOutput.assetId
  )
    return true;
  return false;
}

export async function processSingleNativeOutput(
  options: ProcessNativeOutputOptions,
): Promise<void> {
  const {
    task,
    projectId,
    taskId,
    output,
    nativeOutput,
    record,
    createdItems,
    setAssets,
    projects,
  } = options;

  const priorOutput = { ...output };
  const missingText =
    task.kind === "text" &&
    nativeOutput.status === "succeeded" &&
    !nativeOutput.text?.trim();

  if (
    shouldPreserveArchivedEvidence(task, priorOutput, nativeOutput, missingText)
  ) {
    output.status = "succeeded";
    output.assetId = priorOutput.assetId;
    output.text = priorOutput.text;
    output.error = undefined;
    return;
  }

  output.status =
    nativeOutput.status === "pending"
      ? "running"
      : missingText
        ? "unknown"
        : nativeOutput.status;
  output.assetId = nativeOutput.assetId;
  output.text = nativeOutput.text ?? priorOutput.text;
  output.error = nativeOutput.error;

  if (missingText) {
    output.error = "原生任务完成但未返回文案正文。";
    return;
  }

  if (
    task.kind !== "text" &&
    nativeOutput.status === "succeeded" &&
    !nativeOutput.assetId
  ) {
    output.status = "unknown";
    output.error = "原生任务完成但未返回该输出的素材标识。";
    return;
  }

  if (nativeOutput.status === "pending") {
    handlePendingOutputFallback(output, record);
    return;
  }

  if (task.kind === "text") {
    handleTextOutputResult(task, projectId, output, nativeOutput, createdItems);
    return;
  }

  if (nativeOutput.status !== "succeeded" || !nativeOutput.assetId) return;

  await saveNativeImageResult({
    task,
    projectId,
    taskId,
    output,
    nativeAssetId: nativeOutput.assetId,
    createdItems,
    setAssets,
    projects,
  });
}

function handlePendingOutputFallback(
  output: CreationTaskOutput,
  record: NativeTaskHostRecord,
): void {
  if (record.status === "succeeded") {
    output.status = "unknown";
    output.error = "原生任务完成但该输出没有终态回执。";
  } else if (record.status === "failed") {
    output.status = "failed";
    output.error = record.failure ?? "原生任务失败但该输出没有终态回执。";
  } else {
    output.status = "unknown";
    output.error =
      record.failure ?? "原生任务输出回执状态不明，请先核对供应商。";
  }
}

function handleTextOutputResult(
  task: CreationTask,
  projectId: string,
  output: CreationTaskOutput,
  nativeOutput: NonNullable<NativeTaskHostRecord["outputs"]>[number],
  createdItems: CanvasCollectionItem[],
): void {
  if (nativeOutput.status !== "succeeded") return;
  try {
    const item = textTaskResult(
      projectId,
      task,
      output.index,
      nativeOutput.text ?? "",
    );
    if (!createdItems.some((existing) => existing.id === item.id))
      createdItems.push(item);
  } catch (err) {
    console.warn("[nativeTaskExecution] textTaskResult parse error:", err);
    output.status = "unknown";
    output.error = "原生文本结果缺失或无效，请先核对任务。";
  }
}

async function saveNativeImageResult(options: {
  task: CreationTask;
  projectId: string;
  taskId: string;
  output: CreationTaskOutput;
  nativeAssetId: string;
  createdItems: CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  projects: CreationProject[];
}): Promise<void> {
  const {
    task,
    projectId,
    taskId,
    output,
    nativeAssetId,
    createdItems,
    setAssets,
    projects,
  } = options;

  try {
    const rawAsset = await readNativeAsset(nativeAssetId);
    const asset = rawAsset
      ? await composeNativeEditAsset(
          task,
          rawAsset,
          projects.find((p) => p.id === projectId)?.tasks ?? [],
        )
      : null;
    if (!asset) throw new Error("原生素材原件尚未找到。");
    output.assetId = asset.assetId;
    const id = `${projectId}-${taskId}-result-${output.index + 1}`;
    const item: CanvasCollectionItem = {
      id,
      title: `图片结果 ${output.index + 1}`,
      description: `${task.model} · 已归档 ${asset.assetId}`,
      kind: "image",
      prompt: task.prompt,
      model: task.model,
      providerConnectionId: task.providerConnectionId,
      imageEditDraft: task.imageEdit?.document,
      imageEditContext: imageResultContext(task, asset.assetId),
      assetId: asset.assetId,
      parentAssetId: asset.parentId,
      preview: asset.preview,
      generationStatus: "ready",
      updatedAt: Date.now(),
      result: {
        id,
        kind: "image",
        title: `图片结果 ${output.index + 1}`,
        src: asset.preview,
        description: `来自 ${task.providerName ?? "已配置模型"} 的已归档图片结果`,
        source: "provider",
      },
    };
    const existing = createdItems.findIndex((candidate) => candidate.id === id);
    if (existing >= 0) createdItems[existing] = item;
    else createdItems.push(item);

    setAssets((current) => {
      if (current.some((entry) => entry.id === asset.assetId)) return current;
      return [
        ...current,
        {
          id: asset.assetId,
          name: `AI 结果 ${current.length + 1}`,
          type: "image" as const,
          tag: "AI生成",
          createdAt: asset.provenance.generatedAt,
          src: asset.preview,
          isAiGenerated: asset.isAiGenerated ?? true,
          provider: asset.provenance.provider,
          model: asset.provenance.model,
          promptHash: asset.promptHash,
          parentId: asset.parentId,
          sourceTaskId: asset.sourceJobId,
          providerConnectionId: asset.provenance.connectionId,
          c2paPresent: asset.provenance.c2paPresent,
          synthIdSignal: asset.provenance.synthIdSignal,
          originCount: asset.origins?.length ?? 1,
          sha256: asset.sha256,
          source: asset.source ?? "provider",
        },
      ];
    });
  } catch (error) {
    output.status =
      error instanceof ImageEditMappingError ? "failed" : "unknown";
    output.error =
      error instanceof ImageEditMappingError
        ? error.message
        : "原生任务已完成，但本地素材原件读取失败。";
  }
}

const { composeNativeEditAsset } = createImageEditRuntime({
  read: loadStoredAsset,
  write: storeGeneratedAsset,
});
