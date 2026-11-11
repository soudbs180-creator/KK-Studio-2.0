import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCanvasToolRequest } from "./operations.js";

function opsOf(name: Parameters<typeof buildCanvasToolRequest>[0], input: Record<string, unknown>) {
    const request = buildCanvasToolRequest(name, input, null);
    return (request.input as { ops: Array<Record<string, any>> }).ops;
}

test("generation flow reuses referenced nodes when the prompt only mentions them", () => {
    const ops = opsOf("canvas_generate_image", { prompt: "@[node:text-1]", referenceNodeIds: ["text-1"], title: "Flow", autoRun: true });
    const addedTextNodes = ops.filter((op) => op.type === "add_node" && op.nodeType === "text");
    const config = ops.find((op) => op.type === "add_node" && op.nodeType === "config");
    const runs = ops.filter((op) => op.type === "run_generation");
    assert.equal(addedTextNodes.length, 0);
    assert.equal(ops.filter((op) => op.type === "connect_nodes" && op.fromNodeId === "text-1" && String(op.toNodeId).startsWith("config-")).length, 1);
    assert.match(String(config?.metadata?.prompt), /^@\[node:text-1\]$/);
    assert.equal(runs.length, 1);
});

test("generation flow still creates a prompt node for prose prompts", () => {
    const ops = opsOf("canvas_generate_image", { prompt: "a cat on a roof", referenceNodeIds: ["text-1"], autoRun: true });
    assert.equal(ops.filter((op) => op.type === "add_node" && op.nodeType === "text").length, 1);
    const config = ops.find((op) => op.type === "add_node" && op.nodeType === "config");
    assert.match(String(config?.metadata?.prompt), /@\[node:text-/);
});
import { CanvasOpSchema, CANVAS_ATOMIC_OPS } from "./atomic-schema.js";
import { canvasOpSchema, toolDescriptions } from "./schemas.js";
import { z } from "zod";

test("atomic MCP schema publishes all requested operations and rejects malformed payloads", () => {
  const expected = ["add_card", "update_card", "remove_card", "move_card", "resize_card", "lock_card", "unlock_card", "group_cards", "ungroup_cards", "align_cards", "distribute_cards", "reorder_layer", "connect_ports", "disconnect_ports", "update_edge", "set_viewport", "fit_view", "focus_card", "select_cards", "clear_selection", "duplicate_cards", "batch_apply", "undo", "redo", "export_canvas_json", "import_canvas_json", "export_canvas_png", "add_comment", "resolve_comment", "set_grid_mode", "set_snap_to_grid", "auto_layout", "tag_card", "untag_card"];
  const advertised = JSON.stringify(z.toJSONSchema(canvasOpSchema, { io: "input" }));
  for (const op of expected) { assert.ok(CANVAS_ATOMIC_OPS.includes(op as typeof CANVAS_ATOMIC_OPS[number]), op); assert.ok(advertised.includes(op), op); assert.ok(toolDescriptions.canvas_apply_ops.includes(op), op); }
  assert.equal(canvasOpSchema.safeParse({ type: "canvas_operation", operation: { op: "move_card", payload: { id: "a", x: "bad", y: 0 } } }).success, false);
  assert.equal(CanvasOpSchema.safeParse({ op: "lock_card", payload: { id: "a", unknown: true } }).success, false);
  assert.equal(CanvasOpSchema.safeParse({ op: "unknown", payload: {} }).success, false);
  assert.equal(canvasOpSchema.safeParse({ type: "canvas_operation", operation: { op: "add_comment", payload: { id: "c", cardId: "a", text: "review" } } }).success, true);
});
