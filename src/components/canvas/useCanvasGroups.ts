import { useEffect, useMemo, useState } from "react";
import type { CanvasGroup, ProjectCanvas } from "../../domain/projectCanvas";

const DEFAULT_BORDER = "#21a673";

export function useCanvasGroups(initialCanvas?: ProjectCanvas) {
  const [groups, setGroups] = useState<CanvasGroup[]>(
    () => initialCanvas?.groups ?? [],
  );
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set((initialCanvas?.groups ?? []).map((group) => group.id)),
  );

  useEffect(() => {
    if (!initialCanvas?.groups) return;
    setGroups(initialCanvas.groups);
    setCollapsedIds((current) => {
      const valid = new Set(initialCanvas.groups?.map((group) => group.id));
      return new Set([...current].filter((id) => valid.has(id)));
    });
  }, [initialCanvas?.groups]);

  const itemToGroup = useMemo(() => {
    const map = new Map<string, CanvasGroup>();
    for (const group of groups)
      for (const itemId of group.itemIds) map.set(itemId, group);
    return map;
  }, [groups]);

  function createGroup(itemIds: Iterable<string>): CanvasGroup | null {
    const ids = [...new Set(itemIds)];
    if (ids.length < 2) return null;
    const now = Date.now();
    const group: CanvasGroup = {
      id: `canvas-group-${crypto.randomUUID()}`,
      name: "资源包",
      itemIds: ids,
      borderColor: DEFAULT_BORDER,
      collapseMode: "info",
      layoutMode: "grid",
      createdAt: now,
      updatedAt: now,
    };
    setGroups((current) => [...current, group]);
    setCollapsedIds((current) => new Set(current).add(group.id));
    return group;
  }

  function updateGroup(id: string, patch: Partial<CanvasGroup>): void {
    setGroups((current) =>
      current.map((group) =>
        group.id === id ? { ...group, ...patch, updatedAt: Date.now() } : group,
      ),
    );
  }

  function toggleCollapsed(id: string): void {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ungroup(id: string): void {
    setGroups((current) => current.filter((group) => group.id !== id));
    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  return {
    groups,
    setGroups,
    collapsedIds,
    itemToGroup,
    createGroup,
    updateGroup,
    toggleCollapsed,
    ungroup,
  };
}
