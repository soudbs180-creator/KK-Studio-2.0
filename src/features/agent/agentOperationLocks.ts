import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { ProjectCanvas } from "../../domain/projectCanvas.ts";
import type { CanvasAgentOp } from "./agentTypes.ts";

/** Old MCP operations obey the same target locks as atomic canvas operations. */
export function agentOperationLockReason(
  op: CanvasAgentOp,
  items: CanvasCollectionItem[],
  edges: ProjectCanvas["edges"] = [],
): string | undefined {
  const locked = new Set(
    items.filter((i) => i.canvasPresentation?.locked).map((i) => i.id),
  );
  if (!locked.size) return;
  let targets: string[] = [];
  switch (op.type) {
    case "run_generation":
      targets = [op.nodeId];
      break;
    case "update_node":
      targets = [op.id];
      break;
    case "connect_nodes":
      targets = [op.toNodeId];
      break;
    case "delete_node":
      targets =
        op.ids ??
        (op.id
          ? [op.id]
          : items
              .filter((i) => !op.nodeType || i.kind === op.nodeType)
              .map((i) => i.id));
      break;
    case "delete_connections": {
      const ids = new Set(op.ids ?? (op.id ? [op.id] : []));
      targets = edges
        .filter((e) => op.all || ids.has(e.id))
        .map((e) => e.target);
      break;
    }
  }
  return targets.some((id) => locked.has(id))
    ? "操作目标包含已锁定节点"
    : undefined;
}
