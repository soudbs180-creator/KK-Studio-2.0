import type { CreationAttachment } from "./model.ts";
import type { StoredGeneratedAsset } from "./assetRepository.ts";
import { isAssetReference } from "./snapshotAssets.ts";
import { resolveTargetImageMime } from "./mediaAlphaPreservation.ts";

export async function resolveImageAttachments(
  attachments: CreationAttachment[],
  read: (id: string) => Promise<StoredGeneratedAsset | null>,
): Promise<CreationAttachment[]> {
  const resolved: CreationAttachment[] = [];
  for (const attachment of attachments) {
    let dataUrl = attachment.dataUrl;
    if (
      dataUrl &&
      isAssetReference(dataUrl) &&
      attachment.assetId &&
      dataUrl !== `kk-asset:${attachment.assetId}`
    )
      throw new Error("参考素材引用与身份不一致，未提交生成，请重新选择图片。");
    let asset: StoredGeneratedAsset | null = null;
    if (attachment.assetId && (!dataUrl || isAssetReference(dataUrl))) {
      asset = await read(attachment.assetId);
      if (!asset)
        throw new Error("参考素材原件缺失，未提交生成，请重新导入素材。");
      dataUrl = asset.preview;
    }
    if (!dataUrl || !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(dataUrl))
      throw new Error("参考素材无法读取，未提交生成，请重新选择图片。");

    const mimeMatch = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
    const extractedMime = mimeMatch ? mimeMatch[1] : (asset?.mime ?? attachment.mime);
    const hasAlpha =
      extractedMime.toLowerCase() === "image/png" ||
      extractedMime.toLowerCase() === "image/webp";
    const targetMime = resolveTargetImageMime(hasAlpha, attachment.mime || extractedMime);

    // Retain originalAssetId on derived edit tasks to prevent generational compression loss
    const originalAssetId =
      attachment.originalAssetId ??
      asset?.parentId ??
      attachment.assetId;

    resolved.push({
      ...attachment,
      dataUrl,
      mime: targetMime,
      ...(originalAssetId ? { originalAssetId } : {}),
    });
  }
  return resolved;
}

export function prepareAttachmentUpload(
  attachment: CreationAttachment,
  hasAlpha: boolean,
  originalAssetId?: string,
): CreationAttachment {
  const targetMime = resolveTargetImageMime(hasAlpha, attachment.mime);
  return {
    ...attachment,
    mime: targetMime,
    originalAssetId: originalAssetId ?? attachment.originalAssetId ?? attachment.assetId,
  };
}
