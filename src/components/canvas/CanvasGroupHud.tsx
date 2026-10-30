import { cardLayout } from "../../domain/canvasGraph";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { CanvasGroup } from "../../domain/projectCanvas";
import CanvasGroupToolbar from "./CanvasGroupToolbar";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasGroups } from "./useCanvasGroups";

function placeItems(
  orderedIds: string[],
  layout: CanvasGroup["layoutMode"],
  items: CanvasCollectionItem[],
  current: Record<string, { x: number; y: number }>,
) {
  const next = { ...current };
  const columns = layout === "grid" ? 2 : 1;
  orderedIds.forEach((id, index) => {
    const item = items.find((entry) => entry.id === id);
    if (!item || !next[id]) return;
    next[id] = {
      x:
        82 +
        (layout === "horizontal" ? index * 650 : (index % columns) * 650) -
        cardLayout(item).left,
      y:
        107 +
        (layout === "vertical" || layout === "upstream"
          ? index
          : Math.floor(index / columns)) *
          520,
    };
  });
  return next;
}

export default function CanvasGroupHud({
  controls,
  groups,
  items,
}: {
  controls: ReturnType<typeof useCanvasControls>;
  groups: ReturnType<typeof useCanvasGroups>;
  items: CanvasCollectionItem[];
}) {
  return (
    <CanvasGroupToolbar
      selectedIds={controls.selectedIds}
      groups={groups.groups}
      onCreate={() => groups.createGroup(controls.selectedIds)}
      onArrange={(layout) => {
        const selectedIds = [...controls.selectedIds];
        const selected = groups.groups.find((group) =>
          selectedIds.every((id) => group.itemIds.includes(id)),
        );
        controls.setNodes((current) =>
          placeItems(selectedIds, layout, items, current),
        );
        if (selected) groups.updateGroup(selected.id, { layoutMode: layout });
      }}
      onSort={(by) => {
        const selectedIds = [...controls.selectedIds];
        const selected = groups.groups.find((group) =>
          selectedIds.every((id) => group.itemIds.includes(id)),
        );
        const orderedIds = [...selectedIds].sort((a, b) => {
          const itemA = items.find((entry) => entry.id === a);
          const itemB = items.find((entry) => entry.id === b);
          if (!itemA || !itemB) return 0;
          if (by === "name")
            return itemA.title.localeCompare(itemB.title, "zh-CN");
          return (itemB.updatedAt ?? 0) - (itemA.updatedAt ?? 0);
        });
        const layout = selected?.layoutMode ?? "grid";
        controls.setNodes((current) =>
          placeItems(orderedIds, layout, items, current),
        );
        if (selected) groups.updateGroup(selected.id, { itemIds: orderedIds });
      }}
      onUngroup={() => {
        const selected = groups.groups.find((group) =>
          [...controls.selectedIds].every((id) => group.itemIds.includes(id)),
        );
        if (selected) groups.ungroup(selected.id);
      }}
    />
  );
}
