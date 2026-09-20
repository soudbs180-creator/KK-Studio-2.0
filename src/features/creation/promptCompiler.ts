export interface PromptCompileOptions {
  referenceCount?: number;
  operation?: "generate" | "edit" | "inpaint" | "outpaint";
  outputCount?: number;
  locale?: "zh-CN" | "en-US";
}

/**
 * Turns a short designer request into stable, model-readable sections while
 * preserving the user's wording. It does not invent people, brands or visual
 * constraints that were not supplied by the designer.
 */
export function compileDesignPrompt(
  prompt: string,
  options: PromptCompileOptions = {},
): string {
  const subject = prompt.trim();
  if (!subject) return "";
  const operation = options.operation ?? "generate";
  const references = Math.max(0, Math.floor(options.referenceCount ?? 0));
  const outputs = Math.max(
    1,
    Math.min(64, Math.floor(options.outputCount ?? 1)),
  );
  if (options.locale === "en-US")
    return [
      "Task: create a production-ready visual.",
      `Operation: ${operation}.`,
      `User brief: ${subject}`,
      references
        ? `References: use ${references} supplied reference image(s) for consistency; do not copy unrelated content.`
        : "References: none supplied.",
      `Deliverables: ${outputs} independent variation(s). Preserve subject identity, composition intent, and readable details from the brief.`,
    ].join("\n");
  return [
    "任务：生成可用于设计交付的视觉素材。",
    `操作：${operation}。`,
    `设计师原始需求：${subject}`,
    references
      ? `参考图：使用设计师提供的 ${references} 张参考图保持一致性，不引入无关内容。`
      : "参考图：本次未提供参考图。",
    `交付：${outputs} 个相互独立的变体；保持主体、构图意图和原始需求中的可读细节。`,
  ].join("\n");
}
