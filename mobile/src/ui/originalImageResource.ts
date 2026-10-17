import type { MobileRepository } from "../storage/repository.ts";
import { loadPreviewImage, type ImageSizeReader } from "./imageDimensions.ts";
import {
  verifiedPreviewSource,
  type LocalPreviewSource,
} from "./MediaOriginalPreviewResource.ts";

/** Native sizing requires a local file URI; the disposable source owns its lifetime. */
export async function originalImageResource(
  repository: Pick<MobileRepository, "readOriginal">,
  assetId: string,
  valid: () => boolean,
  create: (bytes: Uint8Array) => LocalPreviewSource,
  getSize: ImageSizeReader,
) {
  const source = await verifiedPreviewSource(
    repository,
    assetId,
    valid,
    create,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const size = await Promise.race([
      loadPreviewImage(source.uri, getSize, valid),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("图片尺寸读取超时，原件保留。")),
          15000,
        );
      }),
    ]);
    if (!size) {
      source.dispose();
      return undefined;
    }
    return { ...source, ...size };
  } catch (error) {
    source.dispose();
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
