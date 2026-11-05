import type { CanvasOperation } from "./canvasOperationSchema.ts";
import type { CanvasOperationState } from "./canvasOperationState.ts";

export function mutateCanvasAnnotations(
  next: CanvasOperationState,
  op: CanvasOperation,
): boolean {
  if (op.op === "set_grid_mode") {
    next.gridMode = op.payload.mode;
    return true;
  }
  if (
    !["add_comment", "resolve_comment", "tag_card", "untag_card"].includes(
      op.op,
    )
  )
    return false;
  if (op.op === "add_comment" || op.op === "resolve_comment") {
    const item = writableItem(next, op.payload.cardId);
    if (op.op === "add_comment") {
      if (
        (item.comments?.length ?? 0) >= 100 ||
        item.comments?.some((c) => c.id === op.payload.id)
      )
        throw new Error("评论数量超限或 ID 重复");
      (item.comments ??= []).push({
        id: op.payload.id,
        text: op.payload.text,
        resolved: false,
      });
    } else {
      const comment = item.comments?.find((c) => c.id === op.payload.id);
      if (!comment) throw new Error("评论不存在");
      comment.resolved = op.payload.resolved;
    }
    return true;
  }
  if (op.op === "tag_card" || op.op === "untag_card") {
    const item = writableItem(next, op.payload.id);
    const tags = new Set(item.tags);
    if (op.op === "tag_card") tags.add(op.payload.tag);
    else tags.delete(op.payload.tag);
    if (tags.size > 32) throw new Error("最多32个标签");
    item.tags = [...tags];
    return true;
  }
  return false;
}

function writableItem(state: CanvasOperationState, id: string) {
  const item = state.items.find((i) => i.id === id);
  if (!item || item.canvasPresentation?.locked)
    throw new Error("节点不存在或已锁定");
  return item;
}
