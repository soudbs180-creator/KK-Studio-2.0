import {
  imageCapabilitySchema,
  type ImageCapabilityId,
  type ImageCapabilitySpec,
} from "../../../packages/creation-contracts/index.ts";
import type { ComfyWorkflow } from "../comfyui/index.ts";
type Parameters = ImageCapabilitySpec["parameters"];
export interface ImageWorkflowModels {
  checkpoint?: string;
  upscaleModel?: string;
  backgroundModel?: string;
}

export function capabilityFromWorkflow(
  graph: ComfyWorkflow,
  capabilityId: ImageCapabilityId,
  sourceAssetId: string,
  parameters: Parameters,
): ImageCapabilitySpec {
  const nodes = Object.fromEntries(
    Object.entries(graph).map(([id, node]) => [
      id,
      { class_type: node.class_type, inputs: node.inputs ?? {} },
    ]),
  );
  function unique(type: string, input: string) {
    const candidates = Object.entries(nodes).filter(
      ([, node]) =>
        node.class_type === type && Object.hasOwn(node.inputs, input),
    );
    if (candidates.length !== 1)
      throw new Error(
        `工作流需要唯一的 ${type}.${input}，请在原生编辑器整理后重新导入 API JSON。`,
      );
    return { nodeId: candidates[0][0], input };
  }
  const bindings: Record<string, { nodeId: string; input: string }> = {
    image: unique("LoadImage", "image"),
  };
  if (capabilityId === "image.outpaint") {
    for (const side of ["left", "right", "top", "bottom"])
      bindings[side] = unique("ImagePadForOutpaint", side);
    const positive = Object.values(nodes).find(
      (node) => node.class_type === "KSampler",
    )?.inputs.positive;
    if (
      Array.isArray(positive) &&
      nodes[String(positive[0])]?.class_type === "CLIPTextEncode"
    )
      bindings.prompt = { nodeId: String(positive[0]), input: "text" };
  }
  if (capabilityId === "image.upscale")
    bindings.scale = unique("ImageScaleBy", "scale_by");
  return imageCapabilitySchema.parse({
    capabilityId,
    version: "1.0.0",
    adapter: "comfyui",
    sourceAssetId,
    parameters,
    workflow: {
      nodes,
      bindings,
      outputNodeIds: Object.entries(nodes)
        .filter(([, node]) => node.class_type === "SaveImage")
        .map(([id]) => id),
    },
  });
}

export function standardImageCapability(
  id: ImageCapabilityId,
  assetId: string,
  models: ImageWorkflowModels,
  parameters?: Parameters,
): ImageCapabilitySpec {
  const nodes: ComfyWorkflow = {
    image: { class_type: "LoadImage", inputs: { image: "original.png" } },
  };
  if (id === "image.upscale") {
    if (models.upscaleModel) {
      nodes.model = {
        class_type: "UpscaleModelLoader",
        inputs: { model_name: models.upscaleModel },
      };
      nodes.restore = {
        class_type: "ImageUpscaleWithModel",
        inputs: { upscale_model: ["model", 0], image: ["image", 0] },
      };
      // RealESRGAN is 4x; scale binding applies to the original so final output stays exactly 2x/4x.
      nodes.scale = {
        class_type: "ImageScaleBy",
        inputs: { image: ["image", 0], upscale_method: "lanczos", scale_by: 2 },
      };
      nodes.size = {
        class_type: "GetImageSize",
        inputs: { image: ["scale", 0] },
      };
      nodes.outputSize = {
        class_type: "ImageScale",
        inputs: {
          image: ["restore", 0],
          upscale_method: "lanczos",
          width: ["size", 0],
          height: ["size", 1],
          crop: "disabled",
        },
      };
    } else
      nodes.scale = {
        class_type: "ImageScaleBy",
        inputs: { image: ["image", 0], upscale_method: "lanczos", scale_by: 2 },
      };
    nodes.save = {
      class_type: "SaveImage",
      inputs: {
        images: [models.upscaleModel ? "outputSize" : "scale", 0],
        filename_prefix: "KK-upscale",
      },
    };
    return capabilityFromWorkflow(
      nodes,
      id,
      assetId,
      parameters ?? { scale: 2 },
    );
  }
  if (id === "image.layer-split") {
    if (!models.backgroundModel)
      throw new Error("请先安装 BiRefNet 模型并刷新本地模型列表。");
    nodes.model = {
      class_type: "LoadBackgroundRemovalModel",
      inputs: { bg_removal_name: models.backgroundModel },
    };
    nodes.mask = {
      class_type: "RemoveBackground",
      inputs: { bg_removal_model: ["model", 0], image: ["image", 0] },
    };
    nodes.invert = { class_type: "InvertMask", inputs: { mask: ["mask", 0] } };
    nodes.foreground = {
      class_type: "JoinImageWithAlpha",
      inputs: { image: ["image", 0], alpha: ["invert", 0] },
    };
    nodes.background = {
      class_type: "JoinImageWithAlpha",
      inputs: { image: ["image", 0], alpha: ["mask", 0] },
    };
    nodes.saveForeground = {
      class_type: "SaveImage",
      inputs: { images: ["foreground", 0], filename_prefix: "KK-foreground" },
    };
    nodes.saveBackground = {
      class_type: "SaveImage",
      inputs: { images: ["background", 0], filename_prefix: "KK-background" },
    };
    return capabilityFromWorkflow(
      nodes,
      id,
      assetId,
      parameters ?? { layers: ["前景", "背景"] },
    );
  }
  if (!models.checkpoint)
    throw new Error("请选择本机 Checkpoint 模型后执行扩图。");
  nodes.model = {
    class_type: "CheckpointLoaderSimple",
    inputs: { ckpt_name: models.checkpoint },
  };
  nodes.positive = {
    class_type: "CLIPTextEncode",
    inputs: { clip: ["model", 1], text: "extend the image naturally" },
  };
  nodes.negative = {
    class_type: "CLIPTextEncode",
    inputs: { clip: ["model", 1], text: "blur, watermark, seams" },
  };
  nodes.pad = {
    class_type: "ImagePadForOutpaint",
    inputs: {
      image: ["image", 0],
      left: 128,
      right: 128,
      top: 128,
      bottom: 128,
      feathering: 0,
    },
  };
  nodes.encode = {
    class_type: "VAEEncodeForInpaint",
    inputs: {
      pixels: ["pad", 0],
      mask: ["pad", 1],
      vae: ["model", 2],
      grow_mask_by: 6,
    },
  };
  nodes.sample = {
    class_type: "KSampler",
    inputs: {
      model: ["model", 0],
      positive: ["positive", 0],
      negative: ["negative", 0],
      latent_image: ["encode", 0],
      seed: 42,
      steps: 20,
      cfg: 7,
      sampler_name: "euler",
      scheduler: "normal",
      denoise: 1,
    },
  };
  nodes.decode = {
    class_type: "VAEDecode",
    inputs: { samples: ["sample", 0], vae: ["model", 2] },
  };
  nodes.save = {
    class_type: "SaveImage",
    inputs: { images: ["composite", 0], filename_prefix: "KK-outpaint" },
  };
  nodes.composite = {
    class_type: "ImageCompositeMasked",
    inputs: {
      destination: ["pad", 0],
      source: ["decode", 0],
      x: 0,
      y: 0,
      resize_source: false,
      mask: ["pad", 1],
    },
  };
  return capabilityFromWorkflow(
    nodes,
    id,
    assetId,
    parameters ?? { left: 128, right: 128, top: 128, bottom: 128 },
  );
}
