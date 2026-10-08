import type { CanvasCollectionItem } from "./canvasItems.ts";

type Reference = { assetId?: string; kind?: string } | undefined;
type Source = Pick<CanvasCollectionItem, "assetId" | "preview" | "result">;

/** A visible original must be archived before an edit can submit. */
export function hasImageReferenceSource(source?: Source | null): boolean {
  return Boolean(source?.assetId || source?.preview || source?.result);
}

/** Keep malformed/unarchived inputs so the submission reader can reject them. */
export function uniqueImageReferences<T extends Reference>(
  references: readonly T[],
): T[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    if (!reference?.assetId || (reference.kind && reference.kind !== "image"))
      return true;
    if (seen.has(reference.assetId)) return false;
    seen.add(reference.assetId);
    return true;
  });
}

/** Count the same archived original once across self and incoming edges. */
export function imageReferenceCount(
  source?: Source | null,
  incoming: readonly Reference[] = [],
): number {
  return uniqueImageReferences(
    hasImageReferenceSource(source) ? [source!, ...incoming] : incoming,
  ).length;
}
