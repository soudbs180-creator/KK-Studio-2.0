import type { ModelSelection } from "../../domain/modelSelection.ts";

export function codexHomeValidation(
  draft: { privacyMode: string; outputCount: number },
  selection: ModelSelection,
): { privacy?: string; count?: string } {
  if (selection.source === "api") return {};
  return {
    privacy:
      draft.privacyMode !== "byok_local"
        ? "Codex 账号生图需要发送当前提示词与所选参考图；请使用 BYOK 本地模式。"
        : undefined,
    count:
      !Number.isInteger(draft.outputCount) ||
      draft.outputCount < 1 ||
      draft.outputCount > 4
        ? `当前草稿为 ${draft.outputCount} 张，Codex 内置生图每次支持 1 至 4 张；原数量已保留。`
        : undefined,
  };
}

/** An image capability is an instruction, never a Codex reasoning model slug. */
export function codexGenerationPrompt(
  prompt: string,
  selection: ModelSelection,
  count = 1,
): string {
  if (selection.source === "api") throw new Error("API 选择不能提交到 Codex。");
  if (selection.kind !== "image") return prompt;
  if (!Number.isInteger(count) || count < 1 || count > 4)
    throw new Error("Codex 内置生图每次支持 1 至 4 张图片。");
  return `使用 Codex/ChatGPT 账号内置 imagegen/image_generation 生成 ${count} 张图片。不要调用 KK 的 run_generation 或任何外部生成 API，不使用脚本绘图或创建空占位节点。完成图片由 KK 自动归档到当前画布。\n用户提示词：${prompt}`;
}

export function codexReasoningModel(
  selection: ModelSelection,
): string | undefined {
  return selection.source === "codex" && selection.kind !== "image"
    ? selection.model || undefined
    : undefined;
}
