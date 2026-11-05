import { z } from "zod";
import { Graph, layout } from "@dagrejs/dagre";
import type { CanvasOperation } from "../../domain/canvasOperations.ts";
import { readFloorplanArchitecture } from "./floorplanGraph.ts";

export interface FloorplanNode {
  id: string;
  name: string;
  kind: "ui" | "service" | "worker" | "feature" | "data";
  path: string;
  children?: FloorplanNode[];
}
const node: z.ZodType<FloorplanNode> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1).max(160),
      name: z.string().min(1).max(160),
      kind: z.enum(["ui", "service", "worker", "feature", "data"]),
      path: z.string().max(1000),
      children: z.array(node).max(500).optional(),
    })
    .strict(),
);

/** Floorplan's kind/path hierarchy, mapped to KK cards by a MIT Dagre adapter. */
export class FloorplanCanvasAdapter {
  flattenHierarchy(input: FloorplanNode) {
    const root = node.parse(input);
    const results: Array<{
      id: string;
      name: string;
      level: number;
      kind: string;
    }> = [];
    const visit = (n: FloorplanNode, level: number) => {
      if (
        level > 32 ||
        results.length >= 500 ||
        results.some((v) => v.id === n.id)
      )
        throw new Error("蓝图层级过深、节点过多或 ID 重复");
      results.push({ id: n.id, name: n.name, level, kind: n.kind });
      n.children?.forEach((child) => visit(child, level + 1));
    };
    visit(root, 0);
    return results;
  }

  toCanvas(
    input: unknown,
    namespace = crypto.randomUUID(),
  ): Extract<CanvasOperation, { op: "import_canvas_json" }> {
    const flat =
      input && typeof input === "object" && "nodes" in input
        ? readFloorplanArchitecture(input)
        : undefined;
    const root = flat ? undefined : node.parse(input);
    if (root) this.flattenHierarchy(root);
    const graph = new Graph()
      .setGraph({ rankdir: "LR", ranksep: 120, nodesep: 64 })
      .setDefaultEdgeLabel(() => ({}));
    const cards: Extract<
      CanvasOperation,
      { op: "import_canvas_json" }
    >["payload"]["document"]["cards"] = [];
    const edges: Extract<
      CanvasOperation,
      { op: "import_canvas_json" }
    >["payload"]["document"]["edges"] = [];
    const visit = (n: FloorplanNode, parent?: string) => {
      const id = `bp-${namespace}-${cards.length}`;
      graph.setNode(id, { width: 590, height: 627 });
      cards.push({
        id,
        kind: "text",
        title: n.name,
        description: `${n.kind} · ${n.path}`.slice(0, 500),
        prompt: `${n.name}\n${n.kind}\n${n.path}`,
      });
      if (parent) {
        graph.setEdge(parent, id);
        edges.push({
          id: `bp-edge-${namespace}-${edges.length}`,
          source: parent,
          target: id,
          kind: "result",
        });
      }
      n.children?.forEach((child) => visit(child, id));
    };
    if (flat) {
      const idMap = new Map(
        flat.nodes.map((node, index) => [node.id, `bp-${namespace}-${index}`]),
      );
      for (const n of flat.nodes) {
        const id = idMap.get(n.id)!;
        graph.setNode(id, { width: 590, height: 627 });
        cards.push({
          id,
          title: n.label,
          kind: "text",
          description: `${n.kind} · ${n.paths.join(", ")}`.slice(0, 500),
          prompt:
            `${n.label}\n${n.kind}\n${n.summary}\n${n.paths.join("\n")}`.slice(
              0,
              4000,
            ),
        });
      }
      const pairs = [
        ...flat.nodes
          .filter((n) => n.parent)
          .map((n) => ({ from: n.parent!, to: n.id })),
        ...flat.edges,
      ];
      for (const pair of pairs) {
        const source = idMap.get(pair.from)!,
          target = idMap.get(pair.to)!;
        if (
          source === target ||
          edges.some((edge) => edge.source === source && edge.target === target)
        )
          continue;
        graph.setEdge(source, target);
        edges.push({
          id: `bp-edge-${namespace}-${edges.length}`,
          source,
          target,
          kind: "result",
        });
      }
    } else visit(root!);
    layout(graph);
    return {
      op: "import_canvas_json",
      payload: {
        document: {
          version: 1,
          cards,
          edges,
          positions: Object.fromEntries(
            cards.map((c) => {
              const p = graph.node(c.id);
              return [c.id, { x: p.x - 295, y: p.y - 313.5 }];
            }),
          ),
        },
      },
    };
  }
}
