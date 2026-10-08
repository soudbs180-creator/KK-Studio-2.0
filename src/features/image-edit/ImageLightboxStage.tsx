import { useEffect, useRef } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import ImageCanvasLayers from "./ImageCanvasLayers.tsx";
import { useMaskDocument } from "./useMaskDocument.ts";
import { useImageViewport } from "./useImageViewport.ts";
export default function ImageLightboxStage({
  source,
  onSwitch,
  onDimensions,
}: {
  source: CanvasCollectionItem;
  onSwitch: (delta: number) => void;
  onDimensions: (value: string) => void;
}) {
  const mask = useMaskDocument(source),
    document = { ...mask.document, regions: [] },
    scratch = useRef<HTMLCanvasElement>(null),
    start = useRef<{ x: number; y: number } | null>(null);
  const viewport = useImageViewport({
    width: document.width,
    height: document.height,
    tool: "browse",
    start: () => {},
    move: () => {},
    end: () => {},
    cancel: () => {},
  });
  useEffect(() => {
    if (mask.ready) onDimensions(`${document.width} × ${document.height}`);
  }, [mask.ready, document.width, document.height, onDimensions]);
  return (
    <div
      ref={viewport.ref}
      className="image-edit-viewport"
      role="region"
      aria-label="图片预览画布"
      tabIndex={0}
      {...viewport.handlers}
      onPointerDown={(event) => {
        viewport.handlers.onPointerDown(event);
        start.current =
          event.pointerType === "touch" &&
          !viewport.multiTouch.current &&
          viewport.view.scale <= viewport.fit * 1.05
            ? { x: event.clientX, y: event.clientY }
            : null;
      }}
      onPointerUp={(event) => {
        const first = start.current;
        viewport.handlers.onPointerUp(event);
        start.current = null;
        if (
          first &&
          !viewport.multiTouch.current &&
          Math.abs(event.clientY - first.y) > 60 &&
          Math.abs(event.clientX - first.x) < 40
        ) {
          onSwitch(event.clientY < first.y ? 1 : -1);
          viewport.reset();
        }
      }}
      onDoubleClick={viewport.reset}
    >
      <ImageCanvasLayers
        document={document}
        original={mask.original}
        scratch={scratch}
        ready={mask.ready}
        title={source.title}
        view={viewport.view}
      />
      {mask.error && <p role="alert">{mask.error}</p>}
      <button
        data-ui-overlay
        className="ui-button image-lightbox-reset"
        onClick={viewport.reset}
      >
        复位图片
      </button>
    </div>
  );
}
