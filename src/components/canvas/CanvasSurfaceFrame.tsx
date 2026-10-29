import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import type { useCanvasControls } from "./useCanvasControls";
import {
  canvasPatternDotSize,
  canvasPatternGridLine,
  canvasPatternOpacity,
  canvasPatternPitch,
} from "../../domain/canvasViewport";

export default function CanvasSurface({
  controls,
  covered,
  chatOpen,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  controls: ReturnType<typeof useCanvasControls>;
  covered: boolean;
  chatOpen: boolean;
}) {
  const { containerRef, preferences, dragging, transform, zoomCanvas } =
    controls;
  return (
    <div
      {...props}
      ref={containerRef}
      {...(covered ? { inert: "" } : {})}
      className={`canvas infinite-canvas ${chatOpen ? "has-chat" : ""} ${dragging === "pan" ? "is-panning" : ""} canvas-pattern-${preferences.backgroundPattern}`}
      data-testid="infinite-canvas"
      data-tool={controls.tool}
      data-space-pan={controls.spaceHeld}
      role="region"
      aria-label="无限画布"
      tabIndex={0}
      onWheel={zoomCanvas}
      style={
        {
          "--canvas-usable-width": `${controls.viewport.width}px`,
          backgroundColor: preferences.backgroundColor,
          backgroundSize: `${canvasPatternPitch(transform.scale)}px ${canvasPatternPitch(transform.scale)}px`,
          "--canvas-pan-x": `${transform.x}px`,
          "--canvas-pan-y": `${transform.y}px`,
          "--canvas-dot-cell": `${canvasPatternPitch(transform.scale)}px`,
          "--canvas-pattern-opacity": canvasPatternOpacity(transform.scale),
          "--canvas-dot-size": `${canvasPatternDotSize(transform.scale)}px`,
          "--canvas-grid-line": `${canvasPatternGridLine(transform.scale)}px`,
        } as CSSProperties
      }
    />
  );
}
