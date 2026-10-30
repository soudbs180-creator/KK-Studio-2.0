import { useMemo, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { cardLayout } from "../../domain/canvasGraph";
import type { CanvasGroup } from "../../domain/projectCanvas";
import type { Point } from "./canvasModel";

function bounds(
  group: CanvasGroup,
  items: CanvasCollectionItem[],
  nodes: Record<string, Point>,
) {
  const members = items.filter((item) => group.itemIds.includes(item.id));
  const rects = members
    .map((item) => {
      const point = nodes[item.id];
      if (!point) return null;
      const layout = cardLayout(item);
      return {
        left: point.x + layout.left,
        top: point.y,
        right: point.x + layout.left + layout.width,
        bottom: point.y + layout.height,
      };
    })
    .filter(Boolean) as Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>;
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left)) - 16;
  const top = Math.min(...rects.map((rect) => rect.top)) - 42;
  return {
    left,
    top,
    width: Math.max(...rects.map((rect) => rect.right)) - left + 16,
    height: Math.max(...rects.map((rect) => rect.bottom)) - top + 16,
  };
}

export default function CanvasGroupLayer({
  groups,
  items,
  nodes,
  collapsedIds,
  onToggle,
  onUpdate,
  onUngroup,
}: {
  groups: CanvasGroup[];
  items: CanvasCollectionItem[];
  nodes: Record<string, Point>;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CanvasGroup>) => void;
  onUngroup: (id: string) => void;
}) {
  return (
    <>
      {groups.map((group) => {
        const rect = bounds(group, items, nodes);
        if (!rect) return null;
        const collapsed = collapsedIds.has(group.id);
        const memberItems = items.filter((item) =>
          group.itemIds.includes(item.id),
        );
        const imageCount = memberItems.filter(
          (item) => item.kind === "image",
        ).length;
        const videoCount = memberItems.filter(
          (item) => item.kind === "video",
        ).length;
        return (
          <GroupCard
            key={group.id}
            group={group}
            rect={collapsed ? { ...rect, width: 304, height: 176 } : rect}
            collapsed={collapsed}
            imageCount={imageCount}
            videoCount={videoCount}
            onToggle={() => onToggle(group.id)}
            onUpdate={(patch) => onUpdate(group.id, patch)}
            onUngroup={() => onUngroup(group.id)}
          />
        );
      })}
    </>
  );
}

function GroupCard({
  group,
  rect,
  collapsed,
  imageCount,
  videoCount,
  onToggle,
  onUpdate,
  onUngroup,
}: {
  group: CanvasGroup;
  rect: { left: number; top: number; width: number; height: number };
  collapsed: boolean;
  imageCount: number;
  videoCount: number;
  onToggle: () => void;
  onUpdate: (patch: Partial<CanvasGroup>) => void;
  onUngroup: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const style = useMemo(
    () => ({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      borderColor: group.borderColor,
    }),
    [group.borderColor, rect],
  );
  return (
    <div
      className={`canvas-group-card ${collapsed ? "is-collapsed" : "is-expanded"} is-${group.collapseMode}`}
      style={style}
      data-canvas-group={group.id}
    >
      <div
        className="canvas-group-card__header"
        onClick={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest("input")
          )
            return;
          onToggle();
        }}
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <input
            autoFocus
            value={group.name}
            aria-label="编组名称"
            onChange={(event) => onUpdate({ name: event.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape")
                setEditing(false);
            }}
          />
        ) : (
          <strong>{group.name}</strong>
        )}
        <span>资源包 / 标签组</span>
      </div>
      <div className="canvas-group-card__meta">
        {group.collapseMode === "stack" ? (
          "堆叠收纳"
        ) : (
          <>
            {imageCount ? `图片 ${imageCount}` : ""}
            {imageCount && videoCount ? " · " : ""}
            {videoCount ? `视频 ${videoCount}` : ""}
          </>
        )}
      </div>
      <div className="canvas-group-card__actions">
        <button type="button" onClick={onToggle}>
          {collapsed ? "展开" : "收纳"}
        </button>
        <select
          aria-label="编组收纳方式"
          value={group.collapseMode}
          onChange={(event) =>
            onUpdate({
              collapseMode: event.target.value as CanvasGroup["collapseMode"],
            })
          }
        >
          <option value="info">信息</option>
          <option value="stack">堆叠</option>
        </select>
        <input
          type="color"
          aria-label="编组边框颜色"
          value={group.borderColor}
          onChange={(event) => onUpdate({ borderColor: event.target.value })}
        />
        <button type="button" onClick={onUngroup}>
          解组
        </button>
      </div>
    </div>
  );
}
