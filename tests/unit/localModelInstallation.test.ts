import assert from "node:assert/strict";
import test from "node:test";
import { createLocalModelInstallationBridge } from "../../src/features/models/localModelInstallation.ts";
import {
  localInstallSelectionSchema,
  localInstallStatusSchema,
  localRuntimeStatusSchema,
} from "../../src/domain/localModelInstallation.ts";

test("installation accepts fixed profiles without granting arbitrary sources", () => {
  assert.deepEqual(
    localInstallSelectionSchema.parse({
      packageIds: ["qwen3.5-4b-q4-k-m"],
      runtimeBackend: "cpu",
    }),
    { packageIds: ["qwen3.5-4b-q4-k-m"], runtimeBackend: "cpu" },
  );
  for (const packageIds of [["https://host/model"], ["../model"], []]) {
    assert.equal(
      localInstallSelectionSchema.safeParse({
        packageIds,
        runtimeBackend: "cpu",
      }).success,
      false,
    );
  }
  assert.equal(
    localInstallSelectionSchema.safeParse({
      packageIds: ["qwen3.5-4b-q4-k-m"],
      runtimeBackend: "cpu",
      url: "https://host/evil",
    }).success,
    false,
  );
  for (const [packageIds, runtimeBackend] of [
    [["qwen3.5-4b-q4-k-m"], "none"],
    [["minimax-h3-16g-hifi-fl2va"], "cpu"],
  ]) {
    assert.equal(
      localInstallSelectionSchema.safeParse({ packageIds, runtimeBackend })
        .success,
      false,
    );
  }
});

test("bridge current and list are explicit, validated and never accept a frontend owner", async () => {
  const calls: unknown[] = [];
  const bridge = createLocalModelInstallationBridge(
    async (command, args) => {
      calls.push({ command, args });
      return command === "local_model_current" ? null : [];
    },
    () => true,
  );
  assert.equal(await bridge.current(), null);
  assert.deepEqual(await bridge.listInstalled(), []);
  assert.deepEqual(calls, [
    { command: "local_model_current", args: undefined },
    { command: "local_model_list_installed", args: undefined },
  ]);
  const malformed = createLocalModelInstallationBridge(
    async () => ({ owner: "spoofed", state: "installed" }),
    () => true,
  );
  await assert.rejects(malformed.current());
  let invoked = false;
  const web = createLocalModelInstallationBridge(
    async () => {
      invoked = true;
      return null;
    },
    () => false,
  );
  await assert.rejects(web.chooseDirectory(), /桌面版/);
  assert.equal(invoked, false);
});

test("loaded runtime never implies inference or tools were verified", () => {
  assert.equal(
    localInstallStatusSchema.safeParse({
      version: 1,
      operationId: "a".repeat(32),
      state: "installed",
      sequence: 1,
      completedBytes: 10,
      totalBytes: 10,
      installationIds: ["b".repeat(32)],
      error: null,
    }).success,
    true,
  );
  const loaded = {
    version: 1,
    installationId: "b".repeat(32),
    instanceId: "c".repeat(32),
    state: "running",
    text: "loaded",
    vision: "loaded",
    inference: "unverified",
    tools: "unverified",
    error: null,
  };
  assert.equal(localRuntimeStatusSchema.safeParse(loaded).success, true);
  assert.equal(
    localRuntimeStatusSchema.safeParse({ ...loaded, tools: "verified" })
      .success,
    false,
  );
  assert.equal(
    localRuntimeStatusSchema.safeParse({ ...loaded, inference: "verified" })
      .success,
    false,
  );
});
