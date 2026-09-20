import type { CanvasReference } from "../../domain/canvasItems";
import { storeGeneratedAsset } from "../../features/creation/assetRepository";

export async function readReferenceImages(
  files: File[],
  slot?: CanvasReference["slot"],
): Promise<CanvasReference[]> {
  const allowed = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]);
  if (
    files.some(
      (file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024,
    )
  )
    throw new Error("请选择 10 MB 以内的 PNG、JPG、WebP 或 GIF 参考图片。");
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
                  slot: index === 0 ? slot : undefined,
                }),
              )
              .catch(() => reject(new Error("参考图片本地归档失败，请重试。")));
          };
          reader.onerror = () =>
            reject(new Error("读取失败，请重新选择图片。"));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
