import type { CreationAttachment } from "./model.ts";
import type { StoredGeneratedAsset } from "./assetRepository.ts";
import { isAssetReference } from "./snapshotAssets.ts";

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
    if (attachment.assetId && (!dataUrl || isAssetReference(dataUrl))) {
      const asset = await read(attachment.assetId);
      if (!asset)
        throw new Error("参考素材原件缺失，未提交生成，请重新导入素材。");
      dataUrl = asset.preview;
    }
    if (!dataUrl || !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(dataUrl))
      throw new Error("参考素材无法读取，未提交生成，请重新选择图片。");
    resolved.push({ ...attachment, dataUrl });
  }
  return resolved;
}
