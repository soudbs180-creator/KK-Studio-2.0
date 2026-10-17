import type {
  CreationTask,
  CreationTaskOutput,
} from "@kk-studio/creation-contracts";
import type { TextReceipt, ImageReceipt } from "../services/providerTypes.ts";
import type { WorkflowHost, AccountContext, PendingArchive } from "./types.ts";
import { projectRevision } from "./types.ts";
import { resolveRetryParent } from "./retryArchive.ts";
export function verifyReceipt(
  receipt: TextReceipt | ImageReceipt,
  task: CreationTask,
  projectId: string,
): void {
  const identity = receipt.identity;
  if (
    identity.submissionId !== task.idempotencyKey ||
    identity.projectId !== projectId ||
    identity.connectionId !== task.providerConnectionId ||
    identity.model !== task.model ||
    identity.prompt !== task.prompt
  )
    throw new Error("生成回执身份不一致；输入及回执保留供核对。");
}
export async function updateTask(
  host: WorkflowHost,
  ctx: AccountContext,
  projectId: string,
  task: CreationTask,
  requireSession = false,
): Promise<void> {
  await host.mutate(ctx, (repo, snapshot) => {
    if (requireSession && !host.valid(ctx))
      throw new Error("会话已变化，回执保留等待原账号恢复。");
    return repo.updateTask(
      projectId,
      task,
      projectRevision(snapshot, projectId),
    );
  });
}
export async function archiveReceipt(
  host: WorkflowHost,
  ctx: AccountContext,
  pending: PendingArchive,
): Promise<void> {
  if (!host.valid(ctx) || ctx.accountId !== pending.accountId)
    throw new Error("会话已变化，请重新登录原账号后恢复。");
  const { projectId, receipt } = pending;
  let task = ctx.snapshot.projects
    .find((p) => p.id === projectId)
    ?.tasks.find((t) => t.id === pending.task.id);
  if (!task || task.idempotencyKey !== pending.task.idempotencyKey)
    throw new Error("恢复任务身份不一致；不会重新生成。");
  verifyReceipt(receipt, task, projectId);
  if (
    receipt.providerRequestId &&
    /^[A-Za-z0-9._:-]{1,200}$/.test(receipt.providerRequestId)
  ) {
    await host.mutate(ctx, (repo, s) =>
      repo.saveExecutionReceipt(
        projectId,
        {
          taskId: task!.id,
          connectionId: task!.providerConnectionId!,
          protocol: "openai-compatible",
          providerRequestId: receipt.providerRequestId,
        },
        projectRevision(s, projectId),
      ),
    );
  }
  if ("text" in receipt) {
    task = {
      ...task,
      status: "succeeded",
      submissionState: "terminal",
      completedOutputs: 1,
      error: undefined,
      updatedAt: host.deps.now(),
      outputs: [
        {
          index: 0,
          status: "succeeded",
          text: receipt.text,
          model: task.model,
          createdAt: task.createdAt,
        },
      ],
    };
    await updateTask(host, ctx, projectId, task, true);
    const exists = ctx.snapshot.projects
      .find((p) => p.id === projectId)
      ?.messages.some((m) => m.taskId === task!.id && m.role === "assistant");
    if (!exists)
      await host.mutate(ctx, (repo, s) =>
        repo.appendMessage(
          projectId,
          {
            id: host.deps.id(),
            projectId,
            conversationId: projectId,
            taskId: task!.id,
            model: task!.model,
            role: "assistant",
            text: receipt.text,
            createdAt: host.deps.now(),
          },
          projectRevision(s, projectId),
        ),
      );
  } else {
    for (const original of receipt.originals) {
      if (
        task.outputs?.find((o) => o.index === original.index)?.status ===
        "succeeded"
      )
        continue;
      if (!host.valid(ctx)) throw new Error("会话已变化，原件保留等待恢复。");
      const asset = await ctx.repo.storeOriginal({
        bytes: original.bytes,
        mime: original.mime,
        name: `${task.id}-${original.index + 1}.${original.mime.split("/")[1]}`,
        provenance: {
          source: "provider",
          projectId,
          taskId: task.id,
          model: task.model,
        },
      });
      await host.mutate(ctx, (repo) => repo.load());
      await host.mutate(ctx, (repo, s) =>
        repo.attachMaterial(projectId, asset.id, projectRevision(s, projectId)),
      );
      const outputs: CreationTaskOutput[] = task.outputs!.map((o) =>
        o.index === original.index
          ? { ...o, status: "succeeded" as const, assetId: asset.id }
          : o,
      );
      const completedOutputs = outputs.filter(
        (o) => o.status === "succeeded",
      ).length;
      task = {
        ...task,
        outputs,
        completedOutputs,
        status:
          completedOutputs === task.requestedOutputs && pending.complete
            ? "succeeded"
            : "partial",
        submissionState:
          completedOutputs === task.requestedOutputs && pending.complete
            ? "terminal"
            : "unknown",
        error:
          completedOutputs === task.requestedOutputs && pending.complete
            ? undefined
            : "部分原件已归档，其余受理状态须核对。",
        updatedAt: host.deps.now(),
      };
      await updateTask(host, ctx, projectId, task, true);
    }
  }
  if (pending.complete) {
    await resolveRetryParent(host, ctx, projectId, task);
    host.recoveries.delete(task.id);
  }
  host.publish();
}
