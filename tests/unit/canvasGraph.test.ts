import test from "node:test";
import assert from "node:assert/strict";
import {
  connectionGeometry,
  cardLayout,
  cardSelectionLayout,
  cardVisualBounds,
  deleteConnection,
  restoreConnection,
} from "../../src/domain/canvasGraph.ts";
import { BASE_CANVAS_ITEMS } from "../../src/domain/canvasItems.ts";

test("选中视频的可见范围包含编辑器而不改变卡片和连接锚点", () => {
  for (const id of ["video1", "video2"]) {
    const item = BASE_CANVAS_ITEMS.find((item) => item.id === id)!;
    assert.deepEqual(cardSelectionLayout(item), {
      width: 590,
      height: 471,
      left: -110,
      collapsedHeight: 224,
      anchor: { x: 370, y: 120 },
    });
    assert.deepEqual(cardLayout(item), {
      width: 370,
      height: 224,
      left: 0,
      collapsedHeight: 224,
      anchor: { x: 370, y: 120 },
    });
    assert.deepEqual(cardVisualBounds(item), {
      x: 0,
      y: 16,
      width: 370,
      height: 208,
    });
  }
});

test("视频引用和生成占位不预留不存在的编辑器", () => {
  const video = BASE_CANVAS_ITEMS.find((item) => item.id === "video1")!;
  assert.deepEqual(cardSelectionLayout({ ...video, referenceOnly: true }), {
    width: 590,
    height: 224,
    left: 0,
    collapsedHeight: 224,
    anchor: { x: 370, y: 120 },
  });
  assert.deepEqual(
    cardSelectionLayout({
      ...video,
      generationStatus: "pending",
      generationIndex: 0,
    }),
    {
      width: 380,
      height: 380,
      left: 0,
      collapsedHeight: 380,
      anchor: { x: 380, y: 190 },
    },
  );
});

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

test("媒体自然比例进入画布可见边界", () => {
  const source = {
    ...BASE_CANVAS_ITEMS[0],
    mediaWidth: 1600,
    mediaHeight: 900,
  };
  const result = {
    ...source,
    id: "result",
    result: {
      id: "result",
      kind: "image" as const,
      title: "宽图",
      description: "",
      source: "demo" as const,
    },
  };
  assert.equal(cardVisualBounds(source).height, 225);
  assert.ok(Math.abs(cardVisualBounds(result).height - 227.75) < 0.001);
});
