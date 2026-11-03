import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  comfyNodeChoices,
  readComfyImageModels,
} from "../../src/features/image-edit/comfyImageModels.ts";
test("model discovery handles both ComfyUI legacy and V3 combo metadata", () => {
  assert.deepEqual(
    comfyNodeChoices(
      { Loader: { input: { required: { name: [["sd15.safetensors"]] } } } },
      "Loader",
      "name",
    ),
    ["sd15.safetensors"],
  );
  assert.deepEqual(
    comfyNodeChoices(
      {
        Loader: {
          input: {
            required: {
              name: ["COMBO", { options: ["RealESRGAN_x4plus.pth", 3] }],
            },
          },
        },
      },
      "Loader",
      "name",
    ),
    ["RealESRGAN_x4plus.pth"],
  );
  assert.deepEqual(comfyNodeChoices({}, "Missing", "name"), []);
});

test("model discovery times out even when a response body stalls", async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write("{");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const original = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", (ms: number) => {
    assert.equal(ms, 10_000);
    return original(30);
  });
  try {
    const address = server.address() as { port: number };
    await assert.rejects(
      readComfyImageModels(
        `http://127.0.0.1:${address.port}`,
        new AbortController().signal,
      ),
      { name: "TimeoutError" },
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("a missing optional node does not hide the available upscale models", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) =>
    url.endsWith("UpscaleModelLoader")
      ? Response.json({
          UpscaleModelLoader: {
            input: { required: { model_name: [["RealESRGAN_x4plus.pth"]] } },
          },
        })
      : new Response("{}", { status: 404 }),
  );
  const models = await readComfyImageModels(
    "http://127.0.0.1:8188",
    new AbortController().signal,
  );
  assert.deepEqual(models, {
    checkpoints: [],
    upscaleModels: ["RealESRGAN_x4plus.pth"],
    backgroundModels: [],
  });
});
