/** Feathering distance is measured inward. Zero mask copies all four original bytes. */
export function blendMaskedPixels(
  original: Uint8ClampedArray,
  generated: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number,
  feather = 4,
): Uint8ClampedArray {
  if (
    original.length !== width * height * 4 ||
    generated.length !== original.length ||
    mask.length !== width * height
  )
    throw new Error("融合图片或蒙版尺寸不匹配。");
  const distance = new Uint16Array(mask.length),
    limit = Math.max(1, Math.min(64, Math.round(feather)));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i])
        distance[i] = Math.min(
          x ? distance[i - 1] + 1 : 1,
          y ? distance[i - width] + 1 : 1,
          limit,
        );
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (mask[i])
        distance[i] = Math.min(
          distance[i],
          x + 1 < width ? distance[i + 1] + 1 : 1,
          y + 1 < height ? distance[i + width] + 1 : 1,
        );
    }
  const output = new Uint8ClampedArray(original);
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      const alpha = (mask[i] / 255) * Math.min(1, distance[i] / limit);
      for (let c = 0; c < 4; c++)
        output[i * 4 + c] = Math.round(
          original[i * 4 + c] * (1 - alpha) + generated[i * 4 + c] * alpha,
        );
    }
  return output;
}
