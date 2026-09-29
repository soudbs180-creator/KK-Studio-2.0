import type { CanvasConnection } from "./canvasGraph.ts";
import type { CanvasCollectionItem } from "./canvasItems.ts";
import type { Point, ViewTransform } from "./canvasViewport.ts";

export interface CanvasHistorySnapshot {
  items: CanvasCollectionItem[];
  positions: Record<string, Point>;
  edges: CanvasConnection[];
  viewport: ViewTransform;
}

export interface CanvasHistoryState {
  limit: number;
  past: CanvasHistorySnapshot[];
  present: CanvasHistorySnapshot;
  future: CanvasHistorySnapshot[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneCanvasHistorySnapshot(
  snapshot: CanvasHistorySnapshot,
): CanvasHistorySnapshot {
  return clone(snapshot);
}

export function canvasHistoryFingerprint(
  snapshot: CanvasHistorySnapshot,
): string {
  return JSON.stringify({
    items: snapshot.items.map((item) => [item.id, item]),
    positions: Object.keys(snapshot.positions)
      .sort()
      .map((id) => [id, snapshot.positions[id]]),
    edges: snapshot.edges.map((edge) => [
      edge.id,
      edge.source,
      edge.target,
      edge.kind,
    ]),
    viewport: [
      snapshot.viewport.x,
      snapshot.viewport.y,
      snapshot.viewport.scale,
    ],
  });
}

export function createCanvasHistory(
  initial: CanvasHistorySnapshot,
  limit = 80,
): CanvasHistoryState {
  return {
    limit: Math.max(1, Math.floor(limit)),
    past: [],
    present: cloneCanvasHistorySnapshot(initial),
    future: [],
  };
}

export function commitCanvasHistory(
  state: CanvasHistoryState,
  next: CanvasHistorySnapshot,
): CanvasHistoryState {
  const current = canvasHistoryFingerprint(state.present);
  const incoming = canvasHistoryFingerprint(next);
  if (current === incoming) {
    return {
      ...state,
      past: state.past.map(cloneCanvasHistorySnapshot),
      present: cloneCanvasHistorySnapshot(state.present),
      future: state.future.map(cloneCanvasHistorySnapshot),
    };
  }
  return {
    ...state,
    past: [...state.past, cloneCanvasHistorySnapshot(state.present)].slice(
      -state.limit,
    ),
    present: cloneCanvasHistorySnapshot(next),
    future: [],
  };
}

export function undoCanvasHistory(
  state: CanvasHistoryState,
): CanvasHistoryState {
  const previous = state.past.at(-1);
  if (!previous) return state;
  return {
    ...state,
    past: state.past.slice(0, -1),
    present: cloneCanvasHistorySnapshot(previous),
    future: [
      cloneCanvasHistorySnapshot(state.present),
      ...state.future.map(cloneCanvasHistorySnapshot),
    ].slice(0, state.limit),
  };
}

export function redoCanvasHistory(
  state: CanvasHistoryState,
): CanvasHistoryState {
  const next = state.future[0];
  if (!next) return state;
  return {
    ...state,
    past: [
      ...state.past.map(cloneCanvasHistorySnapshot),
      cloneCanvasHistorySnapshot(state.present),
    ].slice(-state.limit),
    present: cloneCanvasHistorySnapshot(next),
    future: state.future.slice(1).map(cloneCanvasHistorySnapshot),
  };
}
