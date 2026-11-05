import test from "node:test";
import assert from "node:assert/strict";
import {
  KkMemoryStore,
  InMemoryMemoryDriver,
  TauriMemoryDriver,
  emptyStoreV2,
} from "../../src/features/memory/kkMemoryStore.ts";
import { MemoryService } from "../../src/features/memory/memoryService.ts";

function fixture() {
  const store = new KkMemoryStore({ driver: new InMemoryMemoryDriver() });
  const service = new MemoryService({
    storage: store.asMemoryStorage(),
    storageForNamespace: (namespace) => store.asMemoryStorage(namespace),
    settings: { read: () => ({ enabled: true }), write: () => {} },
    queryScoped: (options) => store.queryCascading(options),
  });
  return { store, service };
}

test("production memory management extracts and deletes only the selected namespace", async () => {
  const { service } = fixture();
  await service.saveCodexExtraction(
    "记忆：用户喜欢黑色背景",
    undefined,
    0,
    () => true,
    "project:p1",
  );
  await service.saveCodexExtraction(
    "记忆：用户喜欢黑色文字",
    undefined,
    0,
    () => true,
    "session:s1",
  );
  assert.equal((await service.load()).records.length, 0);
  const project = await service.load("project:p1");
  assert.equal(project.records.length, 1);
  assert.equal((await service.load("project:p2")).records.length, 0);
  await service.deleteRecord(project.records[0].id, "project:p1");
  assert.equal((await service.load("project:p1")).records.length, 0);
  assert.equal((await service.load("session:s1")).records.length, 1);
  assert.equal(
    await service.saveCodexExtraction(
      "记忆：旧提炼结果",
      undefined,
      0,
      () => true,
      "session:s1",
    ),
    0,
  );
  assert.match(
    await service.buildInjection("黑色", { projectId: "p1", sessionId: "s1" }),
    /黑色文字/,
  );
  await service.clearAll("session:s1");
  assert.equal(await service.buildInjection("黑色", { sessionId: "s1" }), "");
});

test("scoped reset keeps global data and an unsupported scope never falls back to global", async () => {
  const { store, service } = fixture();
  await service.saveCodexExtraction("记忆：全局偏好", undefined);
  await service.saveCodexExtraction(
    "记忆：项目偏好",
    undefined,
    0,
    () => true,
    "project:p1",
  );
  await service.resetIdentity("project:p1");
  assert.equal((await service.load("project:p1")).records.length, 0);
  assert.equal((await service.load()).records.length, 1);
  await assert.rejects(() => service.load("project:"), /无效/);
  const legacy = new MemoryService({ storage: store.asMemoryStorage() });
  await assert.rejects(() => legacy.load("project:p1"), /作用域/);
});

test("Desktop scoped identity reset delegates to the native backup command instead of a normal write", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  });
  const calls: Array<{ command: string; namespace: string }> = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      __TAURI_INTERNALS__: {
        invoke: async (command: string, args: { namespace: string }) => {
          calls.push({ command, namespace: args.namespace });
          if (command === "memory_read_scoped")
            return JSON.stringify(emptyStoreV2(args.namespace));
          return undefined;
        },
      },
    },
  });
  const store = new KkMemoryStore({ driver: new TauriMemoryDriver() });
  const service = new MemoryService({
    storage: store.asMemoryStorage(),
    storageForNamespace: (ns) => store.asMemoryStorage(ns),
  });
  await service.resetIdentity("project:p1");
  assert.deepEqual(calls, [
    { command: "memory_reset_scoped", namespace: "project:p1" },
    { command: "memory_read_scoped", namespace: "project:p1" },
  ]);
});
