/**
 * Feature Slice: extensions
 *
 * Clean-Room Extension Runtime Bridge & Slot Registration Ecosystem.
 */
export type {
  DisposeFn,
  ExtensionSlotId,
  SlotMountContext,
  SlotDefinition,
  SlotHandle,
  ExtensionStorage,
  ToastOptions,
  ExtensionUI,
  MiddlewareNext,
  MiddlewareHandler,
  ExtensionContext,
  ExtensionFactory,
  ExtensionRegistration,
  ExtensionManifest,
  ExtensionRuntimeBridge,
} from "./extensionTypes.ts";

export { SlotRegistry, slotRegistry } from "./slotRegistry.ts";
export { ExtensionSlotErrorBoundary } from "./ExtensionSlotErrorBoundary.tsx";
export { useExtensionSlot } from "./useExtensionSlot.ts";
export { ExtensionSlot } from "./ExtensionSlot.tsx";
export type { ExtensionSlotProps } from "./ExtensionSlot.tsx";
export {
  ExtensionRuntimeBridgeImpl,
  SimpleEventEmitter,
  SimpleMiddlewarePipeline,
  createExtensionContext,
  getOrCreateGlobalBridge,
  extensionBridge,
} from "./runtimeBridge.ts";
