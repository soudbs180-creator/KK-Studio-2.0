import { capabilityManifestSchema } from "../../../packages/creation-contracts/index.ts";
import { imageTaskCapability } from "./imageTaskCapability.ts";
export const layerSplitCapabilityManifest = capabilityManifestSchema.parse({
  id: "image.layer-split",
  enabled: true,
  version: "1.0.0",
  title: "图层拆分",
  kind: "builtin",
  input: "image.layer-split.task-reference",
  output: "creation.task-id",
  requires: { permissions: ["ai:generate", "asset:read", "asset:write"] },
  adapters: [
    {
      id: "image.layer-split/comfyui",
      kind: "comfyui",
      priority: 10,
      compat: "^1.5.0",
    },
    {
      id: "image.layer-split/provider-api",
      kind: "provider-api",
      priority: 0,
      compat: "^1.5.0",
    },
  ],
  task: { progress: true, cancellable: true, resumable: false },
  lineage: { inputRoles: ["base"], relation: "derivedFrom" },
  platforms: ["desktop", "web"],
  degrade: "需要归档原件和已配置的本地 ComfyUI 图层拆分工作流。",
  card: "docs/features/feat-042-layer-split.md",
});
export const executeLayerSplitCapability = imageTaskCapability(
  "image.layer-split",
  "1.0.0",
);
