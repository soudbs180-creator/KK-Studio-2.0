import { useLayoutEffect, useRef } from "react";

export default function AssetPanelHeader({
  compact,
  onToggleCompact,
  onClose,
}: {
  compact: boolean;
  onToggleCompact: () => void;
  onClose: () => void;
}) {
  const offset = useRef([0, 0]);
  const drag = useRef<{ x: number; y: number; origin: number[] } | null>(null);
  const handle = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const button = handle.current;
    const dialog = button?.closest("dialog");
    if (!button || !dialog) return;
    const clamp = () => move(button, offset.current[0], offset.current[1]);
    clamp();
    const observer = new ResizeObserver(clamp);
    observer.observe(dialog);
    window.addEventListener("resize", clamp);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", clamp);
    };
  }, [compact]);
  function move(button: HTMLButtonElement, x: number, y: number): void {
    const dialog = button.closest("dialog");
    if (!dialog) return;
    const box = dialog.getBoundingClientRect();
    const dx = Math.max(
      8 - box.left,
      Math.min(x - offset.current[0], window.innerWidth - 8 - box.right),
    );
    const dy = Math.max(
      8 - box.top,
      Math.min(y - offset.current[1], window.innerHeight - 8 - box.bottom),
    );
    offset.current = [offset.current[0] + dx, offset.current[1] + dy];
    dialog.style.translate = `${offset.current[0]}px ${offset.current[1]}px`;
  }
  function cancel(button: HTMLButtonElement): void {
    if (!drag.current) return;
    move(button, drag.current.origin[0], drag.current.origin[1]);
    drag.current = null;
  }
  return (
    <header className="asset-header">
      <button
        ref={handle}
        className="asset-drag-handle"
        aria-label="移动素材库"
        title="拖动素材库；Alt＋方向键移动"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.focus();
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            origin: [...offset.current],
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current)
            move(
              event.currentTarget,
              drag.current.origin[0] + event.clientX - drag.current.x,
              drag.current.origin[1] + event.clientY - drag.current.y,
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={(event) => cancel(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && drag.current) {
            event.preventDefault();
            event.stopPropagation();
            cancel(event.currentTarget);
          }
          if (
            !event.altKey ||
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          move(
            event.currentTarget,
            offset.current[0] +
              (event.key === "ArrowRight"
                ? 8
                : event.key === "ArrowLeft"
                  ? -8
                  : 0),
            offset.current[1] +
              (event.key === "ArrowDown"
                ? 8
                : event.key === "ArrowUp"
                  ? -8
                  : 0),
          );
        }}
      >
        <span
          className="asset-header-icon asset-drag-icon"
          aria-hidden="true"
        />
      </button>
      <span>素材库</span>
      <div className="asset-window-actions">
        <button
          aria-label={compact ? "展开资产管理" : "收起资产管理"}
          onClick={onToggleCompact}
        >
          <span
            className="asset-header-icon asset-expand-icon"
            aria-hidden="true"
          />
        </button>
        <button aria-label="关闭资产管理" onClick={onClose}>
          <span
            className="asset-header-icon asset-close-icon"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}
