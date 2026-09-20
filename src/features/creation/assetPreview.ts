import { loadStoredAsset } from "./assetRepository.ts";

const MAX_PREVIEWS = 24;
const MAX_EDGE = 320;
const cache = new Map<string, string>();
let queue = Promise.resolve();
let generation = 0;

/** Disposable thumbnails never supply export/redraw bytes. Decode one original at a time. */
export function loadAssetPreview(
  assetId: string,
  mime: string,
  signal?: AbortSignal,
): Promise<string | null> {
  // Metadata decides whether a thumbnail is supported before reading bytes.
  if (!mime.startsWith("image/")) return Promise.resolve(null);
  const assertActive = () => {
    if (signal?.aborted)
      throw new DOMException("Preview cancelled", "AbortError");
  };
  const work = queue.then(async () => {
    assertActive();
    const cached = cache.get(assetId);
    if (cached) {
      cache.delete(assetId);
      cache.set(assetId, cached);
      return cached;
    }
    const version = generation;
    const original = await loadStoredAsset(assetId);
    assertActive();
    if (!original) throw new Error("素材原件缺失，请恢复后重试。");
    if (!original.mime.startsWith("image/")) return null;
    const image = new Image();
    try {
      image.src = original.preview;
      await image.decode();
      assertActive();
      const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前环境无法创建素材预览。");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const preview = canvas.toDataURL("image/webp", 0.75);
      if (version === generation) {
        cache.set(assetId, preview);
        while (cache.size > MAX_PREVIEWS)
          cache.delete(cache.keys().next().value!);
      }
      return preview;
    } finally {
      image.src = "";
    }
  });
  queue = work.then(
    () => undefined,
    () => undefined,
  );
  return work;
}

export function clearAssetPreviews(): void {
  generation++;
  cache.clear();
}
