import test from "node:test";
import assert from "node:assert/strict";
import {
  connectionGeometry,
  cardLayout,
  cardVisualBounds,
  deleteConnection,
  restoreConnection,
} from "../../src/domain/canvasGraph.ts";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems.ts";

test("连接锚点随两端移动且不改变节点坐标", () => {
  const nodes = { image: { x: 82, y: 107 }, video1: { x: 709, y: 50 } };
  const edge = { id: "connector-video1", source: "image", target: "video1" };
  const before = structuredClone(nodes);
  const a = connectionGeometry(edge, nodes, BASE_CANVAS_ITEMS)!;
  assert.deepEqual(a.start, { x: 576, y: 365 });
  const b = connectionGeometry(
    edge,
    { ...nodes, image: { x: 112, y: 127 } },
    BASE_CANVAS_ITEMS,
  )!;
  assert.equal(b.start.x - a.start.x, 30);
  assert.equal(b.start.y - a.start.y, 20);
  assert.deepEqual(b.end, a.end);
  assert.deepEqual(nodes, before);
});

test("连接在图片、两种视频标签高度和结果卡片的可见侧边中点", () => {
  const items = [
    ...BASE_CANVAS_ITEMS,
    { id: "text", kind: "text" as const, title: "文本", description: "" },
  ];
  const nodes = Object.fromEntries(
    items.map((item, i) => [item.id, { x: i * 700, y: i * 100 }]),
  );
  for (const a of items)
    for (const b of items) {
      const geometry = connectionGeometry(
        { id: "test", source: a.id, target: b.id },
        nodes,
        items,
      )!;
      const source = cardVisualBounds(a),
        target = cardVisualBounds(b);
      assert.equal(geometry.start.x, nodes[a.id].x + source.x + source.width);
      assert.equal(
        geometry.start.y,
        nodes[a.id].y + source.y + source.height / 2,
      );
      assert.equal(geometry.end.x, nodes[b.id].x + target.x);
      assert.equal(
        geometry.end.y,
        nodes[b.id].y + target.y + target.height / 2,
      );
    }
});

test("删除和撤销只影响目标连接，节点缺失时不恢复悬空连接", () => {
  const edge = { id: "a", source: "image", target: "video1" };
  const other = { id: "b", source: "image", target: "video2" };
  const remaining = deleteConnection([edge, other], "a");
  assert.deepEqual(remaining, [other]);
  assert.deepEqual(restoreConnection(remaining, edge, BASE_CANVAS_ITEMS), [
    other,
    edge,
  ]);
  assert.deepEqual(
    restoreConnection(
      remaining,
      edge,
      BASE_CANVAS_ITEMS.filter((x) => x.id !== "video1"),
    ),
    [other],
  );
  assert.deepEqual(restoreConnection([edge], edge, BASE_CANVAS_ITEMS), [edge]);
});

test("上传图片自然比例进入画布可见边界", () => {
  const source = {
    ...BASE_CANVAS_ITEMS[0],
    mediaWidth: 1600,
    mediaHeight: 900,
  };
  assert.equal(cardVisualBounds(source).height, 225);
});

for (const [label, width, height, bodyHeight] of [
  ["宽图", 1200, 300, 96.5],
  ["16:9", 1200, 675, 214.625],
  ["竖图", 600, 900, 569],
  ["方图", 600, 600, 380],
] as const) {
  test(`${label}结果的主体和锚点匹配无内边距的1px边框`, () => {
    const result = {
      ...BASE_CANVAS_ITEMS[0],
      id: "result",
      mediaWidth: width,
      mediaHeight: height,
      result: {
        id: "result",
        kind: "image" as const,
        title: label,
        description: "synthetic geometry fixture",
        source: "demo" as const,
      },
    };
    assert.equal(cardVisualBounds(result).height, bodyHeight);
    assert.deepEqual(cardLayout(result).anchor, { x: 380, y: bodyHeight / 2 });
    assert.equal(cardLayout(result).collapsedHeight, bodyHeight);
  });
}
