import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
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
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (history.handleKeyDown(event)) return;
    controls.handleViewKeyDown(event);
    if (
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.currentTarget.closest("[inert]") ||
      document.querySelector("dialog[open]") ||
      (event.target instanceof Element &&
        event.target.closest(
          "input,textarea,select,[contenteditable='true'],[role='menu'],[role='dialog'],.node-popover,.generation-count-panel",
        ))
    )
      return;
    const key = event.key.toLowerCase();
    if (key !== "l" && key !== "g") return;
    event.preventDefault();
    event.stopPropagation();
    if (key === "l") setLayersOpen((current) => !current);
    else controls.setSnapEnabled(!controls.preferences.snapEnabled);
  }
  return { layersOpen, setLayersOpen, history, handleKeyDown };
}
