import {
  imageCapabilitySchema,
  type ImageCapabilitySpec,
} from "../../packages/creation-contracts/index.ts";
export function imageSpec(id = "image.outpaint"): ImageCapabilitySpec {
  return imageCapabilitySchema.parse({
    capabilityId: id as ImageCapabilitySpec["capabilityId"],
    version: "1.0.0",
    adapter: "comfyui",
    sourceAssetId: "asset-0123456789abcdef01234567",
    parameters:
      id === "image.outpaint"
        ? { left: 64, right: 0, top: 32, bottom: 0 }
        : id === "image.upscale"
          ? { scale: 2 }
          : { layers: ["foreground", "background"] },
    workflow: {
      nodes: {
        "1": { class_type: "LoadImage", inputs: { image: "placeholder" } },
        "2": {
          class_type: "FixtureTransform",
          inputs: {
            image: ["1", 0],
            text: "placeholder",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            scale: 1,
          },
        },
        "3": { class_type: "SaveImage", inputs: { images: ["2", 0] } },
        "4": { class_type: "SaveImage", inputs: { images: ["2", 1] } },
      },
      bindings: {
        image: { nodeId: "1", input: "image" },
        prompt: { nodeId: "2", input: "text" },
        ...(id === "image.outpaint"
          ? Object.fromEntries(
              ["left", "right", "top", "bottom"].map((input) => [
                input,
                { nodeId: "2", input },
              ]),
            )
          : id === "image.upscale"
            ? { scale: { nodeId: "2", input: "scale" } }
            : {}),
      },
      outputNodeIds: id === "image.layer-split" ? ["3", "4"] : ["3"],
    },
  });
}
