import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  SetStateAction,
} from "react";
import type { CanvasConnection } from "../../domain/canvasGraph.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { reconcileCanvasConnections } from "../../domain/canvasConnections.ts";
import { reconcileProjectCanvas } from "../../domain/projectCanvas.ts";
import {
  canvasHistoryFingerprint,
  cloneCanvasHistorySnapshot,
  commitCanvasHistory,
  createCanvasHistory,
  redoCanvasHistory,
  settleCanvasHistoryGeneration,
  settleCanvasGenerationItems,
  undoCanvasHistory,
  type CanvasHistorySnapshot,
  type CanvasHistoryState,
} from "../../domain/canvasHistory.ts";
import type { Point, ViewTransform } from "../../domain/canvasViewport.ts";
import { parseSettings, SETTINGS_STORAGE_KEY } from "../../domain/settings.ts";
import type { CanvasGroup } from "../../domain/projectCanvas.ts";

export function clampHistoryLimit(val: unknown): number {
  if (val === null || val === undefined || val === "") return 20;
  const num = typeof val === "number" ? val : Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return 20;
  return Math.min(100, Math.max(5, Math.floor(num)));
}

export function truncateCanvasHistoryPast(
  history: CanvasHistoryState,
  limit: number,
): CanvasHistoryState {
  const clampedLimit = clampHistoryLimit(limit);
  return {
    ...history,
    limit: clampedLimit,
    past:
      history.past.length > clampedLimit
        ? history.past.slice(-clampedLimit)
        : history.past,
    future:
      history.future.length > clampedLimit
        ? history.future.slice(0, clampedLimit)
        : history.future,
  };
}

export function getEffectiveLimit(customLimit?: number): number {
  if (typeof customLimit === "number" && customLimit > 0) {
    return clampHistoryLimit(customLimit);
  }
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SETTINGS_STORAGE_KEY)
        : null;
    return clampHistoryLimit(parseSettings(raw).preferences.historyLimit ?? 20);
  } catch {
    // health: allow EMPTY_CATCH -- localStorage 在受限沙箱不可读时回退默认步数 20
    return 20;
  }
}

interface CanvasHistoryOptions {
  groups?: CanvasGroup[];
  setGroups?: Dispatch<SetStateAction<CanvasGroup[]>>;
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

function extractIncomingHistoryLimit(detail: unknown): unknown {
  if (typeof detail === "number") return detail;
  if (!detail || typeof detail !== "object") return undefined;
  const record = detail as {
    historyLimit?: unknown;
    preferences?: { historyLimit?: unknown };
  };
  return record.historyLimit ?? record.preferences?.historyLimit;
}

function reconcileSnapshotIntoRefs(params: {
  snapshot: CanvasHistorySnapshot;
  limit: number;
  gestureActive: boolean;
  automaticViewport?: { readonly current: ViewTransform | null };
  presentRef: MutableRefObject<CanvasHistorySnapshot | null>;
  historyRef: MutableRefObject<CanvasHistoryState | null>;
  applyingFingerprint: MutableRefObject<string | null>;
  bumpRevision: () => void;
}): void {
  const {
    snapshot,
    limit,
    gestureActive,
    automaticViewport,
    presentRef,
    historyRef,
    applyingFingerprint,
    bumpRevision,
  } = params;
  const present = presentRef.current;
  if (present && gestureActive && !applyingFingerprint.current) return;
  const fingerprint = canvasHistoryFingerprint(snapshot);
  if (!present) {
    presentRef.current = cloneCanvasHistorySnapshot(snapshot);
    historyRef.current = createCanvasHistory(snapshot, limit);
    bumpRevision();
    return;
  }
  if (applyingFingerprint.current) {
    if (applyingFingerprint.current === fingerprint) {
      applyingFingerprint.current = null;
      presentRef.current = cloneCanvasHistorySnapshot(snapshot);
      bumpRevision();
    }
    return;
  }
  const history = historyRef.current ?? createCanvasHistory(present, limit);
  history.limit = limit;
  if (canvasHistoryFingerprint(present) === fingerprint) {
    historyRef.current = commitCanvasHistory(history, snapshot);
    presentRef.current = cloneCanvasHistorySnapshot(snapshot);
    return;
  }
  if (
    automaticViewport?.current === snapshot.viewport &&
    canvasHistoryFingerprint({ ...snapshot, viewport: present.viewport }) ===
      canvasHistoryFingerprint(present)
  ) {
    historyRef.current = {
      ...commitCanvasHistory(history, {
        ...snapshot,
        viewport: present.viewport,
      }),
      present: cloneCanvasHistorySnapshot(snapshot),
    };
    presentRef.current = cloneCanvasHistorySnapshot(snapshot);
    bumpRevision();
    return;
  }
  historyRef.current = commitCanvasHistory(history, snapshot);
  presentRef.current = cloneCanvasHistorySnapshot(snapshot);
  bumpRevision();
}

export function useCanvasHistory({
  groups,
  setGroups,
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
  limit: customLimit,
}: CanvasHistoryOptions) {
  const [limit, setLimit] = useState(() => getEffectiveLimit(customLimit));
  const [, setRevision] = useState(0);
  const historyRef = useRef<CanvasHistoryState | null>(null);
  const presentRef = useRef<CanvasHistorySnapshot | null>(null);
  const applyingFingerprint = useRef<string | null>(null);
  const bumpRevision = useCallback(() => setRevision((value) => value + 1), []);

  const updateHistoryLimit = useCallback(
    (rawLimit: unknown) => {
      const nextLimit = clampHistoryLimit(rawLimit);
      setLimit(nextLimit);
      if (historyRef.current) {
        historyRef.current = truncateCanvasHistoryPast(
          historyRef.current,
          nextLimit,
        );
      }
      bumpRevision();
    },
    [bumpRevision],
  );

  useEffect(() => {
    if (typeof customLimit === "number" && customLimit > 0) {
      updateHistoryLimit(customLimit);
    }
  }, [customLimit, updateHistoryLimit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSettingsChanged = (event: Event) => {
      const incomingLimit = extractIncomingHistoryLimit(
        (event as CustomEvent).detail,
      );
      if (incomingLimit !== undefined) {
        updateHistoryLimit(incomingLimit);
      }
    };
    window.addEventListener("kk:settings-changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("kk:settings-changed", handleSettingsChanged);
    };
  }, [updateHistoryLimit]);

  useEffect(() => {
    if (presentRef.current && gestureActive && !applyingFingerprint.current)
      return;
    const snapshot = {
      ...snapshotOf(items, positions, edges, viewport),
      groups,
    };
    reconcileSnapshotIntoRefs({
      snapshot,
      limit,
      gestureActive,
      automaticViewport,
      presentRef,
      historyRef,
      applyingFingerprint,
      bumpRevision,
    });
  }, [
    automaticViewport,
    bumpRevision,
    groups,
    edges,
    gestureActive,
    items,
    limit,
    positions,
    viewport,
  ]);

  const apply = useCallback(
    (next: CanvasHistorySnapshot): void => {
      applyingFingerprint.current = canvasHistoryFingerprint(next);
      onItemsChange(structuredClone(next.items));
      setPositions({ ...next.positions });
      setEdges(next.edges.map((edge) => ({ ...edge })));
      setViewport({ ...next.viewport });
      setGroups?.(structuredClone(next.groups ?? []));
      setSelectedNode?.((current) =>
        current && next.items.some((item) => item.id === current)
          ? current
          : null,
      );
    },
    [
      onItemsChange,
      setEdges,
      setPositions,
      setSelectedNode,
      setViewport,
      setGroups,
    ],
  );

  const settleLocalGeneration = useCallback(
    (terminal: CanvasCollectionItem[]): void => {
      onItemsChange((current) =>
        settleCanvasGenerationItems(current, terminal),
      );
      const history = historyRef.current;
      if (!history) return;
      const next = settleCanvasHistoryGeneration(history, terminal);
      historyRef.current = next;
      presentRef.current = cloneCanvasHistorySnapshot(next.present);
      if (applyingFingerprint.current)
        applyingFingerprint.current = canvasHistoryFingerprint(next.present);
      bumpRevision();
    },
    [bumpRevision, onItemsChange],
  );

  const undo = useCallback((): void => {
    if (gestureActive) return;
    const history = historyRef.current;
    if (!history || history.past.length === 0) return;
    const next = undoCanvasHistory(history);
    historyRef.current = next;
    apply(next.present);
    bumpRevision();
  }, [apply, bumpRevision, gestureActive]);

  const redo = useCallback((): void => {
    if (gestureActive) return;
    const history = historyRef.current;
    if (!history || history.future.length === 0) return;
    const next = redoCanvasHistory(history);
    historyRef.current = next;
    apply(next.present);
    bumpRevision();
  }, [apply, bumpRevision, gestureActive]);

  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUndo = () => undoRef.current();
    const handleRedo = () => redoRef.current();
    window.addEventListener("kk:canvas-undo", handleUndo);
    window.addEventListener("kk:canvas-redo", handleRedo);
    return () => {
      window.removeEventListener("kk:canvas-undo", handleUndo);
      window.removeEventListener("kk:canvas-redo", handleRedo);
    };
  }, []);

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
    settleLocalGeneration,
  };
}
