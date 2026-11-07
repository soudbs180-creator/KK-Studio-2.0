import type { CanvasItemKind, CanvasReferenceSlot } from "./identity.ts";
export interface CanvasReference {
  id?: string;
  assetId?: string;
  parentAssetId?: string;
  title: string;
  preview?: string;
  /** Media subtype used by compact audio and video reference slots. */
  kind?: CanvasItemKind;
  /** Video references may occupy the first or last frame slot. */
  frame?: "first" | "last";
  /** Semantic slot from the five-slot reference workflow. */
  slot?: CanvasReferenceSlot;
}
