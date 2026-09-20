import test from "node:test";
import assert from "node:assert/strict";
import {
  connectionGeometry,
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
