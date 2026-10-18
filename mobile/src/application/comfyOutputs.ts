import type { AccountContext } from "./types.ts";
import { projectRevision } from "./types.ts";
import { localMutation } from "./localMutations.ts";
import type { ComfyPollReceipt } from "../services/comfyTypes.ts";
import { comfyOutputKey } from "../core/comfyIdentity.ts";
import {
  checkComfy,
  comfyTask,
  updateComfyTask,
  type ComfyHost,
  type PendingComfy,
} from "./comfyContext.ts";
import { persistComfy } from "./comfyExecution.ts";

export const LEGACY_COMFY_OUTPUT_REASON =
  "旧 Comfy 任务已有归档原件但缺少固定输出身份映射，不能自动核对；原任务和素材保留，请人工核对供应商原任务。";
export function legacyComfyOutputs(ctx: AccountContext, id: string): boolean {
  const { task, record } = comfyTask(ctx, id);
  return task.completedOutputs > 0 && record.comfy!.outputs === undefined;
}
/** Freeze the complete observed upstream key->slot assignment before requesting any bytes. */
export async function mapComfyOutputs(
  host: ComfyHost,
  ctx: AccountContext,
  id: string,
  pending: PendingComfy,
  value: ComfyPollReceipt,
): Promise<ComfyPollReceipt> {
  if (legacyComfyOutputs(ctx, id)) throw new Error(LEGACY_COMFY_OUTPUT_REASON);
  const outputs = (pending.outputs ?? []).map((row) => ({ ...row })),
    seen = new Set<string>();
  const task = comfyTask(ctx, id).task;
  const mapped = value.outputs.map((output) => {
    if (
      output.promptId !== pending.receipt.promptId ||
      output.connectionId !== pending.receipt.identity.connectionId
    )
      throw new Error("Comfy 输出不属于已捕获作业。");
    const key = comfyOutputKey(output);
    if (seen.has(key))
      throw new Error("Comfy 上游输出身份重复，不能计为多个原件。");
    seen.add(key);
    let row = outputs.find((item) => item.key === key);
    if (!row) {
      if (outputs.length >= task.requestedOutputs)
        throw new Error("Comfy 上游输出身份已变化，原槽位保持不变。");
      row = {
        slot: outputs.length,
        key,
        nodeId: output.nodeId,
        filename: output.filename,
        subfolder: output.subfolder,
        type: output.type,
      };
      outputs.push(row);
    }
    return Object.freeze({ ...output, index: row.slot });
  });
  // Matching history output is positive evidence for the original requested UUID even after a lost POST reply.
  if (mapped.length && !pending.receipt.promptIdConfirmed)
    pending.receipt = Object.freeze({
      ...pending.receipt,
      promptIdConfirmed: true,
    });
  pending.outputs = outputs;
  await persistComfy(host, ctx, id, pending);
  checkComfy(host, ctx);
  mapped.sort((a, b) => a.index - b.index);
  Object.freeze(mapped);
  return Object.freeze({ ...value, receipt: pending.receipt, outputs: mapped });
}
export async function archiveComfyOutputs(
  host: ComfyHost,
  ctx: AccountContext,
  id: string,
  pending: PendingComfy,
  signal: AbortSignal,
): Promise<void> {
  for (const original of pending.originals.values()) {
    checkComfy(host, ctx, signal);
    let { project, task } = comfyTask(ctx, id);
    if (
      task.outputs?.find((o) => o.index === original.index)?.status ===
      "succeeded"
    )
      continue;
    const row = pending.outputs?.find((item) => item.slot === original.index);
    if (
      !row ||
      row.nodeId !== original.nodeId ||
      row.filename !== original.filename ||
      original.promptId !== pending.receipt.promptId
    )
      throw new Error("Comfy 原件缺少固定槽位身份，不能归档。");
    const asset = await ctx.repo.storeOriginal({
      bytes: original.bytes,
      mime: original.mime,
      name: original.filename,
      provenance: {
        source: "provider",
        projectId: project.id,
        taskId: id,
        model: task.model,
      },
    });
    checkComfy(host, ctx, signal);
    await localMutation(host.app, ctx, (repo) => repo.load());
    if (row.sha256 !== undefined && row.sha256 !== asset.sha256)
      throw new Error("Comfy 原件内容已变化，固定输出哈希不能替换。");
    row.sha256 = asset.sha256;
    await persistComfy(host, ctx, id, pending);
    await localMutation(host.app, ctx, (repo, snapshot) =>
      repo.attachMaterial(
        project.id,
        asset.id,
        projectRevision(snapshot, project.id),
      ),
    );
    ({ project, task } = comfyTask(ctx, id));
    const outputs = task.outputs!.map((o) =>
      o.index === original.index
        ? { ...o, status: "succeeded" as const, assetId: asset.id }
        : o,
    );
    await updateComfyTask(host, ctx, id, {
      outputs,
      completedOutputs: outputs.filter((o) => o.status === "succeeded").length,
      status: "partial",
      submissionState: "unknown",
      updatedAt: host.app.deps.now(),
    });
    pending.originals.delete(original.index);
  }
}
