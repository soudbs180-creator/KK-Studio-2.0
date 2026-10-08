import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { getImageSelectionPosition } from "./imageSelectionPosition";

type Position = ReturnType<typeof getImageSelectionPosition>;

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
    revealDelta: 0,
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
        const next = getImageSelectionPosition(element, canvas, toolbar);
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
