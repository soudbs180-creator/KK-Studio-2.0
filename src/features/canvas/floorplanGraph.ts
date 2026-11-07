import { z } from "zod";

const entry = z.object({
  id: z.string().min(1).max(160),
  label: z.string().min(1).max(160),
  kind: z.enum([
    "ui",
    "service",
    "worker",
    "feature",
    "data",
    "library",
    "external",
  ]),
  parent: z.string().optional(),
  paths: z.array(z.string().max(1000)).max(100).default([]),
  summary: z.string().max(3000).default(""),
});
const architecture = z.object({
  $schema: z.literal("floorplan/architecture@1").optional(),
  nodes: z.array(entry).min(1).max(500),
  edges: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .max(2000)
    .default([]),
});
export function readFloorplanArchitecture(input: unknown) {
  const graph = architecture.parse(input);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  if (byId.size !== graph.nodes.length) throw new Error("蓝图 ID 重复");
  for (const node of graph.nodes) {
    const seen = new Set([node.id]);
    let parent = node.parent;
    while (parent) {
      if (seen.has(parent)) throw new Error("蓝图层级存在循环");
      seen.add(parent);
      const ancestor = byId.get(parent);
      if (!ancestor) throw new Error(`父节点 ${parent} 不存在`);
      if (seen.size > 32) throw new Error("蓝图层级超过32层");
      parent = ancestor.parent;
    }
  }
  const owner = (path: string) => {
    if (byId.has(path)) return path;
    const matches = graph.nodes
      .flatMap((n) =>
        n.paths.map((pattern) => ({
          id: n.id,
          prefix: pattern.replace(/\*.*$/, ""),
        })),
      )
      .filter((p) => path.startsWith(p.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length);
    if (!matches[0]) throw new Error(`无法定位蓝图连线端点 ${path}`);
    return matches[0].id;
  };
  return {
    nodes: graph.nodes,
    edges: graph.edges.map((edge) => ({
      from: owner(edge.from),
      to: owner(edge.to),
    })),
  };
}
