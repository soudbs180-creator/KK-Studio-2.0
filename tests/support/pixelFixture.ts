export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createPixelBuffer(
  width: number,
  height: number,
  fillColor?: RGBAColor,
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fillColor) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillColor.r;
      data[i + 1] = fillColor.g;
      data[i + 2] = fillColor.b;
      data[i + 3] = fillColor.a;
    }
  }
  return { width, height, data };
}
