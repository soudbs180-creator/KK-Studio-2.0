import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useDismissible } from "../useDismissible";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { Point, ViewTransform } from "./canvasModel";
import CanvasZoomMenu from "./CanvasZoomMenu";
import CanvasMinimap from "./CanvasMinimap";
import "../../styles/canvas-navigation.css";

interface NavigationProps {
  transform: ViewTransform;
  nodes: Record<string, Point>;
  items: CanvasCollectionItem[];
  onZoom: (scale: number) => void;
  onChangeZoom: (factor: number) => void;
  onFit: () => void;
  onArrange: () => void;
  onLocate: (id: string) => void;
  showConnections: boolean;
  onToggleConnections: () => void;
  backgroundColor: string;
  onBackgroundColor: (color: string) => void;
  backgroundPattern: "dots" | "grid";
  onToggleBackgroundPattern: () => void;
}

export default function CanvasNavigation({
  transform,
  nodes,
  items,
  onZoom,
  onChangeZoom,
  onFit,
  onArrange,
  onLocate,
  showConnections,
  onToggleConnections,
  backgroundColor,
  onBackgroundColor,
  backgroundPattern,
  onToggleBackgroundPattern,
}: NavigationProps) {
  const [open, setOpen] = useState<"zoom" | "map" | "background" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dismiss = useCallback(() => setOpen(null), []);
  useDismissible(open !== null, ref, dismiss, opener);
  function closeAndFocus(): void {
    dismiss();
    opener.current?.focus({ preventScroll: true });
  }
  useLayoutEffect(() => {
    const menu = ref.current?.querySelector<HTMLElement>(
      ".canvas-zoom-menu,.canvas-background-menu",
    );
    if (!menu) return;
    const canvas = menu.closest(".infinite-canvas");
    const update = () => {
      const gap = parseFloat(getComputedStyle(menu).paddingBottom);
      const bottom = Math.min(
        window.innerHeight,
        canvas?.getBoundingClientRect().bottom ?? window.innerHeight,
      );
      menu.style.setProperty(
        "--canvas-menu-available-height",
        `${Math.max(0, bottom - menu.getBoundingClientRect().top - gap)}px`,
      );
    };
    update();
    if (open === "background") menu.querySelector("button")?.focus();
    const observer = new ResizeObserver(update);
    const hud = menu.closest(".canvas-hud");
    if (hud) observer.observe(hud);
    if (canvas) observer.observe(canvas);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open]);
  return (
    <div
      ref={ref}
      className="canvas-top-right"
      data-node-id="100:16335"
      role="group"
      aria-label="画布导航"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <button
        className="canvas-zoom-trigger"
        data-node-id="100:16337"
        aria-label="画布缩放"
        title="画布缩放"
        aria-haspopup="menu"
        aria-expanded={open === "zoom"}
        onClick={(event) => {
          opener.current = event.currentTarget;
          setOpen(open === "zoom" ? null : "zoom");
        }}
      >
        <span>{Math.round(transform.scale * 100)}%</span>
        <img src="/design/figma/nav-chevron.svg" alt="" />
      </button>
      <div className="canvas-navigation-tools" data-node-id="100:16334">
        <button
          className="canvas-arrange"
          onClick={() => {
            dismiss();
            onArrange();
          }}
          aria-label="整理画布"
          title="整理全部卡片并适配视图"
        >
          <img src="/design/figma/nav-arrange.svg" alt="" />
          <span>整理</span>
        </button>
        <span className="canvas-navigation-divider" aria-hidden="true" />
        <button
          className="canvas-background"
          aria-label="画布背景"
          title="背景样式与颜色"
          aria-haspopup="dialog"
          aria-expanded={open === "background"}
          onClick={(event) => {
            opener.current = event.currentTarget;
            setOpen(open === "background" ? null : "background");
          }}
        >
          <img
            src={
              backgroundPattern === "dots"
                ? "/design/figma/nav-background.svg"
                : "/design/figma/canvas-dots.svg"
            }
            alt=""
          />
        </button>
        <button
          className="canvas-lines"
          onClick={() => {
            dismiss();
            onToggleConnections();
          }}
          aria-label="显示连线"
          title={showConnections ? "隐藏连线" : "显示连线"}
          aria-pressed={showConnections}
        >
          <img src="/design/figma/nav-lines.svg" alt="" />
        </button>
        <button
          className="canvas-map-trigger"
          aria-label="小地图"
          title="小地图"
          aria-expanded={open === "map"}
          onClick={(event) => {
            opener.current = event.currentTarget;
            setOpen(open === "map" ? null : "map");
          }}
        >
          <img src="/design/figma/nav-map.svg" alt="" />
          <span>小地图</span>
        </button>
      </div>
      {open === "background" && (
        <div
          className="canvas-background-menu"
          role="dialog"
          aria-label="画布背景选项"
        >
          {(["dots", "grid"] as const).map((pattern) => (
            <button
              key={pattern}
              type="button"
              aria-pressed={backgroundPattern === pattern}
              onClick={() => {
                if (backgroundPattern !== pattern) onToggleBackgroundPattern();
                closeAndFocus();
              }}
            >
              {pattern === "dots" ? "点状背景" : "网格背景"}
            </button>
          ))}
          <label className="canvas-background-color">
            背景颜色
            <input
              className="canvas-color-input"
              type="color"
              aria-label="画布背景颜色"
              value={backgroundColor}
              onChange={(event) => {
                onBackgroundColor(event.target.value);
                closeAndFocus();
              }}
            />
          </label>
        </div>
      )}
      {open === "zoom" && (
        <CanvasZoomMenu
          scale={transform.scale}
          onZoom={onZoom}
          onChangeZoom={onChangeZoom}
          onFit={onFit}
          onClose={closeAndFocus}
        />
      )}
      {open === "map" && (
        <CanvasMinimap
          items={items}
          nodes={nodes}
          onLocate={(id) => {
            dismiss();
            onLocate(id);
          }}
        />
      )}
    </div>
  );
}
