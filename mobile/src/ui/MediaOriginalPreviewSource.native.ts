import { File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import type { LocalPreviewSource } from "./MediaOriginalPreviewResource.ts";

export function createLocalPreviewSource(
  bytes: Uint8Array,
  mime: string,
): LocalPreviewSource {
  const extensions: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
  };
  const file = new File(
    Paths.cache,
    `kk-preview-${Crypto.randomUUID()}.${extensions[mime] ?? "bin"}`,
  );
  file.create();
  try {
    file.write(bytes);
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
  return {
    uri: file.uri,
    dispose: () => {
      if (file.exists) file.delete();
    },
  };
}
