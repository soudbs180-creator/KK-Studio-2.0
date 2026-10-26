import type { CanvasReference } from "../../domain/canvasItems.ts";

/** Frame roles belong to the video task even when their source is an image. */
export function referenceLayout(references: CanvasReference[], video: boolean) {
  const frame = (role: "first" | "last") =>
    video
      ? references.find(
          (entry) => entry.kind !== "audio" && entry.frame === role,
        )
      : undefined;
  const first = frame("first");
  const last = frame("last");
  const remaining = references.filter(
    (entry) => entry !== first && entry !== last,
  );
  return {
    first,
    last,
    remaining,
  };
}

export function referenceRatio(width: number, height: number): "1:1" | "16:9" {
  return Number.isFinite(width) &&
    Number.isFinite(height) &&
    height > 0 &&
    width > height
    ? "16:9"
    : "1:1";
}

export function referencePreviewPosition(
  anchor: { left: number; top: number; bottom: number; width: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  const above = anchor.top - size.height - 8;
  return {
    left: Math.max(
      8,
      Math.min(
        anchor.left + (anchor.width - size.width) / 2,
        viewport.width - size.width - 8,
      ),
    ),
    top: Math.max(
      8,
      Math.min(
        above >= 8 ? above : anchor.bottom + 8,
        viewport.height - size.height - 8,
      ),
    ),
  };
}
