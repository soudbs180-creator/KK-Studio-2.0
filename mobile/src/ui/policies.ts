import {
  retryableOutputIndices,
  type CreationTask,
  type CreationDraft,
} from "@kk-studio/creation-contracts";
import type { MobileConnectionMetadata } from "../core/mobileModel.ts";
export function taskActions(
  task: CreationTask,
  active: boolean,
  pendingArchive: boolean,
) {
  return {
    retryIndices: retryableOutputIndices(task, task.outputs ?? []),
    stop: active,
    recover: pendingArchive,
  };
}
export function composerUnavailable(
  draft: CreationDraft,
  connection?: MobileConnectionMetadata,
): string | undefined {
  if (!draft.prompt.trim()) return "写下你的想法。";
  if (connection?.protocol === "comfyui")
    return "此连接需在 ComfyUI 工作流页面预检并明确提交。";
  if (draft.attachments.length)
    return "此生成适配器尚不支持参考素材，请移除参考后再提交。";
  if (!connection?.credentialRef) return "请设置有效连接及凭据。";
  if (draft.kind !== "text" && draft.kind !== "image")
    return "当前没有可执行的媒体适配器。";
  if (!connection.capabilities?.[draft.kind]) return "连接未配置当前类型端点。";
  if (!draft.model.trim()) return "请选择或填写模型。";
  return undefined;
}
