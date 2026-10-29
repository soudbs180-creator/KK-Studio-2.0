import { capabilityManifestSchema } from "../../../packages/creation-contracts/index.ts";
import { imageTaskCapability } from "./imageTaskCapability.ts";
export const outpaintCapabilityManifest = capabilityManifestSchema.parse({
  id: "image.outpaint",
  version: "1.0.0",
  title: "扩图",
  kind: "builtin",
  input: "image.outpaint.task-reference",
  output: "creation.task-id",
  requires: { permissions: ["ai:generate", "asset:read", "asset:write"] },
  adapters: [
    {
      id: "image.outpaint/comfyui",
      kind: "comfyui",
      priority: 10,
      compat: "^1.5.0",
    },
    {
      id: "image.outpaint/provider-api",
      kind: "provider-api",
      priority: 0,
      compat: "^1.5.0",
    },
  ],
  task: { progress: true, cancellable: true, resumable: false },
  lineage: { inputRoles: ["base"], relation: "derivedFrom" },
  platforms: ["web"],
  degrade: "需要归档原件、明确工作流和可用适配器；原生与通用API尚未验收。",
  card: "docs/features/feat-040-outpaint.md",
});
export const executeOutpaintCapability = imageTaskCapability(
  "image.outpaint",
  "1.0.0",
);
