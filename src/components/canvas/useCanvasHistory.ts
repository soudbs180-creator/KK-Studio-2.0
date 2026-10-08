import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from "react";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { reconcileCanvasConnections } from "../../domain/canvasConnections";
import { reconcileProjectCanvas } from "../../domain/projectCanvas";
import {
  canvasHistoryFingerprint,
  cloneCanvasHistorySnapshot,
  commitCanvasHistory,
  createCanvasHistory,
  redoCanvasHistory,
  undoCanvasHistory,
  type CanvasHistorySnapshot,
  type CanvasHistoryState,
} from "../../domain/canvasHistory";
import type { Point, ViewTransform } from "../../domain/canvasViewport";

interface CanvasHistoryOptions {
  items: CanvasCollectionItem[];
  positions: Record<string, Point>;
  edges: CanvasConnection[];
  viewport: ViewTransform;
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  setPositions: Dispatch<SetStateAction<Record<string, Point>>>;
  setEdges: Dispatch<SetStateAction<CanvasConnection[]>>;
  setViewport: Dispatch<SetStateAction<ViewTransform>>;
  setSelectedNode?: Dispatch<SetStateAction<string | null>>;
  gestureActive?: boolean;
  automaticViewport?: { readonly current: ViewTransform | null };
  limit?: number;
}

function snapshotOf(
  items: CanvasCollectionItem[],
  positions: Record<string, Point>,
  edges: CanvasConnection[],
  viewport: ViewTransform,
): CanvasHistorySnapshot {
  const canvas = reconcileProjectCanvas(
    {
      version: 1,
      positions,
      edges: reconcileCanvasConnections(items, edges),
      viewport,
    },
    items,
  );
  return { items, positions: canvas.positions, edges: canvas.edges, viewport };
}

function isCanvasEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input,textarea,select,[contenteditable='true'],[role='menu'],dialog",
      ),
    )
  );
}

export function useCanvasHistory({
  items,
  positions,
  edges,
  viewport,
  onItemsChange,
  setPositions,
  setEdges,
  setViewport,
  setSelectedNode,
  gestureActive = false,
  automaticViewport,
  limit = 80,
}: CanvasHistoryOptions) {
  const [, setRevision] = useState(0);
  const historyRef = useRef<CanvasHistoryState | null>(null);
  const presentRef = useRef<CanvasHistorySnapshot | null>(null);
  const applyingFingerprint = useRef<string | null>(null);
  const snapshot = useMemo(
    () => snapshotOf(items, positions, edges, viewport),
    [edges, items, positions, viewport],
  );

  useEffect(() => {
    const fingerprint = canvasHistoryFingerprint(snapshot);
    const present = presentRef.current;
    if (!present) {
      presentRef.current = cloneCanvasHistorySnapshot(snapshot);
      historyRef.current = createCanvasHistory(snapshot, limit);
      setRevision((value) => value + 1);
      return;
    }
    if (applyingFingerprint.current) {
      if (applyingFingerprint.current === fingerprint) {
        applyingFingerprint.current = null;
        presentRef.current = cloneCanvasHistorySnapshot(snapshot);
        setRevision((value) => value + 1);
      }
      return;
    }
    // Pointer renders are previews. A completed gesture commits once; cancel
    // restores its starting snapshot, preserving both the past and the redo.
    if (gestureActive) return;
    if (canvasHistoryFingerprint(present) === fingerprint) return;
    const history = historyRef.current ?? createCanvasHistory(present, limit);
    if (
      automaticViewport?.current === snapshot.viewport &&
      canvasHistoryFingerprint({ ...snapshot, viewport: present.viewport }) ===
        canvasHistoryFingerprint(present)
    ) {
      // Revealing a selected card is part of that action, rather than a new
      // user pan/zoom. Keep the actual viewport without consuming undo/redo.
      historyRef.current = {
        ...history,
        present: cloneCanvasHistorySnapshot(snapshot),
      };
      presentRef.current = cloneCanvasHistorySnapshot(snapshot);
      setRevision((value) => value + 1);
      return;
    }
    historyRef.current = commitCanvasHistory(history, snapshot);
    presentRef.current = cloneCanvasHistorySnapshot(snapshot);
    setRevision((value) => value + 1);
  }, [automaticViewport, gestureActive, limit, snapshot]);

  const apply = useCallback(
    (next: CanvasHistorySnapshot): void => {
      applyingFingerprint.current = canvasHistoryFingerprint(next);
      onItemsChange(cloneCanvasHistorySnapshot(next).items);
      setPositions({ ...next.positions });
      setEdges(next.edges.map((edge) => ({ ...edge })));
      setViewport({ ...next.viewport });
      setSelectedNode?.((current) =>
        current && next.items.some((item) => item.id === current)
          ? current
          : null,
      );
    },
    [onItemsChange, setEdges, setPositions, setSelectedNode, setViewport],
  );

  const undo = useCallback((): void => {
    if (gestureActive) return;
    const history = historyRef.current;
    if (!history || history.past.length === 0) return;
    const next = undoCanvasHistory(history);
    historyRef.current = next;
    apply(next.present);
    setRevision((value) => value + 1);
  }, [apply, gestureActive]);

  const redo = useCallback((): void => {
    if (gestureActive) return;
    const history = historyRef.current;
    if (!history || history.future.length === 0) return;
    const next = redoCanvasHistory(history);
    historyRef.current = next;
    apply(next.present);
    setRevision((value) => value + 1);
  }, [apply, gestureActive]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>): boolean => {
      if (
        event.defaultPrevented ||
        event.nativeEvent.isComposing ||
        event.altKey ||
        isCanvasEditableTarget(event.target) ||
        !(event.ctrlKey || event.metaKey)
      )
        return false;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return false;
      event.preventDefault();
      event.stopPropagation();
      if (key === "y" || event.shiftKey) redo();
      else undo();
      return true;
    },
    [redo, undo],
  );

  return {
    canUndo: !gestureActive && Boolean(historyRef.current?.past.length),
    canRedo: !gestureActive && Boolean(historyRef.current?.future.length),
    undo,
    redo,
    handleKeyDown,
  };
}
