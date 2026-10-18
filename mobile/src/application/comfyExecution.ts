import type { CreationTask } from "@kk-studio/creation-contracts";
import type { AccountContext } from "./types.ts";
import { projectRevision } from "./types.ts";
import { localMutation } from "./localMutations.ts";
import type { ComfySubmissionReceipt } from "../services/comfyTypes.ts";
import { ComfyServiceError } from "../services/comfyClient.ts";
import { sameComfyJson } from "../core/comfyIdentity.ts";
import {
  checkComfy,
  comfyClient,
  comfyKey,
  metadataConnection,
  assertNoUnresolvedWorkflow,
  runComfy,
  updateComfyTask,
  type ComfyHost,
  type ComfyPlan,
  type PendingComfy,
} from "./comfyContext.ts";

export async function persistComfy(
  host: ComfyHost,
  ctx: AccountContext,
  taskId: string,
  pending: PendingComfy,
) {
  await localMutation(host.app, ctx, (repo, snapshot) =>
    repo.saveExecutionReceipt(
      pending.projectId,
      {
        taskId,
        connectionId: pending.receipt.identity.connectionId,
        protocol: "comfyui",
        ...(pending.receipt.promptIdConfirmed
          ? { providerRequestId: pending.receipt.promptId }
          : {}),
        comfy: {
          identity: pending.receipt.identity,
          requestedOutputs: snapshot.projects
            .find((p) => p.id === pending.projectId)!
            .tasks.find((t) => t.id === taskId)!.requestedOutputs,
          promptId: pending.receipt.promptId,
          promptIdConfirmed: pending.receipt.promptIdConfirmed === true,
          ...(pending.outputs === undefined
            ? {}
            : { outputs: pending.outputs }),
          ...(pending.receipt.queueNumber === undefined
            ? {}
            : { queueNumber: pending.receipt.queueNumber }),
        },
      },
      projectRevision(snapshot, pending.projectId),
    ),
  );
}
function verifyAcceptance(
  receipt: ComfySubmissionReceipt,
  expected: ComfySubmissionReceipt,
) {
  for (const key of [
    "submissionId",
    "projectId",
    "connectionId",
    "baseUrl",
    "workflowRevision",
    "capturedAt",
  ] as const)
    if (receipt.identity[key] !== expected.identity[key])
      throw new Error("Comfy 回执身份不一致，须核对原任务。");
  if (!sameComfyJson(receipt.identity.workflow, expected.identity.workflow))
    throw new Error("Comfy 回执工作流已变化。");
}
export async function submitComfy(
  host: ComfyHost,
  plan: ComfyPlan,
  signal?: AbortSignal,
): Promise<string> {
  const ctx = host.plans.get(plan);
  if (!ctx) throw new Error("提交计划不是本次已校验的不可变计划。");
  checkComfy(host, ctx, signal);
  const key = comfyKey(ctx, plan.submissionId),
    busy = `${ctx.accountId}:${plan.projectId}`;
  if (
    host.issued.has(key) ||
    ctx.snapshot.projects.some((p) =>
      p.tasks.some((t) => t.id === plan.submissionId),
    )
  )
    throw new Error("任务已记录，不能重复提交。");
  if (host.app.submitting.has(busy))
    throw new Error("当前项目已有生成进行中。");
  const current = metadataConnection(host, ctx, plan.connection.id);
  if (JSON.stringify(current) !== JSON.stringify(plan.connection))
    throw new Error("连接已变化，请重新预检。");
  host.app.submitting.add(busy);
  try {
    return await runComfy(
      host,
      ctx,
      plan.submissionId,
      plan.projectId,
      signal,
      async (activeSignal) => {
        await host.app.ensureSession();
        checkComfy(host, ctx, activeSignal);
        assertNoUnresolvedWorkflow(
          ctx,
          plan.projectId,
          plan.connection,
          plan.workflow,
        );
        const task: CreationTask = {
          id: plan.submissionId,
          idempotencyKey: plan.submissionId,
          kind: "image",
          prompt: "明确批准的 ComfyUI API 工作流",
          model: "ComfyUI workflow",
          status: "queued",
          submissionState: "intent",
          createdAt: plan.capturedAt,
          updatedAt: plan.capturedAt,
          attachments: [],
          attempt: 1,
          requestedOutputs: plan.requestedOutputs,
          completedOutputs: 0,
          privacyMode: "byok_local",
          providerConnectionId: plan.connection.id,
          providerBaseUrl: plan.connection.baseUrl,
          providerCredentialRef: plan.connection.credentialRef,
          outputs: Array.from(
            { length: plan.requestedOutputs },
            (_, index) => ({
              index,
              status: "waiting" as const,
              model: "ComfyUI workflow",
              createdAt: plan.capturedAt,
            }),
          ),
        };
        const receipt: ComfySubmissionReceipt = Object.freeze({
          identity: Object.freeze({
            submissionId: plan.submissionId,
            projectId: plan.projectId,
            connectionId: plan.connection.id,
            baseUrl: plan.connection.baseUrl,
            workflowRevision: plan.workflowRevision,
            workflow: plan.workflow,
            capturedAt: plan.capturedAt,
          }),
          promptId: plan.submissionId,
          promptIdConfirmed: false,
          submissionState: "submitted",
        });
        await localMutation(host.app, ctx, (repo) =>
          repo.appendTask(plan.projectId, task, plan.projectRevision),
        );
        const pending: PendingComfy = {
          projectId: plan.projectId,
          receipt,
          originals: new Map(),
          outputs: [],
        };
        await persistComfy(host, ctx, task.id, pending);
        await updateComfyTask(host, ctx, task.id, {
          status: "running",
          submissionState: "submitted",
          submittedAt: host.app.deps.now(),
          updatedAt: host.app.deps.now(),
        });
        checkComfy(host, ctx, activeSignal);
        if (
          JSON.stringify(metadataConnection(host, ctx, plan.connection.id)) !==
          JSON.stringify(plan.connection)
        )
          throw new Error("连接已变化，工作流尚未发送。");
        host.issued.add(key);
        host.pending.set(key, pending);
        try {
          const accepted = await comfyClient(host, ctx).submitWorkflow(
            {
              submissionId: plan.submissionId,
              projectId: plan.projectId,
              workflowRevision: plan.workflowRevision,
              workflow: plan.workflow,
              connection: plan.connection,
              capturedAt: plan.capturedAt,
            },
            activeSignal,
          );
          verifyAcceptance(accepted, receipt);
          pending.receipt = accepted;
          await persistComfy(host, ctx, task.id, pending);
          checkComfy(host, ctx, activeSignal);
          return task.id;
        } catch (error) {
          if (error instanceof ComfyServiceError && error.comfyReceipt) {
            verifyAcceptance(error.comfyReceipt, receipt);
            pending.receipt = error.comfyReceipt;
          }
          if (host.app.valid(ctx)) {
            try {
              await persistComfy(host, ctx, task.id, pending);
              await updateComfyTask(host, ctx, task.id, {
                status: "unknown",
                submissionState: "unknown",
                error: "Comfy 受理回执须核对，不会重复提交。",
                updatedAt: host.app.deps.now(),
              });
            } catch {
              /* Memory retains exact receipt until explicit recovery. */
            }
          }
          throw error;
        }
      },
    );
  } finally {
    host.app.submitting.delete(busy);
    host.app.publish();
  }
}
