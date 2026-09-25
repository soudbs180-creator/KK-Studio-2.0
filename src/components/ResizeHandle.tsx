import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
  defaultWidth,
  growDir,
  label,
}: {
  cssVar: string;
  min: number;
  max: number;
  defaultWidth: number;
  growDir: "left" | "right";
  label: string;
}) {
  const state = useRef<{ startX: number; startWidth: number } | null>(null);
  const handle = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(min);
  const [reachableMax, setReachableMax] = useState(max);

  const allowedMax = useCallback(() => {
    const other = document.querySelector<HTMLElement>(
      growDir === "right" ? ".conversation-panel" : ".sidebar",
    );
    const otherWidth =
      other && other.getClientRects().length
        ? other.getBoundingClientRect().width
        : 0;
    return Math.max(min, Math.min(max, window.innerWidth - otherWidth - 440));
  }, [growDir, min, max]);

  const applyWidth = useCallback(
    (requested: number) => {
      const currentMax = allowedMax();
      const next = Math.round(Math.min(currentMax, Math.max(min, requested)));
      document.documentElement.style.setProperty(cssVar, `${next}px`);
      setWidth(next);
      setReachableMax(currentMax);
    },
    [allowedMax, cssVar, min],
  );

  useLayoutEffect(() => {
    const panel = handle.current?.parentElement;
    if (panel) setWidth(Math.round(panel.getBoundingClientRect().width));
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const current =
        event.currentTarget.parentElement?.getBoundingClientRect().width ?? min;
      state.current = { startX: event.clientX, startWidth: current || min };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
    },
    [min],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!state.current) return;
      const dx = event.clientX - state.current.startX;
      applyWidth(state.current.startWidth + (growDir === "right" ? dx : -dx));
    },
    [applyWidth, growDir],
  );

  const end = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!state.current) return;
    state.current = null;
    event.currentTarget.classList.remove("is-dragging");
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    const onResize = () => {
      setReachableMax(allowedMax());
      const stored = parseFloat(
        document.documentElement.style.getPropertyValue(cssVar),
      );
      if (Number.isFinite(stored)) applyWidth(stored);
      else if (handle.current?.parentElement)
        setWidth(
          Math.round(
            handle.current.parentElement.getBoundingClientRect().width,
          ),
        );
    };
    const other = document.querySelector<HTMLElement>(
      growDir === "right" ? ".conversation-panel" : ".sidebar",
    );
    const observer = new ResizeObserver(onResize);
    if (other) observer.observe(other);
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      document.body.style.cursor = "";
    };
  }, [allowedMax, applyWidth, cssVar, growDir]);

  return (
    <div
      ref={handle}
      className="resize-handle"
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={reachableMax}
      aria-valuenow={width}
      aria-keyshortcuts="Shift+Home"
      title="按 Shift+Home 恢复默认宽度"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Home" && event.shiftKey) applyWidth(defaultWidth);
        else if (event.key === "Home") applyWidth(min);
        else if (event.key === "End") applyWidth(allowedMax());
        else {
          const direction = event.key === "ArrowRight" ? 1 : -1;
          applyWidth(
            width + (growDir === "right" ? direction : -direction) * 16,
          );
        }
      }}
    />
  );
}

export function SidebarResizeHandle() {
  return (
    <ResizeHandle
      cssVar="--sidebar-width-user"
      min={220}
      max={480}
      defaultWidth={291}
      growDir="right"
      label="调整侧栏宽度"
    />
  );
}

export function ConversationResizeHandle() {
  return (
    <ResizeHandle
      cssVar="--conversation-width-user"
      min={470}
      max={760}
      defaultWidth={470}
      growDir="left"
      label="调整对话面板宽度"
    />
  );
}
