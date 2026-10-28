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
