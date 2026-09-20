import { enclosingRect, type Point } from "../../domain/canvasViewport";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { cardLayout } from "../../domain/canvasGraph";

interface MinimapProps {
  nodes: Record<string, Point>;
  items: CanvasCollectionItem[];
  onLocate: (id: string) => void;
}
export default function CanvasMinimap({
  nodes,
  items,
  onLocate,
}: MinimapProps) {
  const rects = items.flatMap((item) => {
    const point = nodes[item.id];
    if (!point) return [];
    const result = item.result || ["audio", "text"].includes(item.kind);
    return [
      {
        id: item.id,
        title: item.title,
        x: point.x + (!result && item.kind === "image" ? 96 : 0),
        y: point.y + (result ? 0 : item.kind === "image" ? 58 : 16),
        width: result
          ? cardLayout(item).width
          : item.kind === "image"
            ? 400
            : 370,
        height: result
          ? cardLayout(item).height
          : item.kind === "image"
            ? 400
            : 208,
      },
    ];
  });
  const bounds = enclosingRect(rects);
  return (
    <section className="canvas-minimap" aria-label="画布小地图">
      <p className="visually-hidden">点击卡片定位并编辑</p>
      <div className="minimap-surface">
        {bounds ? (
          rects.map((rect) => (
            <button
              key={rect.id}
              className="minimap-node"
              aria-label={`定位 ${rect.title}`}
              title={rect.title}
              onClick={() => onLocate(rect.id)}
              style={{
                left: `${8 + ((rect.x - bounds.x) / Math.max(1, bounds.width)) * 84}%`,
                top: `${8 + ((rect.y - bounds.y) / Math.max(1, bounds.height)) * 84}%`,
                width: `${(rect.width / Math.max(1, bounds.width)) * 84}%`,
                height: `${(rect.height / Math.max(1, bounds.height)) * 84}%`,
              }}
            />
          ))
        ) : (
          <span className="minimap-empty">暂无卡片</span>
        )}
      </div>
    </section>
  );
}
