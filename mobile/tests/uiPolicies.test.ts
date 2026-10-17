import test from "node:test";
import assert from "node:assert/strict";
import { composerUnavailable, taskActions } from "../src/ui/policies.ts";
import type { CreationTask } from "@kk-studio/creation-contracts";
const task: CreationTask = {
  id: "t",
  idempotencyKey: "k",
  prompt: "p",
  model: "m",
  kind: "image",
  status: "partial",
  submissionState: "terminal",
  createdAt: 1,
  updatedAt: 1,
  attachments: [],
  attempt: 1,
  requestedOutputs: 3,
  completedOutputs: 1,
  privacyMode: "byok_local",
  outputs: [
    {
      index: 0,
      status: "succeeded",
      assetId: "asset-old",
      model: "m",
      createdAt: 1,
    },
    { index: 1, status: "unknown", model: "m", createdAt: 1 },
    { index: 2, status: "failed", model: "m", createdAt: 1 },
  ],
};
test("task action policy limits retry to known failed outputs and keeps unknown blocked", () => {
  assert.deepEqual(taskActions(task, false, false).retryIndices, [2]);
  assert.deepEqual(
    taskActions({ ...task, submissionState: "unknown" }, false, true)
      .retryIndices,
    [],
  );
  assert.equal(
    taskActions({ ...task, submissionState: "unknown" }, false, true).recover,
    true,
  );
  assert.equal(taskActions(task, true, false).stop, true);
});
test("composer cannot silently ignore references or infer model capability", () => {
  const draft = {
    prompt: "create",
    model: "a",
    kind: "image" as const,
    attachments: [
      { id: "a", assetId: "b", mime: "image/png", size: 4, name: "ref" },
    ],
    approvalMode: "ask" as const,
    privacyMode: "byok_local" as const,
    outputCount: 1,
    updatedAt: 1,
  };
  assert.match(
    composerUnavailable(draft, {
      id: "c",
      name: "c",
      provider: "p",
      baseUrl: "https://p.example",
      capabilities: { text: true, image: true },
    })!,
    /参考/,
  );
  assert.ok(
    composerUnavailable(
      { ...draft, attachments: [] },
      { id: "c", name: "c", provider: "p", baseUrl: "https://p.example" },
    ),
  );
  assert.equal(
    composerUnavailable(
      { ...draft, attachments: [] },
      {
        id: "c",
        name: "c",
        provider: "p",
        baseUrl: "https://p.example",
        credentialRef: "r",
        capabilities: { text: true, image: true },
      },
    ),
    undefined,
  );
  assert.match(
    composerUnavailable(
      { ...draft, attachments: [] },
      {
        id: "workflow",
        name: "Comfy",
        provider: "comfyui",
        baseUrl: "https://workflow.example",
        protocol: "comfyui",
        credentialRef: "ref",
        capabilities: { text: true, image: true },
      },
    )!,
    /ComfyUI.*预检/,
  );
});
