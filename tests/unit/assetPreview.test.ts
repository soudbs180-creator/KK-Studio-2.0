import test from "node:test";
import assert from "node:assert/strict";
import { loadAssetPreview } from "../../src/features/creation/assetPreview.ts";

test("非图片缩略图不读取原件，也不要求浏览器存储或解码环境", async () => {
  for (const mime of ["video/mp4", "audio/mpeg", ""]) {
    assert.equal(await loadAssetPreview(`asset-${"0".repeat(24)}`, mime), null);
  }
});
