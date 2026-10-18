import test from "node:test";
import assert from "node:assert/strict";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import {
  areNodeDataEqual,
  areReferencesEqual,
  areGenerationStatesEqual,
  areSelectionAndMenuEqual,
  areDragStatesEqual,
  areGeometryAndPositionEqual,
  areHandlersEqual,
  arePropsEqual,
  type CanvasNodeItemProps,
} from "../../src/components/canvas/canvasNodeItemComparator.ts";

function createMockItem(id = "node-1", plugin = false): CanvasCollectionItem {
  return {
    id,
    node_rev: 1,
    kind: "image",
    title: "Test Node",
    description: "Test Description",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    plugin: plugin
      ? {
          type: "custom:plugin",
          name: "Test Plugin",
          version: "1.0.0",
          metadata: { content: "test" },
        }
      : undefined,
  };
}

const defaultItem = createMockItem();
const defaultReferences: CanvasNodeItemProps["references"] = [];
const defaultDummyFn = () => {};
const defaultEmptyArray: string[] = [];

function createMockProps(overrides?: Partial<CanvasNodeItemProps>): CanvasNodeItemProps {
  const item = overrides?.item ?? defaultItem;
  const id = item.id;

  return {
    item,
    controls: {
      tool: "select",
      setTool: defaultDummyFn,
      spaceHeld: false,
      selectedIds: new Set(),
      marquee: null,
      dragging: null,
      dragRef: { current: null },
      nodes: {
        [id]: { x: 100, y: 200 },
      },
      transform: { x: 0, y: 0, scale: 1 },
      selectedNode: null,
      setSelectedNode: defaultDummyFn,
      setComposerExtraHeight: defaultDummyFn,
      startNodeDrag: defaultDummyFn,
      moveNodeWithKeyboard: defaultDummyFn,
      usableViewport: () => ({ width: 800, height: 600 }),
      actions: {} as unknown,
    } as unknown as CanvasNodeItemProps["controls"],
    addMenu: {
      menu: null,
      open: defaultDummyFn,
      close: defaultDummyFn,
      openAtPoint: defaultDummyFn,
    } as unknown as CanvasNodeItemProps["addMenu"],
    liked: false,
    connectionTarget: false,
    onConnect: defaultDummyFn,
    onConnectionTargetChange: defaultDummyFn,
    onDelete: defaultDummyFn,
    onToggleLike: defaultDummyFn,
    onConfigure: defaultDummyFn,
    onItemsChange: defaultDummyFn,
    references: defaultReferences,
    onDemoResults: defaultDummyFn,
    onGenerationStart: defaultDummyFn,
    onAddReferences: defaultDummyFn,
    onRemoveReference: defaultDummyFn,
    onGenerationState: defaultDummyFn,
    activeLocalResultIds: defaultEmptyArray,
    ...overrides,
  };
}

test("areReferencesEqual performs content-based equality checks", () => {
  assert.equal(areReferencesEqual(undefined, undefined), true);
  assert.equal(areReferencesEqual([], []), true);

  const r1 = [{ id: "r1", title: "Ref 1", preview: "p1" }];
  const r2 = [{ id: "r1", title: "Ref 1", preview: "p1" }];
  const r3 = [{ id: "r1", title: "Ref 2", preview: "p1" }];

  assert.equal(areReferencesEqual(r1, r2), true);
  assert.equal(areReferencesEqual(r1, r3), false);
  assert.equal(areReferencesEqual(r1, []), false);
  assert.equal(areReferencesEqual(undefined, r1), false);
});

test("areNodeDataEqual detects changes in item, liked, connectionTarget, references", () => {
  const base = createMockProps();
  assert.equal(areNodeDataEqual(base, createMockProps()), true);

  // Distinct empty array instances evaluate as equal (prevents unnecessary re-render)
  assert.equal(
    areNodeDataEqual(base, createMockProps({ references: [] })),
    true,
  );

  // Distinct reference arrays with identical content evaluate as equal
  const refA = [{ id: "ref-1", title: "Ref", preview: "img.png" }];
  const refB = [{ id: "ref-1", title: "Ref", preview: "img.png" }];
  assert.equal(
    areNodeDataEqual(
      createMockProps({ references: refA }),
      createMockProps({ references: refB }),
    ),
    true,
  );

  // item reference changed
  assert.equal(
    areNodeDataEqual(base, createMockProps({ item: createMockItem("node-1") })),
    false,
  );

  // liked changed
  assert.equal(areNodeDataEqual(base, createMockProps({ liked: true })), false);

  // connectionTarget changed
  assert.equal(
    areNodeDataEqual(base, createMockProps({ connectionTarget: true })),
    false,
  );

  // references changed
  assert.equal(
    areNodeDataEqual(
      base,
      createMockProps({
        references: [
          {
            id: "ref-1",
            title: "Ref",
          },
        ],
      }),
    ),
    false,
  );
});

test("areGenerationStatesEqual detects changes in active local result IDs for target node", () => {
  const base = createMockProps();
  const nextSame = createMockProps();
  assert.equal(areGenerationStatesEqual(base, nextSame), true);

  // Active in next but not prev
  const nextActive = createMockProps({ activeLocalResultIds: ["node-1"] });
  assert.equal(areGenerationStatesEqual(base, nextActive), false);

  // Active in both
  const prevActive = createMockProps({ activeLocalResultIds: ["node-1"] });
  assert.equal(areGenerationStatesEqual(prevActive, nextActive), true);

  // Other node active does not affect this node
  const nextOtherActive = createMockProps({ activeLocalResultIds: ["node-999"] });
  assert.equal(areGenerationStatesEqual(base, nextOtherActive), true);
});

test("areSelectionAndMenuEqual detects menu open, single selection, and multi-selection", () => {
  const base = createMockProps();
  assert.equal(areSelectionAndMenuEqual(base, createMockProps()), true);

  // Menu open for this node
  const withMenu = createMockProps();
  (withMenu.addMenu as unknown as { menu: { parentId: string } | null }).menu = {
    parentId: "node-1",
  };
  assert.equal(areSelectionAndMenuEqual(base, withMenu), false);

  // Selected node changed
  const withSelected = createMockProps();
  (withSelected.controls as unknown as { selectedNode: string | null }).selectedNode =
    "node-1";
  assert.equal(areSelectionAndMenuEqual(base, withSelected), false);

  // Multi-selected set changed
  const withMulti = createMockProps();
  (withMulti.controls as unknown as { selectedIds: Set<string> }).selectedIds =
    new Set(["node-1"]);
  assert.equal(areSelectionAndMenuEqual(base, withMulti), false);
});

test("areDragStatesEqual detects node dragging status for this node", () => {
  const base = createMockProps();
  assert.equal(areDragStatesEqual(base, createMockProps()), true);

  const draggingThis = createMockProps();
  (draggingThis.controls as unknown as { dragging: string }).dragging = "node";
  (
    draggingThis.controls as unknown as {
      dragRef: { current: { nodeId: string } | null };
    }
  ).dragRef = { current: { nodeId: "node-1" } };
  assert.equal(areDragStatesEqual(base, draggingThis), false);

  // Dragging another node does not flag dragging for node-1
  const draggingOther = createMockProps();
  (draggingOther.controls as unknown as { dragging: string }).dragging = "node";
  (
    draggingOther.controls as unknown as {
      dragRef: { current: { nodeId: string } | null };
    }
  ).dragRef = { current: { nodeId: "node-2" } };
  assert.equal(areDragStatesEqual(base, draggingOther), true);
});

test("areGeometryAndPositionEqual detects coordinate changes and plugin scale sensitivity", () => {
  const base = createMockProps();
  assert.equal(areGeometryAndPositionEqual(base, createMockProps()), true);

  // Position x changed
  const movedX = createMockProps();
  (movedX.controls as unknown as { nodes: Record<string, { x: number; y: number }> }).nodes = {
    "node-1": { x: 105, y: 200 },
  };
  assert.equal(areGeometryAndPositionEqual(base, movedX), false);

  // Position y changed
  const movedY = createMockProps();
  (movedY.controls as unknown as { nodes: Record<string, { x: number; y: number }> }).nodes = {
    "node-1": { x: 100, y: 205 },
  };
  assert.equal(areGeometryAndPositionEqual(base, movedY), false);

  // Missing node position
  const missingNode = createMockProps();
  (missingNode.controls as unknown as { nodes: Record<string, unknown> }).nodes = {};
  assert.equal(areGeometryAndPositionEqual(base, missingNode), false);

  // Non-plugin node: scale change does NOT invalidate props (saves re-renders on zoom)
  const nonPluginScaled = createMockProps();
  (nonPluginScaled.controls as unknown as { transform: { x: number; y: number; scale: number } }).transform = {
    x: 0,
    y: 0,
    scale: 1.5,
  };
  assert.equal(areGeometryAndPositionEqual(base, nonPluginScaled), true);

  // Plugin node: scale change DOES invalidate props (plugin node requires scale awareness)
  const pluginBase = createMockProps({ item: createMockItem("node-1", true) });
  const pluginScaled = createMockProps({ item: pluginBase.item });
  (pluginScaled.controls as unknown as { transform: { x: number; y: number; scale: number } }).transform = {
    x: 0,
    y: 0,
    scale: 1.5,
  };
  assert.equal(areGeometryAndPositionEqual(pluginBase, pluginScaled), false);
});

test("areHandlersEqual checks callback references", () => {
  const base = createMockProps();
  assert.equal(areHandlersEqual(base, createMockProps()), true);

  const changedOnConnect = createMockProps({ onConnect: () => {} });
  assert.equal(areHandlersEqual(base, changedOnConnect), false);

  const changedOnDelete = createMockProps({ onDelete: () => {} });
  assert.equal(areHandlersEqual(base, changedOnDelete), false);

  const changedOnGenerationState = createMockProps({ onGenerationState: () => {} });
  assert.equal(areHandlersEqual(base, changedOnGenerationState), false);
});

test("arePropsEqual performs full composite check", () => {
  const prev = createMockProps();
  const next = createMockProps();
  assert.equal(arePropsEqual(prev, next), true);

  // Fails on data mismatch
  assert.equal(arePropsEqual(prev, createMockProps({ liked: true })), false);

  // Fails on position mismatch
  const moved = createMockProps();
  (moved.controls as unknown as { nodes: Record<string, { x: number; y: number }> }).nodes = {
    "node-1": { x: 999, y: 888 },
  };
  assert.equal(arePropsEqual(prev, moved), false);

  // Fails on generation mismatch
  assert.equal(
    arePropsEqual(prev, createMockProps({ activeLocalResultIds: ["node-1"] })),
    false,
  );
});
