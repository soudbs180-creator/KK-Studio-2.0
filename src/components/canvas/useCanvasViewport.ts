import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { surfaceScale } from "./canvasSurface";

interface CanvasViewport {
  width: number;
  height: number;
}

interface CanvasViewportResult {
  viewport: CanvasViewport;
  measure: () => CanvasViewport;
}

export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement>,
): CanvasViewportResult {
  const measure = useCallback((): CanvasViewport => {
    const canvas = containerRef.current;
    const bounds = canvas?.getBoundingClientRect();
    const chat = containerRef.current?.parentElement
      ?.querySelector(".conversation-panel")
      ?.getBoundingClientRect();
    const canvasWidth = canvas?.clientWidth ?? 1000;
    const scale = canvas ? surfaceScale(canvas) : 1;
    const chatWidth = chat?.width ? chat.width / scale : 0;
    const availableWidth =
      canvas && bounds && chat && chatWidth > 0 && window.innerWidth > 1200
        ? (chat.left - bounds.left) / scale - canvas.clientLeft - 16
        : canvasWidth;
    return {
      // Compact chat overlays the content instead of compressing its viewport.
      // Only a desktop dock reserves space; canvas zoom stays independent.
      width: Math.max(160, Math.min(canvasWidth, availableWidth)),
      height: bounds ? bounds.height / scale : (canvas?.clientHeight ?? 700),
    };
  }, [containerRef]);
  const [viewport, setViewport] = useState<CanvasViewport>({
    width: 1000,
    height: 700,
  });
  useLayoutEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;
    const update = (): void => {
      const next = measure();
      // A hidden workspace has no usable area; retain its last visible viewport.
      if (next.width <= 0 || next.height <= 0) return;
      setViewport((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    const chat = canvas.parentElement?.querySelector(".conversation-panel");
    if (chat) observer.observe(chat);
    update();
    return () => observer.disconnect();
  }, [containerRef, measure]);
  return { viewport, measure };
}
