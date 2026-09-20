import { useEffect, useRef } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  projectCanvasFingerprint,
  reconcileProjectCanvas,
  type ProjectCanvas,
} from "../../domain/projectCanvas";

export function useCanvasPersistence(
  initialCanvas: ProjectCanvas | undefined,
  positions: ProjectCanvas["positions"],
  edges: ProjectCanvas["edges"],
  viewport: ProjectCanvas["viewport"],
  items: CanvasCollectionItem[],
  onChange: ((canvas: ProjectCanvas) => void) | undefined,
): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const previous = useRef(projectCanvasFingerprint(initialCanvas));
  useEffect(() => {
    const canvas = reconcileProjectCanvas(
      { version: 1, positions, edges, viewport },
      items,
    );
    const fingerprint = projectCanvasFingerprint(canvas);
    if (fingerprint !== previous.current) {
      previous.current = fingerprint;
      onChangeRef.current?.(canvas);
    }
  }, [positions, edges, viewport, items]);
}
