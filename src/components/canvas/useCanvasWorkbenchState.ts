import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { useCanvasHistory } from "./useCanvasHistory";
import type { useCanvasControls } from "./useCanvasControls";

export function useCanvasWorkbenchState({
  controls,
  items,
  onItemsChange,
  edges,
  setEdges,
}: {
  controls: ReturnType<typeof useCanvasControls>;
  items: CanvasCollectionItem[];
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  edges: CanvasConnection[];
  setEdges: Dispatch<SetStateAction<CanvasConnection[]>>;
}) {
  const [layersOpen, setLayersOpen] = useState(false);
  const history = useCanvasHistory({
    items,
    positions: controls.nodes,
    edges,
    viewport: controls.transform,
    onItemsChange,
    setPositions: controls.setNodes,
    setEdges,
    setViewport: controls.setTransform,
    setSelectedNode: controls.setSelectedNode,
    gestureActive: controls.dragging === "node" || controls.dragging === "pan",
    automaticViewport: controls.automaticViewport,
  });
  return { layersOpen, setLayersOpen, history };
}
