import type { CanvasGroup } from "../../domain/projectCanvas";

export default function CanvasGroupToolbar({
  selectedIds,
  groups,
  onCreate,
  onArrange,
  onSort,
  onUngroup,
}: {
  selectedIds: Set<string>;
  groups: CanvasGroup[];
  onCreate: () => void;
  onArrange: (layout: CanvasGroup["layoutMode"]) => void;
  onSort?: (by: "name" | "time") => void;
  onUngroup: () => void;
}) {
  if (selectedIds.size < 2) return null;
  const selectedGroup = groups.find((group) =>
    [...selectedIds].every((id) => group.itemIds.includes(id)),
  );
  return (
    <div
      className="canvas-group-toolbar"
      role="toolbar"
      aria-label="编组与布局"
    >
      <button type="button" onClick={onCreate}>
        编组
      </button>
      <button
        type="button"
        aria-pressed={selectedGroup?.layoutMode === "grid"}
        onClick={() => onArrange("grid")}
      >
        布局整理
      </button>
      <button
        type="button"
        aria-pressed={selectedGroup?.layoutMode === "horizontal"}
        onClick={() => onArrange("horizontal")}
      >
        水平
      </button>
      <button
        type="button"
        aria-pressed={selectedGroup?.layoutMode === "vertical"}
        onClick={() => onArrange("vertical")}
      >
        垂直
      </button>
      <button
        type="button"
        aria-pressed={selectedGroup?.layoutMode === "upstream"}
        onClick={() => onArrange("upstream")}
      >
        上下游
      </button>
      {onSort && (
        <>
          <button type="button" onClick={() => onSort("name")}>
            按名字
          </button>
          <button type="button" onClick={() => onSort("time")}>
            按时间
          </button>
        </>
      )}
      {selectedGroup && (
        <button type="button" onClick={onUngroup}>
          解组
        </button>
      )}
    </div>
  );
}
