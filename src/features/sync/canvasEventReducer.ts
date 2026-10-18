import type { CanvasHistorySnapshot } from "../../domain/canvasHistory.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { CanvasConnection } from "../../domain/canvasGraph.ts";
import type { Point, ViewTransform } from "../../domain/canvasViewport.ts";
import type { CanvasEventRecord } from "./eventTypes.ts";

/**
 * Creates an initial blank canvas snapshot for EventBus replay.
 */
export function createBlankCanvasSnapshot(): CanvasHistorySnapshot {
  return {
    items: [],
    positions: {},
    edges: [],
    viewport: { x: 0, y: 0, scale: 1 },
  };
}

/**
 * Pure deterministic reducer that applies a single CanvasEventRecord to a CanvasHistorySnapshot.
 */
export function reduceCanvasEvent(
  state: CanvasHistorySnapshot,
  event: CanvasEventRecord,
): CanvasHistorySnapshot {
  const { eventType, payload, targetNodeId, newRev, createdAt } = event;

  switch (eventType) {
    case "canvas.node.created": {
      const item = (payload.item ?? payload) as CanvasCollectionItem;
      const position = (payload.position ?? { x: 0, y: 0 }) as Point;
      const augmentedItem: CanvasCollectionItem = {
        ...item,
        node_rev: newRev,
      };
      return {
        ...state,
        items: [...state.items.filter((i) => i.id !== item.id), augmentedItem],
        positions: {
          ...state.positions,
          [item.id]: { ...position },
        },
      };
    }

    case "canvas.node.moved": {
      const position = payload.position as Point;
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === targetNodeId
            ? { ...i, node_rev: newRev, updatedAt: createdAt }
            : i,
        ),
        positions: {
          ...state.positions,
          [targetNodeId]: { ...position },
        },
      };
    }

    case "canvas.node.updated": {
      const patch = (payload.patch ?? payload) as Partial<CanvasCollectionItem>;
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === targetNodeId
            ? { ...i, ...patch, node_rev: newRev, updatedAt: createdAt }
            : i,
        ),
      };
    }

    case "canvas.connection.created":
    case "canvas.edge.created": {
      const connection = (payload.connection ?? payload.edge ?? payload) as CanvasConnection;
      return {
        ...state,
        edges: [...state.edges.filter((e) => e.id !== connection.id), connection],
      };
    }

    case "canvas.connection.deleted":
    case "canvas.edge.deleted": {
      const connectionId = (payload.connectionId ?? payload.id) as string;
      return {
        ...state,
        edges: state.edges.filter((e) => e.id !== connectionId),
      };
    }

    case "canvas.node.locked": {
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === targetNodeId
            ? {
                ...i,
                generationStatus: "pending",
                node_rev: newRev,
                updatedAt: createdAt,
              }
            : i,
        ),
      };
    }

    case "canvas.node.unlocked": {
      const result = payload.result as CanvasCollectionItem["result"] | undefined;
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === targetNodeId
            ? {
                ...i,
                generationStatus: "ready",
                result: result ?? i.result,
                node_rev: newRev,
                updatedAt: createdAt,
              }
            : i,
        ),
      };
    }

    case "canvas.node.override":
    case "agent.task.cancelled": {
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === targetNodeId
            ? {
                ...i,
                generationStatus: undefined,
                node_rev: newRev,
                updatedAt: createdAt,
              }
            : i,
        ),
      };
    }

    case "canvas.node.deleted": {
      const remainingItems = state.items.filter((i) => i.id !== targetNodeId);
      const remainingPositions = { ...state.positions };
      delete remainingPositions[targetNodeId];
      const remainingEdges = state.edges.filter(
        (e) => e.source !== targetNodeId && e.target !== targetNodeId,
      );
      return {
        ...state,
        items: remainingItems,
        positions: remainingPositions,
        edges: remainingEdges,
      };
    }

    case "canvas.viewport.changed": {
      const viewport = payload.viewport as ViewTransform;
      return {
        ...state,
        viewport: { ...viewport },
      };
    }

    default:
      return state;
  }
}

/**
 * Replays a sequential stream of CanvasEventRecords from baseline snapshot.
 * Guarantees monotonic ordering by seq if present.
 */
export function reduceCanvasEvents(
  baseline: CanvasHistorySnapshot,
  events: CanvasEventRecord[],
): CanvasHistorySnapshot {
  const sorted = [...events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  return sorted.reduce<CanvasHistorySnapshot>(reduceCanvasEvent, baseline);
}
