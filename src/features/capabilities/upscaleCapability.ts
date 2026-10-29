import { capabilityManifestSchema } from "../../../packages/creation-contracts/index.ts";
import { imageTaskCapability } from "./imageTaskCapability.ts";
export const upscaleCapabilityManifest = capabilityManifestSchema.parse({
  id: "image.upscale",
  version: "1.0.0",
  title: "高清修复",
  kind: "builtin",
  input: "image.upscale.task-reference",
  output: "creation.task-id",
  requires: { permissions: ["ai:generate", "asset:read", "asset:write"] },
  adapters: [
    {
      id: "image.upscale/comfyui",
      kind: "comfyui",
      priority: 10,
      compat: "^1.5.0",
    },
    {
      id: "image.upscale/provider-api",
      kind: "provider-api",
      priority: 0,
      compat: "^1.5.0",
    },
  ],
  task: { progress: true, cancellable: true, resumable: false },
  lineage: { inputRoles: ["base"], relation: "derivedFrom" },
  platforms: ["web"],
  degrade: "需要归档原件、明确工作流和可用适配器；原生与通用API尚未验收。",
  card: "docs/features/feat-041-upscale.md",
});
export const executeUpscaleCapability = imageTaskCapability(
  "image.upscale",
  "1.0.0",
);
