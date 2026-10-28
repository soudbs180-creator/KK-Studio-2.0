import React, { useEffect, useRef, useState, type SetStateAction } from "react";
import {
  requiredApprovalGates,
  type ApprovalGate,
} from "../../domain/agentWorkflow.ts";
import type { Asset } from "../../domain/assets.ts";
import { assertCanvasDeliveries } from "../../domain/canvasDelivery.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { isLocalProviderUrl } from "../../domain/providerUrl.ts";
import { imageResultContext } from "../image-edit/context.ts";
import { createImageEditRuntime } from "../image-edit/editTasks.ts";
import { ImageEditMappingError } from "../image-edit/imageProcessing.ts";
import { imageRegeneration } from "../image-edit/regeneration.ts";
import {
  hashPrompt,
  loadStoredAsset,
  storeGeneratedAsset,
} from "./assetRepository.ts";
import { mapWithConcurrency } from "./generationQueue.ts";
import { generateImages, GenerationProviderError } from "./imageGeneration.ts";
import {
  appendImageTaskResults,
  assertLiveTextTask,
} from "./imageTaskCommand.ts";
import type {
  CreationProject,
  CreationSnapshot,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";
import { executeNativeFlow } from "./nativeTaskExecution.ts";
import {
  cancelNativeTask,
  usesNativeTaskHost,
  type NativeTaskHostRecord,
} from "./nativeTaskHost.ts";
import { compileDesignPrompt } from "./promptCompiler.ts";
import {
  markProviderConnectionFailure,
  markProviderConnectionHealthy,
  readProviderConnections,
} from "./providerRegistry.ts";
import {
  ProviderSubmissionError,
  reserveProviderSubmissionAsync,
  taskProviderOptions,
  taskSubmissionBinding,
  type ProviderSubmissionReservation,
} from "./providerSubmission.ts";
import {
  abortedAfterProviderSubmission,
  canRetryTask,
  markArchiveFailuresUnknown,
  mergeRetryTaskState,
  preserveAcceptedOutputsOnDeliveryFailure,
  retryableOutputIndices,
  retryBlockedOutputIndices,
  submissionMayHaveBeenAccepted,
} from "./taskRecovery.ts";
import { generateText } from "./textGeneration.ts";
import { textTaskResult } from "./textTaskResult.ts";

export function outputsForTask(task: CreationTask): CreationTaskOutput[] {
  const completed = new Set(
    task.completedOutputIndices?.length
      ? task.completedOutputIndices
      : Array.from(
          {
            length: Math.min(task.completedOutputs, task.requestedOutputs),
          },
          (_, index) => index,
        ),
  );
  return task.outputs?.length
    ? task.outputs
    : Array.from({ length: task.requestedOutputs }, (_, index) => ({
        index,
        status: completed.has(index)
          ? ("succeeded" as const)
          : ("waiting" as const),
        model: task.model,
        provider: task.providerName,
        createdAt: task.createdAt,
      }));
}

export function rootItemId(project: CreationProject): string | null {
  return (
    project.items.find((item) => item.id === `${project.id}-prompt`)?.id ??
    project.items.find((item) => item.kind === "image")?.id ??
    null
  );
}

/** Capacity failure hint: name connections the user can switch to right away. */
export function capacitySwitchHint(currentId: string | undefined): string {
  const available = readProviderConnections().filter(
    (connection) =>
      connection.id !== currentId &&
      connection.state !== "disabled" &&
      connection.state !== "quarantined" &&
      connection.state !== "cooldown",
  );
  if (available.length === 0)
    return "当前没有其他可用连接，请稍后在设置中核对连接或模型。";
  return `当前可用连接：${available
    .slice(0, 3)
    .map((item) => item.displayName || item.provider)
    .join("、")}${
    available.length > 3 ? " 等" : ""
  }；可在设置中切换连接或模型后重试。`;
}

export function hasArchivedOutputEvidence(
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

export interface UseTaskExecutionOptions {
  creationRef: React.MutableRefObject<CreationSnapshot>;
  updateProject: (
    projectId: string,
    updater: (project: CreationProject) => CreationProject,
  ) => void;
  commitCreation: (snapshot: CreationSnapshot) => void;
  persistence: {
    flush: () => Promise<void>;
    loadEpoch?: number;
  };
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
  replaceCanvasItems: (
    action: SetStateAction<CanvasCollectionItem[]>,
  ) => CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  openSettingsProviders?: () => void;
  taskControllers?: React.MutableRefObject<Record<string, AbortController>>;
}

export interface UseTaskExecutionReturn {
  executeTask: (
    projectId: string,
    taskId: string,
    initialProject?: CreationProject,
    explicitRetry?: boolean,
  ) => Promise<void>;
  cancelTask: (taskId: string) => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  retryTask: (
    projectId: string,
    oldTaskId: string,
    outputIndex?: number,
  ) => void;
  regenerateImageTask: (projectId: string, taskId: string) => void;
  pendingApproval: {
    projectId: string;
    taskId: string;
    gates: ApprovalGate[];
  } | null;
  pendingApprovalTask: CreationTask | undefined;
  resolveTaskApproval: (approved: boolean) => void;
  savingResultTaskIds: Set<string>;
  taskControllers: React.MutableRefObject<Record<string, AbortController>>;
  canPauseTask: (taskId: string) => boolean;
}

/**
 * 核心任务调度与执行 Hook：负责单任务生命周期管理（审批门禁、原生/网络双轨执行、结果校验交付与重试）。
 */
export function useTaskExecution(
  options: UseTaskExecutionOptions,
): UseTaskExecutionReturn {
  const {
    creationRef,
    updateProject,
    commitCreation,
    persistence,
    activeProjectIdRef,
    replaceCanvasItems,
    setAssets,
    openSettingsProviders,
  } = options;

  const defaultControllers = useRef<Record<string, AbortController>>({});
  const taskControllers = options.taskControllers ?? defaultControllers;

  const [savingResultTaskIds, setSavingResultTaskIds] = useState(
    new Set<string>(),
  );
  useEffect(() => setSavingResultTaskIds(new Set()), [persistence.loadEpoch]);

  const nativeTaskRecords = useRef<Record<string, NativeTaskHostRecord>>({});
  const nativeCancelRequested = useRef(new Set<string>());
  const pausedTaskIds = useRef(new Set<string>());

  const [pendingApproval, setPendingApproval] = useState<{
    projectId: string;
    taskId: string;
    gates: ApprovalGate[];
  } | null>(null);
  const pendingApprovalRef = useRef(pendingApproval);
  pendingApprovalRef.current = pendingApproval;

  const pendingApprovalTask = creationRef.current.projects
    .find((project) => project.id === pendingApproval?.projectId)
    ?.tasks.find((task) => task.id === pendingApproval?.taskId);

  const canPauseTask = (taskId: string): boolean =>
    Boolean(taskControllers.current[taskId]);

  function pauseTask(taskId: string): void {
    pausedTaskIds.current.add(taskId);
    taskControllers.current[taskId]?.abort("paused");
  }

  function resumeTask(taskId: string): void {
    const project = creationRef.current.projects.find((item) =>
      item.tasks.some((task) => task.id === taskId),
    );
    if (!project || taskControllers.current[taskId]) return;
    pausedTaskIds.current.delete(taskId);
    void executeTask(project.id, taskId, project, true);
  }

  function regenerateImageTask(projectId: string, taskId: string): void {
    const project = creationRef.current.projects.find(
      (p) => p.id === projectId,
    );
    const task = project?.tasks.find((t) => t.id === taskId);
    if (
      !project ||
      !task ||
      task.kind !== "image" ||
      task.status !== "succeeded" ||
      project.tasks.some((t) => ["queued", "running"].includes(t.status))
    )
      return;
    const regenerated = imageRegeneration(task);
    const next = {
      ...project,
      tasks: [...project.tasks, regenerated],
      updatedAt: Date.now(),
    };
    commitCreation({
      ...creationRef.current,
      projects: creationRef.current.projects.map((p) =>
        p.id === projectId ? next : p,
      ),
    });
    void executeTask(projectId, regenerated.id, next, true);
  }

  function cancelTask(taskId: string): void {
    cancelQueuedImageEditGroupTasks(taskId, creationRef, updateProject);
    pausedTaskIds.current.delete(taskId);

    const controller = taskControllers.current[taskId];
    if (controller) {
      if (usesNativeTaskHost()) {
        nativeCancelRequested.current.add(taskId);
        if (nativeTaskRecords.current[taskId]) {
          void cancelNativeTask(taskId).catch((err) => {
            console.warn("[useTaskExecution] cancelNativeTask failed:", err);
          });
        }
      }
      controller.abort("user");
      return;
    }

    const handledRecovered = cancelRecoveredNativeTaskIfPresent(
      taskId,
      creationRef,
    );
    if (handledRecovered) return;

    cancelInactiveQueuedTask({
      taskId,
      creationRef,
      updateProject,
      activeProjectIdRef,
      replaceCanvasItems,
      pendingApproval,
      setPendingApproval,
    });
  }

  function resolveTaskApproval(approved: boolean): void {
    if (!pendingApproval) return;
    const project = creationRef.current.projects.find(
      (item) => item.id === pendingApproval.projectId,
    );
    if (!project) {
      setPendingApproval(null);
      return;
    }
    if (
      !approved &&
      project.tasks.find((task) => task.id === pendingApproval.taskId)
        ?.imageEdit
    ) {
      pendingApprovalRef.current = null;
      cancelTask(pendingApproval.taskId);
      setPendingApproval(null);
      return;
    }
    const nextProject: CreationProject = {
      ...project,
      items: approved
        ? project.items
        : project.items.map((item) =>
            item.id ===
            (project.tasks.find((task) => task.id === pendingApproval.taskId)
              ?.sourceItemId ?? rootItemId(project))
              ? { ...item, generationStatus: undefined }
              : item,
          ),
      tasks: project.tasks.map((task) =>
        task.id === pendingApproval.taskId
          ? {
              ...task,
              approvedGates: approved
                ? [
                    ...new Set([
                      ...(task.approvedGates ?? []),
                      ...pendingApproval.gates,
                    ]),
                  ]
                : [],
              status: approved ? "queued" : "cancelled",
              error: approved ? undefined : "人工审批已取消，未发送远程请求。",
              outputs: task.outputs?.map((output) => ({
                ...output,
                status: approved ? "waiting" : "cancelled",
              })),
              updatedAt: Date.now(),
            }
          : task,
      ),
    };
    updateProject(project.id, () => nextProject);
    if (activeProjectIdRef.current === project.id)
      replaceCanvasItems(nextProject.items);
    setPendingApproval(null);
    pendingApprovalRef.current = null;
    if (approved)
      void executeTask(project.id, pendingApproval.taskId, nextProject);
  }

  function retryTask(
    projectId: string,
    oldTaskId: string,
    outputIndex?: number,
  ): void {
    const project = creationRef.current.projects.find(
      (item) => item.id === projectId,
    );
    const oldTask = project?.tasks.find((item) => item.id === oldTaskId);
    if (!project || !oldTask || taskControllers.current[oldTaskId]) return;
    if (!canRetryTask(oldTask)) return;
    let rootTask = oldTask;
    let targetIndices = retryableOutputIndices(
      oldTask,
      outputsForTask(oldTask),
      outputIndex,
    );
    const visited = new Set<string>();
    while (rootTask.retryOfTaskId && !visited.has(rootTask.id)) {
      visited.add(rootTask.id);
      const parent = project.tasks.find(
        (candidate) => candidate.id === rootTask.retryOfTaskId,
      );
      if (!parent) break;
      targetIndices = targetIndices.map(
        (index) => rootTask.retryOutputIndices?.[index] ?? index,
      );
      rootTask = parent;
    }
    const rootOutputs = outputsForTask(rootTask);
    targetIndices = targetIndices.filter((index) =>
      retryableOutputIndices(rootTask, rootOutputs, index).includes(index),
    );
    const busyIndices = new Set(
      retryBlockedOutputIndices(project.tasks, rootTask.id),
    );
    targetIndices = targetIndices.filter((index) => !busyIndices.has(index));
    if (!targetIndices.length) return;
    if (!oldTask.providerBaseUrl) {
      commitCreation({
        ...creationRef.current,
        projects: creationRef.current.projects.map((item) =>
          item.id === projectId
            ? {
                ...item,
                composerDraft: {
                  ...item.composerDraft,
                  prompt: oldTask.prompt,
                  updatedAt: Date.now(),
                },
                updatedAt: Date.now(),
              }
            : item,
        ),
      });
      openSettingsProviders?.();
      return;
    }
    const now = Date.now();
    const retry = {
      ...oldTask,
      id: `${projectId}-task-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      status: "queued" as const,
      error: undefined,
      resultItemId: undefined,
      completedOutputs: 0,
      submissionState: "intent" as const,
      submittedAt: undefined,
      requestedOutputs: targetIndices.length,
      estimatedCostUsd: undefined,
      outputs: Array.from(
        {
          length: targetIndices.length,
        },
        (_, index) => ({
          index,
          status: "waiting" as const,
          model: oldTask.model,
          provider: oldTask.providerName,
          createdAt: now,
        }),
      ),
      idempotencyKey:
        oldTask.status === "interrupted" && oldTask.submissionState === "intent"
          ? oldTask.idempotencyKey
          : `${projectId}-generation-${now.toString(36)}-retry-${oldTask.attempt + 1}`,
      batchId: `${oldTask.batchId ?? `${projectId}-batch`}-retry-${oldTask.attempt + 1}`,
      attempt: oldTask.attempt + 1,
      approvedGates: [],
      retryOfTaskId: rootTask.id,
      retryOutputIndices: targetIndices,
      createdAt: now,
      updatedAt: now,
    };
    const nextProject = {
      ...project,
      tasks: [...project.tasks, retry],
      items: project.items.map((item) =>
        item.id === (retry.sourceItemId ?? rootItemId(project))
          ? { ...item, generationStatus: "pending" as const }
          : item,
      ),
      updatedAt: now,
    };
    commitCreation({
      ...creationRef.current,
      projects: creationRef.current.projects.map((item) =>
        item.id === projectId ? nextProject : item,
      ),
    });
    if (activeProjectIdRef.current === projectId)
      replaceCanvasItems(nextProject.items);
    void executeTask(projectId, retry.id, nextProject);
  }

  async function executeTask(
    projectId: string,
    taskId: string,
    initialProject?: CreationProject,
    explicitRetry = false,
  ): Promise<void> {
    const project =
      initialProject ??
      creationRef.current.projects.find((item) => item.id === projectId);
    const task = project?.tasks.find((item) => item.id === taskId);

    const allowed = validateTaskExecutionPreconditions({
      project,
      task,
      taskId,
      projectId,
      taskControllers,
      pendingApprovalRef,
      setPendingApproval,
      updateProject,
      creationRef,
    });
    if (!allowed || !task) return;

    const controller = new AbortController();
    taskControllers.current[taskId] = controller;

    const setResultSaving = (saving: boolean) => {
      if (
        taskControllers.current[taskId] !== controller ||
        (saving && controller.signal.aborted)
      )
        return;
      setSavingResultTaskIds((current) => {
        if (current.has(taskId) === saving) return current;
        const next = new Set(current);
        if (saving) next.add(taskId);
        else next.delete(taskId);
        return next;
      });
    };

    controller.signal.addEventListener("abort", () => setResultSaving(false), {
      once: true,
    });

    let outputs = outputsForTask(task);
    const pendingIndices = outputs
      .filter((output) => output.status !== "succeeded")
      .map((output) => output.index);

    const createdItems: CanvasCollectionItem[] = [];
    const publishedItems = new Set<string>();
    const rejectedDeliveryIds = new Set<string>();
    const deliveryErrorRef = { current: undefined as string | undefined };
    const archiveFailureIndices = new Set<number>();
    const mappingFailures = new Map<number, string>();
    let durableSubmission = false;
    let providerRequestStarted = false;
    let nativeSubmissionStarted = false;
    let terminalPublished = false;
    let terminalSaveFailed = false;

    const setOutputs = (next: CreationTaskOutput[]) => {
      outputs = next;
    };

    const flushPublishedResult = async () => {
      try {
        await persistence.flush();
      } catch (error) {
        terminalSaveFailed = terminalPublished;
        throw error;
      }
    };

    const publish = (
      status: CreationTask["status"],
      error?: string,
      submissionState?: CreationTask["submissionState"],
    ): void => {
      if (taskControllers.current[taskId] !== controller) return;
      terminalPublished = publishTaskOutputState({
        projectId,
        taskId,
        task,
        status,
        error,
        submissionState,
        outputs,
        createdItems,
        publishedItems,
        rejectedDeliveryIds,
        deliveryErrorRef,
        setOutputs,
        updateProject,
        creationRef,
        activeProjectIdRef,
        replaceCanvasItems,
      });
    };

    let reservation: ProviderSubmissionReservation | undefined;
    const nativeTaskHost = usesNativeTaskHost();

    try {
      if (!task.providerBaseUrl)
        throw new Error("历史任务未记录供应商，请从当前输入重新提交。");
      if (!pendingIndices.length) {
        publish("succeeded");
        return;
      }
      const compiledPrompt =
        task.kind === "text" || task.imageEdit || task.imageEditContext
          ? task.prompt
          : compileDesignPrompt(task.prompt, {
              referenceRoles: task.attachments.map(
                (attachment) => attachment.role,
              ),
              referenceCount: task.attachments.length,
              outputCount: task.requestedOutputs,
            });
      const promptHash = await hashPrompt(compiledPrompt);
      if (controller.signal.aborted) throw new Error("任务已停止。");
      if (!nativeTaskHost)
        reservation = await reserveProviderSubmissionAsync(
          taskSubmissionBinding(task),
          { explicitRetry: explicitRetry || Boolean(task.retryOfTaskId) },
        );
      if (controller.signal.aborted) throw new Error("任务已停止。");

      assertTaskCurrent(task, projectId, creationRef);
      outputs = outputs.map((output) =>
        output.status === "succeeded"
          ? output
          : { ...output, status: "running", error: undefined },
      );
      publish("queued", undefined, "intent");
      await persistence.flush();

      if (nativeTaskHost) {
        await executeNativeFlow({
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
          assertTextCurrent: () =>
            assertTaskCurrent(task, projectId, creationRef),
          nativeTaskRecords,
          nativeCancelRequested,
          creationRef,
          getOutputs: () => outputs,
          setOutputs: (next) => {
            outputs = next;
          },
          markSubmission: () => {
            durableSubmission = true;
            nativeSubmissionStarted = true;
          },
        });
        return;
      }

      publish("running", undefined, "submitted");
      await persistence.flush();
      durableSubmission = true;

      if (task.kind === "text") {
        await executeTextFlow({
          task,
          projectId,
          controller,
          outputs,
          createdItems,
          publish,
          flushPublishedResult,
          assertTextCurrent: () =>
            assertTaskCurrent(task, projectId, creationRef),
          reservation,
          onStart: () => {
            providerRequestStarted = true;
          },
        });
        return;
      }

      await executeImageFlow({
        task,
        projectId,
        taskId,
        compiledPrompt,
        promptHash,
        pendingIndices,
        controller,
        reservation,
        creationRef,
        createdItems,
        setAssets,
        setResultSaving,
        publish,
        flushPublishedResult,
        archiveFailureIndices,
        mappingFailures,
        durableSubmission,
        onStart: () => {
          providerRequestStarted = true;
        },
        getOutputs: () => outputs,
        setOutputs: (next) => {
          outputs = next;
        },
      });
    } catch (error) {
      if (terminalSaveFailed) return;
      await handleExecutionError({
        error,
        task,
        taskId,
        controller,
        durableSubmission,
        providerRequestStarted,
        nativeTaskHost,
        nativeSubmissionStarted,
        nativeCancelRequested,
        nativeTaskRecords,
        reservation,
        publish,
        persistence,
        getOutputs: () => outputs,
        setOutputs: (next) => {
          outputs = next;
        },
      });
    } finally {
      setResultSaving(false);
      try {
        await reservation?.release();
      } catch (err) {
        console.warn(
          "[useTaskExecution] Failed to release provider submission reservation:",
          err,
        );
      }
      if (taskControllers.current[taskId] === controller)
        delete taskControllers.current[taskId];

      triggerNextChainedImageEditTask({
        task,
        projectId,
        controller,
        creationRef,
        executeTask,
      });
    }
  }

  return {
    executeTask,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    regenerateImageTask,
    pendingApproval,
    pendingApprovalTask,
    resolveTaskApproval,
    savingResultTaskIds,
    taskControllers,
    canPauseTask,
  };
}

// ---------------------------------------------------------------------------
// 细粒度校验与辅助子函数
// ---------------------------------------------------------------------------

function assertTaskCurrent(
  task: CreationTask,
  projectId: string,
  creationRef: React.MutableRefObject<CreationSnapshot>,
): void {
  if (
    task.kind === "text" &&
    !navigator.onLine &&
    !isLocalProviderUrl(task.providerBaseUrl ?? "")
  )
    throw new Error("当前离线，未提交文本任务；草稿已保留。");
  if (task.kind === "text")
    assertLiveTextTask(
      creationRef.current.projects.find((item) => item.id === projectId),
      task,
    );
}

function cancelQueuedImageEditGroupTasks(
  taskId: string,
  creationRef: React.MutableRefObject<CreationSnapshot>,
  updateProject: (
    projectId: string,
    updater: (project: CreationProject) => CreationProject,
  ) => void,
): void {
  for (const project of creationRef.current.projects) {
    const groupId = project.tasks.find((t) => t.id === taskId)?.imageEdit
      ?.groupId;
    if (groupId) {
      updateProject(project.id, (current) => ({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id !== taskId &&
          t.imageEdit?.groupId === groupId &&
          t.status === "queued"
            ? {
                ...t,
                status: "cancelled",
                submissionState: "terminal",
                error: "本轮区域重绘已取消，成功候选保留。",
                outputs: t.outputs?.map((o) => ({
                  ...o,
                  status: "cancelled",
                })),
              }
            : t,
        ),
      }));
    }
  }
}

function cancelRecoveredNativeTaskIfPresent(
  taskId: string,
  creationRef: React.MutableRefObject<CreationSnapshot>,
): boolean {
  const recovered = creationRef.current.projects
    .flatMap((project) => project.tasks)
    .find(
      (task) =>
        task.id === taskId &&
        (task.submissionState === "submitted" ||
          task.submissionState === "unknown"),
    );
  if (usesNativeTaskHost() && recovered) {
    void cancelNativeTask(taskId).catch((err) => {
      console.warn("[useTaskExecution] cancelNativeTask failed:", err);
    });
    return true;
  }
  return false;
}

function cancelInactiveQueuedTask(options: {
  taskId: string;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  updateProject: (
    projectId: string,
    updater: (project: CreationProject) => CreationProject,
  ) => void;
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
  replaceCanvasItems: (
    action: SetStateAction<CanvasCollectionItem[]>,
  ) => CanvasCollectionItem[];
  pendingApproval: { taskId: string } | null;
  setPendingApproval: (val: null) => void;
}): void {
  const {
    taskId,
    creationRef,
    updateProject,
    activeProjectIdRef,
    replaceCanvasItems,
    pendingApproval,
    setPendingApproval,
  } = options;

  const project = creationRef.current.projects.find((item) =>
    item.tasks.some((task) => task.id === taskId && task.status === "queued"),
  );
  if (!project) return;
  const sourceItemId =
    project.tasks.find((task) => task.id === taskId)?.sourceItemId ??
    rootItemId(project);
  updateProject(project.id, (current) => ({
    ...current,
    items: current.items.map((item) =>
      item.id === sourceItemId
        ? { ...item, generationStatus: undefined }
        : item,
    ),
    tasks: current.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: "cancelled",
            error: "任务已取消，已归档的成功结果保留。",
            outputs: outputsForTask(task).map((output) =>
              output.status === "succeeded"
                ? output
                : { ...output, status: "cancelled" },
            ),
            updatedAt: Date.now(),
          }
        : task,
    ),
  }));
  if (activeProjectIdRef.current === project.id) {
    const latest = creationRef.current.projects.find(
      (item) => item.id === project.id,
    );
    if (latest) replaceCanvasItems(latest.items);
  }
  if (pendingApproval?.taskId === taskId) setPendingApproval(null);
}

function triggerNextChainedImageEditTask(options: {
  task: CreationTask;
  projectId: string;
  controller: AbortController;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  executeTask: (projectId: string, taskId: string) => Promise<void>;
}): void {
  const { task, projectId, controller, creationRef, executeTask } = options;
  if (task.imageEdit && !controller.signal.aborted) {
    const latest = creationRef.current.projects.find((p) => p.id === projectId);
    const next = latest?.tasks.find(
      (t) =>
        t.id !== task.id &&
        t.imageEdit?.groupId === task.imageEdit?.groupId &&
        t.status === "queued" &&
        t.submissionState !== "submitted" &&
        t.submissionState !== "unknown",
    );
    if (next) void executeTask(projectId, next.id);
  }
}

function validateTaskExecutionPreconditions(options: {
  project?: CreationProject;
  task?: CreationTask;
  taskId: string;
  projectId: string;
  taskControllers: React.MutableRefObject<Record<string, AbortController>>;
  pendingApprovalRef: React.MutableRefObject<{
    projectId: string;
    taskId: string;
    gates: ApprovalGate[];
  } | null>;
  setPendingApproval: React.Dispatch<
    React.SetStateAction<{
      projectId: string;
      taskId: string;
      gates: ApprovalGate[];
    } | null>
  >;
  updateProject: (
    projectId: string,
    updater: (p: CreationProject) => CreationProject,
  ) => void;
  creationRef: React.MutableRefObject<CreationSnapshot>;
}): boolean {
  const {
    project,
    task,
    taskId,
    projectId,
    taskControllers,
    pendingApprovalRef,
    setPendingApproval,
    updateProject,
    creationRef,
  } = options;

  if (!project || !task || taskControllers.current[taskId]) return false;

  if (task.imageEdit) {
    const live =
      creationRef.current.projects.find((p) => p.id === projectId) ?? project;
    if (
      live.tasks.some(
        (other) =>
          other.id !== taskId &&
          other.imageEdit?.groupId === task.imageEdit?.groupId &&
          taskControllers.current[other.id],
      )
    )
      return false;
    if (
      pendingApprovalRef.current &&
      pendingApprovalRef.current.taskId !== taskId
    )
      return false;
  }

  if (
    task.status === "unknown" ||
    task.submissionState === "unknown" ||
    task.submissionState === "submitted"
  )
    return false;

  const missingGates = requiredApprovalGates({
    privacyMode: task.privacyMode,
    requestedOutputs: task.requestedOutputs,
    providerBaseUrl: task.providerBaseUrl,
  }).filter((gate) => !task.approvedGates?.includes(gate));

  if (missingGates.length) {
    pendingApprovalRef.current = { projectId, taskId, gates: missingGates };
    setPendingApproval({ projectId, taskId, gates: missingGates });
    updateProject(projectId, (current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              status: "queued",
              error: "等待人工审批，尚未提交到供应商。",
            }
          : item,
      ),
    }));
    return false;
  }

  return true;
}

interface PublishStateOptions {
  projectId: string;
  taskId: string;
  task: CreationTask;
  status: CreationTask["status"];
  error?: string;
  submissionState?: CreationTask["submissionState"];
  outputs: CreationTaskOutput[];
  createdItems: CanvasCollectionItem[];
  publishedItems: Set<string>;
  rejectedDeliveryIds: Set<string>;
  deliveryErrorRef?: { current: string | undefined };
  setOutputs?: (outputs: CreationTaskOutput[]) => void;
  updateProject: (
    projectId: string,
    updater: (project: CreationProject) => CreationProject,
  ) => void;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  activeProjectIdRef: React.MutableRefObject<string | null | undefined>;
  replaceCanvasItems: (
    action: SetStateAction<CanvasCollectionItem[]>,
  ) => CanvasCollectionItem[];
}

export function publishTaskOutputState(options: PublishStateOptions): boolean {
  const {
    projectId,
    taskId,
    task,
    status,
    error,
    submissionState,
    outputs,
    createdItems,
    publishedItems,
    rejectedDeliveryIds,
    updateProject,
    creationRef,
    activeProjectIdRef,
    replaceCanvasItems,
  } = options;

  let deliveryErrorMessage: string | undefined =
    options.deliveryErrorRef?.current;
  let acceptedResults: CanvasCollectionItem[] = [];
  let terminalPublished = false;

  updateProject(projectId, (current) => {
    const pendingResults = createdItems.filter(
      (item) =>
        !publishedItems.has(item.id) && !rejectedDeliveryIds.has(item.id),
    );
    const withResults = appendImageTaskResults(
      current,
      pendingResults,
      task.sourceItemId ?? rootItemId(current),
    );
    acceptedResults = [];
    for (const result of pendingResults) {
      try {
        assertCanvasDeliveries({
          items: [result],
          project: withResults,
          label: "生成产物",
          requireAssetId: result.kind !== "text",
        });
        acceptedResults.push(result);
      } catch (validationError) {
        rejectedDeliveryIds.add(result.id);
        deliveryErrorMessage =
          validationError instanceof Error
            ? validationError.message
            : "生成产物未通过画布交付校验。";
      }
    }
    if (deliveryErrorMessage && options.deliveryErrorRef) {
      options.deliveryErrorRef.current = deliveryErrorMessage;
    }
    let effectiveOutputs = outputs;
    if (deliveryErrorMessage) {
      effectiveOutputs = preserveAcceptedOutputsOnDeliveryFailure(
        outputs,
        projectId,
        taskId,
        rejectedDeliveryIds,
        deliveryErrorMessage,
      );
      options.setOutputs?.(effectiveOutputs);
    }
    const publishedStatus = deliveryErrorMessage ? "unknown" : status;
    terminalPublished =
      publishedStatus !== "running" && publishedStatus !== "queued";
    const publishedError = deliveryErrorMessage ?? error;
    const publishedSubmissionState = deliveryErrorMessage
      ? ("unknown" as const)
      : submissionState;
    const sourceItemId = task.sourceItemId ?? rootItemId(current);
    const nextProject = appendImageTaskResults(
      current,
      acceptedResults,
      sourceItemId,
    );
    const nextTasks = current.tasks.map((item) => {
      if (item.id === taskId) {
        return {
          ...item,
          status: publishedStatus,
          error: publishedError,
          submissionState: publishedSubmissionState ?? item.submissionState,
          submittedAt:
            publishedSubmissionState === "submitted"
              ? (item.submittedAt ?? Date.now())
              : item.submittedAt,
          outputs: [...effectiveOutputs],
          completedOutputs: effectiveOutputs.filter(
            (output) => output.status === "succeeded",
          ).length,
          resultItemId: acceptedResults[0]?.id ?? item.resultItemId,
          updatedAt: Date.now(),
        };
      }
      if (item.id !== task.retryOfTaskId) return item;
      const merged = mergeRetryTaskState({
        parent: { ...item, outputs: outputsForTask(item) },
        retry: {
          outputs: effectiveOutputs,
          retryOutputIndices: task.retryOutputIndices,
          status: publishedStatus,
          submissionState: publishedSubmissionState,
          error: publishedError,
        },
      });
      return {
        ...item,
        ...merged,
        updatedAt: Date.now(),
      };
    });

    const sourceTasks = nextTasks.filter(
      (candidate) =>
        (candidate.sourceItemId ?? rootItemId(current)) === sourceItemId,
    );
    const sourceUncertain = sourceTasks.some(
      (candidate) =>
        candidate.status === "unknown" ||
        candidate.submissionState === "unknown" ||
        candidate.outputs?.some((output) => output.status === "unknown"),
    );
    const sourceRunning = sourceTasks.some(
      (candidate) =>
        candidate.status === "queued" ||
        candidate.status === "running" ||
        candidate.submissionState === "submitted",
    );
    const sourceFailed = sourceTasks.some(
      (candidate) =>
        candidate.status === "failed" || candidate.status === "offline",
    );
    const sourceGenerationStatus = sourceUncertain
      ? ("error" as const)
      : sourceRunning
        ? ("pending" as const)
        : sourceFailed
          ? ("error" as const)
          : undefined;

    return {
      ...nextProject,
      tasks: nextTasks,
      items: [
        ...current.items.map((item) =>
          item.id === sourceItemId
            ? {
                ...item,
                generationStatus: sourceGenerationStatus,
              }
            : item,
        ),
        ...acceptedResults.filter(
          (result) => !current.items.some((item) => item.id === result.id),
        ),
      ],
      updatedAt: Date.now(),
    };
  });

  acceptedResults.forEach((item) => publishedItems.add(item.id));
  if (activeProjectIdRef.current === projectId) {
    const latest = creationRef.current.projects.find(
      (item) => item.id === projectId,
    );
    if (latest) replaceCanvasItems(latest.items);
  }
  return terminalPublished;
}

interface TextFlowOptions {
  task: CreationTask;
  projectId: string;
  controller: AbortController;
  outputs: CreationTaskOutput[];
  createdItems: CanvasCollectionItem[];
  publish: (
    status: CreationTask["status"],
    error?: string,
    submissionState?: CreationTask["submissionState"],
  ) => void;
  flushPublishedResult: () => Promise<void>;
  assertTextCurrent: () => void;
  reservation?: ProviderSubmissionReservation;
  onStart: () => void;
}

async function executeTextFlow(options: TextFlowOptions): Promise<void> {
  const {
    task,
    projectId,
    controller,
    outputs,
    createdItems,
    publish,
    flushPublishedResult,
    assertTextCurrent,
    reservation,
    onStart,
  } = options;

  const text = await generateText({
    prompt: task.prompt,
    model: task.model,
    providerBaseUrl: task.providerBaseUrl!,
    protocol: task.providerProtocol,
    authMode: task.providerAuthMode,
    credentialRef: task.providerCredentialRef,
    idempotencyKey: task.idempotencyKey,
    signal: controller.signal,
    beforeRequest: () => {
      assertTextCurrent();
      reservation!.assertCurrent();
    },
    onRequestStart: onStart,
    onText: (value) => {
      if (controller.signal.aborted) return;
      outputs[0] = { ...outputs[0], text: value };
      publish("running", undefined, "submitted");
    },
  });

  if (controller.signal.aborted) throw new Error("任务已停止。");
  createdItems.push(textTaskResult(projectId, task, outputs[0].index, text));
  outputs[0] = {
    ...outputs[0],
    status: "succeeded",
    text,
    error: undefined,
  };
  publish("succeeded", undefined, "terminal");
  await flushPublishedResult();
  if (task.providerConnectionId && reservation?.healthUnchanged())
    markProviderConnectionHealthy(task.providerConnectionId);
}

interface ImageFlowOptions {
  task: CreationTask;
  projectId: string;
  taskId: string;
  compiledPrompt: string;
  promptHash?: string;
  pendingIndices: number[];
  controller: AbortController;
  reservation?: ProviderSubmissionReservation;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  createdItems: CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  setResultSaving: (saving: boolean) => void;
  publish: (
    status: CreationTask["status"],
    error?: string,
    submissionState?: CreationTask["submissionState"],
  ) => void;
  flushPublishedResult: () => Promise<void>;
  archiveFailureIndices: Set<number>;
  mappingFailures: Map<number, string>;
  durableSubmission: boolean;
  onStart: () => void;
  getOutputs: () => CreationTaskOutput[];
  setOutputs: (outputs: CreationTaskOutput[]) => void;
}

async function executeImageFlow(options: ImageFlowOptions): Promise<void> {
  const {
    task,
    projectId,
    taskId,
    compiledPrompt,
    promptHash,
    pendingIndices,
    controller,
    reservation,
    creationRef,
    createdItems,
    setAssets,
    setResultSaving,
    publish,
    flushPublishedResult,
    archiveFailureIndices,
    mappingFailures,
    durableSubmission,
    onStart,
    getOutputs,
    setOutputs,
  } = options;

  const generated = await generateImages({
    prompt: compiledPrompt,
    model: task.model,
    attachments: task.attachments,
    signal: controller.signal,
    providerBaseUrl: task.providerBaseUrl,
    providerConnectionId: task.providerConnectionId,
    credentialRef: task.providerCredentialRef,
    count: pendingIndices.length,
    idempotencyKey: `${task.idempotencyKey}-remaining-${pendingIndices.join("-")}`,
    size: task.imageSize,
    maskAssetId: task.imageEdit?.nativeMask
      ? task.imageEdit.maskAssetId
      : undefined,
    beforeRequest: () => reservation!.assertCurrent(),
    onRequestStart: onStart,
    onChunk: async (sources, offset) => {
      await processChunkBatch({
        sources,
        offset,
        pendingIndices,
        task,
        projectId,
        taskId,
        promptHash,
        controller,
        creationRef,
        createdItems,
        setAssets,
        setResultSaving,
        publish,
        archiveFailureIndices,
        mappingFailures,
        getOutputs,
        setOutputs,
      });
    },
  });

  if (controller.signal.aborted) throw new Error("任务已停止。");

  setOutputs(
    markArchiveFailuresUnknown(
      getOutputs(),
      archiveFailureIndices,
      "供应商结果已返回，但本地素材归档失败；请先核对素材库，不会自动重复提交。",
    ).map((output) =>
      output.status === "succeeded" || output.status === "unknown"
        ? output
        : {
            ...output,
            status:
              durableSubmission &&
              generated.failure instanceof GenerationProviderError &&
              generated.failure.failureClass === "network"
                ? "unknown"
                : "failed",
            promptHash,
            error: mappingFailures.get(output.index) ?? "此项尚未归档。",
          },
    ),
  );

  const finalOutputs = getOutputs();
  const generatedUncertain =
    durableSubmission &&
    generated.failure instanceof GenerationProviderError &&
    generated.failure.failureClass === "network";
  const archiveUncertain = finalOutputs.some(
    (output) =>
      output.status === "unknown" && archiveFailureIndices.has(output.index),
  );

  const { status, completed } = resolveImageFlowStatus(
    finalOutputs,
    task.requestedOutputs,
    generatedUncertain,
    archiveUncertain,
  );

  const message = resolveImageFlowMessage({
    status,
    archiveUncertain,
    generatedUncertain,
    failure: generated.failure,
    completed,
    requestedOutputs: task.requestedOutputs,
    mappingFailures,
    connectionId: task.providerConnectionId,
  });

  recordConnectionHealth({
    task,
    failure: generated.failure,
    archiveUncertain,
    reservation,
  });
  publish(
    status,
    message,
    generatedUncertain || archiveUncertain ? "unknown" : "terminal",
  );
  await flushPublishedResult();
}

async function processChunkBatch(options: {
  sources: string[];
  offset: number;
  pendingIndices: number[];
  task: CreationTask;
  projectId: string;
  taskId: string;
  promptHash?: string;
  controller: AbortController;
  creationRef: React.MutableRefObject<CreationSnapshot>;
  createdItems: CanvasCollectionItem[];
  setAssets: React.Dispatch<SetStateAction<Asset[]>>;
  setResultSaving: (saving: boolean) => void;
  publish: (status: CreationTask["status"]) => void;
  archiveFailureIndices: Set<number>;
  mappingFailures: Map<number, string>;
  getOutputs: () => CreationTaskOutput[];
  setOutputs: (outputs: CreationTaskOutput[]) => void;
}): Promise<void> {
  const {
    sources,
    offset,
    pendingIndices,
    task,
    projectId,
    taskId,
    promptHash,
    controller,
    creationRef,
    createdItems,
    setAssets,
    setResultSaving,
    publish,
    archiveFailureIndices,
    mappingFailures,
    getOutputs,
    setOutputs,
  } = options;

  setResultSaving(true);
  const archived = await mapWithConcurrency(
    sources,
    2,
    async (source, sourceIndex) => {
      try {
        const protectedSource = await composeEditResult(
          task,
          source,
          creationRef.current.projects.find((p) => p.id === projectId)?.tasks ??
            [],
          controller.signal,
        );
        return await storeGeneratedAsset({
          source: protectedSource,
          provider: task.providerName,
          model: task.model,
          sourceJobId: task.id,
          connectionId: task.providerConnectionId,
          promptHash,
          parentId:
            task.imageEdit?.sourceAssetId ??
            task.attachments.find((attachment) => attachment.assetId)?.assetId,
          tags: ["AI生成", task.providerName ?? ""],
          signal: controller.signal,
        });
      } catch (error) {
        const target = pendingIndices[offset + sourceIndex];
        if (target != null) {
          if (error instanceof ImageEditMappingError)
            mappingFailures.set(target, error.message);
          else archiveFailureIndices.add(target);
        }
        return null;
      }
    },
  );

  archived.forEach((asset, index) => {
    const target = pendingIndices[offset + index];
    if (!asset || target == null) return;
    setOutputs(
      getOutputs().map((output) =>
        output.index === target
          ? {
              ...output,
              status: "succeeded",
              assetId: asset.assetId,
              model: task.model,
              provider: task.providerName,
              promptHash,
              error: undefined,
              createdAt: Date.now(),
            }
          : output,
      ),
    );
    const id = `${projectId}-${taskId}-result-${target + 1}`;
    createdItems.push({
      id,
      title: `图片结果 ${target + 1}`,
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
        title: `图片结果 ${target + 1}`,
        src: asset.preview,
        description: `来自 ${task.providerName ?? "已配置模型"} 的已归档图片结果`,
        source: "provider",
      },
    });
  });

  setAssets((current) => {
    const seen = new Set(current.map((asset) => asset.id));
    const additions = archived.flatMap((asset) => {
      if (!asset) return [];
      seen.add(asset.assetId);
      return [
        {
          id: asset.assetId,
          name:
            current.find((item) => item.id === asset.assetId)?.name ??
            `AI 结果 ${seen.size}`,
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
    return Array.from(
      new Map(
        [...current, ...additions].map((asset) => [asset.id, asset]),
      ).values(),
    );
  });
  publish("running");
  setResultSaving(false);
}

function resolveImageFlowStatus(
  outputs: CreationTaskOutput[],
  requestedOutputs: number,
  generatedUncertain: boolean,
  archiveUncertain: boolean,
): { status: CreationTask["status"]; completed: number } {
  const completed = outputs.filter((o) => o.status === "succeeded").length;
  if (generatedUncertain || archiveUncertain) {
    return { status: "unknown", completed };
  }
  if (completed === requestedOutputs) {
    return { status: "succeeded", completed };
  }
  if (completed > 0) {
    return { status: "partial", completed };
  }
  return { status: "failed", completed };
}

function resolveImageFlowMessage(options: {
  status: CreationTask["status"];
  archiveUncertain: boolean;
  generatedUncertain: boolean;
  failure: unknown;
  completed: number;
  requestedOutputs: number;
  mappingFailures: Map<number, string>;
  connectionId?: string;
}): string | undefined {
  const {
    status,
    archiveUncertain,
    generatedUncertain,
    failure,
    completed,
    requestedOutputs,
    mappingFailures,
    connectionId,
  } = options;

  if (archiveUncertain) {
    return "供应商结果已返回，但本地素材归档失败；请先核对素材库，不会自动重复提交。";
  }
  if (generatedUncertain) {
    return "供应商受理状态不明，请先核对供应商；为避免重复扣费，当前不会普通重试。";
  }
  if (status === "succeeded") return undefined;
  if (failure instanceof ProviderSubmissionError) return failure.message;
  if (
    failure instanceof GenerationProviderError &&
    failure.failureClass === "rate_limited"
  ) {
    return `${failure.message} ${capacitySwitchHint(connectionId)}`;
  }
  const mappingError = mappingFailures.values().next().value;
  return (
    mappingError ??
    `${completed}/${requestedOutputs} 张已归档，可重试未归档结果。`
  );
}

function recordConnectionHealth(options: {
  task: CreationTask;
  failure: unknown;
  archiveUncertain: boolean;
  reservation?: ProviderSubmissionReservation;
}): void {
  const { task, failure, archiveUncertain, reservation } = options;
  if (!task.providerConnectionId) return;

  if (
    failure instanceof GenerationProviderError &&
    [
      "rate_limited",
      "unauthorized",
      "forbidden",
      "provider_unavailable",
      "network",
    ].includes(failure.failureClass)
  ) {
    markProviderConnectionFailure(
      task.providerConnectionId,
      {
        kind: failure.failureClass as
          | "rate_limited"
          | "unauthorized"
          | "forbidden"
          | "provider_unavailable"
          | "network",
        retryAfterSeconds: failure.retryAfterSeconds,
      },
      taskProviderOptions(task),
    );
  } else if (!failure && !archiveUncertain && reservation?.healthUnchanged()) {
    markProviderConnectionHealthy(
      task.providerConnectionId,
      taskProviderOptions(task),
    );
  }
}

interface ExecutionErrorOptions {
  error: unknown;
  task: CreationTask;
  taskId: string;
  controller: AbortController;
  durableSubmission: boolean;
  providerRequestStarted: boolean;
  nativeTaskHost: boolean;
  nativeSubmissionStarted: boolean;
  nativeCancelRequested: React.MutableRefObject<Set<string>>;
  nativeTaskRecords: React.MutableRefObject<
    Record<string, NativeTaskHostRecord>
  >;
  reservation?: ProviderSubmissionReservation;
  publish: (
    status: CreationTask["status"],
    error?: string,
    submissionState?: CreationTask["submissionState"],
  ) => void;
  persistence: { flush: () => Promise<void> };
  getOutputs: () => CreationTaskOutput[];
  setOutputs: (outputs: CreationTaskOutput[]) => void;
}

function isTaskErrorUncertain(options: {
  durableSubmission: boolean;
  providerRequestStarted: boolean;
  nativeTaskHost: boolean;
  aborted: boolean;
  nativeSubmissionStarted: boolean;
  error: unknown;
  taskId: string;
  nativeCancelRequested: React.MutableRefObject<Set<string>>;
  nativeTaskRecords: React.MutableRefObject<
    Record<string, NativeTaskHostRecord>
  >;
}): boolean {
  const {
    durableSubmission,
    providerRequestStarted,
    nativeTaskHost,
    aborted,
    nativeSubmissionStarted,
    error,
    taskId,
    nativeCancelRequested,
    nativeTaskRecords,
  } = options;

  if (
    nativeTaskHost &&
    nativeCancelRequested.current.has(taskId) &&
    Boolean(nativeTaskRecords.current[taskId])
  ) {
    return true;
  }

  if (
    abortedAfterProviderSubmission({
      durableSubmission,
      providerRequestStarted,
      nativeTaskHost,
      aborted,
    })
  ) {
    return true;
  }

  if (
    nativeTaskHost &&
    submissionMayHaveBeenAccepted({
      durableSubmission,
      providerRequestStarted,
      nativeTaskHost,
      nativeSubmissionStarted,
    })
  ) {
    return true;
  }

  if (durableSubmission && (providerRequestStarted || nativeTaskHost)) {
    if (error instanceof GenerationProviderError) {
      return error.failureClass === "network";
    }
    return !(error instanceof ProviderSubmissionError);
  }

  return false;
}

function resolveTaskErrorStatus(
  isUncertain: boolean,
  isPaused: boolean,
  isAborted: boolean,
): CreationTask["status"] {
  if (isUncertain) return "unknown";
  if (isPaused) return "queued";
  if (isAborted) return "cancelled";
  if (!navigator.onLine) return "offline";
  return "failed";
}

function resolveTaskErrorMessage(
  isUncertain: boolean,
  isPaused: boolean,
  isAborted: boolean,
  error: unknown,
  connectionId?: string,
): string {
  if (isUncertain)
    return "供应商受理状态不明，请先核对供应商；为避免重复扣费，当前不会普通重试。";
  if (isPaused) return "已暂停；已归档结果保留，恢复只提交剩余输出。";
  if (isAborted) return "已取消任务，已归档结果保留。";
  if (
    error instanceof GenerationProviderError &&
    error.failureClass === "rate_limited"
  ) {
    return `${error.message} ${capacitySwitchHint(connectionId)}`;
  }
  if (error instanceof Error) return error.message;
  return "任务失败，请重试。";
}

async function handleExecutionError(
  options: ExecutionErrorOptions,
): Promise<void> {
  const {
    error,
    task,
    taskId,
    controller,
    durableSubmission,
    providerRequestStarted,
    nativeTaskHost,
    nativeSubmissionStarted,
    nativeCancelRequested,
    nativeTaskRecords,
    reservation,
    publish,
    persistence,
    getOutputs,
    setOutputs,
  } = options;

  const uncertain = isTaskErrorUncertain({
    durableSubmission,
    providerRequestStarted,
    nativeTaskHost,
    aborted: controller.signal.aborted,
    nativeSubmissionStarted,
    error,
    taskId,
    nativeCancelRequested,
    nativeTaskRecords,
  });

  const paused = controller.signal.reason === "paused";
  const status = resolveTaskErrorStatus(
    uncertain,
    paused,
    controller.signal.aborted,
  );
  const message = resolveTaskErrorMessage(
    uncertain,
    paused,
    controller.signal.aborted,
    error,
    task.providerConnectionId,
  );

  setOutputs(
    getOutputs().map((output) =>
      output.status === "succeeded"
        ? output
        : {
            ...output,
            status: uncertain
              ? "unknown"
              : paused
                ? "waiting"
                : controller.signal.aborted
                  ? "cancelled"
                  : "failed",
            error: message,
          },
    ),
  );

  publish(
    status,
    message,
    uncertain ? "unknown" : durableSubmission ? "terminal" : "intent",
  );

  if (
    task.providerConnectionId &&
    reservation &&
    !controller.signal.aborted &&
    error instanceof GenerationProviderError &&
    [
      "rate_limited",
      "unauthorized",
      "forbidden",
      "provider_unavailable",
      "network",
    ].includes(error.failureClass)
  ) {
    markProviderConnectionFailure(
      task.providerConnectionId,
      {
        kind: error.failureClass as
          | "rate_limited"
          | "unauthorized"
          | "forbidden"
          | "provider_unavailable"
          | "network",
        retryAfterSeconds: error.retryAfterSeconds,
      },
      taskProviderOptions(task),
    );
  }
  await persistence.flush().catch((err) => {
    console.warn("[useTaskExecution] flush on error failed:", err);
  });
}

const { composeEditResult } = createImageEditRuntime({
  read: loadStoredAsset,
  write: storeGeneratedAsset,
});
