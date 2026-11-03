import test from "node:test";
import assert from "node:assert/strict";
import {
  standardImageCapability,
  capabilityFromWorkflow,
} from "../../src/features/image-edit/imageCapabilityWorkflow.ts";
import { imageCapabilitySchema } from "../../packages/creation-contracts/index.ts";
const asset = "asset-0123456789abcdef01234567";
test("standard workflows execute real ComfyUI nodes with explicit source and outputs", () => {
  for (const id of [
    "image.outpaint",
    "image.upscale",
    "image.layer-split",
  ] as const) {
    const spec = standardImageCapability(id, asset, {
      checkpoint: "sd15.safetensors",
      upscaleModel: "RealESRGAN_x4plus.pth",
      backgroundModel: "birefnet.safetensors",
    });
    assert.ok(imageCapabilitySchema.safeParse(spec).success);
    assert.equal(spec.workflow.nodes.image.class_type, "LoadImage");
    for (const output of spec.workflow.outputNodeIds)
      assert.equal(spec.workflow.nodes[output].class_type, "SaveImage");
    assert.ok(!JSON.stringify(spec).includes("Fixture"));
  }
  const layers = standardImageCapability("image.layer-split", asset, {
    backgroundModel: "birefnet.safetensors",
  });
  assert.equal(layers.workflow.nodes.mask.class_type, "RemoveBackground");
  assert.equal(layers.workflow.outputNodeIds.length, 2);
  const outpaint = standardImageCapability("image.outpaint", asset, {
    checkpoint: "sd15.safetensors",
  });
  assert.deepEqual(outpaint.workflow.nodes.composite.inputs.mask, ["pad", 1]);
  assert.equal(outpaint.workflow.nodes.pad.inputs.feathering, 0);
});
test("imported workflow binding refuses ambiguous image or prompt targets", () => {
  const spec = standardImageCapability("image.upscale", asset, {});
  const workflow = structuredClone(spec.workflow.nodes);
  const imported = capabilityFromWorkflow(
    workflow,
    "image.upscale",
    asset,
    spec.parameters,
  );
  assert.deepEqual(imported.workflow.bindings.image, {
    nodeId: "image",
    input: "image",
  });
  workflow.another = { class_type: "LoadImage", inputs: { image: "x" } };
  assert.throws(
    () =>
      capabilityFromWorkflow(workflow, "image.upscale", asset, spec.parameters),
    /唯一/,
  );
});
