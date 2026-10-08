import { useEffect, useRef, type RefObject } from "react";
import type { MaskDocument } from "./mask.ts";
import { context2d } from "./imageProcessing.ts";
import { drawMaskAnnotation } from "./maskAnnotation.ts";
export default function ImageCanvasLayers({
  document,
  original,
  scratch,
  ready,
  title,
  view,
}: {
  document: MaskDocument;
  original: RefObject<HTMLCanvasElement | undefined>;
  scratch: RefObject<HTMLCanvasElement>;
  ready: boolean;
  title: string;
  view: { x: number; y: number; scale: number };
}) {
  const base = useRef<HTMLCanvasElement>(null),
    annotation = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ready && base.current && original.current)
      context2d(base.current).drawImage(original.current, 0, 0);
  }, [ready, document.width, document.height]);
  useEffect(() => {
    const canvas = annotation.current;
    if (!canvas) return;
    const ctx = context2d(canvas);
    ctx.clearRect(0, 0, document.width, document.height);
    drawMaskAnnotation(ctx, document, view.scale);
  }, [document, view.scale]);
  return (
    <div
      className="image-edit-layers"
      style={{
        width: document.width,
        height: document.height,
        transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
      }}
    >
      {[base, annotation, scratch].map((ref, i) => (
        <canvas
          key={i}
          ref={ref}
          width={document.width}
          height={document.height}
          className={
            i === 0
              ? "image-original"
              : i === 2
                ? "image-mask image-scratch"
                : "image-mask"
          }
          aria-label={i === 0 ? title : undefined}
        />
      ))}
    </div>
  );
}
