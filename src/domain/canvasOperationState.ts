import type { CanvasCollectionItem } from "./canvasItems.ts";
import type { ProjectCanvas } from "./projectCanvas.ts";
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}
export interface CanvasOperationState {
  items: CanvasCollectionItem[];
  canvas: ProjectCanvas;
  selectedNodeIds: string[];
  snapEnabled: boolean;
  minimapVisible: boolean;
  screen: { width: number; height: number };
}
export interface CanvasOperationBridge {
  getState(): CanvasOperationState;
  commit(state: CanvasOperationState): void;
  undo(): void;
  redo(): void;
  exportImage(): unknown;
}
