import { test } from "node:test";
import assert from "node:assert/strict";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import { imageSpec } from "../fixtures/image-capability.ts";
import {
  imageCapabilityAction,
  imageCapabilityActionLabels,
} from "../../src/features/image-edit/imageCapabilityActions.ts";

const source: CanvasCollectionItem = {
  id: "image-source",
  kind: "image",
  title: "源图",
  description: "已归档",
  assetId: "asset-0123456789abcdef01234567",
  imageCapability: imageSpec("image.outpaint"),
};

test("capability actions expose stable labels and bind the current archived source", () => {
  assert.deepEqual(imageCapabilityActionLabels, {
    "image.outpaint": "扩图",
    "image.upscale": "高清修复",
    "image.layer-split": "图层拆分",
  });
  const action = imageCapabilityAction(source, "image.outpaint");
  assert.equal(action.error, undefined);
  assert.equal(action.spec?.sourceAssetId, source.assetId);
  assert.equal(action.outputCount, 1);
});

test("capability actions refuse an image without a matching explicit workflow", () => {
  const result = imageCapabilityAction(
    { ...source, imageCapability: undefined },
    "image.upscale",
  );
  assert.match(result.error ?? "", /ComfyUI 工作流中配置高清修复能力/);
});
