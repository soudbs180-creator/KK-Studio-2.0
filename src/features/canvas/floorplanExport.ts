import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { ProjectCanvas } from "../../domain/projectCanvas.ts";
import { readProjectCanvas } from "../../domain/projectCanvas.ts";
import { readFloorplanArchitecture } from "./floorplanGraph.ts";
import { readPortableCanvas } from "../../domain/canvasPortableSnapshot.ts";
import { serializeFloorplanFile } from "./floorplanFile.ts";

/** Standard Floorplan topology plus a namespaced lossless KK snapshot extension. */
export function exportFloorplan(
  items: CanvasCollectionItem[],
  positions: ProjectCanvas["positions"],
  edges: ProjectCanvas["edges"],
  groups: NonNullable<ProjectCanvas["groups"]> = [],
) {
  const canvas = readProjectCanvas(
    {
      version: 1,
      positions,
      edges,
      groups,
      viewport: { x: 0, y: 0, scale: 1 },
    },
    items,
  );
  const ids = [...items.map((i) => i.id), ...groups.map((g) => g.id)];
  if (new Set(ids).size !== ids.length)
    throw new Error("卡片与分组 ID 冲突，不能导出蓝图");
  const containingGroup = (members: string[], ownId?: string) =>
    groups
      .filter(
        (g) =>
          g.id !== ownId &&
          members.every((id) => g.itemIds.includes(id)) &&
          (!ownId || g.itemIds.length > members.length),
      )
      .sort((a, b) => a.itemIds.length - b.itemIds.length)[0]?.id;
  const nodes = [
    ...groups.map((g) => ({
      id: g.id,
      label: g.name,
      kind: "feature" as const,
      parent: containingGroup(g.itemIds, g.id),
      paths: [],
      summary: "画布分组",
    })),
    ...items.map((i) => ({
      id: i.id,
      label: i.title,
      kind: i.blueprint?.kind ?? ("feature" as const),
      parent:
        containingGroup([i.id]) ??
        (ids.includes(i.blueprint?.parentId ?? "")
          ? i.blueprint?.parentId
          : undefined),
      paths: i.blueprint?.paths ?? [],
      summary:
        i.blueprint?.summary ?? (i.prompt ?? i.description).slice(0, 3000),
    })),
  ];
  const result = {
    $schema: "floorplan/architecture@1" as const,
    nodes,
    edges: edges.map((e) => ({ from: e.source, to: e.target })),
    kkStudio: {
      version: 1 as const,
      items: structuredClone(items),
      positions: structuredClone(positions),
      edges: structuredClone(edges),
      groups: structuredClone(canvas.groups),
    },
  };
  readFloorplanArchitecture(result);
  readPortableCanvas(JSON.parse(JSON.stringify(result.kkStudio)));
  return JSON.parse(serializeFloorplanFile(result)) as typeof result;
}
