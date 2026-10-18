import test from "node:test";
import assert from "node:assert/strict";
import {
  imageEventRatio,
  loadPreviewImage,
  type ImageSizeReader,
} from "../src/ui/imageDimensions.ts";

test("image preview supports RN Web load events without source and native dimensions", () => {
  assert.equal(imageEventRatio({ nativeEvent: {} }), undefined);
  assert.equal(
    imageEventRatio({ nativeEvent: { source: { width: 600, height: 300 } } }),
    2,
  );
  assert.equal(
    imageEventRatio({
      nativeEvent: { source: { width: Infinity, height: 0 } },
    }),
    undefined,
  );
});
test("original image sizing preserves non-square ratio and suppresses late account results", async () => {
  let complete!: (width: number, height: number) => void;
  const getSize: ImageSizeReader = (_uri, success) => {
    complete = success;
  };
  let current = true;
  const pending = loadPreviewImage(
    "data:image/png;base64,fixture",
    getSize,
    () => current,
  );
  current = false;
  complete(600, 300);
  assert.equal(await pending, undefined);
  const dimensions = await loadPreviewImage(
    "data:image/png;base64,fixture",
    (_uri, success) => success(300, 600),
    () => true,
  );
  assert.equal(dimensions!.width / dimensions!.height, 0.5);
  await assert.rejects(
    loadPreviewImage(
      "data:image/png;base64,fixture",
      (_uri, success) => success(0, 600),
      () => true,
    ),
  );
  await assert.rejects(
    loadPreviewImage(
      "data:image/png;base64,fixture",
      (_uri, _success, failure) => failure(new Error("decode failed")),
      () => true,
    ),
  );
});
