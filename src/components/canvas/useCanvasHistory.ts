import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from "react";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
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
  limit?: number;
}

function snapshotOf(
  items: CanvasCollectionItem[],
  positions: Record<string, Point>,
  edges: CanvasConnection[],
  viewport: ViewTransform,
): CanvasHistorySnapshot {
  return { items, positions, edges, viewport };
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
    if (canvasHistoryFingerprint(present) === fingerprint) return;
    const history = historyRef.current ?? createCanvasHistory(present, limit);
    historyRef.current = commitCanvasHistory(history, snapshot);
    presentRef.current = cloneCanvasHistorySnapshot(snapshot);
    setRevision((value) => value + 1);
  }, [limit, snapshot]);

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
    const history = historyRef.current;
    if (!history || history.past.length === 0) return;
    const next = undoCanvasHistory(history);
    historyRef.current = next;
    apply(next.present);
    setRevision((value) => value + 1);
  }, [apply]);

  const redo = useCallback((): void => {
    const history = historyRef.current;
    if (!history || history.future.length === 0) return;
    const next = redoCanvasHistory(history);
    historyRef.current = next;
    apply(next.present);
    setRevision((value) => value + 1);
  }, [apply]);

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
    canUndo: Boolean(historyRef.current?.past.length),
    canRedo: Boolean(historyRef.current?.future.length),
    undo,
    redo,
    handleKeyDown,
  };
}
