import { useEffect, useMemo, useRef } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  projectCanvasFingerprint,
  reconcileProjectCanvas,
  type CanvasGroup,
  type ProjectCanvas,
} from "../../domain/projectCanvas";

export function useCanvasPersistence(
  initialCanvas: ProjectCanvas | undefined,
  positions: ProjectCanvas["positions"],
  edges: ProjectCanvas["edges"],
  viewport: ProjectCanvas["viewport"],
  groups: CanvasGroup[],
  items: CanvasCollectionItem[],
  onChange: ((canvas: ProjectCanvas) => void) | undefined,
): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialFingerprint = useMemo(
    () => projectCanvasFingerprint(initialCanvas),
    [initialCanvas],
  );
  const previous = useRef(initialFingerprint);
  useEffect(() => {
    const canvas = reconcileProjectCanvas(
      { version: 1, positions, edges, viewport, groups },
      items,
    );
    const fingerprint = projectCanvasFingerprint(canvas);
    if (fingerprint === initialFingerprint) {
      previous.current = fingerprint;
      return;
    }
    // A preserved local gesture must repair a conflicting external snapshot.
    if (fingerprint !== previous.current || initialCanvas !== undefined) {
      previous.current = fingerprint;
      onChangeRef.current?.(canvas);
    }
  }, [
    positions,
    edges,
    viewport,
    groups,
    items,
    initialCanvas,
    initialFingerprint,
  ]);
}
