import type { Dispatch, SetStateAction, KeyboardEvent } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { cardLayout } from "../../domain/canvasGraph";
import {
  fitRects,
  zoomAtPoint,
  type Point,
  type ViewTransform,
  type ViewportRect,
} from "../../domain/canvasViewport";

interface CanvasViewOptions {
  nodes: Record<string, Point>;
  items: CanvasCollectionItem[];
  selectedNode: string | null;
  composerExtraHeight: number;
  getViewport: () => { width: number; height: number };
  setTransform: Dispatch<SetStateAction<ViewTransform>>;
}

export function useCanvasView({
  nodes,
  items,
  selectedNode,
  composerExtraHeight,
  getViewport,
  setTransform,
}: CanvasViewOptions) {
  function viewportRect(): ViewportRect {
    const { width, height } = getViewport();
    return {
      x: 16,
      y: 70,
      width: Math.max(1, width - 32),
      height: Math.max(1, height - 170),
    };
  }

  function updateZoom(value: number, relative = false): void {
    const viewport = viewportRect();
    const center = {
      x: viewport.x + viewport.width / 2,
      y: viewport.y + viewport.height / 2,
    };
    setTransform((current) =>
      zoomAtPoint(current, center, relative ? current.scale * value : value),
    );
  }

  function fitView(): void {
    const rects = items.flatMap((item): ViewportRect[] => {
      const point = nodes[item.id];
      if (!point) return [];
      const selected = selectedNode === item.id;
      const image = item.kind === "image";
      const layout = cardLayout(item);
      return [
        {
          x: point.x + (selected ? layout.left : 0),
          y: point.y,
          width:
            item.result || ["audio", "text"].includes(item.kind)
              ? layout.width
              : image || selected
                ? 590
                : 370,
          height: selected
            ? layout.height + (item.result ? 0 : composerExtraHeight)
            : layout.collapsedHeight,
        },
      ];
    });
    setTransform(fitRects(rects, viewportRect()));
  }

  function handleViewKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey)
      return;
    if (
      event.target instanceof Element &&
      event.target.closest(
        "input,textarea,select,dialog,[contenteditable='true'],[role='menu']",
      )
    )
      return;
    if (
      (event.ctrlKey || event.metaKey) &&
      ["+", "=", "-"].includes(event.key)
    ) {
      event.preventDefault();
      event.stopPropagation();
      updateZoom(event.key === "-" ? 1 / 1.1 : 1.1, true);
    } else if (
      event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      (event.key === "!" || event.code === "Digit1")
    ) {
      event.preventDefault();
      event.stopPropagation();
      fitView();
    }
  }

  return {
    setZoom: (scale: number): void => updateZoom(scale),
    changeZoom: (factor: number): void => updateZoom(factor, true),
    fitView,
    handleViewKeyDown,
  };
}
