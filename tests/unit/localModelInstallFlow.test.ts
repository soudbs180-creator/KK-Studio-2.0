import assert from "node:assert/strict";
import test from "node:test";
import { runLocalModelInstallFlow } from "../../src/features/models/localModelInstallFlow.ts";
import type { createLocalModelInstallationBridge } from "../../src/features/models/localModelInstallation.ts";

type Bridge = ReturnType<typeof createLocalModelInstallationBridge>;

test("install flow chooses directory, prepares, installs, and lists", async () => {
  const calls: string[] = [];
  const bridge = {
    async chooseDirectory() {
      calls.push("choose");
      return {
        version: 1 as const,
        grantId: "a".repeat(32),
        displayPath: "D:\\Models",
      };
    },
    async prepare() {
      calls.push("prepare");
      return {
        version: 1 as const,
        operationId: "b".repeat(32),
        fingerprint: "c".repeat(64),
        selection: {
          packageIds: ["qwen3.5-4b-q4-k-m"],
          runtimeBackend: "cpu" as const,
        },
        downloadBytes: 100,
        requiredBytes: 200,
        destination: "D:\\Models",
      };
    },
    async install() {
      calls.push("install");
      return {
        version: 1 as const,
        operationId: "b".repeat(32),
        state: "installed" as const,
        sequence: 1,
        completedBytes: 100,
        totalBytes: 100,
        installationIds: ["d".repeat(32)],
        error: null,
      };
    },
    async status() {
      calls.push("status");
      return {
        version: 1 as const,
        operationId: "b".repeat(32),
        state: "installed" as const,
        sequence: 1,
        completedBytes: 100,
        totalBytes: 100,
        installationIds: ["d".repeat(32)],
        error: null,
      };
    },
    async listInstalled() {
      calls.push("list");
      return [
        {
          version: 1 as const,
          installationId: "d".repeat(32),
          packageId: "qwen3.5-4b-q4-k-m",
          name: "Qwen3.5-4B Q4_K_M",
          engine: "llama.cpp" as const,
          destination: "D:\\Models",
          backend: "cpu" as const,
          associated: false,
          acceptance: "unverified" as const,
        },
      ];
    },
  } as unknown as Bridge;

  const result = await runLocalModelInstallFlow(
    { packageIds: ["qwen3.5-4b-q4-k-m"], runtimeBackend: "cpu" },
    {
      bridge,
      confirmDownload: async () => true,
      maxPolls: 1,
    },
  );
  assert.equal(result.status.state, "installed");
  assert.equal(result.installed[0]?.packageId, "qwen3.5-4b-q4-k-m");
  assert.deepEqual(calls, ["choose", "prepare", "install", "list"]);
});

test("install flow stops when directory picker is cancelled", async () => {
  const bridge = {
    async chooseDirectory() {
      return null;
    },
  } as unknown as Bridge;
  await assert.rejects(
    () =>
      runLocalModelInstallFlow(
        { packageIds: ["qwen3.5-4b-q4-k-m"], runtimeBackend: "cpu" },
        { bridge },
      ),
    /未选择目录/,
  );
});
