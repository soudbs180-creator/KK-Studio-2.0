import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import {
  createFastVideoAdapter,
  fastVideoDisableReason,
  isFastVideoConnection,
} from "../../src/integrations/generation/fastVideoAdapter.ts";
import { createGenerationAdapter } from "../../src/integrations/generation/providerAdapterFactory.ts";
import { ProviderAdapterError } from "../../src/integrations/generation/providerAdapter.ts";

const connection: ProviderConnection = {
  id: "local-fastvideo",
  provider: "FastVideo",
  kind: "local_comfyui",
  channel: "local",
  displayName: "FastVideo 本地",
  baseUrl: "http://127.0.0.1:8000",
  authMode: "none",
  capabilities: {
    modalities: ["video"],
    operations: ["generate", "image_to_video"],
    async: true,
    maxOutputs: 1,
  },
  state: "active",
  concurrencyLimit: 1,
};

test("factory recognizes FastVideo connections and disable reason is explicit", () => {
  assert.equal(isFastVideoConnection(connection), true);
  assert.match(fastVideoDisableReason(false), /FastVideo/);
  const adapter = createGenerationAdapter(connection);
  assert.ok(adapter);
});

test("submit fails closed when runner is missing", async () => {
  const adapter = createFastVideoAdapter({
    connection,
    outputDirectory: "D:/tmp/fastvideo-out",
  });
  await assert.rejects(
    () =>
      adapter.submit({
        prompt: "a raccoon in sunflowers",
        model: "FastVideo/FastWan2.1-T2V-1.3B-Diffusers",
        attachments: [],
        requestedOutputs: 1,
        idempotencyKey: "job-1",
        signal: new AbortController().signal,
      }),
    (error: unknown) =>
      error instanceof ProviderAdapterError &&
      error.failureClass === "provider_unavailable",
  );
});

test("configured runner can complete a mocked text-to-video job", async () => {
  const adapter = createFastVideoAdapter({
    connection,
    outputDirectory: "D:/tmp/fastvideo-out",
    runner: {
      async generateVideo() {
        return { path: "D:/tmp/fastvideo-out/job-2.mp4", mime: "video/mp4" };
      },
    },
  });
  const submitted = await adapter.submit({
    prompt: "a raccoon in sunflowers",
    model: "FastVideo/FastWan2.1-T2V-1.3B-Diffusers",
    attachments: [],
    requestedOutputs: 1,
    idempotencyKey: "job-2",
    signal: new AbortController().signal,
  });
  assert.equal(submitted.status, "queued");
  const status = await adapter.getStatus(submitted.providerJobId);
  assert.equal(status.status, "succeeded");
  const results = await adapter.listResults(submitted.providerJobId);
  assert.equal(results[0]?.kind, "video");
  assert.equal(results[0]?.mime, "video/mp4");
});
