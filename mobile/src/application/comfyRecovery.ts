import { localMutation } from "./localMutations.ts";
import type {
  ComfyPollReceipt,
  ComfyCancelReceipt,
} from "../services/comfyTypes.ts";
import {
  checkComfy,
  comfyClient,
  comfyContext,
  comfyKey,
  comfyTask,
  runComfy,
  updateComfyTask,
  type ComfyHost,
} from "./comfyContext.ts";
import { persistComfy } from "./comfyExecution.ts";
import {
  archiveComfyOutputs,
  mapComfyOutputs,
  legacyComfyOutputs,
  LEGACY_COMFY_OUTPUT_REASON,
} from "./comfyOutputs.ts";

export function canRecoverComfy(
  host: ComfyHost,
  id: string,
  scope?: string,
): boolean {
  try {
    const ctx = comfyContext(host, scope),
      { task } = comfyTask(ctx, id);
    return (
      !["succeeded", "failed", "cancelled"].includes(task.status) &&
      task.submissionState !== "intent" &&
      !legacyComfyOutputs(ctx, id)
    );
  } catch {
    return false;
  }
}
export function comfyRecoveryReason(
  host: ComfyHost,
  id: string,
  scope?: string,
): string | undefined {
  try {
    return legacyComfyOutputs(comfyContext(host, scope), id)
      ? LEGACY_COMFY_OUTPUT_REASON
      : undefined;
  } catch {
    return "此任务没有可执行的本机 Comfy 回执；恢复副本仅供查看。";
  }
}
export async function pollComfy(
  host: ComfyHost,
  id: string,
  scope?: string,
  signal?: AbortSignal,
  onProgress?: (value: ComfyPollReceipt) => void,
): Promise<ComfyPollReceipt> {
  const ctx = comfyContext(host, scope);
  await host.app.ensureSession();
  checkComfy(host, ctx, signal);
  await localMutation(host.app, ctx, (repo) => repo.load());
  const captured = comfyTask(ctx, id),
    key = comfyKey(ctx, id);
  if (legacyComfyOutputs(ctx, id)) throw new Error(LEGACY_COMFY_OUTPUT_REASON);
  if (captured.task.submissionState === "intent")
    throw new Error("该任务尚未提交；核对不会代为发送工作流。");
  let pending = host.pending.get(key);
  if (!pending) {
    pending = {
      projectId: captured.project.id,
      originals: new Map(),
      outputs: captured.record.comfy!.outputs?.map((row) => ({ ...row })),
      receipt: {
        identity: captured.record.comfy!.identity,
        promptId: captured.record.comfy!.promptId,
        promptIdConfirmed: captured.record.comfy!.promptIdConfirmed,
        queueNumber: captured.record.comfy!.queueNumber,
        submissionState: "submitted",
      },
    };
    host.pending.set(key, pending);
  }
  const retained = pending;
  return runComfy(
    host,
    ctx,
    id,
    captured.project.id,
    signal,
    async (activeSignal) => {
      try {
        await persistComfy(host, ctx, id, retained);
        await archiveComfyOutputs(host, ctx, id, retained, activeSignal);
        const client = comfyClient(host, ctx);
        const value =
          retained.lastPoll?.status === "succeeded"
            ? retained.lastPoll
            : await client.pollPrompt(
                captured.connection,
                retained.receipt,
                activeSignal,
              );
        checkComfy(host, ctx, activeSignal);
        if (value.outputs.length > captured.task.requestedOutputs)
          throw new Error("工作流输出数量超过已批准数量，须核对。");
        let result: ComfyPollReceipt = Object.freeze({
          ...value,
          outputs: value.outputs.map((o) => Object.freeze({ ...o })),
        });
        Object.freeze(result.outputs);
        const originalsReady = [
          "succeeded",
          "partial",
          "failed",
          "cancelled",
        ].includes(result.status);
        if (originalsReady)
          result = await mapComfyOutputs(host, ctx, id, retained, result);
        retained.lastPoll = result;
        onProgress?.(result);
        checkComfy(host, ctx, activeSignal);
        for (const output of originalsReady ? result.outputs : []) {
          const task = comfyTask(ctx, id).task;
          if (
            task.outputs?.find((o) => o.index === output.index)?.status ===
            "succeeded"
          )
            continue;
          checkComfy(host, ctx, activeSignal);
          if (!retained.originals.has(output.index))
            retained.originals.set(
              output.index,
              await client.downloadOriginal(
                captured.connection,
                retained.receipt,
                output,
                activeSignal,
              ),
            );
          await archiveComfyOutputs(host, ctx, id, retained, activeSignal);
        }
        const task = comfyTask(ctx, id).task;
        const complete =
          result.status === "succeeded" &&
          result.outputs.length === task.requestedOutputs &&
          task.completedOutputs === task.requestedOutputs;
        const confirmedFailed =
          ["failed", "cancelled"].includes(result.status) &&
          !task.completedOutputs;
        const queued = ["queued", "running"].includes(result.status);
        await updateComfyTask(host, ctx, id, {
          status: complete
            ? "succeeded"
            : task.completedOutputs
              ? "partial"
              : confirmedFailed
                ? (result.status as "failed" | "cancelled")
                : queued
                  ? "queued"
                  : "unknown",
          submissionState:
            complete || confirmedFailed
              ? "terminal"
              : queued
                ? "submitted"
                : "unknown",
          updatedAt: host.app.deps.now(),
          error: complete
            ? undefined
            : "Comfy 未归档输出仍须核对，不会重新生成。",
        });
        if (complete || confirmedFailed) host.pending.delete(key);
        return {
          ...result,
          status: complete ? "succeeded" : comfyTask(ctx, id).task.status,
        };
      } catch (error) {
        if (host.app.valid(ctx)) {
          try {
            const task = comfyTask(ctx, id).task;
            await updateComfyTask(host, ctx, id, {
              status: task.completedOutputs ? "partial" : "unknown",
              submissionState: "unknown",
              error: "原回执及原件保留供恢复，不会重复生成。",
              updatedAt: host.app.deps.now(),
            });
          } catch {
            /* Durable prior snapshot and memory remain intact. */
          }
        }
        throw error;
      }
    },
  );
}
export async function cancelComfy(
  host: ComfyHost,
  id: string,
  scope?: string,
  signal?: AbortSignal,
): Promise<ComfyCancelReceipt> {
  const ctx = comfyContext(host, scope);
  await host.app.ensureSession();
  checkComfy(host, ctx, signal);
  const { task, record, project, connection } = comfyTask(ctx, id),
    pending = host.pending.get(comfyKey(ctx, id));
  if (task.status === "succeeded" || task.submissionState === "intent")
    throw new Error("该任务没有可请求取消的在途作业。");
  const receipt = pending?.receipt ?? {
    identity: record.comfy!.identity,
    promptId: record.comfy!.promptId,
    promptIdConfirmed: record.comfy!.promptIdConfirmed,
    queueNumber: record.comfy!.queueNumber,
    submissionState: "submitted" as const,
  };
  return runComfy(host, ctx, id, project.id, signal, async (activeSignal) => {
    if (pending) await persistComfy(host, ctx, id, pending);
    const result = await comfyClient(host, ctx).requestCancel(
      connection,
      receipt,
      activeSignal,
    );
    checkComfy(host, ctx, activeSignal);
    if (result.available && result.cancelRequested)
      await updateComfyTask(host, ctx, id, {
        status: task.completedOutputs ? "partial" : "unknown",
        submissionState: "unknown",
        error: "已请求按任务取消；上游终止或费用尚未确认。",
        updatedAt: host.app.deps.now(),
      });
    return result;
  });
}
