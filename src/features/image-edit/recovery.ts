import type { CreationTask } from "../creation/model.ts";
import { formatEditPrompt } from "./prompt.ts";
import { readImageEditContext, readImageEditSnapshot } from "./snapshot.ts";

/** The native journal remembers the role independently of the browser snapshot. */
export function editReceiptReason(
  task: Pick<CreationTask, "imageEdit" | "imageEditContext" | "prompt">,
  required?: boolean,
): string | undefined {
  try {
    const edit = readImageEditSnapshot(task.imageEdit);
    const context = readImageEditContext(task.imageEditContext);
    if (required === true && !edit)
      throw new Error("编辑快照缺失，不能发布未融合的裁剪结果。");
    if (required === false && edit)
      throw new Error("编辑快照与原生任务角色冲突。");
    // Legacy ordinary generation has no context. Legacy continuous editing
    // used this compiler: permit the exact whole-image body bound to its saved
    // instruction, including literal local-edit wording inside user text.
    // Asset tags are shared by content and cannot identify a task's role.
    if (required === undefined && context && !edit) {
      const wholeBody =
        context.lastInstruction === undefined
          ? undefined
          : formatEditPrompt({
              current: context.lastInstruction,
              local: false,
              instructions: [],
            });
      if (!wholeBody || !task.prompt.endsWith(wholeBody))
        throw new Error("旧编辑快照缺失或任务角色无法确认。");
    }
  } catch (error) {
    return `${error instanceof Error ? error.message : "编辑快照无效。"} 原件已保留，请先核对任务；不会自动重复提交。`;
  }
  return undefined;
}
