import {
  retryableOutputIndices,
  type CreationTask,
  type CreationDraft,
} from "@kk-studio/creation-contracts";
import type { MobileConnectionMetadata } from "../core/mobileModel.ts";
import {
  isTwelveAiConnection,
  supportsImageReferences,
} from "../services/twelveAiProtocol.ts";
import { videoModelProfile } from "../services/twelveAiVideoModels.ts";
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
  imageSize?: string,
): string | undefined {
  if (!draft.prompt.trim()) return "写下你的想法。";
  if (connection?.protocol === "comfyui")
    return "此连接需在 ComfyUI 工作流页面预检并明确提交。";
  if (
    draft.attachments.length &&
    (draft.kind !== "image" ||
      !connection ||
      !supportsImageReferences(connection, draft.model))
  )
    return "此生成适配器尚不支持参考素材，请移除参考后再提交。";
  if (
    draft.attachments.some(
      (attachment) =>
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          attachment.mime,
        ),
    )
  )
    return "此图片编辑通道仅支持 PNG、JPEG、WebP 或 GIF 图片参考。";
  if (draft.attachments.some((attachment) => !attachment.assetId))
    return "请先保存参考图片原件，再提交编辑。";
  if (
    imageSize !== undefined &&
    (draft.kind !== "image" ||
      !imageSize.trim() ||
      !connection?.capabilities?.imageSizes?.includes(imageSize))
  )
    return "请选择此连接已声明支持的图片尺寸，或使用默认尺寸。";
  if (!connection?.credentialRef) return "请设置有效连接及凭据。";
  if (draft.kind === "video") {
    if (!connection || !isTwelveAiConnection(connection))
      return "文本生视频仅支持官方 12ai 连接。";
    if (!videoModelProfile(draft.model))
      return "请选择已接入的文本生视频模型；Grok 需要首帧，当前不支持。";
    if (draft.outputCount !== 1 || draft.prompt.length > 5000)
      return "视频每次生成一条，提示词最多 5000 字符。";
    return undefined;
  }
  if (draft.kind !== "text" && draft.kind !== "image")
    return "当前没有可执行的媒体适配器。";
  if (!connection.capabilities?.[draft.kind]) return "连接未配置当前类型端点。";
  if (!draft.model.trim()) return "请选择或填写模型。";
  return undefined;
}
