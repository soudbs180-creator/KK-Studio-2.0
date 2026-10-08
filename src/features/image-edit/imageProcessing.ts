import { assertImageDimensions, type MaskDocument } from "./mask.ts";
import type { EditCrop } from "./regions.ts";
import { blendMaskedPixels } from "./pixels.ts";
import { drawMaskAnnotation } from "./maskAnnotation.ts";
export class ImageEditMappingError extends Error {}
export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  assertImageDimensions(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前环境无法读取图片像素。");
  return context;
}
export async function decodeImage(
  source: string,
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  signal?.throwIfAborted();
  let url = source,
    temporary = false;
  if (!source.startsWith("data:image/")) {
    const parsed = new URL(source);
    if (!["https:", "http:"].includes(parsed.protocol))
      throw new Error("图片地址无效。");
    const response = await fetch(source, {
      signal,
      credentials: "omit",
      redirect: "error",
    });
    if (
      !response.ok ||
      Number(response.headers.get("Content-Length")) > 100 * 1024 * 1024
    )
      throw new Error("图片结果无法读取或过大。");
    const blob = await response.blob();
    if (blob.size > 100 * 1024 * 1024 || !blob.type.startsWith("image/"))
      throw new Error("图片结果格式不受支持。");
    url = URL.createObjectURL(blob);
    temporary = true;
  }
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    signal?.throwIfAborted();
    const canvas = makeCanvas(image.naturalWidth, image.naturalHeight);
    context2d(canvas).drawImage(image, 0, 0);
    return canvas;
  } finally {
    if (temporary) URL.revokeObjectURL(url);
  }
}
export function cropImage(
  source: HTMLCanvasElement,
  crop: EditCrop,
): HTMLCanvasElement {
  const scale = Math.min(1, 4096 / Math.max(crop.width, crop.height));
  const canvas = makeCanvas(
      Math.max(1, Math.round(crop.width * scale)),
      Math.max(1, Math.round(crop.height * scale)),
    ),
    ctx = context2d(canvas);
  const axis = (start: number, length: number, limit: number) => {
    const left = Math.max(0, -start),
      right = Math.max(0, start + length - limit),
      middle = length - left - right;
    return [
      { s: 0, n: 1, d: 0, l: left },
      { s: Math.max(0, start), n: middle, d: left, l: middle },
      { s: limit - 1, n: 1, d: length - right, l: right },
    ].filter((p) => p.l > 0);
  };
  for (const x of axis(crop.x, crop.width, source.width))
    for (const y of axis(crop.y, crop.height, source.height))
      ctx.drawImage(
        source,
        x.s,
        y.s,
        x.n,
        y.n,
        (x.d * canvas.width) / crop.width,
        (y.d * canvas.height) / crop.height,
        (x.l * canvas.width) / crop.width,
        (y.l * canvas.height) / crop.height,
      );
  return canvas;
}
export function drawMask(
  document: MaskDocument,
  crop: EditCrop,
  width: number,
  height: number,
  native = false,
): HTMLCanvasElement {
  const canvas = makeCanvas(width, height),
    ctx = context2d(canvas),
    sx = width / crop.width,
    sy = height / crop.height;
  if (native) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
  } else ctx.fillStyle = "white";
  for (const region of document.regions)
    if (crop.regionIds.includes(region.id))
      for (const [y, x, end] of region.runs) {
        const bounds = [
          (x - crop.x) * sx,
          (y - crop.y) * sy,
          (end - x) * sx,
          sy,
        ] as const;
        if (native) ctx.clearRect(...bounds);
        else ctx.fillRect(...bounds);
      }
  return canvas;
}
export function annotateImage(
  source: HTMLCanvasElement,
  document: MaskDocument,
  crop: EditCrop,
): HTMLCanvasElement {
  const canvas = cropImage(source, crop),
    ctx = context2d(canvas);
  ctx.save();
  ctx.scale(canvas.width / crop.width, canvas.height / crop.height);
  ctx.translate(-crop.x, -crop.y);
  drawMaskAnnotation(ctx, document, canvas.width / crop.width, crop.regionIds);
  ctx.restore();
  return canvas;
}
export function composePixels(
  original: HTMLCanvasElement,
  generated: HTMLCanvasElement,
  document: MaskDocument,
  crop: EditCrop,
  feather?: number,
): HTMLCanvasElement {
  if (
    Math.abs(
      generated.width / generated.height / (crop.width / crop.height) - 1,
    ) > 0.02
  )
    throw new ImageEditMappingError(
      "返回图片比例发生变化，无法可靠映射；原图已保留，请重新生成该区域。",
    );
  const mapped = makeCanvas(original.width, original.height);
  context2d(mapped).drawImage(
    generated,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
  );
  const full = {
    x: 0,
    y: 0,
    width: document.width,
    height: document.height,
    regionIds: crop.regionIds,
  };
  const maskData = context2d(
    drawMask(document, full, document.width, document.height),
  ).getImageData(0, 0, document.width, document.height).data;
  const mask = new Uint8Array(document.width * document.height);
  for (let i = 0; i < mask.length; i++) mask[i] = maskData[i * 4 + 3];
  const ctx = context2d(original),
    before = ctx.getImageData(0, 0, original.width, original.height),
    result = context2d(mapped).getImageData(
      0,
      0,
      original.width,
      original.height,
    );
  const bytes = blendMaskedPixels(
    before.data,
    result.data,
    mask,
    original.width,
    original.height,
    feather ??
      Math.min(
        8,
        Math.max(1, Math.round(Math.max(crop.width, crop.height) * 0.005)),
      ),
  );
  const output = makeCanvas(original.width, original.height);
  context2d(output).putImageData(
    new ImageData(
      new Uint8ClampedArray(bytes),
      original.width,
      original.height,
    ),
    0,
    0,
  );
  return output;
}
