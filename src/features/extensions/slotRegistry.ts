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

const EMPTY_SLOTS: readonly SlotDefinition[] = [];

export class SlotRegistry {
  readonly #slots = new Map<string, Map<string, SlotDefinition>>();
  readonly #snapshots = new Map<string, readonly SlotDefinition[]>();
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
      extensionId: extId,
      order: def.order ?? 0,
    };

    const key = JSON.stringify([extId, itemId]);
    slotMap.set(key, fullDef);
    this.#notify(slotId);

    return {
      id: itemId,
      slot: slotId,
      refresh: () => {
        if (!slotMap.has(key)) return;
        slotMap.set(key, { ...slotMap.get(key)! });
        this.#notify(slotId);
      },
      dispose: () => this.unregister(extId, itemId, slotId),
    };
  }

  unregister(extId: string, itemId: string, slotId?: string): void {
    const key = JSON.stringify([extId, itemId]);
    if (slotId) {
      const map = this.#slots.get(slotId);
      if (map && map.delete(key)) {
        if (map.size === 0) this.#slots.delete(slotId);
        this.#notify(slotId);
      }
      return;
    }

    for (const [sId, map] of this.#slots.entries()) {
      if (map.delete(key)) {
        if (map.size === 0) this.#slots.delete(sId);
        this.#notify(sId);
      }
    }
  }

  unregisterExtension(extId: string): void {
    let changed = false;
    for (const [slotId, map] of this.#slots.entries()) {
      for (const [itemId, def] of map.entries()) {
        if (def.extensionId === extId) {
          map.delete(itemId);
          changed = true;
        }
      }
      if (map.size === 0) this.#slots.delete(slotId);
    }
    if (changed) this.#notify();
  }

  getItems(slotId: string): readonly SlotDefinition[] {
    const snapshot = this.#snapshots.get(slotId);
    if (snapshot) return snapshot;
    const map = this.#slots.get(slotId);
    if (!map || map.size === 0) return EMPTY_SLOTS;
    const items = [...map.values()].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    this.#snapshots.set(slotId, items);
    return items;
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
    if (slotId) this.#snapshots.delete(slotId);
    else this.#snapshots.clear();
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
