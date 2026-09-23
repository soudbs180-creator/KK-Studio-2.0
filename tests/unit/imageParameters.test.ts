import assert from "node:assert/strict";
import test from "node:test";
import { resolveImageSize } from "../../src/domain/imageParameters.ts";

test("adaptive or missing quality omits the provider size", () => {
  assert.equal(resolveImageSize("1:1", "自适应"), undefined);
  assert.equal(resolveImageSize("16:9", undefined), undefined);
  assert.equal(resolveImageSize("16:9", ""), undefined);
  assert.equal(resolveImageSize("16:9", "8K"), undefined);
});

test("square ratios resolve to the quality long edge", () => {
  assert.equal(resolveImageSize("1:1", "1K"), "1024x1024");
  assert.equal(resolveImageSize("1:1", "2K"), "2048x2048");
  assert.equal(resolveImageSize("1:1", "4K"), "4096x4096");
});

test("orientation follows the ratio", () => {
  assert.equal(resolveImageSize("16:9", "1K"), "1024x576");
  assert.equal(resolveImageSize("9:16", "1K"), "576x1024");
  assert.equal(resolveImageSize("3:4", "2K"), "1536x2048");
  assert.equal(resolveImageSize("4:3", "2K"), "2048x1536");
});

test("short edge snaps to the 8px grid", () => {
  // 4096 * 9 / 21 = 1755.43 -> 1752
  assert.equal(resolveImageSize("21:9", "4K"), "4096x1752");
  // 1024 * 4 / 5 = 819.2 -> 816
  assert.equal(resolveImageSize("4:5", "1K"), "816x1024");
  assert.equal(resolveImageSize("5:4", "1K"), "1024x816");
  // 2048 * 2 / 3 = 1365.33 -> 1368
  assert.equal(resolveImageSize("3:2", "2K"), "2048x1368");
  assert.equal(resolveImageSize("2:3", "2K"), "1368x2048");

  for (const ratio of [
    "1:1",
    "16:9",
    "9:16",
    "3:4",
    "4:3",
    "3:2",
    "2:3",
    "5:4",
    "4:5",
    "21:9",
  ]) {
    for (const quality of ["1K", "2K", "4K"] as const) {
      const size = resolveImageSize(ratio, quality)!;
      const [width, height] = size.split("x").map(Number);
      assert.equal(width % 8, 0, `${size} width must be grid-aligned`);
      assert.equal(height % 8, 0, `${size} height must be grid-aligned`);
      assert.ok(width >= 256 && height >= 256, `${size} below minimum`);
      assert.ok(width <= 4096 && height <= 4096, `${size} above maximum`);
    }
  }
});

test("invalid ratios omit size instead of sending garbage", () => {
  assert.equal(resolveImageSize(undefined, "1K"), undefined);
  assert.equal(resolveImageSize("", "1K"), undefined);
  assert.equal(resolveImageSize("abc", "1K"), undefined);
  assert.equal(resolveImageSize("2:0", "1K"), undefined);
  assert.equal(resolveImageSize("0:0", "1K"), undefined);
});

test("extreme ratios clamp the short edge to the supported minimum", () => {
  // 1024 * 1 / 10 = 102.4 -> grid 104 -> clamped to 256, portrait orientation
  assert.equal(resolveImageSize("1:10", "1K"), "256x1024");
});

test("whitespace around ratio tokens is tolerated", () => {
  assert.equal(resolveImageSize(" 16 : 9 ", "1K"), "1024x576");
});
