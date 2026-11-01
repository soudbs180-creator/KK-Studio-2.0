import {
  imageCapabilitySchema,
  type ImageCapabilityId,
  type ImageCapabilitySpec,
} from "../../../packages/creation-contracts/index.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";

export const imageCapabilityActionLabels: Record<ImageCapabilityId, string> = {
  "image.outpaint": "扩图",
  "image.upscale": "高清修复",
  "image.layer-split": "图层拆分",
};

export function imageCapabilityAction(
  source: CanvasCollectionItem,
  capabilityId: ImageCapabilityId,
): {
  spec?: ImageCapabilitySpec;
  outputCount?: number;
  error?: string;
} {
  if (!source.assetId)
    return { error: "当前图片原件尚未归档，不能运行图片能力。" };
  if (source.imageCapability?.capabilityId !== capabilityId)
    return {
      error: `请先在 ComfyUI 工作流中配置${imageCapabilityActionLabels[capabilityId]}能力。`,
    };
  try {
    const spec = imageCapabilitySchema.parse({
      ...structuredClone(source.imageCapability),
      sourceAssetId: source.assetId,
    });
    return {
      spec,
      outputCount:
        spec.capabilityId === "image.layer-split"
          ? spec.parameters.layers.length
          : 1,
    };
  } catch {
    return { error: "图片能力工作流无效，请回到 ComfyUI 重新保存。" };
  }
}
