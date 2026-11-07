// Generated from src/domain/canvasOperationSchema.ts by scripts/agent/sync-canvas-schema.mjs.
import { z } from "zod";
const CANVAS_REFERENCE_SLOTS = ["主体", "风格", "材质", "构图", "Mask"] as const;
import { blueprintNodeSchema } from "./blueprint-schema.js";
const id = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((s) => !["__proto__", "prototype", "constructor"].includes(s));
const ids = z
  .array(id)
  .min(1)
  .max(500)
  .refine((s) => new Set(s).size === s.length);
const number = z.number().finite().min(-1e7).max(1e7);
const point = z.object({ x: number, y: number }).strict();
const size = z.object({
  width: z.number().finite().min(80).max(4000),
  height: z.number().finite().min(44).max(4000),
});
const patch = z
  .object({
    title: z.string().max(160).optional(),
    description: z.string().max(500).optional(),
    prompt: z.string().max(4000).optional(),
    referenceSlot: z.enum(CANVAS_REFERENCE_SLOTS).optional(),
  })
  .strict()
  .refine((s) => Object.keys(s).length > 0);
const card = z
  .object({
    blueprint: blueprintNodeSchema.optional(),
    id,
    kind: z.enum(["text", "image", "video", "audio"]),
    title: z.string().min(1).max(160),
    description: z.string().max(500).default(""),
    prompt: z.string().max(4000).optional(),
    assetId: id.optional(),
    referenceOnly: z.boolean().optional(),
    referenceSlot: z.enum(CANVAS_REFERENCE_SLOTS).optional(),
  })
  .strict();
const operation = <N extends string, T extends z.ZodRawShape>(
  op: N,
  shape: T,
) =>
  z.object({ op: z.literal(op), payload: z.object(shape).strict() }).strict();

const legacyOptions = [
  operation("add_card", { card, position: point }),
  operation("delete_card", { id }),
  operation("update_card", { id, patch }),
  operation("move_card", { id, ...point.shape }),
  operation("resize_card", { id, ...size.shape }),
  operation("connect_cards", {
    id,
    source: id,
    target: id,
    kind: z.enum(["reference", "result"]).default("reference"),
  }),
  operation("disconnect_cards", { id }),
  operation("group_cards", {
    id,
    ids: ids.refine((s) => s.length <= 200),
    name: z.string().min(1).max(120),
  }),
  operation("ungroup_cards", { id }),
  operation("set_viewport", { ...point.shape, zoom: z.number().finite() }),
  operation("reset_viewport", {}),
  operation("fit_view", {}),
  operation("select_nodes", {
    ids: z.array(id).max(500),
    append: z.boolean().default(false),
  }),
  operation("clear_selection", {}),
  operation("align_nodes_horizontal", { ids }),
  operation("align_nodes_vertical", { ids }),
  operation("distribute_nodes", { ids, axis: z.enum(["x", "y"]) }),
  operation("duplicate_node", { id, newId: id }),
  operation("lock_node", { id }),
  operation("unlock_node", { id }),
  operation("set_card_color", {
    id,
    color: z.enum(["default", "accent", "warning", "success"]),
  }),
  operation("add_asset_attachment", {
    id,
    sourceId: id,
    slot: z.enum(CANVAS_REFERENCE_SLOTS),
  }),
  operation("remove_asset_attachment", { id, sourceId: id }),
  operation("create_frame", {
    id,
    ids: ids.refine((s) => s.length <= 200),
    name: z.string().min(1).max(120),
  }),
  operation("export_canvas_image", {}),
  operation("export_canvas_json", {}),
  operation("import_canvas_json", {
    snapshot: z.json().optional(),
    document: z
      .object({
        version: z.literal(1),
        cards: z.array(card).max(500),
        positions: z.record(id, point),
        edges: z
          .array(
            z
              .object({
                id,
                source: id,
                target: id,
                kind: z.enum(["reference", "result"]).optional(),
              })
              .strict(),
          )
          .max(2000),
      })
      .strict(),
  }),
  operation("undo", {}),
  operation("redo", {}),
  operation("set_grid_snap", { enabled: z.boolean() }),
  operation("toggle_mini_map", { visible: z.boolean() }),
  operation("focus_node", { id }),
  operation("batch_transform", { ids, dx: number, dy: number }),
  operation("reorder_z_index", { id, index: z.number().int().min(0).max(499) }),
] as const;
const extendedOptions = [
  operation("remove_card", { id }),
  operation("lock_card", { id }),
  operation("unlock_card", { id }),
  operation("align_cards", { ids, axis: z.enum(["x", "y"]) }),
  operation("distribute_cards", { ids, axis: z.enum(["x", "y"]) }),
  operation("reorder_layer", { id, index: z.number().int().min(0).max(499) }),
  operation("connect_ports", {
    id,
    source: id,
    target: id,
    kind: z.enum(["reference", "result"]).default("reference"),
  }),
  operation("disconnect_ports", { id }),
  operation("update_edge", {
    id,
    patch: z
      .object({
        source: id.optional(),
        target: id.optional(),
        kind: z.enum(["reference", "result"]).optional(),
      })
      .strict()
      .refine((p) => Object.keys(p).length > 0),
  }),
  operation("focus_card", { id }),
  operation("select_cards", {
    ids: z.array(id).max(500),
    append: z.boolean().default(false),
  }),
  operation("duplicate_cards", {
    items: z
      .array(z.object({ id, newId: id }).strict())
      .min(1)
      .max(500),
  }),
  operation("export_canvas_png", {}),
  operation("add_comment", {
    id,
    cardId: id,
    text: z.string().trim().min(1).max(2000),
  }),
  operation("resolve_comment", {
    cardId: id,
    id,
    resolved: z.boolean().default(true),
  }),
  operation("set_grid_mode", { mode: z.enum(["dots", "grid"]) }),
  operation("set_snap_to_grid", { enabled: z.boolean() }),
  operation("auto_layout", {
    ids: ids.optional(),
    direction: z.enum(["LR", "TB"]).default("LR"),
  }),
  operation("tag_card", { id, tag: z.string().trim().min(1).max(40) }),
  operation("untag_card", { id, tag: z.string().trim().min(1).max(40) }),
] as const;
const atomicSchema = z.discriminatedUnion("op", [
  ...legacyOptions,
  ...extendedOptions,
]);
export const CanvasOpSchema = z.discriminatedUnion("op", [
  ...legacyOptions,
  ...extendedOptions,
  operation("batch_apply", {
    operations: z.array(atomicSchema).min(1).max(500),
  }),
]);
export type CanvasOperation = z.infer<typeof CanvasOpSchema>;
export const CANVAS_34_OPS = legacyOptions.map(
  (schema) => schema.shape.op.value,
);

export const CANVAS_ATOMIC_OPS = CanvasOpSchema.options.map(
  (schema) => schema.shape.op.value,
);
