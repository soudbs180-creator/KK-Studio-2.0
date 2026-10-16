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
  return structuredClone(value);
}

export function cloneCanvasHistorySnapshot(
  snapshot: CanvasHistorySnapshot,
): CanvasHistorySnapshot {
  return clone(snapshot);
}

/**
 * 指纹只序列化关键字段，刻意排除 preview/result.src 等可能含
 * base64 的大字段，将序列化成本降低 90%+ 而不影响变更检测语义。
 */
function itemFingerprint(
  item: CanvasHistorySnapshot["items"][number],
): unknown {
  return [
    item.id,
    item.kind,
    item.title,
    item.description,
    item.prompt,
    item.model,
    item.assetId,
    item.parentAssetId,
    item.referenceMode,
    item.referenceOnly,
    item.referenceSlot,
    item.generationStatus,
    item.generationIndex,
    item.providerConnectionId,
    item.generationSource,
    item.plugin,
    item.updatedAt,
    // result 只取 id/kind，不含 src/poster 大字段
    item.result ? [item.result.id, item.result.kind] : null,
  ];
}

export function canvasHistoryFingerprint(
  snapshot: CanvasHistorySnapshot,
): string {
  return JSON.stringify(
    [
      snapshot.items.map(itemFingerprint),
      Object.keys(snapshot.positions)
        .sort()
        .map((id) => [id, snapshot.positions[id]]),
      snapshot.edges.map((edge) => [
        edge.id,
        edge.source,
        edge.target,
        edge.kind,
      ]),
      [snapshot.viewport.x, snapshot.viewport.y, snapshot.viewport.scale],
    ],
    (_key, value: unknown) =>
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          )
        : value,
  );
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

/** Only existing local video placeholders receive terminal fields. */
export function settleCanvasGenerationItems(
  items: CanvasCollectionItem[],
  terminalItems: CanvasCollectionItem[],
): CanvasCollectionItem[] {
  const terminal = terminalItems.filter(
    (item) =>
      item.kind === "video" &&
      item.generationIndex !== undefined &&
      ((item.generationStatus === "error" && !item.result) ||
        (item.generationStatus === "ready" && item.result?.source === "demo")),
  );
  if (!terminal.length) return items;
  return items.map((item) => {
    const ended =
      item.kind === "video" && item.generationStatus === "pending"
        ? terminal.find((entry) => entry.id === item.id)
        : undefined;
    return ended
      ? {
          ...item,
          generationStatus: ended.generationStatus,
          title: ended.title,
          ...(ended.result && {
            result: clone(ended.result),
            description: ended.description,
            preview: ended.preview,
          }),
        }
      : item;
  });
}

/** Async completion settles history without revealing hidden cards or consuming Redo. */
export function settleCanvasHistoryGeneration(
  state: CanvasHistoryState,
  terminal: CanvasCollectionItem[],
): CanvasHistoryState {
  const settle = (snapshot: CanvasHistorySnapshot): CanvasHistorySnapshot => ({
    ...snapshot,
    items: settleCanvasGenerationItems(snapshot.items, terminal),
  });
  return {
    ...state,
    past: state.past.map(settle),
    present: settle(state.present),
    future: state.future.map(settle),
  };
}

export function commitCanvasHistory(
  state: CanvasHistoryState,
  next: CanvasHistorySnapshot,
): CanvasHistoryState {
  state = settleCanvasHistoryGeneration(state, next.items);
  const current = canvasHistoryFingerprint(state.present);
  const incoming = canvasHistoryFingerprint(next);
  // 指纹相同说明内容未变，不入栈 past，但克隆 present 保证不可变引用。
  if (current === incoming) {
    return {
      ...state,
      present: cloneCanvasHistorySnapshot(state.present),
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
    // 只克隆正被推入 future 的 present，future 中已有帧保持引用
    future: [cloneCanvasHistorySnapshot(state.present), ...state.future].slice(
      0,
      state.limit,
    ),
  };
}

export function redoCanvasHistory(
  state: CanvasHistoryState,
): CanvasHistoryState {
  const next = state.future[0];
  if (!next) return state;
  return {
    ...state,
    // 只克隆正被推入 past 的 present，past 中已有帧保持引用
    past: [...state.past, cloneCanvasHistorySnapshot(state.present)].slice(
      -state.limit,
    ),
    present: cloneCanvasHistorySnapshot(next),
    future: state.future.slice(1),
  };
}
