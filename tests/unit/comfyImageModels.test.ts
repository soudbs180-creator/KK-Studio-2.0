import test from "node:test";
import assert from "node:assert/strict";
import { comfyNodeChoices } from "../../src/features/image-edit/comfyImageModels.ts";
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
