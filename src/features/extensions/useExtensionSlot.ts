import { useSyncExternalStore } from "react";
import type { SlotDefinition } from "./extensionTypes.ts";
import { slotRegistry } from "./slotRegistry.ts";

const EMPTY_SLOTS: readonly SlotDefinition[] = [];
/**
 * React hook to observe registered items for a given UI slot.
 */
export function useExtensionSlot(slotId: string): readonly SlotDefinition[] {
  return useSyncExternalStore(
    (onStoreChange) => slotRegistry.subscribe(slotId, onStoreChange),
    () => slotRegistry.getItems(slotId),
    () => EMPTY_SLOTS,
  );
}
