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
