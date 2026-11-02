import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

export interface SlidingPillIndicatorProps {
  activeRect?: DOMRect | null;
  containerRef?: RefObject<HTMLElement | null>;
  activeKey?: string;
  variant?: "pill" | "line";
  className?: string;
  style?: CSSProperties;
}

export function useSlidingPill(
  activeKey: string | undefined,
  containerRef: RefObject<HTMLElement | null>,
  variant: "pill" | "line" = "pill",
  activeRect?: DOMRect | null,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      const key = activeKey ? CSS.escape(activeKey) : "";
      const target =
        (key &&
          container.querySelector<HTMLElement>(
            `[data-key="${key}"], [data-tab="${key}"], [data-value="${key}"]`,
          )) ||
        container.querySelector<HTMLElement>(
          '[aria-selected="true"], .is-active, [aria-current="page"]',
        );
      const rect =
        activeRect ?? (target ? target.getBoundingClientRect() : null);
      if (!rect) {
        setStyle({ opacity: 0 });
        return;
      }
      const bounds = container.getBoundingClientRect();
      const line = variant === "line";
      const x =
        rect.left -
        bounds.left +
        container.scrollLeft -
        container.clientLeft +
        (line ? (rect.width - 24) / 2 : 0);
      const y =
        rect.top -
        bounds.top +
        container.scrollTop -
        container.clientTop +
        (line ? rect.height - 3 : 0);
      setStyle({
        opacity: 1,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: line ? 24 : rect.width,
        height: line ? 2 : rect.height,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    for (const child of container.querySelectorAll<HTMLElement>("[role='tab']"))
      observer.observe(child);
    void document.fonts.ready.then(update);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [activeKey, activeRect, containerRef, variant]);

  return style;
}

export function SlidingPillIndicator({
  activeRect,
  containerRef,
  activeKey,
  variant = "pill",
  className = "",
  style,
}: SlidingPillIndicatorProps) {
  const fallbackRef = useRef<HTMLElement>(null);
  const computedStyle = useSlidingPill(
    activeKey,
    containerRef ?? fallbackRef,
    variant,
    activeRect,
  );
  return (
    <div
      aria-hidden="true"
      data-testid="sliding-pill-indicator"
      className={`${variant === "line" ? "sliding-line-indicator" : "sliding-pill-indicator"} ${className}`.trim()}
      style={{ ...computedStyle, ...style }}
    />
  );
}
