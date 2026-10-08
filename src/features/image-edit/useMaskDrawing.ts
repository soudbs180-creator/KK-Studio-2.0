import { useRef, type RefObject } from "react";
import {
  brushMask,
  containsMask,
  floodMask,
  rectangleMask,
  type MaskDocument,
  type MaskRegion,
  type Point,
} from "./mask.ts";
import { context2d } from "./imageProcessing.ts";
import { EDIT_COLORS } from "./EditToolbar.tsx";
import type { ImageTool } from "./useImageViewport.ts";
export function useMaskDrawing({
  document,
  tool,
  brushWidth,
  color,
  original,
  disabled,
  zoom,
  commit,
  onRegion,
  onError,
}: {
  document: MaskDocument;
  tool: ImageTool;
  brushWidth: number;
  color: string;
  original: RefObject<HTMLCanvasElement | undefined>;
  disabled: boolean;
  zoom: () => number;
  commit: (doc: MaskDocument) => void;
  onRegion: (region: MaskRegion) => void;
  onError: (message: string) => void;
}) {
  const scratch = useRef<HTMLCanvasElement>(null),
    points = useRef<Point[]>([]);
  function cancel() {
    points.current = [];
    if (scratch.current)
      context2d(scratch.current).clearRect(
        0,
        0,
        document.width,
        document.height,
      );
  }
  function paint(point: Point) {
    const canvas = scratch.current;
    if (!canvas) return;
    const ctx = context2d(canvas);
    if (tool === "rectangle" || points.current.length === 1)
      ctx.clearRect(0, 0, document.width, document.height);
    ctx.strokeStyle = EDIT_COLORS[1].color;
    ctx.fillStyle = EDIT_COLORS[1].color;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 1;
    if (tool === "rectangle") {
      const a = points.current[0];
      ctx.lineWidth = 2 / Math.max(0.001, zoom());
      ctx.strokeRect(a.x, a.y, point.x - a.x, point.y - a.y);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(a.x, a.y, point.x - a.x, point.y - a.y);
    } else {
      ctx.beginPath();
      points.current
        .slice(-2)
        .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (points.current.length === 1) {
        ctx.arc(point.x, point.y, brushWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function colorAt(point: Point) {
    if (disabled) return;
    if (document.regions.length >= 200) {
      onError("已有 200 个区域，请分批编辑。");
      return;
    }
    if (tool === "color") {
      const existing = document.regions
        .slice()
        .reverse()
        .find((r) => r.color && containsMask(r.runs, point));
      if (existing) {
        onRegion(existing);
        return;
      }
      try {
        const image = original.current!,
          runs = floodMask(
            context2d(image).getImageData(0, 0, image.width, image.height).data,
            image.width,
            image.height,
            point,
          );
        if (!runs.length) return;
        const palette = EDIT_COLORS.find((c) => c.color === color)!,
          number =
            Math.max(
              document.colorCounters?.[palette.name] ?? 0,
              ...document.regions
                .filter((r) => r.colorName === palette.name)
                .map((r) => r.number ?? 0),
            ) + 1;
        const region = {
          id: crypto.randomUUID(),
          runs,
          color,
          colorName: palette.name,
          number,
          instruction: "",
        };
        commit({
          ...document,
          colorCounters: { ...document.colorCounters, [palette.name]: number },
          regions: [...document.regions, region],
        });
        onRegion(region);
      } catch (reason) {
        onError(
          reason instanceof Error
            ? reason.message
            : "区域识别失败，请使用框选或画笔。",
        );
      }
      return;
    }
    points.current = [point];
    paint(point);
  }
  function start(point: Point) {
    if (disabled) return;
    if (tool === "color") {
      points.current = [point];
      return;
    }
    colorAt(point);
  }
  function move(point: Point) {
    if (!points.current.length || disabled) return;
    if (tool === "color") return;
    if (points.current.length >= 4096) {
      cancel();
      onError("笔画过长，请分段绘制；已有编辑区域已保留。");
      return;
    }
    points.current.push(point);
    paint(point);
  }
  function end() {
    if (!points.current.length || disabled) return;
    if (tool === "color") {
      colorAt(points.current[0]);
      cancel();
      return;
    }
    try {
      const runs =
        tool === "rectangle"
          ? rectangleMask(
              document.width,
              document.height,
              points.current[0],
              points.current.at(-1)!,
            )
          : brushMask(
              document.width,
              document.height,
              points.current,
              brushWidth,
            );
      if (runs.length)
        commit({
          ...document,
          regions: [...document.regions, { id: crypto.randomUUID(), runs }],
        });
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "区域保存失败。");
    }
    cancel();
  }
  return { scratch, start, move, end, cancel };
}
