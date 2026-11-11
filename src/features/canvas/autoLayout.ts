import { Graph, layout } from "@dagrejs/dagre";
import { cardLayout } from "../../domain/canvasGraph.ts";
import {
  applyCanvasOperation,
  type CanvasOperationState,
} from "../../domain/canvasOperations.ts";

export function autoLayoutCanvas(
  state: CanvasOperationState,
  ids = state.items.map((i) => i.id),
  direction: "LR" | "TB" = "LR",
) {
  const graph = new Graph()
    .setGraph({ rankdir: direction, nodesep: 64, ranksep: 120 })
    .setDefaultEdgeLabel(() => ({}));
  const selected = new Set(ids);
  for (const id of ids) {
    const item = state.items.find((i) => i.id === id);
    if (!item || item.canvasPresentation?.locked)
      throw new Error("布局节点不存在或已锁定");
    graph.setNode(id, cardLayout(item));
  }
  for (const edge of state.canvas.edges)
    if (selected.has(edge.source) && selected.has(edge.target))
      graph.setEdge(edge.source, edge.target);
  layout(graph);
  return applyCanvasOperation(state, {
    op: "batch_apply",
    payload: {
      operations: ids.map((id) => {
        const p = graph.node(id);
        return {
          op: "move_card",
          payload: { id, x: p.x - p.width / 2, y: p.y - p.height / 2 },
        };
      }),
    },
  });
}
