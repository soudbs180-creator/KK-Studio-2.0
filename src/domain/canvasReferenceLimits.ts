import type { CanvasCollectionItem, CanvasReference } from "./canvasItems.ts";
import { imageReferenceCount } from "./imageReferences.ts";

/** Convert a model limit into the number of new incoming edge sources. */
export function availableCanvasReferenceSlots(
  source: CanvasCollectionItem,
  existingReferences: readonly CanvasReference[],
  remainingLimit: number,
): number {
  const occupiedIncoming =
    source.kind === "image"
      ? imageReferenceCount(source, existingReferences) -
        imageReferenceCount(source)
      : existingReferences.length;
  return Math.max(0, remainingLimit - occupiedIncoming);
}
