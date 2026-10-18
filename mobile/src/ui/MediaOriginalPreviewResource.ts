import type { MobileRepository } from "../storage/repository.ts";
import { invariant } from "../storage/validation.ts";
export interface LocalPreviewSource {
  uri: string;
  dispose(): void;
}
/** A late original read never creates or publishes a source for a changed account. */
export async function verifiedPreviewSource(
  repository: Pick<MobileRepository, "readOriginal">,
  assetId: string,
  valid: () => boolean,
  create: (bytes: Uint8Array) => LocalPreviewSource,
): Promise<LocalPreviewSource> {
  invariant(valid(), "预览已取消或登录会话已变化。");
  const bytes = await repository.readOriginal(assetId);
  invariant(valid(), "预览已取消或登录会话已变化。");
  const source = create(bytes);
  if (!valid()) {
    source.dispose();
    throw new Error("预览已取消或登录会话已变化。");
  }
  return source;
}
