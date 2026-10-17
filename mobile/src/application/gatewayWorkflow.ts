import type { CreationTask } from "@kk-studio/creation-contracts";
import type {
  GatewayJob,
  ImageInput,
  ImageReceipt,
  ProviderConnection,
} from "../services/providerTypes.ts";
import { ServiceError } from "../services/httpClient.ts";
import type {
  WorkflowHost,
  AccountContext,
  PendingGateway,
  ApplicationState,
} from "./types.ts";
import {
  errorMessage,
  projectRevision,
  requireAccountContext,
} from "./types.ts";
import { archiveReceipt } from "./archival.ts";
function accountContext(host: WorkflowHost, ctx = host.context()) {
  const account = requireAccountContext(ctx);
  if (!host.valid(account)) throw new Error("会话已变化，账号请求未发送。");
  return account;
}
function capturedConnection(task: CreationTask): ProviderConnection {
  if (
    !task.providerConnectionId ||
    !task.providerCredentialRef ||
    !task.providerBaseUrl
  )
    throw new Error("缺少原始连接路由，不能核对作业。");
  return {
    id: task.providerConnectionId,
    credentialRef: task.providerCredentialRef,
    baseUrl: task.providerBaseUrl,
    protocol: "kk-image-jobs",
    capabilities: {
      text: false,
      image: true,
      maxOutputs: task.requestedOutputs,
    },
  };
}
async function persistGateway(
  host: WorkflowHost,
  ctx: AccountContext,
  pending: PendingGateway,
): Promise<void> {
  if (ctx.accountId !== pending.accountId)
    throw new Error("请重新登录提交任务的账号。");
  await host.mutate(ctx, (repo, s) =>
    repo.saveExecutionReceipt(
      pending.projectId,
      {
        taskId: pending.task.id,
        connectionId: pending.task.providerConnectionId!,
        protocol: "kk-image-jobs",
        gatewayJobId: pending.jobId,
      },
      projectRevision(s, pending.projectId),
    ),
  );
  host.pendingGateways.delete(pending.task.id);
  host.publish();
}
function imageReceipt(task: CreationTask, projectId: string): ImageReceipt {
  return {
    identity: {
      submissionId: task.idempotencyKey,
      projectId,
      connectionId: task.providerConnectionId!,
      model: task.model,
      prompt: task.prompt,
      capturedAt: task.submittedAt ?? task.createdAt,
    },
    submissionState: "unknown",
    originals: [],
    archivalState: "pending",
  };
}
async function acceptJob(
  host: WorkflowHost,
  ctx: AccountContext,
  projectId: string,
  task: CreationTask,
  job: GatewayJob,
  signal: AbortSignal,
): Promise<void> {
  accountContext(host, ctx);
  if (job.requestedOutputs !== task.requestedOutputs)
    throw new ServiceError("GATEWAY_OUTPUT_COUNT_CHANGED", "unknown");
  const client = host.deps.gateway!(ctx.vault),
    connection = capturedConnection(task),
    receipt = imageReceipt(task, projectId);
  const pending = {
    accountId: ctx.accountId,
    projectId,
    task,
    receipt,
    complete: false,
  };
  try {
    for (const output of job.outputs) {
      if (
        output.status !== "succeeded" ||
        task.outputs?.find((o) => o.index === output.index)?.status ===
          "succeeded"
      )
        continue;
      if (!host.valid(ctx))
        throw new ServiceError("SESSION_CHANGED_AFTER_SUBMISSION", "unknown");
      receipt.originals.push(
        await client.downloadOriginal(connection, output, signal),
      );
      host.recoveries.set(task.id, pending);
      host.publish();
    }
    const delivered = task.completedOutputs + receipt.originals.length;
    pending.complete =
      job.status === "succeeded" && delivered === task.requestedOutputs;
    receipt.submissionState = pending.complete ? "terminal" : "unknown";
    if (receipt.originals.length || pending.complete)
      await archiveReceipt(host, ctx, pending);
    if (pending.complete) return;
    const stored = ctx.snapshot.projects
      .find((p) => p.id === projectId)!
      .tasks.find((t) => t.id === task.id)!;
    const queued = [
      "queued",
      "submitting",
      "waiting_provider",
      "downloading",
      "running",
    ].includes(job.status);
    await host.mutate(ctx, (repo, s) =>
      repo.updateTask(
        projectId,
        {
          ...stored,
          status: stored.completedOutputs
            ? "partial"
            : queued
              ? "queued"
              : "unknown",
          submissionState: queued ? "submitted" : "unknown",
          error: queued
            ? undefined
            : `作业状态 ${job.status}；上游受理和未归档输出仍须核对，不会重复生成。`,
          updatedAt: host.deps.now(),
          outputs: stored.outputs?.map((o) =>
            o.status === "succeeded"
              ? o
              : { ...o, status: queued ? "waiting" : "unknown" },
          ),
        },
        projectRevision(s, projectId),
      ),
    );
  } catch (error) {
    if (receipt.originals.length) {
      host.recoveries.set(task.id, pending);
      try {
        await archiveReceipt(host, ctx, pending);
      } catch (archiveError) {
        host.report(archiveError);
      }
    }
    throw error;
  }
}
export async function submitGateway(
  host: WorkflowHost,
  ctx: AccountContext,
  projectId: string,
  task: CreationTask,
  input: ImageInput,
  signal: AbortSignal,
): Promise<void> {
  accountContext(host, ctx);
  if (!host.deps.gateway) throw new ServiceError("GATEWAY_ADAPTER_UNAVAILABLE");
  const receipt = await host.deps
      .gateway(ctx.vault)
      .submitImageJob(input, signal),
    identity = receipt.identity;
  if (
    identity.projectId !== projectId ||
    identity.submissionId !== task.idempotencyKey ||
    identity.connectionId !== task.providerConnectionId ||
    identity.model !== task.model ||
    identity.prompt !== task.prompt
  )
    throw new ServiceError("GATEWAY_RECEIPT_IDENTITY_CHANGED", "unknown");
  const pending: PendingGateway = {
    accountId: ctx.accountId,
    projectId,
    task,
    jobId: receipt.job.id,
  };
  host.pendingGateways.set(task.id, pending);
  host.publish();
  await persistGateway(host, ctx, pending);
  if (!host.valid(ctx))
    throw new ServiceError("SESSION_CHANGED_AFTER_SUBMISSION", "unknown");
  await acceptJob(host, ctx, projectId, task, receipt.job, signal);
}
export async function reconcileTask(
  host: WorkflowHost,
  taskId: string,
): Promise<void> {
  const ctx = accountContext(host);
  await host.ensureSession();
  if (host.active.has(taskId)) throw new Error("任务已在核对中，请等待。");
  await host.mutate(ctx, (repo) => repo.load());
  const pending = host.pendingGateways.get(taskId);
  if (pending) {
    await host.mutate(ctx, (repo) => repo.load());
    await persistGateway(host, ctx, pending);
  }
  const project = ctx.snapshot.projects.find((p) =>
      p.tasks.some((t) => t.id === taskId),
    ),
    task = project?.tasks.find((t) => t.id === taskId),
    receipt = project?.executionReceipts?.find((r) => r.taskId === taskId);
  if (
    !task ||
    !project ||
    !receipt ||
    receipt.readOnly ||
    receipt.protocol !== "kk-image-jobs" ||
    !receipt.gatewayJobId
  )
    throw new Error("没有可核对的本机作业回执；恢复副本的历史作业是只读证据。");
  if (task.status === "succeeded") return;
  if (!host.deps.gateway) throw new Error("Gateway 适配器不可用。");
  accountContext(host, ctx);
  if (host.active.has(taskId))
    throw new Error("任务已在执行或核对中，请等待。");
  const controller = new AbortController();
  host.active.set(task.id, { context: ctx, projectId: project.id, controller });
  host.publish();
  try {
    const job = await host.deps
      .gateway(ctx.vault)
      .getImageJob(
        capturedConnection(task),
        receipt.gatewayJobId,
        controller.signal,
      );
    if (!host.valid(ctx))
      throw new ServiceError("SESSION_CHANGED_AFTER_SUBMISSION", "unknown");
    await acceptJob(host, ctx, project.id, task, job, controller.signal);
  } catch (error) {
    host.report(error);
    const stored = ctx.snapshot.projects
      .find((p) => p.id === project.id)!
      .tasks.find((t) => t.id === taskId)!;
    try {
      await host.mutate(ctx, (repo, s) =>
        repo.updateTask(
          project.id,
          {
            ...stored,
            status: stored.completedOutputs ? "partial" : "unknown",
            submissionState: "unknown",
            error: errorMessage(error),
            updatedAt: host.deps.now(),
            outputs: stored.outputs?.map((o) =>
              o.status === "succeeded" ? o : { ...o, status: "unknown" },
            ),
          },
          projectRevision(s, project.id),
        ),
      );
    } catch (saveError) {
      host.report(saveError);
    }
    throw error;
  } finally {
    host.active.delete(task.id);
    host.publish();
  }
}
export async function requestGatewayCancel(
  host: WorkflowHost,
  taskId: string,
): Promise<void> {
  const ctx = accountContext(host);
  await host.ensureSession();
  accountContext(host, ctx);
  const project = ctx.snapshot.projects.find((p) =>
      p.tasks.some((t) => t.id === taskId),
    ),
    task = project?.tasks.find((t) => t.id === taskId),
    receipt = project?.executionReceipts?.find((r) => r.taskId === taskId);
  if (
    !task ||
    !project ||
    !receipt?.gatewayJobId ||
    receipt.readOnly ||
    task.status === "succeeded" ||
    !host.deps.gateway
  )
    throw new Error("此任务没有可取消的本机 Gateway 作业。");
  if (host.active.has(taskId))
    throw new Error("任务已在执行或核对中，请等待。");
  const controller = new AbortController();
  host.active.set(task.id, { context: ctx, projectId: project.id, controller });
  host.publish();
  try {
    await host.deps
      .gateway(ctx.vault)
      .cancelImageJob(
        capturedConnection(task),
        receipt.gatewayJobId,
        controller.signal,
      );
    if (!host.valid(ctx)) throw new Error("会话已变化，请重新核对任务。");
    await host.mutate(ctx, (repo, s) => {
      const current = s.projects
        .find((p) => p.id === project.id)!
        .tasks.find((t) => t.id === taskId)!;
      if (current.status === "succeeded") return Promise.resolve(s);
      return repo.updateTask(
        project.id,
        {
          ...current,
          status: current.completedOutputs ? "partial" : "unknown",
          submissionState: "unknown",
          error: "已请求取消 Gateway 作业；上游取消、计费或退款均未确认。",
          updatedAt: host.deps.now(),
          outputs: current.outputs?.map((o) =>
            o.status === "succeeded" ? o : { ...o, status: "unknown" },
          ),
        },
        projectRevision(s, project.id),
      );
    });
  } finally {
    if (host.active.get(task.id)?.controller === controller)
      host.active.delete(task.id);
    host.publish();
  }
}

export async function reconcileOutstanding(
  host: WorkflowHost & { getState(): ApplicationState },
  includeUnknown = false,
): Promise<void> {
  if (host.getState().auth !== "ready" || !host.deps.gateway) return;
  const ctx = host.context();
  for (const project of ctx.snapshot.projects)
    for (const receipt of project.executionReceipts ?? []) {
      const task = project.tasks.find((t) => t.id === receipt.taskId);
      if (
        receipt.readOnly ||
        !receipt.gatewayJobId ||
        !task ||
        host.active.has(task.id) ||
        !(
          task.status === "queued" ||
          task.status === "running" ||
          (includeUnknown && task.status === "unknown")
        )
      )
        continue;
      try {
        if (!host.valid(ctx)) return;
        await reconcileTask(host, task.id);
      } catch (error) {
        host.report(error);
      }
    }
}
