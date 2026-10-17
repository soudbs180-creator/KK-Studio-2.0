import { invariant } from "../storage/validation.ts";
export interface ImageSize {
  width: number;
  height: number;
}
/** Header bounds are checked before any bitmap is decoded. */
export function boundedImageSize(size: ImageSize, output = false): ImageSize {
  const edge = output ? 4096 : 8192;
  invariant(
    Number.isInteger(size.width) &&
      Number.isInteger(size.height) &&
      size.width > 0 &&
      size.height > 0 &&
      size.width <= edge &&
      size.height <= edge &&
      size.width * size.height <= 16 * 1024 * 1024,
    `图片尺寸超过本地编辑上限（边长 ${edge}，总像素 1600 万），原件保留。`,
  );
  return size;
}
function exifOrientation(
  bytes: Uint8Array,
  offset: number,
  length: number,
): number {
  if (
    length < 16 ||
    String.fromCharCode(...bytes.slice(offset + 2, offset + 8)) !== "Exif\0\0"
  )
    return 1;
  const base = offset + 8,
    end = offset + length;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const order = view.getUint16(base),
    little = order === 18761;
  invariant(
    (little || order === 19789) && view.getUint16(base + 2, little) === 42,
    "JPEG 方向元数据无效，原件保留。",
  );
  const directory = base + view.getUint32(base + 4, little);
  invariant(
    directory >= base + 8 && directory + 2 <= end,
    "JPEG 方向元数据越界。",
  );
  const count = view.getUint16(directory, little);
  invariant(directory + 2 + count * 12 <= end, "JPEG 方向元数据不完整。");
  for (let index = 0; index < count; index++) {
    const entry = directory + 2 + index * 12;
    if (view.getUint16(entry, little) !== 274) continue;
    invariant(
      view.getUint16(entry + 2, little) === 3 &&
        view.getUint32(entry + 4, little) === 1,
      "JPEG 方向元数据格式不支持，原件保留。",
    );
    const orientation = view.getUint16(entry + 8, little);
    invariant(orientation >= 1 && orientation <= 8, "JPEG 方向标记无效。");
    return orientation;
  }
  return 1;
}
export function imageSizeFromBytes(bytes: Uint8Array, mime: string): ImageSize {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    mime === "image/png" &&
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
  )
    return boundedImageSize({
      width: view.getUint32(16),
      height: view.getUint32(20),
    });
  if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) {
    let frame: ImageSize | undefined,
      orientation = 1;
    for (let offset = 2; offset + 4 < bytes.length;) {
      invariant(bytes[offset] === 255, "JPEG 尺寸头无效，原件保留。");
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = view.getUint16(offset);
      invariant(
        length >= 2 && offset + length <= bytes.length,
        "JPEG 尺寸头不完整。",
      );
      if (marker === 225) orientation = exifOrientation(bytes, offset, length);
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        invariant(length >= 8, "JPEG 尺寸头无效。");
        frame = {
          width: view.getUint16(offset + 5),
          height: view.getUint16(offset + 3),
        };
      }
      offset += length;
    }
    if (frame)
      return boundedImageSize(
        orientation >= 5 ? { width: frame.height, height: frame.width } : frame,
      );
  }
  if (
    mime === "image/webp" &&
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    if (kind === "VP8X")
      return boundedImageSize({
        width: 1 + bytes[24] + bytes[25] * 256 + bytes[26] * 65536,
        height: 1 + bytes[27] + bytes[28] * 256 + bytes[29] * 65536,
      });
    if (kind === "VP8L" && bytes[20] === 47)
      return boundedImageSize({
        width: 1 + (view.getUint32(21, true) & 16383),
        height: 1 + ((view.getUint32(21, true) >>> 14) & 16383),
      });
    if (
      kind === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    )
      return boundedImageSize({
        width: view.getUint16(26, true) & 16383,
        height: view.getUint16(28, true) & 16383,
      });
  }
  throw new Error(
    "此格式尚不能安全读取尺寸；本地编辑支持 PNG、JPEG、WebP，原件可继续分享。",
  );
}
