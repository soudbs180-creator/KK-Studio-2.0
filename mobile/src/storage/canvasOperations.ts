import type {
  MobileProject,
  MobileCanvasOperation,
} from "../core/mobileModel.ts";
import {
  invariant,
  object,
  array,
  id,
  text,
  keys,
} from "./schemaPrimitives.ts";

function number(value: unknown, maximum = 1e7): asserts value is number {
  invariant(
    typeof value === "number" &&
      Number.isFinite(value) &&
      Math.abs(value) <= maximum,
    "Invalid bounded canvas number",
  );
}
export function validateNode(value: unknown, bounded = false): void {
  object(value);
  keys(value, ["id", "kind", "x", "y", "text", "assetId", "taskId"]);
  id(value.id);
  invariant(
    typeof value.kind === "string" &&
      ["text", "image", "video", "audio", "file"].includes(value.kind),
    "Corrupt node kind",
  );
  number(value.x, bounded ? 1e7 : Infinity);
  number(value.y, bounded ? 1e7 : Infinity);
  if (value.text !== undefined) text(value.text);
  if (value.assetId !== undefined) id(value.assetId);
  if (value.taskId !== undefined) id(value.taskId);
}
function validateEdge(value: unknown): void {
  object(value);
  keys(value, ["id", "source", "target"]);
  id(value.id);
  id(value.source);
  id(value.target);
}
function validateViewport(value: unknown, bounded = false): void {
  object(value);
  keys(value, ["x", "y", "zoom"]);
  number(value.x, bounded ? 1e7 : Infinity);
  number(value.y, bounded ? 1e7 : Infinity);
  number(value.zoom, bounded ? 100 : Infinity);
  invariant(value.zoom > 0, "Corrupt zoom");
}
export function validateCanvas(
  value: unknown,
): asserts value is MobileProject["canvas"] {
  object(value);
  keys(value, ["nodes", "edges", "viewport"]);
  array(value.nodes, 2000);
  array(value.edges, 4000);
  validateViewport(value.viewport);
  const nodes = new Set<string>(),
    edges = new Set<string>();
  for (const node of value.nodes) {
    validateNode(node);
    object(node);
    id(node.id);
    invariant(!nodes.has(node.id), "Corrupt duplicate node");
    nodes.add(node.id);
  }
  for (const edge of value.edges) {
    validateEdge(edge);
    object(edge);
    id(edge.id);
    invariant(!edges.has(edge.id), "Corrupt duplicate edge");
    edges.add(edge.id);
    invariant(
      nodes.has(String(edge.source)) && nodes.has(String(edge.target)),
      "Corrupt edge",
    );
  }
}
export function validateCanvasOperations(
  value: unknown,
): asserts value is MobileCanvasOperation[] {
  array(value, 200);
  for (const op of value) {
    object(op);
    switch (op.type) {
      case "add_node":
        keys(op, ["type", "node"]);
        validateNode(op.node, true);
        break;
      case "move_node":
        keys(op, ["type", "nodeId", "x", "y"]);
        id(op.nodeId);
        number(op.x);
        number(op.y);
        break;
      case "edit_text":
        keys(op, ["type", "nodeId", "text"]);
        id(op.nodeId);
        text(op.text);
        break;
      case "remove_node":
        keys(op, ["type", "nodeId"]);
        id(op.nodeId);
        break;
      case "add_edge":
        keys(op, ["type", "edge"]);
        validateEdge(op.edge);
        break;
      case "remove_edge":
        keys(op, ["type", "edgeId"]);
        id(op.edgeId);
        break;
      case "set_viewport":
        keys(op, ["type", "viewport"]);
        validateViewport(op.viewport, true);
        break;
      default:
        throw new Error("Unsupported local canvas operation");
    }
  }
}
export function applyCanvasOperations(
  canvas: MobileProject["canvas"],
  operations: MobileCanvasOperation[],
): MobileProject["canvas"] {
  validateCanvasOperations(operations);
  const next: MobileProject["canvas"] = JSON.parse(JSON.stringify(canvas));
  const node = (nodeId: string) => {
    const n = next.nodes.find((n) => n.id === nodeId);
    invariant(n, "Canvas node missing");
    return n;
  };
  for (const op of operations) {
    switch (op.type) {
      case "add_node":
        invariant(
          !next.nodes.some((n) => n.id === op.node.id),
          "Canvas node identity already exists",
        );
        next.nodes.push({ ...op.node });
        break;
      case "move_node":
        Object.assign(node(op.nodeId), { x: op.x, y: op.y });
        break;
      case "edit_text": {
        const n = node(op.nodeId);
        invariant(n.kind === "text", "Only text nodes can edit text");
        n.text = op.text;
        break;
      }
      case "remove_node":
        node(op.nodeId);
        next.nodes = next.nodes.filter((n) => n.id !== op.nodeId);
        next.edges = next.edges.filter(
          (e) => e.source !== op.nodeId && e.target !== op.nodeId,
        );
        break;
      case "add_edge":
        node(op.edge.source);
        node(op.edge.target);
        invariant(
          !next.edges.some((e) => e.id === op.edge.id),
          "Canvas edge identity already exists",
        );
        next.edges.push({ ...op.edge });
        break;
      case "remove_edge":
        invariant(
          next.edges.some((e) => e.id === op.edgeId),
          "Canvas edge missing",
        );
        next.edges = next.edges.filter((e) => e.id !== op.edgeId);
        break;
      case "set_viewport":
        next.viewport = { ...op.viewport };
        break;
    }
  }
  validateCanvas(next);
  return next;
}
