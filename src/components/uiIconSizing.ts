export type UiIconSize = 16 | 20 | 24;
export type UiIconSizeName = "sm" | "md" | "lg";

const ICON_SIZES: readonly UiIconSize[] = [16, 20, 24];

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
  if (size <= 16) return "sm";
  if (size >= 24) return "lg";
  return "md";
}
