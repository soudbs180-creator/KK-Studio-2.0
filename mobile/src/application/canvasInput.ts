export function canvasInputNumber(
  text: string,
  maximum = 1e7,
  positive = false,
): number {
  const value = text.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(value))
    throw new Error("请输入明确的十进制数值，不能留空。");
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    Math.abs(number) > maximum ||
    (positive && number <= 0)
  )
    throw new Error(
      positive
        ? `请输入大于 0 且不超过 ${maximum} 的数值。`
        : `坐标绝对值不能超过 ${maximum}。原记录保留。`,
    );
  return number;
}
