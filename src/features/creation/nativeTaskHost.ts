import { invoke } from "@tauri-apps/api/core";
import type {
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";
import { readNativeAsset, usesNativeAssets } from "./nativeAssetAdapter.ts";
import { textTaskResult } from "./textTaskResult.ts";
import { reconcileProjectCanvas } from "../../domain/projectCanvas.ts";
import { reconcileRetryTaskParents } from "./taskRecovery.ts";
import { composeNativeEditAsset } from "../image-edit/editTasks.ts";
import { imageResultContext } from "../image-edit/context.ts";
import { ImageEditMappingError } from "../image-edit/imageProcessing.ts";

/** The request crossing the Desktop TaskHost IPC boundary. It contains no API key. */
export interface NativeTaskHostRequest {
  maskAssetId?: string;
  kind?: "image" | "text";
  concurrencyLimit?: number;
  taskId: string;
  idempotencyKey: string;
  baseUrl: string;
  credentialRef: string;
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
  taskId: string;
  idempotencyKey: string;
  status: NativeTaskStatus;
  outputIndices: number[];
  outputs: NativeTaskHostOutput[];
  failure?: string;
  updatedAt: number;
}

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

function normalizeRecord(input: unknown): NativeTaskHostRecord {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const rawOutputs = Array.isArray(value.outputs)
    ? value.outputs
    : value.outputs === undefined && Array.isArray(value.assetIds)
      ? value.assetIds.map((assetId, index) => ({
          index: Array.isArray(value.outputIndices)
            ? (value.outputIndices[index] ?? index)
            : index,
          status: "succeeded" as const,
          assetId: typeof assetId === "string" ? assetId : undefined,
          error: undefined,
        }))
      : [];
  const validOutputs = rawOutputs.filter(
    (output): output is Record<string, unknown> =>
      output != null &&
      typeof output === "object" &&
      Number.isSafeInteger(output.index) &&
      output.index >= 0 &&
      ["pending", "submitted", "succeeded", "unknown", "failed"].includes(
        output.status,
      ),
  );
  // Do not discard malformed entries and then accept the remaining receipt.
  const malformed =
    (value.outputs !== undefined && !Array.isArray(value.outputs)) ||
    validOutputs.length !== rawOutputs.length ||
    (value.outputIndices !== undefined &&
      (!Array.isArray(value.outputIndices) ||
        value.outputIndices.some(
          (index) => !Number.isSafeInteger(index) || index < 0,
        ))) ||
    !["submitted", "succeeded", "unknown", "failed"].includes(
      value.status as string,
    );
  const outputs: NativeTaskHostOutput[] = validOutputs.map((output) => ({
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
  }));
  return {
    taskId: typeof value.taskId === "string" ? value.taskId : "",
    idempotencyKey:
      typeof value.idempotencyKey === "string" ? value.idempotencyKey : "",
    status: malformed
      ? "unknown"
      : value.status === "succeeded" ||
          value.status === "failed" ||
          value.status === "unknown"
        ? value.status
        : "submitted",
    outputIndices: Array.isArray(value.outputIndices)
      ? value.outputIndices.filter((index): index is number =>
          Number.isSafeInteger(index),
        )
      : outputs.map((output) => output.index),
    outputs: malformed ? [] : outputs,
    failure: malformed
      ? INVALID_RECEIPT
      : typeof value.failure === "string"
        ? value.failure
        : value.failure &&
            typeof value.failure === "object" &&
            typeof (value.failure as { message?: unknown }).message === "string"
          ? (value.failure as { message: string }).message
          : undefined,
    updatedAt:
      typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : Date.now(),
  };
}

/** Quarantine an inconsistent receipt before either live or recovered output is applied. */
export function validateNativeTaskRecord(
  record: NativeTaskHostRecord,
  task: Pick<CreationTask, "id" | "idempotencyKey" | "requestedOutputs">,
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
  if (!identityMismatch && !invalidOutputs) return record;
  const failure = identityMismatch
    ? "Desktop TaskHost 回执的任务身份不匹配，请先核对供应商；不会自动重复提交。"
    : INVALID_RECEIPT;
  const outputIndices = submittedOutputIndices
    ? [...submittedOutputIndices]
    : Array.from({ length: task.requestedOutputs }, (_, index) => index);
  return {
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
    .filter(
      (task) =>
        task.submissionState === "submitted" ||
        task.submissionState === "unknown" ||
        task.status === "running" ||
        task.status === "unknown",
    )
    .map((task) => task.id);
  if (taskIds.length) {
    const probed = await Promise.all(
      taskIds.map(async (taskId) => {
        try {
          return await getNativeTask(taskId);
        } catch {
          return null;
        }
      }),
    );
    records = [
      ...records,
      ...probed.filter(
        (record): record is NativeTaskHostRecord =>
          record != null &&
          !records.some((item) => item.taskId === record.taskId),
      ),
    ];
  }
  const byTaskId = new Map(records.map((record) => [record.taskId, record]));
  const byIdempotency = new Map(
    records.map((record) => [record.idempotencyKey, record]),
  );
  let changed = false;
  const projects = await Promise.all(
    snapshot.projects.map(async (project) => {
      let projectChanged = false;
      const items = [...project.items];
      const tasks = await Promise.all(
        project.tasks.map(async (task) => {
          if (onlyTaskIds && !onlyTaskIds.includes(task.id)) return task;
          const candidate =
            byTaskId.get(task.id) ?? byIdempotency.get(task.idempotencyKey);
          const native = candidate
            ? validateNativeTaskRecord(candidate, task)
            : undefined;
          const mayHaveBeenSubmitted =
            task.submissionState === "submitted" ||
            task.submissionState === "unknown" ||
            task.status === "running" ||
            task.status === "unknown";
          if (!native) {
            if (!mayHaveBeenSubmitted) return task;
            if (
              task.status === "unknown" &&
              task.submissionState === "unknown" &&
              task.error?.includes("Desktop TaskHost")
            )
              return task;
            const outputs = task.outputs?.map((output) =>
              hasArchivedOutputEvidence(task, output)
                ? output
                : {
                    ...output,
                    status: "unknown" as const,
                    error:
                      "Desktop TaskHost 中没有找到原任务输出回执，请先核对供应商。",
                  },
            );
            projectChanged = changed = true;
            return {
              ...task,
              status: "unknown" as const,
              submissionState: "unknown" as const,
              error:
                "Desktop TaskHost 中没有找到原任务记录，请先核对供应商；不会自动重复提交。",
              outputs,
              completedOutputs:
                outputs?.filter((output) => output.status === "succeeded")
                  .length ?? task.completedOutputs,
              updatedAt: Date.now(),
            };
          }
          const existing = task.outputs ?? [];
          const expectedOutputIndices = Array.from(
            new Set(
              Array.from(
                { length: task.requestedOutputs },
                (_, index) => index,
              ).concat(
                native.outputIndices,
                native.outputs.map((output) => output.index),
                existing.map((output) => output.index),
              ),
            ),
          ).sort((left, right) => left - right);
          const outputs = expectedOutputIndices.map((index) => {
            const prior = existing.find((item) => item.index === index);
            const nativeOutput = native.outputs.find(
              (output) => output.index === index,
            );
            if (!nativeOutput) {
              if (prior && hasArchivedOutputEvidence(task, prior)) return prior;
              return {
                ...(prior ?? {
                  index,
                  status: "waiting" as const,
                  model: task.model,
                  provider: task.providerName,
                  createdAt: task.createdAt,
                }),
                status:
                  native.status === "succeeded"
                    ? ("unknown" as const)
                    : native.status === "failed"
                      ? ("failed" as const)
                      : native.status === "unknown"
                        ? ("unknown" as const)
                        : native.status === "submitted"
                          ? ("running" as const)
                          : (prior?.status ?? ("waiting" as const)),
                error:
                  native.status === "succeeded"
                    ? "原生任务完成但未返回该输出回执。"
                    : native.status === "failed"
                      ? (native.failure ?? "原生任务失败但未返回该输出回执。")
                      : native.status === "unknown"
                        ? (native.failure ??
                          "原生任务输出回执状态不明，请先核对供应商。")
                        : prior?.error,
              } satisfies CreationTaskOutput;
            }
            const outputStatusValue = outputStatus(nativeOutput.status);
            const missingImageAsset =
              task.kind !== "text" &&
              outputStatusValue === "succeeded" &&
              !nativeOutput.assetId;
            const missingText =
              task.kind === "text" &&
              outputStatusValue === "succeeded" &&
              !nativeOutput.text?.trim();
            const terminalPendingOutput =
              native.status === "succeeded" && outputStatusValue === "running";
            const uncertainPendingOutput =
              native.status === "unknown" && outputStatusValue === "running";
            const failedTerminalOutput =
              native.status === "failed" && outputStatusValue === "running";
            if (
              missingImageAsset &&
              prior &&
              hasArchivedOutputEvidence(task, prior)
            )
              return prior;
            if (missingText && prior && hasArchivedOutputEvidence(task, prior))
              return prior;
            if (
              terminalPendingOutput &&
              prior &&
              hasArchivedOutputEvidence(task, prior)
            )
              return prior;
            if (
              uncertainPendingOutput &&
              prior &&
              hasArchivedOutputEvidence(task, prior)
            )
              return prior;
            if (
              failedTerminalOutput &&
              prior &&
              hasArchivedOutputEvidence(task, prior)
            )
              return prior;
            if (
              outputStatusValue === "failed" &&
              prior &&
              hasArchivedOutputEvidence(task, prior)
            )
              return prior;
            if (
              outputStatusValue === "unknown" &&
              prior &&
              hasArchivedOutputEvidence(task, prior)
            )
              return prior;
            return {
              index,
              status:
                missingImageAsset ||
                missingText ||
                terminalPendingOutput ||
                uncertainPendingOutput
                  ? ("unknown" as const)
                  : failedTerminalOutput
                    ? ("failed" as const)
                    : outputStatusValue,
              model: prior?.model ?? task.model,
              provider: prior?.provider ?? task.providerName,
              promptHash: prior?.promptHash,
              assetId: nativeOutput.assetId ?? prior?.assetId,
              text: nativeOutput.text ?? prior?.text,
              error: missingImageAsset
                ? "原生任务完成但未返回该输出的素材标识。"
                : missingText
                  ? "原生任务完成但未返回文案正文。"
                  : terminalPendingOutput
                    ? "原生任务完成但该输出没有终态回执。"
                    : uncertainPendingOutput
                      ? (native.failure ??
                        "原生任务输出回执状态不明，请先核对供应商。")
                      : failedTerminalOutput
                        ? (native.failure ??
                          "原生任务失败但该输出没有终态回执。")
                        : nativeOutput.error,
              createdAt: prior?.createdAt ?? task.createdAt,
            } satisfies CreationTaskOutput;
          });
          const succeeded = outputs.filter(
            (output) =>
              output.status === "succeeded" &&
              native.outputs.some(
                (candidate) =>
                  candidate.index === output.index &&
                  candidate.status === "succeeded",
              ),
          );
          for (const output of succeeded) {
            if (task.kind === "text") {
              try {
                const resultItem = textTaskResult(
                  project.id,
                  task,
                  output.index,
                  output.text ?? "",
                );
                const index = items.findIndex(
                  (item) => item.id === resultItem.id,
                );
                // An existing result belongs to the user: its text/title may
                // have been edited since the original provider journal entry.
                if (index >= 0) continue;
                items.push(resultItem);
                projectChanged = changed = true;
              } catch {
                output.status = "unknown";
                output.error = "原生文本结果缺失或无效，请先核对任务。";
              }
              continue;
            }
            if (!output.assetId) continue;
            try {
              const resultId = `${project.id}-${task.id}-result-${output.index + 1}`;
              const priorOutput = existing.find(
                (candidate) => candidate.index === output.index,
              );
              if (
                task.imageEdit &&
                priorOutput?.status === "failed" &&
                priorOutput.error?.includes("无法可靠映射")
              ) {
                Object.assign(output, priorOutput);
                continue;
              }
              // A protected composite is durable evidence; never reapply an old
              // native crop over a result or draft already owned by the user.
              if (
                priorOutput?.status === "succeeded" &&
                priorOutput.assetId &&
                (task.resultItemId ||
                  items.some(
                    (item) =>
                      item.id === resultId &&
                      item.assetId === priorOutput.assetId,
                  ))
              ) {
                const archived = await readNativeAsset(priorOutput.assetId);
                if (archived) {
                  Object.assign(output, priorOutput);
                  continue;
                }
              }
              const rawAsset = await readNativeAsset(output.assetId);
              const asset = rawAsset
                ? await composeNativeEditAsset(task, rawAsset, project.tasks)
                : null;
              if (!asset) {
                output.status = "unknown";
                output.error = "原生任务已完成，但本地素材原件尚未找到。";
                continue;
              }
              output.assetId = asset.assetId;
              const resultItem = {
                id: resultId,
                title: `图片结果 ${output.index + 1}`,
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
                  title: `图片结果 ${output.index + 1}`,
                  src: asset.preview,
                  description: `来自 ${task.providerName ?? "已配置模型"} 的已归档图片结果`,
                  source: "provider" as const,
                },
              };
              const index = items.findIndex((item) => item.id === resultId);
              if (index >= 0) {
                if (items[index].assetId !== resultItem.assetId) {
                  items[index] = resultItem;
                  projectChanged = changed = true;
                }
              } else {
                items.push(resultItem);
                projectChanged = changed = true;
              }
            } catch (error) {
              output.status =
                error instanceof ImageEditMappingError ? "failed" : "unknown";
              output.error =
                error instanceof ImageEditMappingError
                  ? error.message
                  : "原生任务已完成，但本地素材原件读取失败。";
            }
          }
          const hasUnknown =
            native.status === "unknown" ||
            outputs.some((output) => output.status === "unknown");
          const completed = outputs.filter(
            (output) => output.status === "succeeded",
          ).length;
          const hasFailed = outputs.some(
            (output) =>
              output.status === "failed" || output.status === "cancelled",
          );
          const completeArchivedEvidence =
            completed === task.requestedOutputs &&
            (native.status === "succeeded" || native.status === "failed");
          const status = hasUnknown
            ? "unknown"
            : completeArchivedEvidence
              ? "succeeded"
              : native.status === "succeeded"
                ? completed === task.requestedOutputs
                  ? "succeeded"
                  : hasFailed
                    ? completed > 0
                      ? "partial"
                      : "failed"
                    : "unknown"
                : native.status === "failed"
                  ? completed > 0
                    ? "partial"
                    : "failed"
                  : "running";
          const firstSucceeded = outputs.find(
            (output) => output.status === "succeeded",
          );
          const nextTask: CreationTask = {
            ...task,
            status,
            submissionState:
              status === "running"
                ? ("submitted" as const)
                : status === "unknown"
                  ? ("unknown" as const)
                  : ("terminal" as const),
            submittedAt: task.submittedAt ?? native.updatedAt,
            outputs,
            completedOutputs: completed,
            resultItemId: firstSucceeded
              ? `${project.id}-${task.id}-result-${firstSucceeded.index + 1}`
              : task.resultItemId,
            error:
              status === "succeeded"
                ? undefined
                : hasUnknown
                  ? (outputs.find((output) => output.status === "unknown")
                      ?.error ??
                    native.failure ??
                    "原生任务受理状态不明，请先核对供应商；不会自动重复提交。")
                  : native.failure,
            updatedAt: native.updatedAt,
          };
          if (
            task.status === nextTask.status &&
            task.submissionState === nextTask.submissionState &&
            task.submittedAt === nextTask.submittedAt &&
            task.error === nextTask.error &&
            task.updatedAt === nextTask.updatedAt &&
            JSON.stringify(task.outputs ?? []) ===
              JSON.stringify(nextTask.outputs ?? [])
          )
            return task;
          projectChanged = changed = true;
          return nextTask;
        }),
      );
      const sourceStates = new Map<string, "clear" | "pending" | "error">();
      for (const task of tasks) {
        const uncertain =
          task.status === "unknown" ||
          task.submissionState === "unknown" ||
          task.outputs?.some((output) => output.status === "unknown");
        const sourceItemId =
          task.sourceItemId !== undefined
            ? items.some((item) => item.id === task.sourceItemId)
              ? task.sourceItemId
              : undefined
            : (items.find((item) => item.id === `${project.id}-prompt`)?.id ??
              items.find((item) => item.kind === "image" && !item.result)?.id);
        if (!sourceItemId) continue;
        if (!items.some((item) => item.id === sourceItemId)) continue;
        const state =
          uncertain || task.status === "failed" || task.status === "offline"
            ? ("error" as const)
            : task.status === "running" || task.status === "queued"
              ? ("pending" as const)
              : ("clear" as const);
        const currentState = sourceStates.get(sourceItemId);
        const priority = { clear: 0, pending: 1, error: 2 } as const;
        if (!currentState || priority[state] > priority[currentState])
          sourceStates.set(sourceItemId, state);
      }
      for (const [sourceItemId, sourceState] of sourceStates) {
        const sourceIndex = items.findIndex((item) => item.id === sourceItemId);
        if (sourceIndex < 0) continue;
        const nextGenerationStatus =
          sourceState === "error"
            ? ("error" as const)
            : sourceState === "pending"
              ? ("pending" as const)
              : undefined;
        if (items[sourceIndex].generationStatus === nextGenerationStatus)
          continue;
        items[sourceIndex] = {
          ...items[sourceIndex],
          generationStatus: nextGenerationStatus,
        };
        projectChanged = changed = true;
      }
      const canvas = reconcileProjectCanvas(project.canvas, items);
      for (const task of tasks) {
        const sourceItemId =
          task.sourceItemId !== undefined
            ? items.some((item) => item.id === task.sourceItemId)
              ? task.sourceItemId
              : undefined
            : (items.find((item) => item.id === `${project.id}-prompt`)?.id ??
              items.find((item) => item.kind === "image" && !item.result)?.id);
        if (!sourceItemId || !items.some((item) => item.id === sourceItemId))
          continue;
        for (const output of task.outputs ?? []) {
          if (output.status !== "succeeded") continue;
          const target = `${project.id}-${task.id}-result-${output.index + 1}`;
          if (!items.some((item) => item.id === target)) continue;
          const existingEdgeIndex = canvas.edges.findIndex(
            (edge) => edge.target === target && edge.kind === "result",
          );
          if (existingEdgeIndex >= 0) {
            const existingEdge = canvas.edges[existingEdgeIndex];
            if (existingEdge.source === sourceItemId) continue;
            const preferredId = `result-${target}`;
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
            projectChanged = changed = true;
            continue;
          }
          const preferredId = `result-${target}`;
          const edgeId = canvas.edges.some((edge) => edge.id === preferredId)
            ? `result-${sourceItemId}-${target}`
            : preferredId;
          canvas.edges.push({
            id: edgeId,
            source: sourceItemId,
            target,
            kind: "result",
          });
          projectChanged = changed = true;
        }
      }
      if (!projectChanged) return project;
      return { ...project, items, tasks, canvas, updatedAt: Date.now() };
    }),
  );
  return reconcileRetryTaskParents(
    changed
      ? { ...snapshot, projects, revision: snapshot.revision + 1 }
      : snapshot,
  );
}
