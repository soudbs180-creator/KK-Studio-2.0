import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareImageCapabilityInput,
  assertImageCapabilityConnection,
} from "../../src/features/creation/imageCapabilitySubmission.ts";
import { createImageCapabilityRegistry } from "../../src/features/capabilities/index.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import type { CreateProjectInput } from "../../packages/creation-contracts/index.ts";
import { imageSpec } from "../fixtures/image-capability.ts";

test("image capability input requires the archived original, explicit connection, and an implemented platform/adapter", async () => {
  const spec = imageSpec();
  const input: CreateProjectInput = {
    kind: "image",
    prompt: "exact",
    model: "fixture",
    attachments: [],
    providerConnectionId: "local",
    imageCapability: spec,
  };
  const read = async () => ({
    assetId: spec.sourceAssetId,
    mime: "image/png",
    preview: "data:image/png;base64,YWJj",
  });
  const prepared = await prepareImageCapabilityInput(input, read, "web");
  assert.equal(prepared.attachments[0].originalAssetId, spec.sourceAssetId);
  assert.equal(prepared.prompt, input.prompt);
  await assert.rejects(
    prepareImageCapabilityInput(input, read, "desktop"),
    /原生/,
  );
  await assert.rejects(
    prepareImageCapabilityInput(
      { ...input, imageCapability: { ...spec, adapter: "provider-api" } },
      read,
      "web",
    ),
    /API/,
  );
  await assert.rejects(
    prepareImageCapabilityInput(input, async () => null, "web"),
    /原图/,
  );
  await assert.rejects(
    prepareImageCapabilityInput(
      { ...input, providerConnectionId: undefined },
      read,
      "web",
    ),
    /原连接/,
  );
  await assert.rejects(
    prepareImageCapabilityInput({ ...input, outputCount: 2 }, read, "web"),
    /数量/,
  );
});

test("image capability bindings enforce identity, local authorization, provider limits and capacity", () => {
  const connection: ProviderConnection = {
    id: "local",
    provider: "ComfyUI",
    displayName: "local",
    kind: "local_comfyui",
    baseUrl: "http://127.0.0.1:8188",
    authMode: "none",
    state: "active",
    concurrencyLimit: 1,
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      async: true,
      maxOutputs: 16,
    },
  };
  const binding = {
    imageCapability: imageSpec("image.layer-split"),
    baseUrl: connection.baseUrl,
    model: "fixture",
    authMode: "none" as const,
    referenceCount: 1,
    outputCount: 2,
  };
  assert.equal(
    assertImageCapabilityConnection(connection, binding),
    connection,
  );
  for (const changed of [
    { ...connection, baseUrl: "https://remote.invalid" },
    { ...connection, state: "disabled" as const },
    { ...connection, activeJobs: 1 },
    {
      ...connection,
      capabilities: { ...connection.capabilities, maxOutputs: 1 },
    },
    { ...connection, baseUrl: "http://user:private@127.0.0.1:8188" },
  ])
    assert.throws(() =>
      assertImageCapabilityConnection(changed, {
        ...binding,
        baseUrl: changed.baseUrl,
      }),
    );
  assert.throws(() =>
    assertImageCapabilityConnection(connection, {
      ...binding,
      credentialRef: "different",
    }),
  );
  assert.equal(
    assertImageCapabilityConnection({ ...connection, activeJobs: 1 }, binding, {
      ownSlot: true,
    }).id,
    connection.id,
  );
});

test("disabling one capability preserves the other two and rejects dispatch before submitting", () => {
  const registry = createImageCapabilityRegistry({ "image.outpaint": false });
  const context = {
    platform: "web" as const,
    permissions: ["ai:generate", "asset:read", "asset:write"] as const,
    modelTraits: [],
    resources: [],
    availableAdapters: [
      "image.outpaint/comfyui",
      "image.upscale/comfyui",
      "image.layer-split/comfyui",
    ],
  };
  assert.throws(() => registry.resolve("image.outpaint", context));
  assert.equal(
    registry.resolve("image.upscale", context).manifest.id,
    "image.upscale",
  );
  assert.equal(
    registry.resolve("image.layer-split", context).manifest.id,
    "image.layer-split",
  );
});
