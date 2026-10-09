import assert from "node:assert/strict";
import test from "node:test";
import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../src/domain/canvasItems.ts";
import { addCanvasReferences } from "../../src/components/canvas/addCanvasReferences.ts";

test("canvas batch upload skips rejected slots and fills later valid capacity", () => {
  const source = {
    id: "target",
    title: "目标",
    description: "",
    kind: "image",
  } as CanvasCollectionItem;
  const existingReferences: CanvasReference[] = [
    {
      id: "edge-style",
      assetId: "asset-style",
      title: "已有风格",
      slot: "风格",
    },
    {
      id: "edge-material",
      assetId: "asset-material",
      title: "已有材质",
      slot: "材质",
    },
    {
      id: "edge-composition",
      assetId: "asset-composition",
      title: "已有构图",
      slot: "构图",
    },
  ];
  const added: CanvasCollectionItem[] = [];
  const connections: string[] = [];
  const notices: string[] = [];
  const references: CanvasReference[] = [
    { title: "重复风格", slot: "风格", assetId: "asset-new-style" },
    { title: "有效主体", slot: "主体", assetId: "asset-new-subject" },
  ];

  addCanvasReferences({
    parentId: source.id,
    parent: { x: 800, y: 240 },
    source,
    references,
    existingReferences,
    addNode: (_kind, item) => {
      const id = `added-${added.length}`;
      added.push({ id, ...item } as CanvasCollectionItem);
      return id;
    },
    onConnect: (id) => connections.push(id),
    onConnectionNotice: (message) => notices.push(message),
  });

  assert.equal(added.length, 1);
  assert.equal(added[0]?.referenceSlot, "主体");
  assert.deepEqual(connections, ["added-0"]);
  assert.ok(notices.some((message) => message.includes("风格槽已有参考图")));
});

test("canvas reference nodes stay inside the visible world bounds", () => {
  const source = {
    id: "target",
    title: "目标",
    description: "",
    kind: "image",
  } as CanvasCollectionItem;
  const added: CanvasCollectionItem[] = [];

  addCanvasReferences({
    parentId: source.id,
    parent: { x: 200, y: 240 },
    source,
    references: [{ title: "主体", slot: "主体", assetId: "asset-subject" }],
    existingReferences: [],
    visibleWorldLeft: 16,
    visibleWorldRight: 900,
    addNode: (_kind, item) => {
      const id = `added-${added.length}`;
      added.push({ id, ...item } as CanvasCollectionItem);
      return id;
    },
    onConnect: () => undefined,
    onConnectionNotice: () => undefined,
  });

  assert.equal(added.length, 1);
  assert.ok((added[0]?.position.x ?? -1) >= 16);
  assert.ok((added[0]?.position.x ?? Number.POSITIVE_INFINITY) + 590 <= 900);
});
