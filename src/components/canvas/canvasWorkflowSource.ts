import { useEffect } from "react";
import {
  comfyOutputSourceId,
  type CanvasCollectionItem,
} from "../../domain/canvasItems.ts";

export function useCanvasWorkflowSourceFocus(
  locateNode: (id: string) => void,
): void {
  useEffect(() => {
    const locate = (event: Event): void =>
      locateNode((event as CustomEvent<string>).detail);
    window.addEventListener("kk:focus-node", locate);
    return () => window.removeEventListener("kk:focus-node", locate);
  }, [locateNode]);
}

export function resolveWorkflowSource(
  item: CanvasCollectionItem,
  items: readonly CanvasCollectionItem[],
): CanvasCollectionItem | undefined {
  if (item.kind !== "image") return undefined;
  const sourceId = item.comfyWorkflowSourceId ?? comfyOutputSourceId(item);
  return sourceId
    ? items.find((candidate) => candidate.id === sourceId)
    : undefined;
}
