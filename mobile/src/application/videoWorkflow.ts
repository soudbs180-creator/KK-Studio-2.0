import type { CreationTask } from "@kk-studio/creation-contracts";
import type {
  GenerationInput,
  ProviderConnection,
} from "../services/providerTypes.ts";
import type {
  VideoJob,
  VideoReceipt,
} from "../services/twelveAiVideoClient.ts";
import { isTwelveAiConnection } from "../services/twelveAiProtocol.ts";
import { ServiceError } from "../services/httpClient.ts";
import type { AccountContext, PendingArchive, WorkflowHost } from "./types.ts";
import { errorMessage, projectRevision } from "./types.ts";
import { archiveReceipt, updateTask, verifyReceipt } from "./archival.ts";

function capturedRoute(baseUrl: string) {
  return new URL("/v1", new URL(baseUrl).origin).toString();
}
function check(host: WorkflowHost, ctx: AccountContext, signal?: AbortSignal) {
  if (!host.valid(ctx))
    throw new ServiceError("SESSION_CHANGED_AFTER_SUBMISSION", "unknown");
  if (signal?.aborted) throw new ServiceError("REQUEST_ABORTED", "unknown");
}
async function queryConnection(
  host: WorkflowHost,
  ctx: AccountContext,
  task: CreationTask,
): Promise<ProviderConnection> {
  const current = ctx.snapshot.connections.find(
    (c) => c.id === task.providerConnectionId,
  );
  if (
    !task.providerBaseUrl ||
    !task.providerCredentialRef ||
    !task.providerConnectionId ||
    !current ||
    !isTwelveAiConnection(current) ||
    !isTwelveAiConnection({ baseUrl: task.providerBaseUrl }) ||
    capturedRoute(current.baseUrl) !== capturedRoute(task.providerBaseUrl)
  )
    throw new Error("视频任务的原连接路由不一致，不能查询或使用其他连接凭据。");
  const originalRef = task.providerCredentialRef;
  let credentialRef = originalRef;
  if (!(await ctx.vault.get(originalRef))) {
    check(host, ctx);
    if (!current.credentialRef)
      throw new ServiceError("PROVIDER_CREDENTIAL_REQUIRED", "unknown");
    credentialRef = current.credentialRef;
  }
  check(host, ctx);
  const latest = ctx.snapshot.connections.find((c) => c.id === current.id);
  if (
    !latest ||
    latest.baseUrl !== current.baseUrl ||
    latest.protocol !== current.protocol ||
    latest.credentialRef !== current.credentialRef
  )
    throw new Error("连接在查询期间已变化，请重新核对原视频任务。");
  return {
    id: task.providerConnectionId,
    baseUrl: task.providerBaseUrl,
    credentialRef,
    protocol: "openai-compatible",
    capabilities: { text: false, image: false },
  };
}
function pendingReceipt(
  host: WorkflowHost,
  ctx: AccountContext,
  projectId: string,
  task: CreationTask,
  id: string,
): PendingArchive {
  const receipt: VideoReceipt = {
    identity: {
      submissionId: task.idempotencyKey,
      projectId,
      connectionId: task.providerConnectionId!,
      model: task.model,
      prompt: task.prompt,
      capturedAt: task.submittedAt ?? task.createdAt,
    },
    providerRequestId: id,
    submissionState: "submitted",
    originals: [],
    archivalState: "pending",
  };
  const pending = {
    accountId: ctx.accountId,
    projectId,
    task,
    receipt,
    complete: false,
  };
  host.recoveries.set(task.id, pending);
  host.publish();
  return pending;
}
async function persistId(
  host: WorkflowHost,
  ctx: AccountContext,
  pending: PendingArchive,
) {
  verifyReceipt(pending.receipt, pending.task, pending.projectId);
  check(host, ctx);
  await host.mutate(ctx, (repo, snapshot) =>
    repo.saveExecutionReceipt(
      pending.projectId,
      {
        taskId: pending.task.id,
        connectionId: pending.task.providerConnectionId!,
        protocol: "openai-compatible",
        providerRequestId: pending.receipt.providerRequestId,
      },
      projectRevision(snapshot, pending.projectId),
    ),
  );
  check(host, ctx);
}
async function pause(signal: AbortSignal) {
  if (signal.aborted) throw new ServiceError("REQUEST_ABORTED", "unknown");
  await new Promise<void>((resolve, reject) => {
    const stop = () => {
      clearTimeout(timer);
      reject(new ServiceError("REQUEST_ABORTED", "unknown"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, 3000);
    signal.addEventListener("abort", stop, { once: true });
  });
}
async function pollAndArchive(
  host: WorkflowHost,
  ctx: AccountContext,
  pending: PendingArchive,
  connection: ProviderConnection,
  outerSignal: AbortSignal,
  initial?: VideoJob,
) {
  const client = host.deps.video!(ctx.vault),
    controller = new AbortController();
  const stop = () => controller.abort();
  if (outerSignal.aborted) controller.abort();
  outerSignal.addEventListener("abort", stop, { once: true });
  const deadline = setTimeout(stop, 10 * 60_000);
  const signal = controller.signal;
  let result = initial;
  try {
    for (;;) {
      check(host, ctx, signal);
      if (!result || !["completed", "failed"].includes(result.status))
        result = await client.get(
          connection,
          pending.task.model,
          pending.receipt.providerRequestId!,
          signal,
        );
      check(host, ctx, signal);
      if (result.status === "failed") {
        const stored = ctx.snapshot.projects
          .find((p) => p.id === pending.projectId)!
          .tasks.find((t) => t.id === pending.task.id)!;
        await updateTask(
          host,
          ctx,
          pending.projectId,
          {
            ...stored,
            status: "failed",
            submissionState: "terminal",
            error: "供应商报告此视频作业失败。原输入与作业回执已保留。",
            updatedAt: host.deps.now(),
            outputs: stored.outputs!.map((o) => ({ ...o, status: "failed" })),
          },
          true,
        );
        host.recoveries.delete(pending.task.id);
        host.publish();
        return;
      }
      if (result.status === "completed") {
        const original = await client.download(
          connection,
          pending.task.model,
          result,
          signal,
        );
        check(host, ctx, signal);
        const receipt = pending.receipt as VideoReceipt;
        receipt.originals = [original];
        receipt.submissionState = "terminal";
        pending.complete = true;
        await archiveReceipt(host, ctx, pending);
        return;
      }
      const stored = ctx.snapshot.projects
        .find((p) => p.id === pending.projectId)!
        .tasks.find((t) => t.id === pending.task.id)!;
      const status = result.status === "queued" ? "queued" : "running";
      if (stored.status !== status || stored.submissionState !== "submitted")
        await updateTask(
          host,
          ctx,
          pending.projectId,
          {
            ...stored,
            status,
            submissionState: "submitted",
            error: undefined,
            updatedAt: host.deps.now(),
          },
          true,
        );
      await pause(signal);
      result = undefined;
    }
  } finally {
    clearTimeout(deadline);
    outerSignal.removeEventListener("abort", stop);
  }
}
export async function submitVideo(
  host: WorkflowHost,
  ctx: AccountContext,
  projectId: string,
  task: CreationTask,
  input: GenerationInput,
  signal: AbortSignal,
) {
  if (!host.deps.video) throw new ServiceError("VIDEO_MODEL_UNAVAILABLE");
  let pending: PendingArchive | undefined;
  const result = await host.deps
    .video(ctx.vault)
    .submit(input, signal, async (id) => {
      pending = pendingReceipt(host, ctx, projectId, task, id);
      // A late response may outlive stop/logout; retain its ID without starting another request.
      if (host.valid(ctx)) await persistId(host, ctx, pending);
    });
  if (!pending) throw new ServiceError("INVALID_VIDEO_JOB", "unknown");
  await pollAndArchive(host, ctx, pending, input.connection, signal, result);
}
export async function recoverVideoTask(host: WorkflowHost, taskId: string) {
  const ctx = host.context();
  await host.ensureSession();
  if (host.active.has(taskId))
    throw new Error("视频任务已在查询，请等待或停止当前请求。");
  await host.mutate(ctx, (repo) => repo.load());
  const project = ctx.snapshot.projects.find((p) =>
    p.tasks.some((t) => t.id === taskId),
  );
  const task = project?.tasks.find((t) => t.id === taskId);
  const storedReceipt = project?.executionReceipts?.find(
    (r) => r.taskId === taskId,
  );
  const memory = host.recoveries.get(taskId);
  if (
    !task ||
    !project ||
    task.kind !== "video" ||
    !host.deps.video ||
    storedReceipt?.readOnly ||
    project.restoredFrom?.tasks[taskId] ||
    (storedReceipt &&
      (storedReceipt.protocol !== "openai-compatible" ||
        storedReceipt.connectionId !== task.providerConnectionId)) ||
    (memory && memory.accountId !== ctx.accountId)
  )
    throw new Error("没有可查询的本机视频回执；恢复副本只供查看。");
  if (task.status === "succeeded") return;
  const id =
    storedReceipt?.providerRequestId ?? memory?.receipt.providerRequestId;
  if (
    !id ||
    (memory?.receipt.providerRequestId &&
      memory.receipt.providerRequestId !== id)
  )
    throw new Error(
      "供应商受理状态不明且没有视频作业 ID；不会再次提交生成，请核对供应商。",
    );
  if (host.active.has(taskId))
    throw new Error("视频任务已在查询，请等待或停止当前请求。");
  const pending = memory ?? pendingReceipt(host, ctx, project.id, task, id);
  const controller = new AbortController();
  host.active.set(taskId, { context: ctx, projectId: project.id, controller });
  host.publish();
  try {
    const connection = await queryConnection(host, ctx, task);
    await persistId(host, ctx, pending);
    if (
      pending.complete &&
      "originals" in pending.receipt &&
      pending.receipt.originals.length
    ) {
      await archiveReceipt(host, ctx, pending);
      return;
    }
    await pollAndArchive(host, ctx, pending, connection, controller.signal);
  } catch (error) {
    const current = ctx.snapshot.projects
      .find((p) => p.id === project.id)
      ?.tasks.find((t) => t.id === taskId);
    if (current && current.status !== "succeeded") {
      try {
        await updateTask(host, ctx, project.id, {
          ...current,
          status: "unknown",
          submissionState: "unknown",
          error: errorMessage(error),
          updatedAt: host.deps.now(),
          outputs: current.outputs!.map((o) =>
            o.status === "succeeded" ? o : { ...o, status: "unknown" },
          ),
        });
      } catch (saveError) {
        host.report(saveError);
      }
    }
    throw error;
  } finally {
    if (host.active.get(taskId)?.controller === controller)
      host.active.delete(taskId);
    host.publish();
  }
}
