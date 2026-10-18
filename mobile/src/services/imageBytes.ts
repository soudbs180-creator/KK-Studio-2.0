import { ServiceError } from "./httpClient.ts";
import type { ImageOriginal } from "./providerTypes.ts";
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function decodeBase64(value: string): Uint8Array {
  if (
    value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    ) ||
    !value
  )
    throw new ServiceError("INVALID_IMAGE_BASE64");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const output = new Uint8Array((value.length / 4) * 3 - padding);
  let offset = 0;
  for (let index = 0; index < value.length; index += 4) {
    const bits =
      (alphabet.indexOf(value[index]) << 18) |
      (alphabet.indexOf(value[index + 1]) << 12) |
      (Math.max(0, alphabet.indexOf(value[index + 2])) << 6) |
      Math.max(0, alphabet.indexOf(value[index + 3]));
    for (const shift of [16, 8, 0])
      if (offset < output.length) output[offset++] = (bits >>> shift) & 255;
  }
  return output;
}
export function imageMime(bytes: Uint8Array): ImageOriginal["mime"] {
  const ascii = (start: number, count: number) =>
    String.fromCharCode(...bytes.slice(start, start + count));
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length >= 45 &&
    signature.every((value, index) => bytes[index] === value) &&
    ascii(12, 4) === "IHDR" &&
    ascii(bytes.length - 8, 4) === "IEND"
  )
    return "image/png";
  if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217
  )
    return "image/jpeg";
  if (
    bytes.length >= 14 &&
    ["GIF87a", "GIF89a"].includes(ascii(0, 6)) &&
    bytes[bytes.length - 1] === 59
  )
    return "image/gif";
  if (
    bytes.length >= 20 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP" &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      4,
      true,
    ) +
      8 ===
      bytes.length
  )
    return "image/webp";
  throw new ServiceError("INVALID_IMAGE_SIGNATURE");
}
