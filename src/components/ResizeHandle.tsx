import { useCallback, useEffect, useRef } from "react";

/**
 * Edge drag handle that resizes a panel by writing a CSS custom property onto
 * :root. `growDir` controls which pointer direction widens the panel:
 *  - "right": handle on the right edge, drag right grows (sidebar).
 *  - "left":  handle on the left edge, drag left grows (conversation panel).
 */
export default function ResizeHandle({
  cssVar,
  min,
  max,
  growDir,
  label,
}: {
  cssVar: string;
  min: number;
  max: number;
  growDir: "left" | "right";
  label: string;
}) {
  const state = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const el = document.documentElement;
      const current = parseFloat(getComputedStyle(el).getPropertyValue(cssVar));
      state.current = { startX: event.clientX, startWidth: current || min };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
    },
    [cssVar, min],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!state.current) return;
      const dx = event.clientX - state.current.startX;
      const next = Math.min(
        max,
        Math.max(
          min,
          state.current.startWidth + (growDir === "right" ? dx : -dx),
        ),
      );
      document.documentElement.style.setProperty(
        cssVar,
        `${Math.round(next)}px`,
      );
    },
    [cssVar, min, max, growDir],
  );

  const end = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!state.current) return;
    state.current = null;
    event.currentTarget.classList.remove("is-dragging");
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <div
      className="resize-handle"
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
