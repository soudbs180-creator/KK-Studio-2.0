import assert from "node:assert/strict";
import test from "node:test";
import { detectLocalHardware } from "../../src/features/models/localHardware.ts";

test("Web without native companion explicitly returns unsupported and performs no fetch", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Detection must not use network");
  };
  try {
    const result = await detectLocalHardware();
    assert.equal(result.status, "unsupported");
    assert.equal(result.platform, "web");
    assert.equal(result.memory, null);
    assert.deepEqual(result.gpus, []);
    assert.deepEqual(result.errors, [
      { probe: "platform", code: "unsupported" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("native bridge validates IPC and does not leak raw diagnostic/private text", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldTauri = Object.getOwnPropertyDescriptor(globalThis, "isTauri");
  const calls: string[] = [];
  let response: unknown = { measuredAtMs: -1, serial: "private-serial" };
  Object.defineProperty(globalThis, "isTauri", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke: async (command: string) => {
          calls.push(command);
          return response;
        },
      },
    },
  });
  try {
    await assert.rejects(detectLocalHardware(), {
      message: "本机硬件检测不可用，请重试。",
    });
    response = {
      version: 1,
      status: "unsupported",
      platform: "linux",
      measuredAtMs: Date.now(),
      cpu: null,
      memory: null,
      os: null,
      gpus: [],
      disks: [],
      errors: [{ probe: "platform", code: "unsupported" }],
    };
    assert.equal((await detectLocalHardware()).platform, "linux");
    assert.deepEqual(calls, ["detect_local_hardware", "detect_local_hardware"]);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldTauri) Object.defineProperty(globalThis, "isTauri", oldTauri);
    else Reflect.deleteProperty(globalThis, "isTauri");
  }
});
