import assert from "node:assert/strict";
import test from "node:test";
import {
  ExtensionRuntimeBridgeImpl,
  SlotRegistry,
  SimpleEventEmitter,
  SimpleMiddlewarePipeline,
  type ExtensionStorage,
} from "../../src/features/extensions/index.ts";

test("ExtensionBridge: global bridge initialization and version metadata", () => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  assert.equal(bridge.version, "2.0.0");
  assert.equal(bridge.apiVersion, 1);
  assert.ok(bridge.extensions instanceof Map);
});

test("ExtensionBridge: extension lifecycle and LIFO reverse cleanup stack", () => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  const cleanupOrder: number[] = [];

  const ctx = bridge.extension("test-ext", (context) => {
    context.onCleanup(() => cleanupOrder.push(1));
    context.onCleanup(() => cleanupOrder.push(2));
    context.effect(() => () => cleanupOrder.push(3));
  });

  assert.equal(ctx.disposed, false);
  ctx.dispose();
  assert.equal(ctx.disposed, true);

  // Must execute in strictly reverse LIFO order: 3, 2, 1
  assert.deepEqual(cleanupOrder, [3, 2, 1]);
});

test("ExtensionBridge: error containment prevents host failure on extension error", () => {
  const bridge = new ExtensionRuntimeBridgeImpl();

  // Crashing extension
  bridge.extension("crashing-ext", () => {
    throw new Error("Deliberate extension crash");
  });

  const reg = bridge.extensions.get("crashing-ext");
  assert.ok(reg);
  assert.equal(reg.status, "degraded");
  assert.match(reg.error ?? "", /Deliberate extension crash/);

  // Subsequent valid extension executes fine
  let healthyRan = false;
  bridge.extension("healthy-ext", () => {
    healthyRan = true;
  });
  assert.equal(healthyRan, true);
  assert.equal(bridge.extensions.get("healthy-ext")?.status, "active");
});

test("ExtensionBridge: SimpleEventEmitter publishes and cleans up listeners", () => {
  const emitter = new SimpleEventEmitter();
  const received: string[] = [];

  const unlisten = emitter.on("custom:event", (data) => {
    received.push(String(data));
  });

  emitter.emit("custom:event", "msg-1");
  assert.deepEqual(received, ["msg-1"]);

  unlisten();
  emitter.emit("custom:event", "msg-2");
  assert.deepEqual(
    received,
    ["msg-1"],
    "Unsubscribed listener should not receive events",
  );
});

test("ExtensionBridge: SimpleMiddlewarePipeline processes waterfall sequentially by order", async () => {
  const pipeline = new SimpleMiddlewarePipeline();

  // Order 10
  pipeline.register<string>(
    "composer:prompt",
    async (val, next) => {
      const res = await next(val);
      return `${res} [order 10]`;
    },
    10,
  );

  // Order 0
  pipeline.register<string>(
    "composer:prompt",
    async (val, next) => {
      const res = await next(`${val} [order 0]`);
      return res;
    },
    0,
  );

  const result = await pipeline.execute("composer:prompt", "base");
  assert.equal(result, "base [order 0] [order 10]");
});

test("ExtensionBridge: SlotRegistry manages items, sorting, and subscriptions", () => {
  const registry = new SlotRegistry();
  let notificationCount = 0;

  const unsubscribe = registry.subscribe("status.bar", () => {
    notificationCount++;
  });

  const h1 = registry.register("ext-1", {
    slot: "status.bar",
    order: 20,
    render: () => {},
  });

  const h2 = registry.register("ext-2", {
    slot: "status.bar",
    order: 5,
    render: () => {},
  });

  assert.equal(notificationCount, 2);
  const items = registry.getItems("status.bar");
  assert.equal(items.length, 2);
  // Order 5 must precede Order 20
  assert.equal(items[0]!.order, 5);
  assert.equal(items[1]!.order, 20);

  h1.dispose();
  assert.equal(registry.getItems("status.bar").length, 1);
  assert.equal(registry.getItems("status.bar")[0]!.order, 5);

  unsubscribe();
  h2.dispose();
  // Notification count should not increase after unsubscribe
  assert.equal(notificationCount, 3);
});

test("ExtensionBridge: backward-compatible e2e manifest registration and slot mounting", () => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  let cleanupCalled = false;

  bridge.registerExtension(
    {
      id: "manifest-ext",
      name: "Manifest Extension",
      version: "1.0.0",
      entryPoint: "main.js",
    },
    () => {
      cleanupCalled = true;
    },
  );

  // Duplicate registration throws
  assert.throws(
    () =>
      bridge.registerExtension({
        id: "manifest-ext",
        name: "Dup",
        version: "1.0.0",
        entryPoint: "dup.js",
      }),
    /already registered/,
  );

  // Unregistered extension mounting slot throws
  assert.throws(
    () => bridge.registerSlot("toolbar", "ghost-ext", () => "<button/>"),
    /Unregistered extension/,
  );

  // Register slot
  bridge.registerSlot("toolbar", "manifest-ext", () => "<button id='btn'/>");
  const items = bridge.getSlotItems("toolbar");
  assert.deepEqual(items, ["<button id='btn'/>"]);

  // Unload extension cleans up and purges slots
  bridge.unloadExtension("manifest-ext");
  assert.equal(cleanupCalled, true);
  assert.deepEqual(bridge.getSlotItems("toolbar"), []);
});

test("ExtensionBridge: scoped storage isolates keys per extension", async () => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  let storageA: ExtensionStorage | undefined;
  let storageB: ExtensionStorage | undefined;

  bridge.extension("ext-A", (ctx) => {
    storageA = ctx.storage;
  });
  bridge.extension("ext-B", (ctx) => {
    storageB = ctx.storage;
  });

  assert.ok(storageA);
  assert.ok(storageB);
  await storageA.set("key1", "valA");
  await storageB.set("key1", "valB");

  assert.equal(await storageA.get("key1"), "valA");
  assert.equal(await storageB.get("key1"), "valB");

  await storageA.remove("key1");
  assert.equal(await storageA.get("key1"), null);
  assert.equal(await storageB.get("key1"), "valB");
});

test("ExtensionBridge: slot snapshots stay stable until a registration changes", () => {
  const registry = new SlotRegistry();
  assert.equal(
    registry.getItems("canvas.toolbar"),
    registry.getItems("canvas.toolbar"),
  );
  const handle = registry.register("stable", {
    slot: "canvas.toolbar",
    render: () => {},
  });
  const snapshot = registry.getItems("canvas.toolbar");
  assert.equal(registry.getItems("canvas.toolbar"), snapshot);
  handle.refresh();
  assert.notEqual(registry.getItems("canvas.toolbar"), snapshot);
  assert.notEqual(registry.getItems("canvas.toolbar")[0], snapshot[0]);
  handle.dispose();
  assert.equal(registry.getItems("canvas.toolbar").length, 0);
});

test("ExtensionBridge: unloading an extension removes only its owned slots", () => {
  const registry = new SlotRegistry();
  registry.register("ext", {
    id: "shared",
    slot: "sidepanel",
    render: () => {},
  });
  registry.register("ext-other", {
    id: "shared",
    slot: "sidepanel",
    render: () => {},
  });
  assert.equal(registry.getItems("sidepanel").length, 2);
  registry.unregisterExtension("ext");
  assert.equal(registry.getItems("sidepanel").length, 1);
  assert.equal(registry.getItems("sidepanel")[0]?.extensionId, "ext-other");
});

test("ExtensionBridge: settings enable and disable reuse the registered factory", () => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  let starts = 0;
  let cleanups = 0;
  const notifications: string[] = [];
  const unsubscribe = bridge.subscribeExtensions(() => {
    notifications.push(bridge.getExtensions()[0]?.status ?? "removed");
  });
  bridge.extension("toggle-ext", (ctx) => {
    starts++;
    ctx.registerSlot({
      id: "custom-id",
      slot: "titlebar.actions",
      render: () => {},
    });
    ctx.onCleanup(() => cleanups++);
  });
  const enabled = bridge.getExtensions();
  assert.equal(bridge.getExtensions(), enabled);
  assert.equal(bridge.getSlotDefinitions("titlebar.actions").length, 1);
  bridge.setExtensionEnabled("toggle-ext", false);
  assert.equal(bridge.getSlotDefinitions("titlebar.actions").length, 0);
  assert.equal(bridge.getExtensions()[0]?.status, "disabled");
  assert.equal(cleanups, 1);
  bridge.setExtensionEnabled("toggle-ext", true);
  assert.equal(starts, 2);
  assert.equal(bridge.getSlotDefinitions("titlebar.actions").length, 1);
  bridge.unloadExtension("toggle-ext");
  assert.equal(cleanups, 2);
  assert.equal(bridge.getExtensions().length, 0);
  assert.equal(notifications.at(-1), "removed");
  unsubscribe();
});

test("ExtensionBridge: legacy registrations appear in settings and dispose on disable", (t) => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  t.after(() => bridge.unloadExtension("legacy-settings"));
  let cleanups = 0;
  bridge.registerExtension(
    {
      id: "legacy-settings",
      name: "Legacy Settings",
      version: "1.2.3",
      entryPoint: "legacy.js",
    },
    () => cleanups++,
  );
  bridge.registerSlot(
    "titlebar.actions",
    "legacy-settings",
    () => "Legacy action",
  );
  const registration = bridge.getExtensions()[0];
  assert.equal(registration?.name, "Legacy Settings");
  assert.equal(registration?.version, "1.2.3");
  assert.equal(registration?.restartable, false);
  bridge.setExtensionEnabled("legacy-settings", false);
  assert.equal(cleanups, 1);
  assert.equal(bridge.getExtensions()[0]?.status, "disabled");
  assert.equal(bridge.getSlotDefinitions("titlebar.actions").length, 0);
  assert.throws(
    () => bridge.setExtensionEnabled("legacy-settings", true),
    /重新加载/,
  );
  bridge.unloadExtension("legacy-settings");
  assert.equal(cleanups, 1);
  assert.equal(bridge.getExtensions().length, 0);
});

test("ExtensionBridge: legacy string slots render text and do not inject HTML", (t) => {
  const bridge = new ExtensionRuntimeBridgeImpl();
  t.after(() => bridge.unloadExtension("legacy-text"));
  bridge.registerExtension({
    id: "legacy-text",
    name: "Legacy Text",
    version: "1.0.0",
    entryPoint: "legacy.js",
  });
  bridge.registerSlot(
    "titlebar.actions",
    "legacy-text",
    () => "<button>Action</button>",
  );
  const container = { textContent: "", innerHTML: "" };
  bridge
    .getSlotDefinitions("titlebar.actions")
    .find((item) => item.extensionId === "legacy-text")!
    .render({
      container: container as unknown as HTMLElement,
      extensionId: "legacy-text",
      slotId: "titlebar.actions",
    });
  assert.equal(container.textContent, "<button>Action</button>");
  assert.equal(container.innerHTML, "");
  bridge.unloadExtension("legacy-text");
});
