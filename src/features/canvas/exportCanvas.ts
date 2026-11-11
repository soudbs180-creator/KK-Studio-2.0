import { cardLayout } from "../../domain/canvasGraph.ts";
import { enclosingRect } from "../../domain/canvasViewport.ts";
import type { CanvasOperationState } from "../../domain/canvasOperations.ts";
import { loadStoredAsset } from "../creation/index.ts";
import { decodeImage } from "../image-edit/index.ts";

/** Export the model's card contents, positions and edges without executing HTML. */
export async function exportCanvasImage(
  state: CanvasOperationState,
): Promise<string> {
  const rects = state.items.map((item) => ({
    ...state.canvas.positions[item.id],
    ...cardLayout(item),
  }));
  const bounds = enclosingRect(rects);
  if (!bounds) throw new Error("画布为空，无法导出图片");
  const scale = Math.min(
    1,
    4096 / Math.max(bounds.width + 64, bounds.height + 64),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((bounds.width + 64) * scale);
  canvas.height = Math.ceil((bounds.height + 64) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前环境无法导出画布");
  const surface = getComputedStyle(document.documentElement);
  ctx.fillStyle =
    surface.getPropertyValue("--canvas-bg").trim() || surface.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(32 - bounds.x, 32 - bounds.y);
  ctx.strokeStyle =
    surface.getPropertyValue("--text-secondary").trim() || surface.color;
  for (const edge of state.canvas.edges) {
    const a = state.canvas.positions[edge.source],
      b = state.canvas.positions[edge.target];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const item of state.items) {
    const p = state.canvas.positions[item.id],
      layout = cardLayout(item);
    ctx.strokeRect(p.x, p.y, layout.width, layout.collapsedHeight);
    ctx.fillStyle =
      surface.getPropertyValue("--text-primary").trim() || surface.color;
    ctx.font = "20px sans-serif";
    ctx.fillText(item.title, p.x + 16, p.y + 32, layout.width - 32);
    if (
      item.kind === "image" &&
      (item.assetId || item.preview || item.result?.src)
    ) {
      const source = item.assetId
        ? (await loadStoredAsset(item.assetId))?.preview
        : (item.preview ?? item.result?.src);
      if (!source) throw new Error(`图片原件无法恢复：${item.title}`);
      const image = await decodeImage(source);
      const scale = Math.min(
        (layout.width - 32) / image.width,
        (layout.collapsedHeight - 64) / image.height,
      );
      ctx.drawImage(
        image,
        p.x + 16,
        p.y + 48,
        image.width * scale,
        image.height * scale,
      );
      continue;
    }
    ctx.font = "14px sans-serif";
    const lines = (item.result?.text ?? item.prompt ?? item.description).split(
      "\n",
    );
    lines
      .slice(0, Math.floor((layout.collapsedHeight - 56) / 22))
      .forEach((line, i) =>
        ctx.fillText(line, p.x + 16, p.y + 64 + i * 22, layout.width - 32),
      );
  }
  return canvas.toDataURL("image/png");
}
