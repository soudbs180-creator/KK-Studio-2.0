import { useEffect, useRef } from "react";
import { MAX_SCALE, MIN_SCALE } from "./canvasModel";

interface ZoomMenuProps {
  scale: number;
  onZoom: (scale: number) => void;
  onChangeZoom: (factor: number) => void;
  onFit: () => void;
  onClose: () => void;
}

export default function CanvasZoomMenu({
  scale,
  onZoom,
  onChangeZoom,
  onFit,
  onClose,
}: ZoomMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
  }, []);
  function choose(action: () => void): void {
    action();
    onClose();
  }
  return (
    <div
      ref={ref}
      className="canvas-zoom-menu"
      role="menu"
      aria-label="画布缩放比例"
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        const buttons = Array.from(
          ref.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) ?? [],
        );
        const current = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        let next: number | undefined;
        if (event.key === "ArrowDown") next = (current + 1) % buttons.length;
        if (event.key === "ArrowUp")
          next = (current - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          buttons[next]?.focus();
        }
        if (event.key === "Tab") onClose();
      }}
    >
      <button
        role="menuitem"
        disabled={scale <= MIN_SCALE}
        onClick={() => choose(() => onChangeZoom(1 / 1.1))}
      >
        缩小<kbd>Ctrl−</kbd>
      </button>
      <button
        role="menuitem"
        disabled={scale >= MAX_SCALE}
        onClick={() => choose(() => onChangeZoom(1.1))}
      >
        放大<kbd>Ctrl+</kbd>
      </button>
      <div className="zoom-menu-divider" role="separator" />
      <button role="menuitem" onClick={() => choose(onFit)}>
        适应视图<kbd>Shift1</kbd>
      </button>
      <div className="zoom-menu-divider" role="separator" />
      {[0.5, 1, 2, 3, 4].map((value) => (
        <button
          key={value}
          role="menuitemradio"
          aria-checked={Math.abs(scale - value) < 0.001}
          onClick={() => choose(() => onZoom(value))}
        >
          {value * 100}%
        </button>
      ))}
    </div>
  );
}
