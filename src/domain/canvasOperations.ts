import { CanvasOpSchema } from "./canvasOperationSchema.ts";
import { applyCanvasOperation } from "./canvasOperationReducer.ts";
import { normalizeCanvasOperation } from "./canvasOperationAliases.ts";
import type {
  CanvasOperationBridge,
  CanvasViewport,
} from "./canvasOperationState.ts";
export {
  CanvasOpSchema,
  CANVAS_34_OPS,
  CANVAS_ATOMIC_OPS,
} from "./canvasOperationSchema.ts";
export type { CanvasOperation } from "./canvasOperationSchema.ts";
export type {
  CanvasOperationState,
  CanvasOperationBridge,
  CanvasViewport,
} from "./canvasOperationState.ts";
export { applyCanvasOperation } from "./canvasOperationReducer.ts";

export class CanvasMcpServer {
  readonly bridge?: CanvasOperationBridge;
  constructor(bridge?: CanvasOperationBridge) {
    this.bridge = bridge;
  }
  executeOp(raw: unknown): {
    success: boolean;
    op: string;
    error?: string;
    data?: unknown;
  } {
    const parsed = CanvasOpSchema.safeParse(raw);
    if (!parsed.success)
      return { success: false, op: "unknown", error: parsed.error.message };
    const op = normalizeCanvasOperation(parsed.data);
    try {
      if (!this.bridge) throw new Error("画布宿主未连接");
      let data: unknown;
      if (op.op === "undo") this.bridge.undo();
      else if (op.op === "redo") this.bridge.redo();
      else if (op.op === "auto_layout") {
        if (!this.bridge.autoLayout) throw new Error("自动布局宿主未连接");
        this.bridge.autoLayout(op.payload.ids, op.payload.direction);
      } else if (op.op === "export_canvas_image")
        data = this.bridge.exportImage();
      else if (op.op === "export_canvas_json") {
        const s = this.bridge.getState();
        data = {
          version: 1,
          cards: s.items.map((item) => ({
            id: item.id,
            title: item.title,
            kind: item.kind,
            description: item.description,
            ...(item.prompt ? { prompt: item.prompt } : {}),
            ...(item.assetId ? { assetId: item.assetId } : {}),
            ...(item.referenceOnly !== undefined
              ? { referenceOnly: item.referenceOnly }
              : {}),
            ...(item.referenceSlot
              ? { referenceSlot: item.referenceSlot }
              : {}),
          })),
          positions: structuredClone(s.canvas.positions),
          edges: structuredClone(s.canvas.edges),
        };
      } else
        this.bridge.commit(applyCanvasOperation(this.bridge.getState(), op));
      return {
        success: true,
        op: op.op,
        ...(data === undefined ? {} : { data }),
      };
    } catch (error) {
      return {
        success: false,
        op: op.op,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class AutonomousCanvasController {
  readonly bridge: CanvasOperationBridge;
  constructor(bridge: CanvasOperationBridge) {
    this.bridge = bridge;
  }
  get viewport(): CanvasViewport {
    const { x, y, scale } = this.bridge.getState().canvas.viewport;
    return { x, y, zoom: scale };
  }
  get selectedNodes() {
    return [...this.bridge.getState().selectedNodeIds];
  }
  setViewport(x: number, y: number, zoom: number) {
    this.bridge.commit(
      applyCanvasOperation(this.bridge.getState(), {
        op: "set_viewport",
        payload: { x, y, zoom },
      }),
    );
  }
  selectNodes(ids: string[], append = false) {
    this.bridge.commit(
      applyCanvasOperation(this.bridge.getState(), {
        op: "select_nodes",
        payload: { ids: [...new Set(ids)], append },
      }),
    );
  }
}
