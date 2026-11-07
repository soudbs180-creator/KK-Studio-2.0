import type { CanvasOperation } from "./canvasOperationSchema.ts";

/** Keep the original public operation names compatible with the current MCP vocabulary. */
export function normalizeCanvasOperation(op: CanvasOperation): CanvasOperation {
  switch (op.op) {
    case "remove_card":
      return { op: "delete_card", payload: op.payload };
    case "lock_card":
      return { op: "lock_node", payload: op.payload };
    case "unlock_card":
      return { op: "unlock_node", payload: op.payload };
    case "align_cards":
      return {
        op:
          op.payload.axis === "x"
            ? "align_nodes_vertical"
            : "align_nodes_horizontal",
        payload: { ids: op.payload.ids },
      };
    case "distribute_cards":
      return { op: "distribute_nodes", payload: op.payload };
    case "reorder_layer":
      return { op: "reorder_z_index", payload: op.payload };
    case "connect_ports":
      return { op: "connect_cards", payload: op.payload };
    case "disconnect_ports":
      return { op: "disconnect_cards", payload: op.payload };
    case "focus_card":
      return { op: "focus_node", payload: op.payload };
    case "select_cards":
      return { op: "select_nodes", payload: op.payload };
    case "export_canvas_png":
      return { op: "export_canvas_image", payload: {} };
    case "set_snap_to_grid":
      return { op: "set_grid_snap", payload: op.payload };
    default:
      return op;
  }
}
