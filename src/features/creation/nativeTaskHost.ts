import { invoke } from "@tauri-apps/api/core";
import type {
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";
import { readNativeAsset, usesNativeAssets } from "./nativeAssetAdapter.ts";
import { textTaskResult } from "./textTaskResult.ts";
import { reconcileProjectCanvas } from "../../domain/projectCanvas.ts";

/** The request crossing the Desktop TaskHost IPC boundary. It contains no API key. */
export interface NativeTaskHostRequest {
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

export function usesNativeTaskHost(): boolean {
  return usesNativeAssets();
}

export function nativeTaskHostUnavailableError(): Error {
  return new Error(DESKTOP_UNAVAILABLE);
}

function requireNativeTaskHost(): void {
  if (!usesNativeTaskHost()) throw nativeTaskHostUnavailableError();
}

function normalizeRecord(
  value: NativeTaskHostRecord & { assetIds?: unknown; failure?: unknown },
): NativeTaskHostRecord {
  const rawOutputs = Array.isArray(value.outputs)
    ? value.outputs
    : Array.isArray(value.assetIds)
      ? value.assetIds.map((assetId, index) => ({
          index: Array.isArray(value.outputIndices)
            ? (value.outputIndices[index] ?? index)
            : index,
          status: "succeeded" as const,
          assetId: typeof assetId === "string" ? assetId : undefined,
          error: undefined,
        }))
      : [];
  const outputs = rawOutputs
    .filter((output) => output && Number.isSafeInteger(output.index))
    .map((output) => ({
      index: output.index,
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
    status:
      value.status === "succeeded" ||
      value.status === "failed" ||
      value.status === "unknown"
        ? value.status
        : "submitted",
    outputIndices: Array.isArray(value.outputIndices)
      ? value.outputIndices.filter((index): index is number =>
          Number.isSafeInteger(index),
        )
      : outputs.map((output) => output.index),
    outputs,
    failure:
      typeof value.failure === "string"
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

function taskStatus(record: NativeTaskHostRecord): CreationTask["status"] {
  if (record.status === "succeeded") return "succeeded";
  if (record.status === "failed") return "failed";
  if (record.status === "unknown") return "unknown";
  return "running";
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
          const native =
            byTaskId.get(task.id) ?? byIdempotency.get(task.idempotencyKey);
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
            projectChanged = changed = true;
            return {
              ...task,
              status: "unknown" as const,
              submissionState: "unknown" as const,
              error:
                "Desktop TaskHost 中没有找到原任务记录，请先核对供应商；不会自动重复提交。",
              updatedAt: Date.now(),
            };
          }
          const existing = task.outputs ?? [];
          const outputs = native.outputs.length
            ? native.outputs.map((output) => {
                const prior = existing.find(
                  (item) => item.index === output.index,
                );
                return {
                  index: output.index,
                  status: outputStatus(output.status),
                  model: prior?.model ?? task.model,
                  provider: prior?.provider ?? task.providerName,
                  promptHash: prior?.promptHash,
                  assetId: output.assetId,
                  text: output.text,
                  error: output.error,
                  createdAt: prior?.createdAt ?? task.createdAt,
                } satisfies CreationTaskOutput;
              })
            : existing.map((output) => ({
                ...output,
                status:
                  native.status === "submitted"
                    ? ("running" as const)
                    : output.status,
              }));
          const succeeded = outputs.filter(
            (output) => output.status === "succeeded",
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
              const asset = await readNativeAsset(output.assetId);
              if (!asset) {
                output.status = "unknown";
                output.error = "原生任务已完成，但本地素材原件尚未找到。";
                continue;
              }
              const resultId = `${project.id}-${task.id}-result-${output.index + 1}`;
              const resultItem = {
                id: resultId,
                title: `图片结果 ${output.index + 1}`,
                description: `${task.model} · 已归档 ${asset.assetId}`,
                kind: "image" as const,
                prompt: task.prompt,
                model: task.model,
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
            } catch {
              output.status = "unknown";
              output.error = "原生任务已完成，但本地素材原件读取失败。";
            }
          }
          const hasUnknown =
            native.status === "unknown" ||
            outputs.some((output) => output.status === "unknown");
          const status = hasUnknown ? "unknown" : taskStatus(native);
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
            completedOutputs: outputs.filter(
              (output) => output.status === "succeeded",
            ).length,
            resultItemId: firstSucceeded
              ? `${project.id}-${task.id}-result-${firstSucceeded.index + 1}`
              : task.resultItemId,
            error: hasUnknown
              ? (native.failure ??
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
      if (!projectChanged) return project;
      const canvas = reconcileProjectCanvas(project.canvas, items);
      for (const task of tasks) {
        if (
          task.kind !== "text" ||
          !task.sourceItemId ||
          !items.some((item) => item.id === task.sourceItemId)
        )
          continue;
        for (const output of task.outputs ?? []) {
          if (output.status !== "succeeded") continue;
          const target = `${project.id}-${task.id}-result-${output.index + 1}`;
          if (
            items.some((item) => item.id === target) &&
            !canvas.edges.some(
              (edge) =>
                edge.source === task.sourceItemId && edge.target === target,
            )
          ) {
            canvas.edges.push({
              id: `result-${target}`,
              source: task.sourceItemId,
              target,
              kind: "result",
            });
          }
        }
      }
      return { ...project, items, tasks, canvas, updatedAt: Date.now() };
    }),
  );
  return changed
    ? { ...snapshot, projects, revision: snapshot.revision + 1 }
    : snapshot;
}
