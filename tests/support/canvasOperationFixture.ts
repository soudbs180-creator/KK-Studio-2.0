import type {
  CanvasOperationBridge,
  CanvasOperationState,
} from "../../src/domain/canvasOperations.ts";
import { createProjectCanvas } from "../../src/domain/projectCanvas.ts";
import {
  createCanvasHistory,
  commitCanvasHistory,
  undoCanvasHistory,
  redoCanvasHistory,
} from "../../src/domain/canvasHistory.ts";

export function createCanvasOperationFixture(
  ids = [
    "node-1",
    "node-2",
    "node-a",
    "node-b",
    "card-1",
    "card-2",
    "c-1",
    "c-2",
  ],
): CanvasOperationBridge {
  const items = ids.map((id) => ({
    id,
    title: id,
    kind: "text" as const,
    description: "test fixture",
  }));
  let state: CanvasOperationState = {
    items,
    canvas: createProjectCanvas(items),
    selectedNodeIds: [],
    snapEnabled: false,
    minimapVisible: false,
    screen: { width: 1440, height: 900 },
  };
  const snapshot = () => ({
    items: state.items,
    positions: state.canvas.positions,
    edges: state.canvas.edges,
    viewport: state.canvas.viewport,
    groups: state.canvas.groups,
  });
  let history = createCanvasHistory(snapshot());
  const restore = () => {
    const present = history.present;
    state = {
      ...state,
      items: present.items,
      canvas: {
        ...state.canvas,
        positions: present.positions,
        edges: present.edges,
        viewport: present.viewport,
        groups: present.groups,
      },
    };
  };
  return {
    getState: () => structuredClone(state),
    commit: (next) => {
      state = structuredClone(next);
      history = commitCanvasHistory(history, snapshot());
    },
    undo: () => {
      history = undoCanvasHistory(history);
      restore();
    },
    redo: () => {
      history = redoCanvasHistory(history);
      restore();
    },
    exportImage: () => {
      throw new Error("Image export requires a real browser canvas");
    },
  };
}
