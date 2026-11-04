/**
 * Clean-Room Extension Runtime Bridge (window.kkStudio).
 *
 * Implements:
 * - Persistent registry, transient React slot mounts
 * - LIFO reverse cleanup stack
 * - Multi-tier error containment and error boundaries
 * - Composable async waterfall middleware pipeline
 * - Strict Zero AGPL-3.0 clean-room isolation
 */
import type {
  DisposeFn,
  ExtensionContext,
  ExtensionFactory,
  ExtensionManifest,
  ExtensionRegistration,
  ExtensionRuntimeBridge,
  ExtensionStorage,
  ExtensionUI,
  MiddlewareHandler,
  SlotDefinition,
  ToastOptions,
} from "./extensionTypes.ts";
import { slotRegistry } from "./slotRegistry.ts";

export class SimpleEventEmitter {
  readonly #listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on(event: string, handler: (...args: unknown[]) => void): DisposeFn {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`[ExtensionEventEmitter] Error in "${event}":`, err);
      }
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}

export class SimpleMiddlewarePipeline {
  readonly #pipelines = new Map<
    string,
    Array<{ order: number; handler: MiddlewareHandler<unknown> }>
  >();

  register<T>(
    pipeline: string,
    handler: MiddlewareHandler<T>,
    order = 0,
  ): DisposeFn {
    let list = this.#pipelines.get(pipeline);
    if (!list) {
      list = [];
      this.#pipelines.set(pipeline, list);
    }
    const item = { order, handler: handler as MiddlewareHandler<unknown> };
    list.push(item);
    list.sort((a, b) => a.order - b.order);

    return () => {
      const current = this.#pipelines.get(pipeline);
      if (current) {
        const index = current.indexOf(item);
        if (index >= 0) current.splice(index, 1);
      }
    };
  }

  async execute<T>(pipeline: string, initialValue: T): Promise<T> {
    const list = this.#pipelines.get(pipeline);
    if (!list || list.length === 0) return initialValue;

    let index = 0;
    const next = async (val?: unknown): Promise<unknown> => {
      const currentVal = val !== undefined ? val : initialValue;
      if (index >= list.length) {
        return currentVal;
      }
      const middleware = list[index++]!;
      return middleware.handler(currentVal, next);
    };

    return (await next(initialValue)) as T;
  }
}

function createScopedStorage(id: string): ExtensionStorage {
  const prefix = `kk_ext_${id}_`;
  const memoryStore = new Map<string, unknown>();

  return {
    async get<T>(key: string, defaultValue?: T): Promise<T | null> {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const raw = window.localStorage.getItem(prefix + key);
          if (raw !== null) {
            return JSON.parse(raw) as T;
          }
        } catch {
          // fallback to memory
          void 0;
        }
      }
      if (memoryStore.has(key)) {
        return memoryStore.get(key) as T;
      }
      return defaultValue !== undefined ? defaultValue : null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem(prefix + key, JSON.stringify(value));
        } catch {
          // fallback to memory
          void 0;
        }
      }
      memoryStore.set(key, value);
    },
    async remove(key: string): Promise<void> {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.removeItem(prefix + key);
        } catch {
          // fallback to memory
          void 0;
        }
      }
      memoryStore.delete(key);
    },
    async clear(): Promise<void> {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          for (let i = window.localStorage.length - 1; i >= 0; i--) {
            const k = window.localStorage.key(i);
            if (k?.startsWith(prefix)) {
              window.localStorage.removeItem(k);
            }
          }
        } catch {
          // fallback
          void 0;
        }
      }
      memoryStore.clear();
    },
  };
}

function createScopedUI(id: string): ExtensionUI {
  return {
    toast(message: string, options?: ToastOptions): void {
      console.info(
        `[KKStudio Toast] [${id}] [${options?.type ?? "info"}]: ${message}`,
      );
    },
    async confirm(message: string): Promise<boolean> {
      if (
        typeof window !== "undefined" &&
        typeof window.confirm === "function"
      ) {
        return window.confirm(`[${id}] ${message}`);
      }
      return true;
    },
    openSidePanel(panelId: string): void {
      console.info(`[KKStudio UI] Open side panel: ${panelId}`);
    },
    closeSidePanel(panelId: string): void {
      console.info(`[KKStudio UI] Close side panel: ${panelId}`);
    },
  };
}

export function createExtensionContext(
  id: string,
  events: SimpleEventEmitter,
  middleware: SimpleMiddlewarePipeline,
  onDisposed: (ctx: ExtensionContext) => void,
): ExtensionContext {
  const disposers: DisposeFn[] = [];
  let isDisposed = false;

  const track = <T extends DisposeFn>(fn: T): T => {
    if (isDisposed) {
      fn();
      return fn;
    }
    disposers.push(fn);
    return fn;
  };

  const context: ExtensionContext = {
    id,
    get disposed() {
      return isDisposed;
    },

    effect(fn) {
      try {
        const res = fn();
        if (res instanceof Promise) {
          let asyncCancelled = false;
          let asyncDisposer: DisposeFn | void;
          res
            .then((val) => {
              if (typeof val === "function") {
                if (asyncCancelled || isDisposed) val();
                else asyncDisposer = val;
              }
            })
            .catch((err) => context.fail(err));

          return track(() => {
            asyncCancelled = true;
            if (typeof asyncDisposer === "function") asyncDisposer();
          });
        }
        if (typeof res === "function") {
          return track(res);
        }
      } catch (err) {
        context.fail(err);
      }
      return () => {};
    },

    onCleanup(fn) {
      track(fn);
    },

    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      return track(() => target.removeEventListener(type, handler, options));
    },

    setTimeout(handler, delayMs) {
      const timer = setTimeout(() => {
        try {
          handler();
        } catch (err) {
          context.fail(err);
        }
      }, delayMs);
      return track(() => clearTimeout(timer));
    },

    setInterval(handler, delayMs) {
      const interval = setInterval(() => {
        try {
          handler();
        } catch (err) {
          context.fail(err);
        }
      }, delayMs);
      return track(() => clearInterval(interval));
    },

    registerSlot(def) {
      const handle = slotRegistry.register(id, def);
      track(handle.dispose);
      return handle;
    },

    on(event, handler) {
      return track(events.on(event, handler));
    },

    emit(event, ...args) {
      events.emit(event, ...args);
    },

    intercept(pipeline, handler, options) {
      return track(middleware.register(pipeline, handler, options?.order ?? 0));
    },

    waterfall(pipeline, initialValue) {
      return middleware.execute(pipeline, initialValue);
    },

    storage: createScopedStorage(id),
    ui: createScopedUI(id),

    fail(error) {
      console.error(`[KKStudio Extension Error] [${id}]:`, error);
    },

    dispose() {
      if (isDisposed) return;
      isDisposed = true;

      // Execute disposers in strictly reverse order (LIFO)
      const list = disposers.splice(0).reverse();
      for (const dispose of list) {
        try {
          dispose();
        } catch (err) {
          console.error(`[KKStudio Extension Cleanup Error] [${id}]:`, err);
        }
      }
      onDisposed(context);
    },
  };

  return context;
}

export class ExtensionRuntimeBridgeImpl implements ExtensionRuntimeBridge {
  readonly version = "2.0.0";
  readonly apiVersion = 1;
  readonly #extensions = new Map<string, ExtensionRegistration>();
  readonly #legacyCleanups = new Map<string, () => void>();
  readonly #legacyManifests = new Map<string, ExtensionManifest>();
  readonly #legacySlots = new Map<
    string,
    Array<{ extId: string; render: () => string }>
  >();
  readonly #events = new SimpleEventEmitter();
  readonly #middleware = new SimpleMiddlewarePipeline();
  readonly #ui = createScopedUI("host");

  get extensions(): ReadonlyMap<string, ExtensionRegistration> {
    return this.#extensions;
  }

  get ui(): ExtensionUI {
    return this.#ui;
  }

  extension(id: string, factory: ExtensionFactory): ExtensionContext {
    if (this.#extensions.has(id)) {
      const existing = this.#extensions.get(id)!;
      if (existing.status === "active") {
        existing.context.dispose();
      }
    }

    const context = createExtensionContext(
      id,
      this.#events,
      this.#middleware,
      (ctx) => {
        const reg = this.#extensions.get(ctx.id);
        if (reg) reg.status = "disposed";
        slotRegistry.unregisterExtension(ctx.id);
      },
    );

    const registration: ExtensionRegistration = {
      id,
      context,
      status: "active",
    };
    this.#extensions.set(id, registration);

    try {
      const result = factory(context);
      if (result instanceof Promise) {
        result.catch((err) => {
          registration.status = "degraded";
          registration.error = err instanceof Error ? err.message : String(err);
          context.fail(err);
        });
      }
    } catch (err) {
      registration.status = "degraded";
      registration.error = err instanceof Error ? err.message : String(err);
      context.fail(err);
    }

    return context;
  }

  plugin(id: string, factory: ExtensionFactory): ExtensionContext {
    return this.extension(id, factory);
  }

  // Backward-compatible API for e2e tests
  registerExtension(
    manifest: ExtensionManifest,
    cleanupFn?: () => void,
  ): boolean {
    if (
      this.#legacyManifests.has(manifest.id) ||
      this.#extensions.has(manifest.id)
    ) {
      throw new Error(`Extension ${manifest.id} already registered`);
    }
    this.#legacyManifests.set(manifest.id, manifest);
    if (cleanupFn) {
      this.#legacyCleanups.set(manifest.id, cleanupFn);
    }
    return true;
  }

  registerSlot(slotName: string, extId: string, render: () => string): void {
    if (!this.#legacyManifests.has(extId) && !this.#extensions.has(extId)) {
      throw new Error(
        `Unregistered extension ${extId} attempted to mount slot`,
      );
    }

    const list = this.#legacySlots.get(slotName) ?? [];
    list.push({ extId, render });
    this.#legacySlots.set(slotName, list);

    // Also mount into SlotRegistry for React UI parity
    slotRegistry.register(extId, {
      slot: slotName,
      render: (ctx) => {
        const str = render();
        ctx.container.innerHTML = str;
      },
    });
  }

  getSlotItems(slotName: string): string[] {
    const list = this.#legacySlots.get(slotName);
    if (!list) return [];
    return list.map((item) => item.render());
  }

  unloadExtension(extId: string): void {
    const cleanup = this.#legacyCleanups.get(extId);
    if (cleanup) {
      try {
        cleanup();
      } catch (err) {
        console.error(
          `[ExtensionRuntimeBridge] Cleanup failed for ${extId}:`,
          err,
        );
      }
    }
    this.#legacyCleanups.delete(extId);
    this.#legacyManifests.delete(extId);

    // Remove legacy slot items
    for (const [slot, items] of this.#legacySlots.entries()) {
      this.#legacySlots.set(
        slot,
        items.filter((i) => i.extId !== extId),
      );
    }

    // Dispose modern context if any
    const modern = this.#extensions.get(extId);
    if (modern) {
      modern.context.dispose();
      this.#extensions.delete(extId);
    }

    // Purge from slotRegistry
    slotRegistry.unregisterExtension(extId);
  }

  getSlotDefinitions(slot: string): readonly SlotDefinition[] {
    return slotRegistry.getItems(slot);
  }

  subscribeSlots(slot: string, callback: () => void): DisposeFn {
    return slotRegistry.subscribe(slot, callback);
  }

  waterfall<T = unknown>(pipeline: string, value: T): Promise<T> {
    return this.#middleware.execute(pipeline, value);
  }

  emit(event: string, ...args: unknown[]): void {
    this.#events.emit(event, ...args);
  }

  on(event: string, handler: (...args: unknown[]) => void): DisposeFn {
    return this.#events.on(event, handler);
  }
}

// Global bridge installation
export function getOrCreateGlobalBridge(): ExtensionRuntimeBridgeImpl {
  if (typeof window !== "undefined") {
    if (!window.kkStudio) {
      window.kkStudio = new ExtensionRuntimeBridgeImpl();
    }
    return window.kkStudio as ExtensionRuntimeBridgeImpl;
  }
  return new ExtensionRuntimeBridgeImpl();
}

export const extensionBridge = getOrCreateGlobalBridge();
