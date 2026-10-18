import assert from "node:assert/strict";
import test from "node:test";
import { ShadowEventBus } from "../../src/features/sync/shadowEventBus.ts";
import type { CheckpointResult, PruneOptions, PruneResult } from "../../src/features/sync/eventTypes.ts";

test("ShadowEventBus checkpoint and prune API contract in non-tauri environment", async () => {
  const bus = new ShadowEventBus();

  // In non-Tauri / browser environment, checkpoint and prune gracefully return null without throwing
  const ckptRes = await bus.checkpoint("truncate");
  assert.strictEqual(ckptRes, null);

  const pruneOpts: PruneOptions = {
    retainLatest: 1000,
    checkpointAfter: true,
  };
  const pruneRes = await bus.prune(pruneOpts);
  assert.strictEqual(pruneRes, null);
});

test("ShadowEventBus mock IPC invocation of checkpoint and prune", async () => {
  let invokedCommand = "";
  let invokedArgs: unknown = null;

  // Mock Tauri invoke implementation
  const mockInvoke = async <T>(cmd: string, args?: unknown): Promise<T> => {
    invokedCommand = cmd;
    invokedArgs = args;

    if (cmd === "event_bus_checkpoint") {
      return {
        busy: false,
        log: 0,
        checkpointed: 12,
      } as T;
    }
    if (cmd === "event_bus_prune") {
      return {
        deletedCount: 50,
        prunedBeforeSeq: 51,
        remainingCount: 100,
        checkpoint: {
          busy: false,
          log: 0,
          checkpointed: 5,
        },
      } as T;
    }
    throw new Error(`Unknown command ${cmd}`);
  };

  // Test custom wrapper simulating desktop IPC invocation
  const testCheckpoint = async (mode?: "truncate" | "passive" | "full" | "restart"): Promise<CheckpointResult> => {
    return await mockInvoke<CheckpointResult>("event_bus_checkpoint", { mode });
  };

  const testPrune = async (options: PruneOptions): Promise<PruneResult> => {
    return await mockInvoke<PruneResult>("event_bus_prune", { options });
  };

  const ckpt = await testCheckpoint("truncate");
  assert.strictEqual(invokedCommand, "event_bus_checkpoint");
  assert.deepStrictEqual(invokedArgs, { mode: "truncate" });
  assert.strictEqual(ckpt.busy, false);
  assert.strictEqual(ckpt.checkpointed, 12);

  const prune = await testPrune({ retainLatest: 100, checkpointAfter: true });
  assert.strictEqual(invokedCommand, "event_bus_prune");
  assert.deepStrictEqual(invokedArgs, { options: { retainLatest: 100, checkpointAfter: true } });
  assert.strictEqual(prune.deletedCount, 50);
  assert.strictEqual(prune.remainingCount, 100);
  assert.strictEqual(prune.checkpoint?.checkpointed, 5);
});

test("ShadowEventBus direct method invocation with mocked Tauri environment", async () => {
  let invokedCmd = "";
  let invokedPayload: unknown = null;

  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const originalIsTauri = (globalThis as unknown as { isTauri?: unknown }).isTauri;
  try {
    (globalThis as unknown as { isTauri: boolean }).isTauri = true;
    (globalThis as unknown as { window: unknown }).window = {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke: async (cmd: string, args: unknown) => {
          invokedCmd = cmd;
          invokedPayload = args;
          if (cmd === "event_bus_checkpoint") {
            return { busy: false, log: 0, checkpointed: 8 };
          }
          if (cmd === "event_bus_prune") {
            return {
              deletedCount: 15,
              prunedBeforeSeq: 16,
              remainingCount: 20,
              checkpoint: { busy: false, log: 0, checkpointed: 8 },
            };
          }
          return null;
        },
      },
    };

    const bus = new ShadowEventBus();
    const ckpt = await bus.checkpoint("truncate");
    assert.strictEqual(invokedCmd, "event_bus_checkpoint");
    assert.deepStrictEqual(invokedPayload, { mode: "truncate" });
    assert.strictEqual(ckpt?.checkpointed, 8);

    const pruneRes = await bus.prune({ retainLatest: 20, checkpointAfter: true });
    assert.strictEqual(invokedCmd, "event_bus_prune");
    assert.deepStrictEqual(invokedPayload, { options: { retainLatest: 20, checkpointAfter: true } });
    assert.strictEqual(pruneRes?.deletedCount, 15);
    assert.strictEqual(pruneRes?.remainingCount, 20);
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
    if (originalIsTauri === undefined) {
      delete (globalThis as unknown as { isTauri?: unknown }).isTauri;
    } else {
      (globalThis as unknown as { isTauri: unknown }).isTauri = originalIsTauri;
    }
  }
});
