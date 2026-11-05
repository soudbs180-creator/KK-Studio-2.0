import {
  CanvasOpSchema,
  type CanvasOperation,
} from "./canvasOperationSchema.ts";
import type { CanvasOperationState } from "./canvasOperationState.ts";
import { cardLayout } from "./canvasGraph.ts";
import { removeCanvasItems, type CanvasCollectionItem } from "./canvasItems.ts";
import { fitRects, MIN_SCALE, MAX_SCALE } from "./canvasViewport.ts";
import { reconcileProjectCanvas } from "./projectCanvas.ts";
import { reconcileCanvasConnections } from "./canvasConnections.ts";

function createContext(next: CanvasOperationState) {
  const requireItem = (id: string, writable = true) => {
    const item = next.items.find((item) => item.id === id);
    if (!item) throw new Error(`节点 ${id} 不存在`);
    if (writable && item.canvasPresentation?.locked)
      throw new Error(`节点 ${id} 已锁定`);
    return item;
  };
  const requireUnused = (id: string) => {
    if (
      next.items.some((item) => item.id === id) ||
      next.canvas.groups?.some((group) => group.id === id) ||
      next.canvas.edges.some((edge) => edge.id === id)
    )
      throw new Error(`ID ${id} 已存在`);
  };
  const position = (id: string) => next.canvas.positions[id] ?? { x: 0, y: 0 };
  const fit = (selected: CanvasCollectionItem[]) => {
    next.canvas.viewport = fitRects(
      selected.map((item) => ({ ...position(item.id), ...cardLayout(item) })),
      {
        x: 16,
        y: 70,
        width: Math.max(1, next.screen.width - 32),
        height: Math.max(1, next.screen.height - 170),
      },
    );
  };

  return { next, requireItem, requireUnused, position, fit };
}
type OperationContext = ReturnType<typeof createContext>;

function mutateCards(op: CanvasOperation, context: OperationContext) {
  const { next, requireItem, requireUnused, position } = context;
  switch (op.op) {
    case "add_card":
      requireUnused(op.payload.card.id);
      next.items.push(op.payload.card);
      next.canvas.positions[op.payload.card.id] = op.payload.position;
      return true;
    case "delete_card":
      requireItem(op.payload.id);
      next.items = removeCanvasItems(next.items, [op.payload.id]);
      return true;
    case "update_card":
      Object.assign(requireItem(op.payload.id), op.payload.patch);
      return true;
    case "move_card":
      requireItem(op.payload.id);
      next.canvas.positions[op.payload.id] = {
        x: op.payload.x,
        y: op.payload.y,
      };
      return true;
    case "resize_card": {
      const item = requireItem(op.payload.id);
      item.canvasPresentation = {
        ...item.canvasPresentation,
        width: op.payload.width,
        height: op.payload.height,
      };
      return true;
    }
    case "duplicate_node": {
      const item = requireItem(op.payload.id, false);
      requireUnused(op.payload.newId);
      next.items.push({
        ...structuredClone(item),
        id: op.payload.newId,
        canvasPresentation: { ...item.canvasPresentation, locked: false },
      });
      const p = position(item.id);
      next.canvas.positions[op.payload.newId] = { x: p.x + 48, y: p.y + 48 };
      return true;
    }
    case "lock_node":
    case "unlock_node": {
      const item = requireItem(op.payload.id, false);
      item.canvasPresentation = {
        ...item.canvasPresentation,
        locked: op.op === "lock_node",
      };
      return true;
    }
    case "set_card_color": {
      const item = requireItem(op.payload.id);
      item.canvasPresentation = {
        ...item.canvasPresentation,
        color: op.payload.color,
      };
      return true;
    }
    case "reorder_z_index": {
      const item = requireItem(op.payload.id);
      next.items = next.items.filter((i) => i.id !== item.id);
      next.items.splice(Math.min(next.items.length, op.payload.index), 0, item);
      return true;
    }
    default:
      return false;
  }
}

function mutateConnections(op: CanvasOperation, context: OperationContext) {
  const { next, requireItem, requireUnused } = context;
  switch (op.op) {
    case "connect_cards": {
      const p = op.payload;
      requireUnused(p.id);
      requireItem(p.source, false);
      requireItem(p.target);
      if (
        p.source === p.target ||
        next.canvas.edges.some(
          (e) => e.source === p.source && e.target === p.target,
        )
      )
        throw new Error("不能重复或自连接节点");
      next.canvas.edges.push(p);
      return true;
    }
    case "disconnect_cards": {
      const edge = next.canvas.edges.find((e) => e.id === op.payload.id);
      if (!edge) throw new Error("连线不存在");
      requireItem(edge.target);
      next.canvas.edges = next.canvas.edges.filter(
        (e) => e.id !== op.payload.id,
      );
      return true;
    }
    case "create_frame":
    case "group_cards": {
      const p = op.payload;
      requireUnused(p.id);
      p.ids.forEach((id) => requireItem(id));
      if ((next.canvas.groups?.length ?? 0) >= 100)
        throw new Error("最多100个分组");
      if (
        next.canvas.groups?.some((g) =>
          g.itemIds.some((id) => p.ids.includes(id)),
        )
      )
        throw new Error("节点已属于其他分组");
      const stamp = Date.now();
      next.canvas.groups = [
        ...(next.canvas.groups ?? []),
        {
          id: p.id,
          name: p.name,
          itemIds: p.ids,
          borderColor: "#21a673",
          collapseMode: "info",
          layoutMode: "grid",
          createdAt: stamp,
          updatedAt: stamp,
        },
      ];
      return true;
    }
    case "ungroup_cards": {
      const group = next.canvas.groups?.find((g) => g.id === op.payload.id);
      if (!group) throw new Error("分组不存在");
      group.itemIds.forEach((id) => requireItem(id));
      next.canvas.groups = next.canvas.groups?.filter(
        (g) => g.id !== op.payload.id,
      );
      return true;
    }
    case "add_asset_attachment": {
      const p = op.payload;
      const source = requireItem(p.sourceId);
      requireItem(p.id);
      if (!source.assetId || source.kind !== "image" || p.id === p.sourceId)
        throw new Error("请选择已有原件的图片参考卡");
      const edgeId = `ref-${p.sourceId}-${p.id}`;
      if (
        next.canvas.edges.some(
          (edge) => edge.source === p.sourceId && edge.target === p.id,
        )
      )
        throw new Error("不能重复连接参考卡");
      requireUnused(edgeId);
      source.referenceSlot = p.slot;
      next.canvas.edges.push({
        id: edgeId,
        source: p.sourceId,
        target: p.id,
        kind: "reference",
      });
      return true;
    }
    case "remove_asset_attachment":
      requireItem(op.payload.id);
      next.canvas.edges = next.canvas.edges.filter(
        (e) =>
          !(
            e.source === op.payload.sourceId &&
            e.target === op.payload.id &&
            e.kind !== "result"
          ),
      );
      return true;
    default:
      return false;
  }
}

function mutateView(op: CanvasOperation, context: OperationContext) {
  const { next, requireItem, position, fit } = context;
  switch (op.op) {
    case "set_viewport":
      next.canvas.viewport = {
        x: op.payload.x,
        y: op.payload.y,
        scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, op.payload.zoom)),
      };
      return true;
    case "reset_viewport":
      next.canvas.viewport = { x: 0, y: 0, scale: 1 };
      return true;
    case "fit_view":
      fit(next.items);
      return true;
    case "focus_node": {
      const item = requireItem(op.payload.id, false);
      fit([item]);
      next.selectedNodeIds = [item.id];
      return true;
    }
    case "select_nodes":
      op.payload.ids.forEach((id) => requireItem(id, false));
      next.selectedNodeIds = [
        ...new Set([
          ...(op.payload.append ? next.selectedNodeIds : []),
          ...op.payload.ids,
        ]),
      ];
      return true;
    case "clear_selection":
      next.selectedNodeIds = [];
      return true;
    case "align_nodes_horizontal":
    case "align_nodes_vertical":
    case "distribute_nodes": {
      const p = op.payload;
      p.ids.forEach((id) => requireItem(id));
      const axis =
        op.op === "align_nodes_horizontal"
          ? "y"
          : op.op === "align_nodes_vertical"
            ? "x"
            : (p as { axis: "x" | "y" }).axis;
      const ordered = [...p.ids].sort(
        (a, b) => position(a)[axis] - position(b)[axis],
      );
      const min = position(ordered[0])[axis],
        max = position(ordered.at(-1)!)[axis];
      ordered.forEach((id, index) => {
        next.canvas.positions[id] = {
          ...position(id),
          [axis]:
            op.op === "distribute_nodes"
              ? min + ((max - min) * index) / Math.max(1, ordered.length - 1)
              : min,
        };
      });
      return true;
    }
    case "set_grid_snap":
      next.snapEnabled = op.payload.enabled;
      return true;
    case "toggle_mini_map":
      next.minimapVisible = op.payload.visible;
      return true;
    case "batch_transform":
      op.payload.ids.forEach((id) => {
        requireItem(id);
        const p = position(id);
        next.canvas.positions[id] = {
          x: p.x + op.payload.dx,
          y: p.y + op.payload.dy,
        };
      });
      return true;
    default:
      return false;
  }
}

function importDocument(op: CanvasOperation, context: OperationContext) {
  const { next, requireUnused } = context;
  switch (op.op) {
    case "import_canvas_json": {
      const d = op.payload.document;
      if (
        new Set(d.cards.map((c) => c.id)).size !== d.cards.length ||
        new Set(d.edges.map((e) => e.id)).size !== d.edges.length
      )
        throw new Error("蓝图 ID 重复");
      for (const c of d.cards) {
        requireUnused(c.id);
        if (!Object.hasOwn(d.positions, c.id)) throw new Error("缺少节点位置");
      }
      const imported = new Set(d.cards.map((c) => c.id));
      const allIds = [...imported, ...d.edges.map((e) => e.id)];
      if (
        new Set(allIds).size !== allIds.length ||
        Object.keys(d.positions).length !== imported.size ||
        Object.keys(d.positions).some((id) => !imported.has(id))
      )
        throw new Error("导入 ID 或位置集合无效");
      const pairs = d.edges.map((e) => `${e.source}\u0000${e.target}`);
      if (new Set(pairs).size !== pairs.length)
        throw new Error("蓝图包含重复连线");
      for (const edge of d.edges) {
        requireUnused(edge.id);
        if (
          !imported.has(edge.source) ||
          !imported.has(edge.target) ||
          edge.source === edge.target
        )
          throw new Error("蓝图包含无效连线");
      }
      next.items.push(...d.cards);
      Object.assign(next.canvas.positions, d.positions);
      next.canvas.edges.push(...d.edges);
      return true;
    }
    default:
      return false;
  }
}

/** Validate on a clone before publishing one atomic state change. */
export function applyCanvasOperation(
  state: CanvasOperationState,
  input: CanvasOperation,
): CanvasOperationState {
  const op = CanvasOpSchema.parse(input);
  const next = structuredClone(state);
  const context = createContext(next);
  if (!(
    mutateCards(op, context) ||
    mutateConnections(op, context) ||
    mutateView(op, context) ||
    importDocument(op, context)
  ))
    throw new Error("该操作须由画布宿主执行");

  if (next.items.length > 2000) throw new Error("画布节点数量超出限制");
  next.canvas = reconcileProjectCanvas(next.canvas, next.items);
  if (
    reconcileCanvasConnections(next.items, next.canvas.edges).length !==
    next.canvas.edges.length
  )
    throw new Error("参考连线的模态、目标或数量不受支持");
  next.canvas = reconcileProjectCanvas(next.canvas, next.items);
  next.selectedNodeIds = next.selectedNodeIds.filter((id) =>
    next.items.some((item) => item.id === id),
  );
  return next;
}
