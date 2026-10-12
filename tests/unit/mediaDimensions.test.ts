import test from "node:test";
import assert from "node:assert/strict";
import { aspectRatioForDimensions } from "../../src/domain/mediaDimensions.ts";
import { dimensionsFromImageSize } from "../../src/features/creation/mediaDimensions.ts";

test("normalizes valid media dimensions to a bounded aspect ratio", () => {
  assert.equal(aspectRatioForDimensions(1600, 900), 16 / 9);
  assert.equal(aspectRatioForDimensions(0, 900), 1);
  assert.equal(aspectRatioForDimensions(1600, Number.NaN), 1);
});

test("parses persisted image size values", () => {
  assert.deepEqual(dimensionsFromImageSize("1536x1024"), {
    width: 1536,
    height: 1024,
  });
  assert.equal(dimensionsFromImageSize("1x1"), undefined);
  assert.equal(dimensionsFromImageSize("auto"), undefined);
});
