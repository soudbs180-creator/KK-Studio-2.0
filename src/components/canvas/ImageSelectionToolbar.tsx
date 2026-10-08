import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { surfaceScale } from "./canvasSurface";

type Position = {
  left: number;
  top: number;
  maxWidth: number;
  visible: boolean;
};

/** A screen-sized selection surface outside the transformed canvas stage. */
export default function ImageSelectionToolbar({
  anchor,
  selected,
  title,
  children,
}: {
  anchor: RefObject<HTMLElement>;
  selected: boolean;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({
    left: 0,
    top: 0,
    maxWidth: 0,
    visible: false,
  });
  useLayoutEffect(() => {
    if (!selected) return;
    let frame: number;
    let previous: Position | undefined;
    const measure = (): void => {
      const element = anchor.current;
      const canvas = element?.closest<HTMLElement>(".canvas");
      const toolbar = ref.current;
      if (element && canvas && toolbar) {
        const card = element.getBoundingClientRect();
        const caption = element.parentElement
          ?.querySelector(".image-caption")
          ?.getBoundingClientRect();
        const bounds = canvas.getBoundingClientRect();
        const scale = surfaceScale(canvas);
        const gap = parseFloat(
          getComputedStyle(toolbar).getPropertyValue("--kk-space-2"),
        );
        const usableWidth =
          parseFloat(canvas.style.getPropertyValue("--canvas-usable-width")) *
          scale;
        const leftEdge = Math.max(0, bounds.left) + gap;
        const rightEdge =
          Math.min(window.innerWidth, bounds.right, bounds.left + usableWidth) -
          gap;
        const top =
          Math.min(card.top, caption?.top ?? card.top) -
          toolbar.offsetHeight -
          gap;
        let slots: Array<[number, number]> = [[leftEdge, rightEdge]];
        for (const hud of [
          ...canvas.querySelectorAll<HTMLElement>(
            ".canvas-hud-actions,.canvas-top-right,.canvas-minimap",
          ),
        ]) {
          const box = hud.getBoundingClientRect();
          if (
            box.width > 0 &&
            box.height > 0 &&
            getComputedStyle(hud).visibility !== "hidden" &&
            top < box.bottom + gap &&
            top + toolbar.offsetHeight > box.top - gap
          ) {
            slots = slots.flatMap(([start, end]) => {
              if (box.right + gap <= start || box.left - gap >= end)
                return [[start, end]];
              const remaining: Array<[number, number]> = [];
              if (box.left - gap > start)
                remaining.push([start, box.left - gap]);
              if (box.right + gap < end) remaining.push([box.right + gap, end]);
              return remaining;
            });
          }
        }
        const center = card.left + card.width / 2;
        const minimumWidth =
          (toolbar.querySelector("button")?.getBoundingClientRect().width ??
            0) +
          gap * 2;
        const slot = slots
          .filter(([start, end]) => end - start >= minimumWidth)
          .sort(
            (a, b) =>
              Math.abs(Math.max(a[0], Math.min(center, a[1])) - center) -
              Math.abs(Math.max(b[0], Math.min(center, b[1])) - center),
          )[0];
        const maxWidth = slot ? slot[1] - slot[0] : 0;
        const width = Math.min(toolbar.scrollWidth, maxWidth);
        const left = slot
          ? Math.max(slot[0], Math.min(center - width / 2, slot[1] - width))
          : leftEdge;
        const next = {
          left,
          top,
          maxWidth,
          // Never float an action over the image when its top has left the viewport.
          visible:
            !canvas.closest("[inert]") &&
            maxWidth > 0 &&
            top >= bounds.top + gap &&
            card.bottom > bounds.top &&
            card.top < bounds.bottom &&
            card.right > leftEdge &&
            card.left < rightEdge,
        };
        if (
          !previous ||
          Object.keys(next).some(
            (key) =>
              next[key as keyof Position] !== previous?.[key as keyof Position],
          )
        ) {
          previous = next;
          setPosition(next);
        }
      }
      // CSS transforms do not trigger ResizeObserver. Track the one selected
      // image while panning, dragging, zooming or resizing; stop on deselection.
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [anchor, selected]);
  if (!selected) return null;
  return createPortal(
    <div
      ref={ref}
      className="image-selection-toolbar"
      role="toolbar"
      aria-label={`图片操作：${title}`}
      aria-orientation="horizontal"
      style={{
        left: position.left,
        top: position.top,
        maxWidth: position.maxWidth,
        visibility: position.visible ? "visible" : "hidden",
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (
          event.nativeEvent.isComposing ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        let next: number | undefined;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        if (event.key === "ArrowLeft")
          next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          event.stopPropagation();
          buttons[next]?.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
