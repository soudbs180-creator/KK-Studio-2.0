import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { LocalComfyUiAdapter } from "../../src/integrations/generation/localComfyUiAdapter.ts";
import type { ProviderConnection } from "../../src/domain/providerConnections.ts";
import { imageSpec } from "../fixtures/image-capability.ts";

test("Comfy image capabilities upload immutable input then bind the exact graph and ordered outputs", async () => {
  const calls: string[] = [];
  const graphs: unknown[] = [];
  let malformed = false,
    failed = false,
    legacy = false,
    badUpload = false;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks);
    calls.push(req.url!);
    res.setHeader("content-type", "application/json");
    if (req.url === "/upload/image") {
      assert.match(raw.toString(), /immutable-original/);
      if (badUpload) {
        res.statusCode = 400;
        res.end("{}");
        return;
      }
      res.end(
        JSON.stringify({
          name: "fixture.png",
          subfolder: "kk",
          type: "input",
          asset: { id: "optional-server-field" },
        }),
      );
    } else if (req.url === "/prompt") {
      graphs.push(JSON.parse(raw.toString()).prompt);
      res.end(JSON.stringify({ prompt_id: "fixture-job" }));
    } else if (req.url === "/history/fixture-job") {
      res.end(
        JSON.stringify({
          "fixture-job": {
            status: {
              status_str: failed ? "error" : "success",
              completed: true,
            },
            outputs: malformed
              ? {
                  "3": {
                    images: [{ filename: "one.png" }, { filename: "two.png" }],
                  },
                }
              : {
                  "4": { images: [{ filename: "background.png" }] },
                  "3": { images: [{ filename: "foreground.png" }] },
                  "99": { images: [{ filename: "preview.png" }] },
                },
          },
        }),
      );
    } else if (req.url === "/api/jobs/fixture-job/cancel") {
      if (legacy) {
        res.statusCode = 404;
        res.end("{}");
        return;
      }
      res.end(JSON.stringify({ cancelled: true }));
    } else if (req.url === "/queue") {
      assert.deepEqual(JSON.parse(raw.toString()), { delete: ["fixture-job"] });
      res.end("{}");
    } else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  try {
    for (const capabilityId of [
      "image.outpaint",
      "image.upscale",
      "image.layer-split",
    ]) {
      const adapter = new LocalComfyUiAdapter({
        id: "local",
        baseUrl: `http://127.0.0.1:${address.port}`,
        kind: "local_comfyui",
        capabilities: {
          modalities: ["image"],
          operations: ["generate"],
          async: true,
        },
      } as ProviderConnection);
      const spec = imageSpec(capabilityId);
      const job = await adapter.submit({
        prompt: "exact prompt",
        model: "fixture",
        requestedOutputs: 1,
        idempotencyKey: "test-key",
        attachments: [
          {
            id: "original",
            assetId: spec.sourceAssetId,
            name: "source.png",
            mime: "image/png",
            size: 18,
            dataUrl: `data:image/png;base64,${Buffer.from("immutable-original").toString("base64")}`,
          },
        ],
        signal: new AbortController().signal,
        imageCapability: spec,
      } as Parameters<typeof adapter.submit>[0]);
      assert.equal(job.providerJobId, "fixture-job");
      const graph = graphs.at(-1) as Record<
        string,
        { inputs: Record<string, unknown> }
      >;
      assert.equal(graph["1"].inputs.image, "kk/fixture.png");
      assert.equal(graph["2"].inputs.text, "exact prompt");
      if (capabilityId === "image.outpaint")
        assert.equal(graph["2"].inputs.left, 64);
      if (capabilityId === "image.upscale")
        assert.equal(graph["2"].inputs.scale, 2);
      const results = await adapter.listResults(job.providerJobId);
      assert.match(results[0].url!, /foreground.png/);
      if (capabilityId === "image.layer-split")
        assert.match(results[1].url!, /background.png/);
      assert.equal(
        results.length,
        capabilityId === "image.layer-split" ? 2 : 1,
      );
      if (capabilityId === "image.layer-split") {
        malformed = true;
        await assert.rejects(adapter.listResults(job.providerJobId), /结果/);
        malformed = false;
      }
      failed = true;
      assert.equal(
        (await adapter.getStatus(job.providerJobId)).status,
        "failed",
      );
      failed = false;
      await adapter.cancel(job.providerJobId);
      if (capabilityId === "image.layer-split") {
        legacy = true;
        await assert.rejects(
          adapter.cancel(job.providerJobId),
          /不支持定向中断/,
        );
        legacy = false;
        badUpload = true;
        let submitted = false;
        await assert.rejects(
          adapter.submit({
            imageCapability: spec,
            beforeSubmit: () => {
              submitted = true;
            },
            prompt: "fixture",
            model: "fixture",
            requestedOutputs: 2,
            idempotencyKey: "not-sent",
            attachments: [
              {
                id: "original",
                assetId: spec.sourceAssetId,
                name: "source.png",
                mime: "image/png",
                size: 18,
                dataUrl: `data:image/png;base64,${Buffer.from("immutable-original").toString("base64")}`,
              },
            ],
            signal: new AbortController().signal,
          }),
          /上传失败/,
        );
        assert.equal(submitted, false);
      }
    }
    assert.equal(calls.filter((p) => p === "/upload/image").length, 4);
    assert.equal(calls.filter((p) => p === "/prompt").length, 3);
    assert.equal(
      calls.filter((p) => p === "/api/jobs/fixture-job/cancel").length,
      4,
    );
    assert.equal(calls.includes("/interrupt"), false);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
