import { useLayoutEffect, useRef, useState } from "react";
import type { ImageTool } from "./useImageViewport.ts";
import { EDIT_COLORS } from "./palette.ts";
export { EDIT_COLORS } from "./palette.ts";
export default function EditToolbar({
  tool,
  onTool,
  brushWidth,
  onBrushWidth,
  color,
  onColor,
  undo,
  redo,
  canUndo,
  canRedo,
  onReset,
  onClear,
  hasRegions,
  disabled,
}: {
  tool: ImageTool;
  onTool: (tool: ImageTool) => void;
  brushWidth: number;
  onBrushWidth: (value: number) => void;
  color: string;
  onColor: (value: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  onClear: () => void;
  hasRegions: boolean;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number } | null>(
      null,
    ),
    [position, setPosition] = useState({ x: 0, y: 0 }),
    placed = useRef(false);
  const clamp = (x: number, y: number) => {
    const element = ref.current,
      parent = element?.parentElement;
    if (!element || !parent) return;
    setPosition({
      x: Math.max(0, Math.min(parent.clientWidth - element.offsetWidth, x)),
      y: Math.max(0, Math.min(parent.clientHeight - element.offsetHeight, y)),
    });
  };
  useLayoutEffect(() => {
    const element = ref.current,
      parent = element?.parentElement;
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      setPosition((current) => {
        const x = placed.current
            ? current.x
            : (parent.clientWidth - element.offsetWidth) / 2,
          y = placed.current
            ? current.y
            : parent.clientHeight - element.offsetHeight - 16;
        placed.current = true;
        return {
          x: Math.max(0, Math.min(parent.clientWidth - element.offsetWidth, x)),
          y: Math.max(
            0,
            Math.min(parent.clientHeight - element.offsetHeight, y),
          ),
        };
      });
    });
    observer.observe(parent);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="image-edit-toolbar"
      data-ui-overlay
      style={{ left: position.x, top: position.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="ui-button toolbar-drag"
        aria-label="拖动编辑工具栏"
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: position.x,
            top: position.y,
          };
        }}
        onPointerMove={(e) => {
          if (drag.current)
            clamp(
              drag.current.left + e.clientX - drag.current.x,
              drag.current.top + e.clientY - drag.current.y,
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        ⠿
      </button>
      {(
        [
          ["browse", "浏览图片"],
          ["rectangle", "框选区域"],
          ["brush", "画笔区域"],
          ["color", "色块区域"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          className="ui-button"
          aria-label={label}
          aria-pressed={tool === value}
          disabled={disabled}
          onClick={() => onTool(value)}
        >
          {label.slice(0, 2)}
        </button>
      ))}
      {tool === "brush" && (
        <label>
          笔宽
          <input
            type="range"
            aria-label="画笔原像素宽度"
            min={2}
            max={256}
            value={brushWidth}
            disabled={disabled}
            onChange={(e) => onBrushWidth(Number(e.target.value))}
          />
          <output>{brushWidth}px</output>
        </label>
      )}
      {tool === "color" && (
        <select
          aria-label="色块颜色"
          value={color}
          disabled={disabled}
          onChange={(e) => onColor(e.target.value)}
        >
          {EDIT_COLORS.map((c) => (
            <option key={c.color} value={c.color}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="ui-button"
        aria-label="撤销编辑"
        disabled={!canUndo || disabled}
        onClick={undo}
      >
        撤销
      </button>
      <button
        type="button"
        className="ui-button"
        aria-label="重做编辑"
        disabled={!canRedo || disabled}
        onClick={redo}
      >
        重做
      </button>
      <button
        type="button"
        className="ui-button"
        aria-label="清空编辑区域"
        title={!hasRegions ? "没有需要清空的编辑区域" : "清空全部区域，可撤销"}
        disabled={!hasRegions || disabled}
        onClick={onClear}
      >
        清空
      </button>
      <button
        type="button"
        className="ui-button"
        aria-label="复位图片"
        onClick={onReset}
      >
        复位
      </button>
    </div>
  );
}
