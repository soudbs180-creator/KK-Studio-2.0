// Public contract entry for feature: capabilities
export {
  CapabilityRegistry,
  CapabilityRegistryError,
} from "./capabilityRegistry.ts";
export type {
  CapabilityConstraints,
  CapabilityExecutionContext,
  CapabilityExecutor,
  CapabilityParser,
  CapabilityResolution,
  CapabilityFallbackEvent,
} from "./capabilityRegistry.ts";
export {
  inpaintCapabilityManifest,
  executeInpaintCapability,
} from "./inpaintCapability.ts";

export {
  outpaintCapabilityManifest,
  executeOutpaintCapability,
} from "./outpaintCapability.ts";

export {
  upscaleCapabilityManifest,
  executeUpscaleCapability,
} from "./upscaleCapability.ts";

export {
  layerSplitCapabilityManifest,
  executeLayerSplitCapability,
} from "./layerSplitCapability.ts";
export { createImageCapabilityRegistry } from "./imageCapabilityRegistry.ts";
