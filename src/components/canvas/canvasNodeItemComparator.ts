import type { Dispatch, SetStateAction } from "react";
import type {
  CanvasCollectionItem,
  CanvasReference,
  DemoResult,
  NodeEditingProps,
} from "../../domain/canvasItems.ts";
import type { CanvasConnection } from "../../domain/canvasGraph.ts";
import type { useCanvasControls } from "./useCanvasControls.ts";
import type { useCanvasAddMenu } from "./useCanvasAddMenu.ts";

export type GenerationPhase = Parameters<
  NonNullable<NodeEditingProps["onGenerationState"]>
>[0];

export interface CanvasNodeItemProps {
  item: CanvasCollectionItem;
  controls: ReturnType<typeof useCanvasControls>;
  addMenu: ReturnType<typeof useCanvasAddMenu>;
  liked: boolean;
  connectionTarget: boolean;
  onConnect: (
    source: string,
    target: string,
    kind?: CanvasConnection["kind"],
  ) => void;
  onConnectionTargetChange: (sourceId: string, targetId: string | null) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
  onConfigure: () => void;
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  references: CanvasReference[];
  onDemoResults: (id: string, results: DemoResult[]) => void;
  onGenerationStart: (id: string, count: number) => void;
  onAddReferences: (id: string, references: CanvasReference[]) => void;
  onRemoveReference: (id: string) => void;
  onSwapReferenceFrames?: (firstId: string, lastId: string) => void;
  onGenerationState: (id: string, phase: GenerationPhase) => void;
  activeLocalResultIds?: readonly string[];
}

export const HANDLER_KEYS = [
  "onConnect",
  "onConnectionTargetChange",
  "onDelete",
  "onToggleLike",
  "onConfigure",
  "onItemsChange",
  "onDemoResults",
  "onGenerationStart",
  "onAddReferences",
  "onRemoveReference",
  "onSwapReferenceFrames",
  "onGenerationState",
] as const;

export function areSingleReferencesEqual(
  a: CanvasReference,
  b: CanvasReference,
): boolean {
  return (
    a.id === b.id &&
    a.assetId === b.assetId &&
    a.parentAssetId === b.parentAssetId &&
    a.title === b.title &&
    a.preview === b.preview &&
    a.kind === b.kind &&
    a.frame === b.frame &&
    a.slot === b.slot
  );
}

export function areReferencesEqual(
  prev?: readonly CanvasReference[],
  next?: readonly CanvasReference[],
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (!areSingleReferencesEqual(prev[i], next[i])) return false;
  }
  return true;
}

export function areNodeDataEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  if (prev.item !== next.item) return false;
  if (prev.liked !== next.liked) return false;
  if (prev.connectionTarget !== next.connectionTarget) return false;
  if (!areReferencesEqual(prev.references, next.references)) return false;
  return true;
}

export function areGenerationStatesEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  const id = prev.item.id;
  const prevActive = Boolean(prev.activeLocalResultIds?.includes(id));
  const nextActive = Boolean(next.activeLocalResultIds?.includes(id));
  return prevActive === nextActive;
}

export function areSelectionAndMenuEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  const id = prev.item.id;
  const prevMenuOpen = prev.addMenu?.menu?.parentId === id;
  const nextMenuOpen = next.addMenu?.menu?.parentId === id;
  if (prevMenuOpen !== nextMenuOpen) return false;

  const prevSelected = prev.controls?.selectedNode === id;
  const nextSelected = next.controls?.selectedNode === id;
  if (prevSelected !== nextSelected) return false;

  const prevMulti = Boolean(prev.controls?.selectedIds?.has(id));
  const nextMulti = Boolean(next.controls?.selectedIds?.has(id));
  return prevMulti === nextMulti;
}

export function areDragStatesEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  const id = prev.item.id;
  const prevDragging =
    prev.controls?.dragging === "node" &&
    prev.controls?.dragRef?.current?.nodeId === id;
  const nextDragging =
    next.controls?.dragging === "node" &&
    next.controls?.dragRef?.current?.nodeId === id;
  return prevDragging === nextDragging;
}

export function areGeometryAndPositionEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  const id = prev.item.id;
  const prevPos = prev.controls?.nodes?.[id];
  const nextPos = next.controls?.nodes?.[id];
  if (prevPos !== nextPos) {
    if (!prevPos || !nextPos) return false;
    if (prevPos.x !== nextPos.x || prevPos.y !== nextPos.y) return false;
  }

  if (
    prev.item?.plugin &&
    prev.controls?.transform?.scale !== next.controls?.transform?.scale
  ) {
    return false;
  }

  return true;
}

export function areHandlersEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  for (const key of HANDLER_KEYS) {
    if (prev[key] !== next[key]) return false;
  }
  return true;
}

export function arePropsEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  if (!areNodeDataEqual(prev, next)) return false;
  if (!areGenerationStatesEqual(prev, next)) return false;
  if (!areSelectionAndMenuEqual(prev, next)) return false;
  if (!areDragStatesEqual(prev, next)) return false;
  if (!areGeometryAndPositionEqual(prev, next)) return false;
  if (!areHandlersEqual(prev, next)) return false;
  return true;
}
