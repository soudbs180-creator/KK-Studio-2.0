/** Pure media geometry helpers shared by the canvas domain and UI adapters. */
export function aspectRatioForDimensions(
  width: number,
  height: number,
): number {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return 1;
  return Math.max(0.25, Math.min(4, width / height));
}
