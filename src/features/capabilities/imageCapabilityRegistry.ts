import {
  capabilityTaskReferenceSchema,
  capabilityTaskIdSchema,
  type BusinessCapabilityManifest,
} from "../../../packages/creation-contracts/index.ts";
import {
  CapabilityRegistry,
  type CapabilityParser,
} from "./capabilityRegistry.ts";
import {
  outpaintCapabilityManifest,
  executeOutpaintCapability,
} from "./outpaintCapability.ts";
import {
  upscaleCapabilityManifest,
  executeUpscaleCapability,
} from "./upscaleCapability.ts";
import {
  layerSplitCapabilityManifest,
  executeLayerSplitCapability,
} from "./layerSplitCapability.ts";
export function createImageCapabilityRegistry(
  overrides: Partial<Record<string, boolean>> = {},
) {
  const entries = [
    [outpaintCapabilityManifest, executeOutpaintCapability],
    [upscaleCapabilityManifest, executeUpscaleCapability],
    [layerSplitCapabilityManifest, executeLayerSplitCapability],
  ] as const;
  const schemas = new Map<string, CapabilityParser>([
    ["creation.task-id", capabilityTaskIdSchema],
  ]);
  for (const [manifest] of entries)
    schemas.set(manifest.input, capabilityTaskReferenceSchema);
  const registry = new CapabilityRegistry(schemas);
  for (const [manifest, execute] of entries)
    registry.register(
      {
        ...manifest,
        enabled: overrides[manifest.id] ?? manifest.enabled,
      } satisfies BusinessCapabilityManifest,
      execute,
    );
  return registry;
}
