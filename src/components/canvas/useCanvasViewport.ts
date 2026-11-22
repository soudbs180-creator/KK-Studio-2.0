import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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
  suspended = false,
): CanvasViewportResult {
  const lastVisible = useRef<CanvasViewport>({ width: 1000, height: 700 });
  const measure = useCallback((): CanvasViewport => {
    if (suspended) return lastVisible.current;
    const canvas = containerRef.current;
    const bounds = canvas?.getBoundingClientRect();
    const chatElement =
      containerRef.current?.parentElement?.querySelector<HTMLElement>(
        ".conversation-panel",
      );
    const chat = chatElement?.getBoundingClientRect();
    const canvasWidth = canvas?.clientWidth ?? 1000;
    const scale = canvas ? surfaceScale(canvas) : 1;
    const chatWidth = chat?.width ? chat.width / scale : 0;
    const availableWidth =
      canvas &&
      bounds &&
      chatElement &&
      chatWidth > 0 &&
      window.innerWidth > 1200
        ? // offsetLeft is stable while the conversation panel slides in. Its
          // animated DOMRect would leave the canvas controls under the panel.
          chatElement.offsetLeft - canvas.offsetLeft - canvas.clientLeft - 16
        : canvasWidth;
    return {
      // Compact chat overlays the content instead of compressing its viewport.
      // Only a desktop dock reserves space; canvas zoom stays independent.
      width: Math.max(160, Math.min(canvasWidth, availableWidth)),
      height: bounds ? bounds.height / scale : (canvas?.clientHeight ?? 700),
    };
  }, [containerRef, suspended]);
  const [viewport, setViewport] = useState(lastVisible.current);
  useLayoutEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;
    const update = (): void => {
      const next = measure();
      // A hidden workspace has no usable area; retain its last visible viewport.
      if (next.width <= 0 || next.height <= 0) return;
      lastVisible.current = next;
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
  }, [containerRef, measure, suspended]);
  return { viewport, measure };
}
