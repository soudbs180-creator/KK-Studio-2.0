import type { MobileApplication } from "./application.ts";
import { projectRevision } from "./types.ts";
import {
  captureComfyWorkflow,
  validateComfyWorkflow,
} from "../services/comfyWorkflow.ts";
import {
  checkComfy,
  comfyClient,
  comfyContext,
  metadataConnection,
  assertNoUnresolvedWorkflow,
  type ComfyHost,
  type ComfyPlan,
} from "./comfyContext.ts";
import { saveComfyConnection } from "./comfyConnections.ts";
import { submitComfy } from "./comfyExecution.ts";
import {
  pollComfy,
  cancelComfy,
  canRecoverComfy,
  comfyRecoveryReason,
} from "./comfyRecovery.ts";
import type { ComfyPollReceipt } from "../services/comfyTypes.ts";
import { localMutation } from "./localMutations.ts";
import { COMFY_UUID } from "../services/comfyProtocol.ts";
export type { ComfyPlan } from "./comfyContext.ts";
const instances = new WeakMap<MobileApplication, ComfyWorkflows>();
export function getComfyWorkflows(app: MobileApplication) {
  let flow = instances.get(app);
  if (!flow) {
    flow = new ComfyWorkflows(app);
    instances.set(app, flow);
  }
  return flow;
}
export class ComfyWorkflows {
  private readonly host: ComfyHost;
  constructor(app: MobileApplication) {
    this.host = {
      app,
      plans: new WeakMap(),
      issued: new Set(),
      pending: new Map(),
    };
  }
  saveConnection(
    input: { id?: string; name: string; baseUrl: string },
    secret: string,
    scope?: string,
  ) {
    return saveComfyConnection(this.host, input, secret, scope);
  }
  async health(id: string, scope?: string, signal?: AbortSignal) {
    const ctx = comfyContext(this.host, scope);
    const value = await comfyClient(this.host, ctx).health(
      metadataConnection(this.host, ctx, id),
      signal,
    );
    checkComfy(this.host, ctx, signal);
    return value;
  }
  async listModelFolders(id: string, scope?: string, signal?: AbortSignal) {
    const ctx = comfyContext(this.host, scope);
    const value = await comfyClient(this.host, ctx).listModelFolders(
      metadataConnection(this.host, ctx, id),
      signal,
    );
    checkComfy(this.host, ctx, signal);
    return value;
  }
  async listModels(
    id: string,
    folder: string,
    scope?: string,
    signal?: AbortSignal,
  ) {
    const ctx = comfyContext(this.host, scope);
    const value = await comfyClient(this.host, ctx).listModels(
      metadataConnection(this.host, ctx, id),
      folder,
      signal,
    );
    checkComfy(this.host, ctx, signal);
    return value;
  }
  async inspectNodes(id: string, scope?: string, signal?: AbortSignal) {
    const ctx = comfyContext(this.host, scope);
    const value = await comfyClient(this.host, ctx).inspectNodes(
      metadataConnection(this.host, ctx, id),
      signal,
    );
    checkComfy(this.host, ctx, signal);
    return value;
  }
  async prepare(
    projectId: string,
    connectionId: string,
    input: unknown,
    workflowRevision: number,
    requestedOutputs: number,
    scope?: string,
    signal?: AbortSignal,
  ): Promise<ComfyPlan> {
    const ctx = comfyContext(this.host, scope),
      connection = metadataConnection(this.host, ctx, connectionId),
      workflow = captureComfyWorkflow(input);
    if (
      !Number.isSafeInteger(workflowRevision) ||
      workflowRevision < 0 ||
      !Number.isInteger(requestedOutputs) ||
      requestedOutputs < 1 ||
      requestedOutputs > 32
    )
      throw new Error("工作流版本或输出数量无效。");
    const submissionId = this.host.app.deps.id(),
      capturedAt = this.host.app.deps.now();
    if (
      !COMFY_UUID.test(submissionId) ||
      !Number.isSafeInteger(capturedAt) ||
      capturedAt < 0
    )
      throw new Error("工作流提交身份或时间无效。");
    await this.host.app.ensureSession();
    checkComfy(this.host, ctx, signal);
    await localMutation(this.host.app, ctx, (repo) => repo.load());
    if (
      JSON.stringify(connection) !==
      JSON.stringify(metadataConnection(this.host, ctx, connectionId))
    )
      throw new Error("连接已变化，请重新预检。");
    const revision = projectRevision(ctx.snapshot, projectId);
    assertNoUnresolvedWorkflow(ctx, projectId, connection, workflow);
    const catalog = await comfyClient(this.host, ctx).inspectNodes(
      connection,
      signal,
    );
    checkComfy(this.host, ctx, signal);
    validateComfyWorkflow(workflow, catalog);
    const plan = Object.freeze({
      accountId: ctx.accountId,
      epoch: ctx.epoch,
      projectId,
      projectRevision: revision,
      submissionId,
      capturedAt,
      connection,
      workflow,
      workflowRevision,
      requestedOutputs,
    });
    this.host.plans.set(plan, ctx);
    return plan;
  }
  submit(plan: ComfyPlan, signal?: AbortSignal) {
    return submitComfy(this.host, plan, signal);
  }
  poll(
    id: string,
    scope?: string,
    signal?: AbortSignal,
    onProgress?: (value: ComfyPollReceipt) => void,
  ) {
    return pollComfy(this.host, id, scope, signal, onProgress);
  }
  recover(
    id: string,
    scope?: string,
    signal?: AbortSignal,
    onProgress?: (value: ComfyPollReceipt) => void,
  ) {
    return pollComfy(this.host, id, scope, signal, onProgress);
  }
  requestCancel(id: string, scope?: string, signal?: AbortSignal) {
    return cancelComfy(this.host, id, scope, signal);
  }
  canRecover(id: string, scope?: string) {
    return canRecoverComfy(this.host, id, scope);
  }
  recoveryUnavailableReason(id: string, scope?: string) {
    return comfyRecoveryReason(this.host, id, scope);
  }
}
