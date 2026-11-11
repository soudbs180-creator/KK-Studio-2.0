import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANVAS_34_OPS,
  CanvasMcpServer,
  CanvasOpSchema,
} from "../../src/domain/canvasOperations.ts";
import { readProjectCanvas } from "../../src/domain/projectCanvas.ts";
import { createCanvasOperationFixture } from "../support/canvasOperationFixture.ts";
import { FloorplanCanvasAdapter } from "../../src/features/canvas/index.ts";
import { readFileSync } from "node:fs";

test("all 34 operations validate distinct payloads and execute real state or explicit host behavior", () => {
  const payloads: Record<string, object> = {
    add_card: {
      card: { id: "new", kind: "text", title: "new" },
      position: { x: 5, y: 6 },
    },
    delete_card: { id: "a" },
    update_card: { id: "a", patch: { title: "updated" } },
    move_card: { id: "a", x: 9, y: 8 },
    resize_card: { id: "a", width: 800, height: 500 },
    connect_cards: { id: "edge2", source: "b", target: "c", kind: "result" },
    disconnect_cards: { id: "edge" },
    group_cards: { id: "group2", ids: ["b", "c"], name: "Group" },
    ungroup_cards: { id: "group" },
    set_viewport: { x: 5, y: 6, zoom: 2 },
    reset_viewport: {},
    fit_view: {},
    select_nodes: { ids: ["a"], append: true },
    clear_selection: {},
    align_nodes_horizontal: { ids: ["a", "b"] },
    align_nodes_vertical: { ids: ["a", "b"] },
    distribute_nodes: { ids: ["a", "b", "c"], axis: "x" },
    duplicate_node: { id: "a", newId: "copy" },
    lock_node: { id: "a" },
    unlock_node: { id: "a" },
    set_card_color: { id: "a", color: "accent" },
    add_asset_attachment: { id: "target", sourceId: "source", slot: "风格" },
    remove_asset_attachment: { id: "target", sourceId: "source" },
    create_frame: { id: "frame", ids: ["b", "c"], name: "Frame" },
    export_canvas_image: {},
    export_canvas_json: {},
    import_canvas_json: {
      document: {
        version: 1,
        cards: [{ id: "imported", title: "Imported", kind: "text" }],
        positions: { imported: { x: 0, y: 0 } },
        edges: [],
      },
    },
    undo: {},
    redo: {},
    set_grid_snap: { enabled: true },
    toggle_mini_map: { visible: true },
    focus_node: { id: "a" },
    batch_transform: { ids: ["a", "b"], dx: 100, dy: 200 },
    reorder_z_index: { id: "a", index: 3 },
  };
  assert.equal(CANVAS_34_OPS.length, 34);
  assert.equal(Object.keys(payloads).length, 34);
  for (const op of CANVAS_34_OPS) {
    const bridge = createCanvasOperationFixture([
      "a",
      "b",
      "c",
      "source",
      "target",
    ]);
    const s = bridge.getState();
    s.items.find((i) => i.id === "source")!.kind = "image";
    s.items.find((i) => i.id === "source")!.assetId =
      "asset-aaaaaaaaaaaaaaaaaaaaaaaa";
    s.items.find((i) => i.id === "target")!.kind = "image";
    s.canvas.edges = [{ id: "edge", source: "a", target: "b", kind: "result" }];
    s.canvas.groups = [
      {
        id: "group",
        name: "G",
        itemIds: ["a"],
        borderColor: "#21a673",
        layoutMode: "grid",
        collapseMode: "info",
        createdAt: 1,
        updatedAt: 1,
      },
    ];
    s.selectedNodeIds = ["b"];
    bridge.commit(s);
    if (op === "redo") bridge.undo();
    const server = new CanvasMcpServer(bridge);
    const request = { op, payload: payloads[op] };
    assert.equal(CanvasOpSchema.safeParse(request).success, true, op);
    const result = server.executeOp(request);
    assert.equal(
      result.success,
      op !== "export_canvas_image",
      `${op}: ${result.error}`,
    );
    if (op === "export_canvas_image")
      assert.match(result.error!, /real browser/);
    const after = bridge.getState();
    assert.doesNotThrow(() => readProjectCanvas(after.canvas, after.items), op);
    if (op === "move_card")
      assert.deepEqual(after.canvas.positions.a, { x: 9, y: 8 });
    if (op === "resize_card") {
      assert.equal(after.items[0].canvasPresentation?.width, 800);
      bridge.undo();
      assert.equal(bridge.getState().items[0].canvasPresentation, undefined);
    }
    if (op === "set_card_color")
      assert.equal(after.items[0].canvasPresentation?.color, "accent");
    if (op === "group_cards") {
      assert.equal(after.canvas.groups?.length, 2);
      bridge.undo();
      assert.equal(bridge.getState().canvas.groups?.length, 1);
    }
    if (op === "lock_node") {
      assert.equal(after.items[0].canvasPresentation?.locked, true);
      assert.equal(
        server.executeOp({ op: "delete_card", payload: { id: "a" } }).success,
        false,
      );
    }
    if (op === "set_grid_snap") assert.equal(after.snapEnabled, true);
    if (op === "toggle_mini_map") assert.equal(after.minimapVisible, true);
    if (op === "export_canvas_json") {
      const restored = new CanvasMcpServer(createCanvasOperationFixture([]));
      assert.equal(
        restored.executeOp({
          op: "import_canvas_json",
          payload: { document: result.data },
        }).success,
        true,
      );
    }
  }
});

test("imports reject hidden position writes, duplicate pairs and cross-kind IDs atomically", () => {
  const bridge = createCanvasOperationFixture(["locked"]),
    server = new CanvasMcpServer(bridge);
  assert.equal(
    server.executeOp({ op: "lock_node", payload: { id: "locked" } }).success,
    true,
  );
  const before = bridge.getState();
  const document = {
    version: 1,
    cards: [{ id: "new", kind: "text", title: "N" }],
    positions: { new: { x: 0, y: 0 }, locked: { x: 999, y: 999 } },
    edges: [],
  };
  assert.equal(
    server.executeOp({ op: "import_canvas_json", payload: { document } })
      .success,
    false,
  );
  assert.deepEqual(bridge.getState(), before);
  assert.equal(
    server.executeOp({
      op: "group_cards",
      payload: { id: "g", ids: ["locked"], name: "x".repeat(121) },
    }).success,
    false,
  );
  assert.equal(
    server.executeOp({
      op: "set_viewport",
      payload: { x: Infinity, y: 0, zoom: 1 },
    }).success,
    false,
  );
});

test("real Floorplan architecture fixture imports hierarchy, path-owned links and external nodes", () => {
  const architecture = JSON.parse(
    readFileSync(
      new URL("../fixtures/floorplan/architecture.json", import.meta.url),
      "utf8",
    ),
  );
  const operation = new FloorplanCanvasAdapter().toCanvas(architecture, "test");
  assert.equal(operation.payload.document.cards.length, 10);
  assert.equal(operation.payload.document.edges.length, 4);
  const bridge = createCanvasOperationFixture([]),
    receipt = new CanvasMcpServer(bridge).executeOp(operation);
  assert.equal(receipt.success, true, receipt.error);
  assert.doesNotThrow(() =>
    readProjectCanvas(bridge.getState().canvas, bridge.getState().items),
  );
});
