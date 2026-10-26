import assert from "node:assert/strict";
import test from "node:test";
import {
  composerReportedHeight,
  visibleComposerExtraHeight,
} from "../../src/components/canvas/composerLayout.ts";
import {
  cardSelectionLayout,
  cardVisualBounds,
} from "../../src/domain/canvasGraph.ts";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems.ts";

test("参考图、展开和错误反馈按实际高度扩展画布可见边界", () => {
  for (const height of [156, 236, 356, 436]) {
    assert.equal(
      visibleComposerExtraHeight(composerReportedHeight(height)),
      height - 156,
    );
  }
  assert.equal(visibleComposerExtraHeight(composerReportedHeight(132)), 0);
});

test("共享输入区围绕媒体居中，选中不改变图片和视频连线锚点", () => {
  for (const kind of ["image", "video"] as const) {
    const item = { ...BASE_CANVAS_ITEMS[0], kind };
    const body = cardVisualBounds(item);
    const selected = cardSelectionLayout(item);
    assert.equal(selected.width, 652);
    assert.equal(selected.left + selected.width / 2, body.x + body.width / 2);
    assert.equal(selected.height, body.y + body.height + 16 + 156);
    assert.deepEqual(selected.anchor, {
      x: body.x + body.width,
      y: body.y + body.height / 2,
    });
  }
});
