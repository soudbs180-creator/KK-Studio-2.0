import { z } from "zod";
import { videoMediaSchema } from "../../packages/creation-contracts/media.ts";
import { resolveImageSize, IMAGE_QUALITY_LABELS } from "./imageParameters.ts";
import type { CanvasParameters } from "./canvasItems.ts";
import type { StageWorkItem } from "./stagePlan.ts";

const count = z
  .union([z.number(), z.string().regex(/^\d+$/u).transform(Number)])
  .pipe(z.number().int().min(1).max(10))
  .default(1);
const basic = z.object({ count }).strict();
const visual = basic
  .extend({
    ratio: z.string().max(40).optional(),
    quality: z.string().max(40).optional(),
    duration: z
      .union([z.number(), z.string().regex(/^\d+$/u).transform(Number)])
      .optional(),
    soundEnabled: z.boolean().optional(),
    imageSize: z
      .string()
      .regex(/^\d{3,4}x\d{3,4}$/u)
      .optional(),
  })
  .strict();

export function stageGenerationParameters(
  work: Pick<StageWorkItem, "kind" | "params">,
): CanvasParameters {
  const defaults = {
    ratio: "自适应",
    quality: "自适应",
    duration: "4",
    soundEnabled: false,
  };
  if (work.kind === "merge") throw new Error("请先配置真实合成工作流");
  if (work.kind === "text" || work.kind === "audio")
    return { ...defaults, count: String(basic.parse(work.params ?? {}).count) };
  const p = visual.parse(work.params ?? {});
  if (work.kind === "video") {
    if (p.imageSize) throw new Error("视频不能使用图片尺寸");
    const media = videoMediaSchema.parse({
      kind: "video",
      duration: p.duration ?? 4,
      aspectRatio: p.ratio ?? "16:9",
      resolution: p.quality ?? "720p",
      audio: p.soundEnabled ?? false,
    });
    return {
      ratio: media.aspectRatio,
      quality: media.resolution,
      duration: String(media.duration),
      count: String(p.count),
      soundEnabled: media.audio ?? false,
    };
  }
  if (p.duration !== undefined || p.soundEnabled !== undefined)
    throw new Error("图片不支持时长或声音参数");
  const ratio = p.ratio ?? "自适应",
    quality = z.enum(IMAGE_QUALITY_LABELS).parse(p.quality ?? "自适应");
  const imageSize = p.imageSize ?? resolveImageSize(ratio, quality);
  if (
    !p.imageSize &&
    (ratio !== "自适应" || quality !== "自适应") &&
    !imageSize
  )
    throw new Error("图片比例与清晰度需共同指定为有效尺寸");
  return { ...defaults, ratio, quality, count: String(p.count), imageSize };
}

export function stageParameterSummary(
  work: Pick<StageWorkItem, "kind" | "params">,
): string {
  try {
    const p = stageGenerationParameters(work);
    return work.kind === "video"
      ? `${p.duration}秒 · ${p.ratio} · ${p.quality} · ${p.count}个 · ${p.soundEnabled ? "有声" : "静音"}`
      : `${p.count}个${p.imageSize ? ` · ${p.imageSize}` : ""}`;
  } catch {
    return "参数不受支持，执行前需修订";
  }
}
