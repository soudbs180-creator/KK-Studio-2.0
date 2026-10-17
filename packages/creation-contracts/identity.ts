/** Platform-independent media identity; values retain the KK canvas contract. */
export type CanvasItemKind = "image" | "video" | "audio" | "text";
export const CANVAS_REFERENCE_SLOTS = [
  "主体",
  "风格",
  "材质",
  "构图",
  "Mask",
] as const;
export type CanvasReferenceSlot = (typeof CANVAS_REFERENCE_SLOTS)[number];
export type ApprovalGate =
  | "high_cost_batch"
  | "remote_transfer"
  | "overwrite_original"
  | "external_share"
  | "account_or_billing_change";
