import type { LocalPreviewSource } from "./MediaOriginalPreviewResource.ts";
export function createLocalPreviewSource(
  bytes: Uint8Array,
  mime: string,
): LocalPreviewSource {
  const uri = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: mime }),
  );
  return { uri, dispose: () => URL.revokeObjectURL(uri) };
}
