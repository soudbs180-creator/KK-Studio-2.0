import type { CreationTask } from "../creation/model.ts";
import { formatEditPrompt } from "./prompt.ts";
import {
  readImageEditContext,
  readImageEditSnapshot,
  type ImageEditContext,
} from "./snapshot.ts";

function isLegacyWholeEdit(prompt: string, context: ImageEditContext): boolean {
  if (context.lastInstruction === undefined) return false;
  const options = {
    current: context.lastInstruction,
    originalPrompt: context.originalPrompt,
    local: false,
    instructions: [],
  };
  const body = formatEditPrompt({ ...options, originalPrompt: undefined });
  if (prompt === formatEditPrompt(options)) return true;
  const bodyHeads = [true, false].map(
    (local) =>
      formatEditPrompt({ current: "", local, instructions: [] })
        .split("\n")
        .slice(0, 2)
        .join("\n") + "\n本轮修改：",
  );
  // The compiler budgets the root differently for trimmed/non-trimmed recent
  // text. Derive both exact prefixes from it, then recompile the entire prompt.
  for (const sample of ["x", " "]) {
    const example = formatEditPrompt({ ...options, previous: sample });
    const tail = `${sample}\n${body}`;
    if (!example.endsWith(tail)) continue;
    const prefix = example.slice(0, -tail.length);
    if (!prompt.startsWith(prefix) || !prompt.endsWith(`\n${body}`)) continue;
    const previous = prompt.slice(prefix.length, -body.length - 1);
    // A second compiler body in recent text makes the legacy boundary
    // ambiguous. A quoted body in the known root/current text is still valid.
    if (
      previous.length > 600 ||
      bodyHeads.some(
        (head) => previous.startsWith(head) || previous.includes(`\n${head}`),
      )
    )
      continue;
    if (prompt === formatEditPrompt({ ...options, previous })) return true;
  }
  return false;
}

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
    // used this compiler: require the complete prompt bound to its saved root
    // and instruction; a quoted whole-image suffix alone cannot prove role.
    // Asset tags are shared by content and cannot identify a task's role.
    if (required === undefined && context && !edit) {
      if (!isLegacyWholeEdit(task.prompt, context))
        throw new Error("旧编辑快照缺失或任务角色无法确认。");
    }
  } catch (error) {
    return `${error instanceof Error ? error.message : "编辑快照无效。"} 原件已保留，请先核对任务；不会自动重复提交。`;
  }
  return undefined;
}
