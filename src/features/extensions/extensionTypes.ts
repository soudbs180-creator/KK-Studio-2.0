/**
 * Clean-Room TypeScript definitions for KK Studio 2.0 Extension Runtime Bridge.
 *
 * Adheres strictly to Zero AGPL-3.0 Contamination:
 * All interfaces synthesized natively with modern TypeScript idioms.
 */

export type DisposeFn = () => void;

export type ExtensionSlotId =
  | "status.bar"
  | "composer.action"
  | "composer.above"
  | "composer.below"
  | "titlebar.actions"
  | "sidebar.section"
  | "message.action"
  | "message.decoration"
  | "sidepanel"
  | "canvas.toolbar"
  | "modal"
  | (string & {});

export interface SlotMountContext {
  container: HTMLElement;
  slotId: string;
  extensionId: string;
  payload?: Record<string, unknown>;
}

export interface SlotDefinition {
  id?: string;
  slot: string;
  order?: number;
  title?: string;
  render: (ctx: SlotMountContext) => DisposeFn | void;
}

export interface SlotHandle {
  id: string;
  slot: string;
  refresh: () => void;
  dispose: DisposeFn;
}

export interface ExtensionStorage {
  get<T = unknown>(key: string, defaultValue?: T): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ToastOptions {
  type?: "info" | "success" | "warning" | "error";
  durationMs?: number;
}

export interface ExtensionUI {
  toast(message: string, options?: ToastOptions): void;
  confirm(message: string): Promise<boolean>;
  openSidePanel(panelId: string): void;
  closeSidePanel(panelId: string): void;
}

export interface MiddlewareNext<T> {
  (value?: T): T | Promise<T>;
}

export interface MiddlewareHandler<T> {
  (value: T, next: MiddlewareNext<T>): T | Promise<T>;
}

export interface ExtensionContext {
  readonly id: string;
  readonly disposed: boolean;

  // Lifecycle & Side-Effects
  effect(fn: () => DisposeFn | void | Promise<DisposeFn | void>): DisposeFn;
  onCleanup(fn: DisposeFn): void;
  listen(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): DisposeFn;
  setTimeout(handler: () => void, delayMs?: number): DisposeFn;
  setInterval(handler: () => void, delayMs?: number): DisposeFn;

  // UI Slot Registration
  registerSlot(definition: SlotDefinition): SlotHandle;

  // Event Bus
  on(event: string, handler: (...args: unknown[]) => void): DisposeFn;
  emit(event: string, ...args: unknown[]): void;

  // Interceptor Pipeline
  intercept<T = unknown>(
    pipeline: string,
    handler: MiddlewareHandler<T>,
    options?: { order?: number },
  ): DisposeFn;
  waterfall<T = unknown>(pipeline: string, initialValue: T): Promise<T>;

  // Scoped Services
  readonly storage: ExtensionStorage;
  readonly ui: ExtensionUI;

  // Diagnostics & Teardown
  fail(error: unknown): void;
  dispose(): void;
}

export type ExtensionFactory = (ctx: ExtensionContext) => void | Promise<void>;

export interface ExtensionRegistration {
  id: string;
  name?: string;
  version?: string;
  context: ExtensionContext;
  status: "active" | "degraded" | "disposed";
  error?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  slots?: string[];
}

export interface ExtensionRuntimeBridge {
  readonly version: string;
  readonly apiVersion: number;
  readonly extensions: ReadonlyMap<string, ExtensionRegistration>;

  extension(id: string, factory: ExtensionFactory): ExtensionContext;
  plugin(id: string, factory: ExtensionFactory): ExtensionContext;

  // Backward-compatible API for e2e tests
  registerExtension(
    manifest: ExtensionManifest,
    cleanupFn?: () => void,
  ): boolean;
  registerSlot(slotName: string, extId: string, render: () => string): void;
  getSlotItems(slotName: string): string[];
  unloadExtension(extId: string): void;

  // Slot management
  getSlotDefinitions(slot: string): readonly SlotDefinition[];
  subscribeSlots(slot: string, callback: () => void): DisposeFn;

  // Middleware & Events
  waterfall<T = unknown>(pipeline: string, value: T): Promise<T>;
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: (...args: unknown[]) => void): DisposeFn;

  readonly ui: ExtensionUI;
}

declare global {
  interface Window {
    kkStudio?: ExtensionRuntimeBridge;
  }
}
