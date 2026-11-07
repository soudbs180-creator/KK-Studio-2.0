export type UiIconSize = 12 | 16 | 20 | 24 | 28 | 32;
export type UiIconSizeName = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

const ICON_SIZES: readonly UiIconSize[] = [12, 16, 20, 24, 28, 32];

export function normalizeUiIconSize(size = 20): UiIconSize {
  return ICON_SIZES.reduce(
    (closest, candidate) =>
      Math.abs(candidate - size) < Math.abs(closest - size)
        ? candidate
        : closest,
    20 as UiIconSize,
  );
}

export function getUiIconSizeName(size: UiIconSize): UiIconSizeName {
  if (size <= 12) return "xs";
  if (size <= 16) return "sm";
  if (size === 28) return "xl";
  if (size === 32) return "xxl";
  if (size >= 24) return "lg";
  return "md";
}
