import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedImageSize,
  imageSizeFromBytes,
} from "../src/application/imageDerivativeDimensions.ts";

test("JPEG frame dimensions are available before a bitmap is decoded", () => {
  const bytes = new Uint8Array([
    255, 216, 255, 192, 0, 8, 8, 1, 224, 2, 128, 3, 255, 217,
  ]);
  assert.deepEqual(imageSizeFromBytes(bytes, "image/jpeg"), {
    width: 640,
    height: 480,
  });
  assert.throws(() => imageSizeFromBytes(bytes.slice(0, 9), "image/jpeg"));
});
test("WebP extended, lossless and lossy headers retain nonsquare dimensions", () => {
  for (const kind of ["VP8X", "VP8L", "VP8 "]) {
    const bytes = new Uint8Array(32);
    bytes.set(new TextEncoder().encode("RIFF"));
    bytes.set(new TextEncoder().encode("WEBP"), 8);
    bytes.set(new TextEncoder().encode(kind), 12);
    const view = new DataView(bytes.buffer);
    if (kind === "VP8X") {
      bytes[24] = 127;
      bytes[25] = 2;
      bytes[27] = 223;
      bytes[28] = 1;
    }
    if (kind === "VP8L") {
      bytes[20] = 47;
      view.setUint32(21, 639 | (479 << 14), true);
    }
    if (kind === "VP8 ") {
      bytes.set([157, 1, 42], 23);
      view.setUint16(26, 640, true);
      view.setUint16(28, 480, true);
    }
    assert.deepEqual(imageSizeFromBytes(bytes, "image/webp"), {
      width: 640,
      height: 480,
    });
  }
});
test("dimension bounds reject nonfinite and huge memory allocations", () => {
  for (const size of [
    { width: Infinity, height: 1 },
    { width: NaN, height: 1 },
    { width: 0, height: 1 },
    { width: 8193, height: 1 },
    { width: 5000, height: 5000 },
    { width: 1.5, height: 1 },
  ])
    assert.throws(() => boundedImageSize(size));
  assert.deepEqual(boundedImageSize({ width: 4096, height: 4096 }, true), {
    width: 4096,
    height: 4096,
  });
  assert.throws(() => boundedImageSize({ width: 4097, height: 1 }, true));
});

test("phone JPEG orientation swaps visual dimensions before crop planning", () => {
  const exif = new Uint8Array(34),
    view = new DataView(exif.buffer);
  view.setUint16(0, 34);
  exif.set([69, 120, 105, 102, 0, 0], 2);
  exif.set([73, 73, 42, 0], 8);
  view.setUint32(12, 8, true);
  view.setUint16(16, 1, true);
  view.setUint16(18, 274, true);
  view.setUint16(20, 3, true);
  view.setUint32(22, 1, true);
  view.setUint16(26, 6, true);
  const bytes = new Uint8Array([
    255,
    216,
    255,
    225,
    ...exif,
    255,
    192,
    0,
    8,
    8,
    1,
    224,
    2,
    128,
    3,
    255,
    217,
  ]);
  assert.deepEqual(imageSizeFromBytes(bytes, "image/jpeg"), {
    width: 480,
    height: 640,
  });
});
