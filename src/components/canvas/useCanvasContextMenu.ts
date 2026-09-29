import { useCallback, useRef, useState, type MouseEvent } from "react";
import type { CanvasContextMenuState } from "./CanvasContextMenu";

export function useCanvasContextMenu() {
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(
    null,
  );
  const rightGesture = useRef<{ x: number; y: number; moved: boolean } | null>(
    null,
  );
  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const editable =
      event.target instanceof Element &&
      event.target.closest("input,textarea,[contenteditable=true]");
    if (editable) return;
    event.preventDefault();
    if (
      event.target instanceof Element &&
      event.target.closest(
        "[data-canvas-node],button,.canvas-hud,.canvas-toolbar,.connection",
      )
    ) {
      rightGesture.current = null;
      return;
    }
    if (rightGesture.current?.moved) {
      rightGesture.current = null;
      return;
    }
    rightGesture.current = null;
    setContextMenu({
      client: { x: event.clientX, y: event.clientY },
      trigger: event.currentTarget,
    });
  }, []);
  return { contextMenu, setContextMenu, rightGesture, handleContextMenu };
}
