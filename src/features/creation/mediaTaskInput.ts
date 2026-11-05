import {
  creationMediaSchema,
  defaultAudioMedia,
  defaultVideoMedia,
  type CreationMedia,
} from "../../../packages/creation-contracts/media.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { CreateProjectInput } from "./model.ts";

export function captureCanvasMedia(
  source: CanvasCollectionItem,
): CreationMedia | undefined {
  if (source.kind === "audio") return { ...defaultAudioMedia };
  if (source.kind !== "video") return undefined;
  if (!source.parameters) return { ...defaultVideoMedia };
  const parsed = creationMediaSchema.safeParse({
    kind: "video",
    duration: Number(source.parameters.duration),
    aspectRatio: source.parameters.ratio,
    resolution: source.parameters.quality,
    audio: source.parameters.soundEnabled,
  });
  if (!parsed.success)
    throw new Error(
      "视频参数不受支持：请选择 4/6/8 秒、16:9/9:16 和 720p/1080p；已有参数已保留。",
    );
  return parsed.data;
}

export function validateMediaTaskInput(input: CreateProjectInput): void {
  if (!input.prompt.trim() || input.prompt.length > 4000)
    throw new Error("请填写不超过 4000 字的媒体描述。");
  const parsed = creationMediaSchema.safeParse(input.media);
  if (!parsed.success || parsed.data.kind !== input.kind)
    throw new Error(
      "视频参数或语音参数无效：视频请选择 4/6/8 秒、16:9/9:16、720p/1080p；语音请选择有效音色、MP3/WAV 和 0.25–4 倍速。",
    );
  if (input.privacyMode && input.privacyMode !== "byok_local")
    throw new Error("视频和语音生成当前仅支持 BYOK 本地模式。");
  if (
    input.imageSize ||
    input.imageEdit ||
    input.imageEditContext ||
    input.imageCapability ||
    input.imageOperation
  )
    throw new Error("媒体任务不能使用图片编辑或工作流参数。");
  const count = input.outputCount ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 10)
    throw new Error("生成数量必须为 1 至 10 的整数。");
  if (input.kind === "audio" && input.attachments.length)
    throw new Error("语音朗读不接收参考附件；请移除附件后重试。");
  if (input.kind === "video") {
    validateVideoReferences(input);
  }
}

function validateVideoReferences(input: CreateProjectInput): void {
  for (const attachment of input.attachments) {
    if (!/^image\/(png|jpeg|webp)$/.test(attachment.mime))
      throw new Error(
        "Veo 仅支持归档 PNG/JPEG/WebP 图片参考，不支持视频或音频参考。",
      );
    if (
      attachment.role &&
      !["主体", "风格", "材质", "构图"].includes(attachment.role)
    )
      throw new Error("视频不支持此参考角色或 Mask。");
    if (
      attachment.referenceFrame !== undefined &&
      !["first", "last"].includes(attachment.referenceFrame)
    )
      throw new Error("视频首尾帧标记无效。");
  }
  const frames = input.attachments.filter((a) => a.referenceFrame);
  if (
    frames.length &&
    (frames.length !== 2 ||
      frames.filter((a) => a.referenceFrame === "first").length !== 1 ||
      frames.filter((a) => a.referenceFrame === "last").length !== 1 ||
      frames.length !== input.attachments.length)
  )
    throw new Error("视频首尾帧必须成对且不能混合普通参考图。");
  if (
    !frames.length &&
    (input.attachments.length > 3 ||
      (input.model === "veo-3.1-fast-generate-preview" &&
        input.attachments.length))
  )
    throw new Error("Veo 标准模型最多 3 张普通参考图；Fast 仅支持成对首尾帧。");
}
