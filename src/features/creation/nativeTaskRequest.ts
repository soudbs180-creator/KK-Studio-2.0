import type { CreationTask } from "./model";
import type { NativeTaskHostRequest } from "./nativeTaskHost";
import { compileDesignPrompt } from "./promptCompiler";

export function compileTaskPrompt(task: CreationTask): string {
  if (task.kind === "text" || task.imageEdit || task.imageEditContext)
    return task.prompt;
  return compileDesignPrompt(task.prompt, {
    referenceRoles: task.attachments.map((attachment) => attachment.role),
    referenceCount: task.attachments.length,
    outputCount: task.requestedOutputs,
  });
}
export function nativeRequestForTask(
  task: CreationTask,
  compiledPrompt: string,
  pendingIndices: number[],
  concurrencyLimit: number | undefined,
  promptHash: string | undefined,
  baseUrl: string,
): NativeTaskHostRequest {
  const attachments = task.attachments.map((attachment) => {
    if (!attachment.assetId)
      throw new Error(
        "Desktop 参考图尚未归档到原生素材库，当前未提交原生任务。",
      );
    return { assetId: attachment.assetId, name: attachment.name };
  });
  return {
    imageEditRequired: task.imageEdit
      ? true
      : task.imageEditContext
        ? false
        : undefined,
    kind: task.kind === "text" ? "text" : undefined,
    protocol: task.kind === "text" ? task.providerProtocol : undefined,
    authMode: task.kind === "text" ? task.providerAuthMode : undefined,
    messages: task.conversationMessages,
    concurrencyLimit: concurrencyLimit,
    taskId: task.id,
    idempotencyKey: task.idempotencyKey,
    baseUrl,
    credentialRef: task.providerCredentialRef ?? "",
    model: task.model,
    prompt: compiledPrompt,
    outputIndices: pendingIndices,
    attachments,
    providerName: task.providerName,
    promptHash,
    size: task.imageSize,
    maskAssetId: task.imageEdit?.nativeMask
      ? task.imageEdit.maskAssetId
      : undefined,
  };
}
