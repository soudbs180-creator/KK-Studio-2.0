import React, {
  useLayoutEffect,
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
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    opacity: 0,
    pointerEvents: "none",
  });

  useLayoutEffect(() => {
    if (!containerRef.current) {
      setStyle({ opacity: 0, pointerEvents: "none" });
      return;
    }

    const container = containerRef.current;
    let targetEl: HTMLElement | null = null;

    if (activeKey) {
      targetEl =
        container.querySelector<HTMLElement>(`[data-key="${activeKey}"]`) ||
        container.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`) ||
        container.querySelector<HTMLElement>(`[data-value="${activeKey}"]`);
    }

    if (!targetEl) {
      targetEl =
        container.querySelector<HTMLElement>(".is-active") ||
        container.querySelector<HTMLElement>('[aria-selected="true"]') ||
        container.querySelector<HTMLElement>('[aria-current="page"]');
    }

    if (!targetEl) {
      setStyle({ opacity: 0, pointerEvents: "none" });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = targetEl.getBoundingClientRect();

    const x = activeRect.left - containerRect.left;
    const y = activeRect.top - containerRect.top;
    const width = activeRect.width;
    const height = variant === "line" ? 3 : activeRect.height;
    const top = variant === "line" ? y + activeRect.height - 3 : y;

    setStyle({
      opacity: 1,
      transform: `translate3d(${x}px, ${top}px, 0)`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
    });
  }, [activeKey, containerRef, variant]);

  return style;
}

export function SlidingPillIndicator({
  activeRect,
  containerRef,
  activeKey,
  variant = "pill",
  className = "",
  style: userStyle,
}: SlidingPillIndicatorProps) {
  const [computedStyle, setComputedStyle] = useState<CSSProperties>({
    opacity: 0,
    pointerEvents: "none",
  });

  useLayoutEffect(() => {
    if (!containerRef?.current) {
      setComputedStyle({ opacity: 0, pointerEvents: "none" });
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    let targetRect = activeRect;

    if (!targetRect && activeKey) {
      const targetEl =
        container.querySelector<HTMLElement>(`[data-key="${activeKey}"]`) ||
        container.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`) ||
        container.querySelector<HTMLElement>(`[data-value="${activeKey}"]`) ||
        container.querySelector<HTMLElement>(".is-active") ||
        container.querySelector<HTMLElement>('[aria-selected="true"]');

      if (targetEl) {
        targetRect = targetEl.getBoundingClientRect();
      }
    }

    if (!targetRect) {
      setComputedStyle({ opacity: 0, pointerEvents: "none" });
      return;
    }

    const x = targetRect.left - containerRect.left;
    const y = targetRect.top - containerRect.top;
    const width = targetRect.width;
    const height = variant === "line" ? 3 : targetRect.height;
    const top = variant === "line" ? y + targetRect.height - 3 : y;

    setComputedStyle({
      opacity: 1,
      transform: `translate3d(${x}px, ${top}px, 0)`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
    });
  }, [activeRect, activeKey, containerRef, variant]);

  const baseClass =
    variant === "line" ? "sliding-line-indicator" : "sliding-pill-indicator";

  return (
    <div
      aria-hidden="true"
      data-testid="sliding-pill-indicator"
      className={`${baseClass} ${className}`.trim()}
      style={{
        ...computedStyle,
        ...userStyle,
      }}
    />
  );
}
