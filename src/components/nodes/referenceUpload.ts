import type { CanvasReference } from "../../domain/canvasItems";
import { storeGeneratedAsset } from "../../features/creation/index.ts";

export async function readReferenceMedia(
  files: File[],
  slot?: CanvasReference["slot"],
): Promise<CanvasReference[]> {
  const allowed = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
  ]);
  if (
    files.some(
      (file) =>
        !allowed.has(file.type) ||
        file.size === 0 ||
        file.size > 10 * 1024 * 1024,
    )
  )
    throw new Error("请选择 10 MB 以内且不为空的图片、视频或音频参考素材。");
  return Promise.all(
    files.map(
      (file, index) =>
        new Promise<CanvasReference>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const preview = String(reader.result);
            void storeGeneratedAsset({
              source: preview,
              sourceJobId: `upload-${Date.now().toString(36)}`,
              tags: ["本地参考"],
              isAiGenerated: false,
              sourceKind: "upload",
            })
              .then((asset) =>
                resolve({
                  id: asset.assetId,
                  assetId: asset.assetId,
                  title: file.name,
                  preview: asset.preview,
                  kind: file.type.startsWith("audio/")
                    ? "audio"
                    : file.type.startsWith("video/")
                      ? "video"
                      : "image",
                  frame: file.type.startsWith("video/")
                    ? index === 0
                      ? "first"
                      : "last"
                    : undefined,
                  slot: index === 0 ? slot : undefined,
                }),
              )
              .catch(() => reject(new Error("参考素材本地归档失败，请重试。")));
          };
          reader.onerror = () =>
            reject(new Error("读取失败，请重新选择参考素材。"));
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export const readReferenceImages = readReferenceMedia;

/** Fill the two video-generation frame slots without reordering uploaded refs. */
export function assignVideoReferenceFrames(
  entries: CanvasReference[],
  existing: CanvasReference[],
): CanvasReference[] {
  const used = new Set(
    existing
      .map((reference) => reference.frame)
      .filter((frame): frame is "first" | "last" => Boolean(frame)),
  );
  return entries.map((entry) => {
    if (entry.kind === "audio" || entry.frame) return entry;
    const frame = !used.has("first")
      ? "first"
      : !used.has("last")
        ? "last"
        : undefined;
    if (frame) used.add(frame);
    return frame ? { ...entry, frame } : entry;
  });
}
