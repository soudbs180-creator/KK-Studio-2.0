import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";
import { swapReferenceFrames } from "./canvasReferences";

export function useCanvasReferenceFrames(
  edges: CanvasConnection[],
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>,
) {
  return useCallback(
    (firstReferenceId: string, lastReferenceId: string) => {
      onItemsChange((current) =>
        swapReferenceFrames(current, edges, firstReferenceId, lastReferenceId),
      );
    },
    [edges, onItemsChange],
  );
}
