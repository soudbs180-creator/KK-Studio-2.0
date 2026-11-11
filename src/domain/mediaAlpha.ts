/**
 * Media Alpha Transparency Preservation & Adaptive Resizing (R4)
 *
 * Guarantees that images containing transparent pixels maintain an alpha-capable
 * MIME type (PNG or WebP), preventing black matte artifact generation in JPEG encoders.
 * Provides exact-aspect-ratio adaptive dimension clamping for edge-constrained pipelines.
 */

export interface AdaptiveDimensions {
  width: number;
  height: number;
}

/**
 * Resolves the appropriate target MIME type based on transparency detection.
 *
 * - When `hasAlpha` is true: Target MIME MUST be `image/png` or `image/webp`.
 *   NEVER `image/jpeg` (which converts transparent pixels to a black matte).
 * - When `hasAlpha` is false: Allows `image/jpeg` or `image/webp` (or `image/png`).
 */
export function resolveTargetImageMime(
  hasAlpha: boolean,
  preferredMime?: string,
): string {
  const normalized = preferredMime?.toLowerCase().trim();
  if (hasAlpha) {
    if (normalized === "image/webp") {
      return "image/webp";
    }
    // Rejects image/jpeg or unsupported mime when alpha exists, ensuring alpha preservation.
    return "image/png";
  }

  // When no alpha channel or fully opaque, allow JPEG or WebP
  if (normalized === "image/webp") {
    return "image/webp";
  }
  if (normalized === "image/png") {
    return "image/png";
  }
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return "image/jpeg";
  }
  return "image/jpeg";
}

/**
 * Calculates adaptive resize dimensions:
 * - Keeps exact aspect ratio.
 * - Clamps longest edge to `maxEdge`.
 */
export function calculateAdaptiveResize(
  width: number,
  height: number,
  maxEdge: number,
): AdaptiveDimensions {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(maxEdge) ||
    width <= 0 ||
    height <= 0 ||
    maxEdge <= 0
  ) {
    throw new Error("图片尺寸与最大边限制必须为大于零的有效数字。");
  }

  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxEdge) {
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const scale = maxEdge / longestEdge;
  if (width >= height) {
    return {
      width: Math.round(maxEdge),
      height: Math.max(1, Math.round(height * scale)),
    };
  }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.round(maxEdge),
  };
}

/**
 * Detects whether an RGBA pixel buffer has any transparency.
 * Scans the alpha channel (every 4th byte, starting at index 3).
 * Returns true if any pixel has alpha < 250.
 */
export function detectAlphaTransparency(
  imageData: Uint8ClampedArray | Buffer | Uint8Array,
): boolean {
  const len = imageData.length;
  for (let i = 3; i < len; i += 4) {
    if (imageData[i] < 250) {
      return true;
    }
  }
  return false;
}
