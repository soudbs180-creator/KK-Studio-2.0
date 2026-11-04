/**
 * Global UI Slot Registry.
 *
 * Implements "Persistent Registry, Transient Mounts":
 * Extension registrations persist safely across React component mount/unmount cycles.
 */
import type {
  DisposeFn,
  SlotDefinition,
  SlotHandle,
} from "./extensionTypes.ts";

export class SlotRegistry {
  readonly #slots = new Map<string, Map<string, SlotDefinition>>();
  readonly #listeners = new Set<(slotId?: string) => void>();

  register(extId: string, def: SlotDefinition): SlotHandle {
    const slotId = def.slot;
    let slotMap = this.#slots.get(slotId);
    if (!slotMap) {
      slotMap = new Map();
      this.#slots.set(slotId, slotMap);
    }

    const itemId =
      def.id ??
      `${extId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullDef: SlotDefinition = {
      ...def,
      id: itemId,
      order: def.order ?? 0,
    };

    slotMap.set(itemId, fullDef);
    this.#notify(slotId);

    return {
      id: itemId,
      slot: slotId,
      refresh: () => this.#notify(slotId),
      dispose: () => this.unregister(extId, itemId, slotId),
    };
  }

  unregister(extId: string, itemId: string, slotId?: string): void {
    if (slotId) {
      const map = this.#slots.get(slotId);
      if (map && map.delete(itemId)) {
        if (map.size === 0) this.#slots.delete(slotId);
        this.#notify(slotId);
      }
      return;
    }

    for (const [sId, map] of this.#slots.entries()) {
      if (map.delete(itemId)) {
        if (map.size === 0) this.#slots.delete(sId);
        this.#notify(sId);
      }
    }
  }

  unregisterExtension(extId: string): void {
    let changed = false;
    for (const [slotId, map] of this.#slots.entries()) {
      for (const [itemId, def] of map.entries()) {
        if (itemId.startsWith(extId) || def.id?.startsWith(extId)) {
          map.delete(itemId);
          changed = true;
        }
      }
      if (map.size === 0) this.#slots.delete(slotId);
    }
    if (changed) this.#notify();
  }

  getItems(slotId: string): readonly SlotDefinition[] {
    const map = this.#slots.get(slotId);
    if (!map || map.size === 0) return [];
    return [...map.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  subscribe(slotId: string, callback: () => void): DisposeFn {
    const listener = (changedSlotId?: string) => {
      if (!changedSlotId || changedSlotId === slotId) {
        callback();
      }
    };
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  clear(): void {
    this.#slots.clear();
    this.#notify();
  }

  #notify(slotId?: string): void {
    for (const listener of this.#listeners) {
      try {
        listener(slotId);
      } catch (err) {
        console.error("[SlotRegistry] Listener error:", err);
      }
    }
  }
}

export const slotRegistry = new SlotRegistry();
