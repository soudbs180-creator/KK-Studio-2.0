import type { MobileApplication } from "./application.ts";
import type { AccountContext } from "./types.ts";
import type {
  ComfyConnection,
  ComfyWorkflow,
  ComfySubmissionReceipt,
  ComfyOriginal,
  ComfyPollReceipt,
} from "../services/comfyTypes.ts";
import { localContext, localMutation } from "./localMutations.ts";
import { projectRevision, requireAccountContext } from "./types.ts";
import { sameComfyJson } from "../core/comfyIdentity.ts";
import type { MobileComfyOutputIdentity } from "../core/comfyModel.ts";

export interface ComfyPlan {
  readonly accountId: string;
  readonly epoch: number;
  readonly projectId: string;
  readonly projectRevision: number;
  readonly submissionId: string;
  readonly capturedAt: number;
  readonly connection: ComfyConnection;
  readonly workflow: ComfyWorkflow;
  readonly workflowRevision: number;
  readonly requestedOutputs: number;
}
export interface PendingComfy {
  projectId: string;
  receipt: ComfySubmissionReceipt;
  originals: Map<number, ComfyOriginal>;
  lastPoll?: ComfyPollReceipt;
  outputs?: MobileComfyOutputIdentity[];
}
export interface ComfyHost {
  app: MobileApplication;
  plans: WeakMap<ComfyPlan, AccountContext>;
  issued: Set<string>;
  pending: Map<string, PendingComfy>;
}
export const comfyKey = (ctx: AccountContext, id: string) =>
  JSON.stringify([ctx.accountId, id]);
export function checkComfy(
  host: ComfyHost,
  ctx: AccountContext,
  signal?: AbortSignal,
) {
  requireAccountContext(ctx);
  if (!host.app.valid(ctx))
    throw new Error("会话已变化，请在原账号恢复 Comfy 任务。");
  if (signal?.aborted) throw new Error("Comfy 请求已停止；受理状态须核对。");
}
export function comfyContext(host: ComfyHost, scope?: string) {
  return localContext(host.app, scope);
}
export function comfyClient(host: ComfyHost, ctx: AccountContext) {
  checkComfy(host, ctx);
  if (!host.app.deps.comfy) throw new Error("ComfyUI 适配器不可用。");
  return host.app.deps.comfy({
    async get(ref) {
      checkComfy(host, ctx);
      const value = await ctx.vault.get(ref);
      checkComfy(host, ctx);
      return value;
    },
    async set() {
      throw new Error("此客户端只读取已捕获凭据。");
    },
    async remove() {
      throw new Error("此客户端只读取已捕获凭据。");
    },
  });
}
export function metadataConnection(
  host: ComfyHost,
  ctx: AccountContext,
  id: string,
): ComfyConnection {
  checkComfy(host, ctx);
  const value = ctx.snapshot.connections.find((c) => c.id === id);
  if (!value || value.protocol !== "comfyui")
    throw new Error("请选择 ComfyUI 工作流连接。");
  return Object.freeze({
    id: value.id,
    protocol: "comfyui",
    baseUrl: value.baseUrl,
    ...(value.credentialRef ? { credentialRef: value.credentialRef } : {}),
  });
}
export function assertNoUnresolvedWorkflow(
  ctx: AccountContext,
  projectId: string,
  connection: ComfyConnection,
  workflow: ComfyWorkflow,
) {
  const project = ctx.snapshot.projects.find((p) => p.id === projectId);
  for (const record of project?.executionReceipts ?? []) {
    const task = project?.tasks.find((t) => t.id === record.taskId);
    if (
      !record.readOnly &&
      record.comfy &&
      record.comfy.identity.connectionId === connection.id &&
      record.comfy.identity.baseUrl === connection.baseUrl &&
      task &&
      ["submitted", "unknown"].includes(task.submissionState ?? "") &&
      sameComfyJson(record.comfy.identity.workflow, workflow)
    )
      throw new Error(
        "相同工作流仍有未核对任务，请先核对原任务，不能新建重复付费提交。",
      );
  }
}
export function comfyTask(ctx: AccountContext, id: string) {
  const project = ctx.snapshot.projects.find((p) =>
    p.tasks.some((t) => t.id === id),
  );
  const task = project?.tasks.find((t) => t.id === id),
    record = project?.executionReceipts?.find((r) => r.taskId === id);
  if (
    !project ||
    !task ||
    !record?.comfy ||
    record.protocol !== "comfyui" ||
    record.readOnly ||
    !task.providerConnectionId ||
    !task.providerBaseUrl
  )
    throw new Error("没有可执行的本机 Comfy 回执；恢复副本仅供查看。");
  return {
    project,
    task,
    record,
    connection: Object.freeze({
      id: task.providerConnectionId,
      baseUrl: task.providerBaseUrl,
      protocol: "comfyui" as const,
      ...(task.providerCredentialRef
        ? { credentialRef: task.providerCredentialRef }
        : {}),
    }),
  };
}
export async function updateComfyTask(
  host: ComfyHost,
  ctx: AccountContext,
  taskId: string,
  patch: Partial<ReturnType<typeof comfyTask>["task"]>,
) {
  await localMutation(host.app, ctx, (repo, snapshot) => {
    const { project, task } = comfyTask({ ...ctx, snapshot }, taskId);
    return repo.updateTask(
      project.id,
      { ...task, ...patch },
      projectRevision(snapshot, project.id),
    );
  });
}
export async function runComfy<T>(
  host: ComfyHost,
  ctx: AccountContext,
  id: string,
  projectId: string,
  signal: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  checkComfy(host, ctx, signal);
  if (host.app.active.has(id)) throw new Error("任务已在执行或核对中。");
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  host.app.active.set(id, { context: ctx, projectId, controller });
  host.app.publish();
  try {
    return await run(controller.signal);
  } finally {
    signal?.removeEventListener("abort", abort);
    if (host.app.active.get(id)?.controller === controller)
      host.app.active.delete(id);
    host.app.publish();
  }
}
