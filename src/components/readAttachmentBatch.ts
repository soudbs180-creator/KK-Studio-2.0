import type { CreationAttachment } from "../features/creation/model";
import { storeGeneratedAsset } from "../features/creation/assetRepository";

/** Keep a failed batch out of the draft; local originals already archived remain intact. */
export async function readAttachmentBatch(
  files: File[],
  readers: Set<FileReader>,
): Promise<CreationAttachment[]> {
  const results = await Promise.allSettled(
    files.map(
      (file) =>
        new Promise<CreationAttachment>((resolve, reject) => {
          const reader = new FileReader();
          readers.add(reader);
          const fail = () =>
            reject(
              new Error(`${file.name} 读取或本地归档失败，本批图片未添加。`),
            );
          reader.onerror = fail;
          reader.onabort = fail;
          reader.onloadend = () => readers.delete(reader);
          reader.onload = async () => {
            try {
              const dataUrl = String(reader.result);
              const archived = await storeGeneratedAsset({
                source: dataUrl,
                sourceKind: "upload",
                isAiGenerated: false,
                tags: ["参考素材"],
                sourceJobId: "upload-" + crypto.randomUUID(),
              });
              resolve({
                id: "attachment-" + crypto.randomUUID(),
                assetId: archived.assetId,
                name: file.name,
                mime: file.type,
                size: file.size,
                dataUrl,
              });
            } catch {
              fail();
            }
          };
          reader.readAsDataURL(file);
        }),
    ),
  );
  const failed = results.find((item) => item.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  return results.flatMap((item) =>
    item.status === "fulfilled" ? [item.value] : [],
  );
}
