import {
  bindImageCapabilityWorkflow,
  imageCapabilitySchema,
  imageCapabilityOutputIds,
  type ImageCapabilitySpec,
} from "../../../packages/creation-contracts/index.ts";
export function nativeComfyWorkflow(
  raw: ImageCapabilitySpec,
  prompt: string,
  outputIndices?: number[],
) {
  const spec = imageCapabilitySchema.parse(raw);
  if (spec.adapter !== "comfyui")
    throw new Error("此工作流需要本地 ComfyUI 适配器");
  return {
    nodes: bindImageCapabilityWorkflow(
      spec,
      "__kk_archived_original__",
      prompt,
      outputIndices,
    ),
    outputNodeIds: imageCapabilityOutputIds(spec, outputIndices),
    imageBinding: spec.workflow.bindings.image!,
  };
}
