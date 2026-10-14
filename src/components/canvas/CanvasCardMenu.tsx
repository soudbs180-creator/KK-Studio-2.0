import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useDismissible } from "../useDismissible";

export default function CanvasCardMenu({
  title,
  point,
  trigger,
  onClose,
  onDelete,
}: {
  title: string;
  point: { x: number; y: number };
  trigger: RefObject<HTMLElement>;
  onClose: () => void;
  onDelete: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(point);
  useDismissible(true, menu, onClose, trigger);
  useLayoutEffect(() => {
    const place = () => {
      const box = menu.current?.getBoundingClientRect();
      if (box)
        setPosition({
          x: Math.max(16, Math.min(point.x, innerWidth - box.width - 16)),
          y: Math.max(16, Math.min(point.y, innerHeight - box.height - 16)),
        });
    };
    place();
    menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [point]);
  return createPortal(
    <div
      ref={menu}
      className="canvas-context-menu"
      role="menu"
      aria-label={`卡片菜单：${title}`}
      style={{ left: position.x, top: position.y, minHeight: 0, width: 240 }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
          return;
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          trigger.current?.focus({ preventScroll: true });
          return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
        }
        if (event.key === "Tab") onClose();
      }}
    >
      <button
        type="button"
        role="menuitem"
        className="canvas-context-item canvas-context-item--danger"
        aria-label={`删除${title}`}
        title="移除画布卡片，归档原件保留"
        onClick={() => {
          const canvas = trigger.current?.closest<HTMLElement>(
            '[data-testid="infinite-canvas"]',
          );
          onClose();
          onDelete();
          canvas?.focus({ preventScroll: true });
        }}
      >
        <span>删除卡片</span>
        <kbd>Delete</kbd>
      </button>
    </div>,
    document.body,
  );
}
