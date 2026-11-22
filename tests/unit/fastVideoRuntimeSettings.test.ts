import assert from "node:assert/strict";
import test from "node:test";
import {
  describeFastVideoRuntime,
  readFastVideoRuntimeSettings,
  writeFastVideoRuntimeSettings,
} from "../../src/features/models/fastVideoRuntimeSettings.ts";

function memoryStorage(seed: Record<string, string> = {}) {
  const data = { ...seed };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

test("fastvideo runtime settings round-trip and affect probe", () => {
  const storage = memoryStorage();
  assert.equal(readFastVideoRuntimeSettings(storage).runnerConfigured, false);
  assert.equal(
    writeFastVideoRuntimeSettings(
      {
        version: 1,
        runnerConfigured: true,
        outputDirectory: "D:/tmp/fv",
        modelId: "FastVideo/FastWan2.1-T2V-1.3B-Diffusers",
      },
      storage,
    ),
    true,
  );
  const described = describeFastVideoRuntime({
    settings: readFastVideoRuntimeSettings(storage),
    platform: "windows",
    cudaReported: true,
    dedicatedVramBytes: 16 * 1024 ** 3,
  });
  assert.equal(described.probe.available, true);
  assert.equal(described.settings.runnerConfigured, true);
});
