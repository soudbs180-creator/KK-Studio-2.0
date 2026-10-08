import { nextColorLabel, type MaskDocument } from "./mask.ts";
export interface RegionInstruction {
  regionId: string;
  label: string;
  text: string;
}
export function compileEditPrompt(
  prompt: string,
  document: MaskDocument,
): { prompt: string; instructions: RegionInstruction[]; regionIds: string[] } {
  const colors = document.regions.filter((r) => r.color);
  const instructions = new Map<string, RegionInstruction>();
  for (const region of colors)
    if (region.instruction?.trim())
      instructions.set(region.id, {
        regionId: region.id,
        label: nextColorLabel(region.colorName!, region.number!),
        text: region.instruction.trim(),
      });
  const matches = [...prompt.matchAll(/@([^\s@，,；;]+)/gu)];
  for (let i = 0; i < matches.length; i++) {
    const marker = matches[i][1],
      candidates = colors.filter(
        (r) =>
          r.colorName === marker ||
          nextColorLabel(r.colorName!, r.number!) === marker,
      );
    if (candidates.length !== 1)
      throw new Error(
        candidates.length
          ? `@${marker} 对应多个色块，请使用编号或选择具体色块。`
          : `@${marker} 色块不存在或已删除，请修正引用。`,
      );
    const region = candidates[0],
      start = matches[i].index! + matches[i][0].length,
      end = matches[i + 1]?.index ?? prompt.length;
    const text = prompt
      .slice(start, end)
      .trim()
      .replace(/[；;，,]+$/u, "")
      .trim();
    if (text)
      instructions.set(region.id, {
        regionId: region.id,
        label: nextColorLabel(region.colorName!, region.number!),
        text,
      });
    else if (!instructions.has(region.id))
      throw new Error(`请填写 ${marker} 的修改意见。`);
  }
  const global = matches.length
    ? prompt.slice(0, matches[0].index).trim()
    : prompt.trim();
  return {
    prompt: global,
    instructions: [...instructions.values()],
    regionIds: document.regions
      .filter((r) => !r.color || instructions.has(r.id))
      .map((r) => r.id),
  };
}
export function formatEditPrompt(options: {
  current: string;
  originalPrompt?: string;
  previous?: string;
  local: boolean;
  instructions: RegionInstruction[];
}): string {
  const required = [
    "任务：在提供的当前原图上进行图片编辑。",
    options.local
      ? "只修改蒙版指定区域；标注图仅用于定位，颜色与编号不属于最终画面。保持区域外主体、背景、构图和像素位置不变。"
      : "按本轮要求修改当前图片，保持未要求改变的原始约束。",
    `本轮修改：${options.current || "按各区域修改意见执行"}`,
    ...options.instructions.map((i) => `区域 ${i.label}：${i.text}`),
    "图片角色：第一张为当前待编辑原图；标注图与蒙版描述对应同一坐标，后续参考图仅按本轮要求使用。不要将标注颜色、字母或边框绘制到成品。",
  ]
    .filter(Boolean)
    .join("\n");
  if (required.length > 3800)
    throw new Error(
      "本轮修改与区域指令合计过长，请缩短修改意见后发送；草稿已保留。",
    );
  let budget = 4000 - required.length - 64;
  const original =
    options.originalPrompt?.slice(
      0,
      Math.min(
        1500,
        Math.floor(budget * (options.previous?.trim() ? 0.75 : 1)),
      ),
    ) ?? "";
  budget -= original.length;
  const previous = options.previous?.slice(0, Math.min(600, budget)) ?? "";
  return [
    original ? `初始设计约束：${original}` : "",
    previous ? `最近已完成的修改（当前原图已体现）：${previous}` : "",
    required,
  ]
    .filter(Boolean)
    .join("\n");
}
