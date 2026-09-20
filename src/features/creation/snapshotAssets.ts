import type { CreationAttachment, CreationSnapshot } from "./model.ts";
import type { StoredGeneratedAsset } from "./assetRepository.ts";

type ReadAsset = (id: string) => Promise<StoredGeneratedAsset | null>;
const PREFIX = "kk-asset:";
const ID = /^asset-[a-f0-9]{24}$/;
export function isAssetReference(value: string): boolean {
  return value.startsWith(PREFIX) && ID.test(value.slice(PREFIX.length));
}

/** Only media fields are transformed: user text, demo paths and unrelated posters stay intact. */
async function transformSnapshot(
  snapshot: CreationSnapshot,
  read: ReadAsset,
  encode: boolean,
): Promise<CreationSnapshot> {
  const copy = structuredClone(snapshot);
  const cache = new Map<string, Promise<StoredGeneratedAsset | null>>();
  const get = (id: string) => {
    if (!cache.has(id)) cache.set(id, read(id));
    return cache.get(id)!;
  };
  async function media(
    value: string | undefined,
    assetId?: string,
  ): Promise<string | undefined> {
    if (!value) return value;
    if (isAssetReference(value)) {
      const id = value.slice(PREFIX.length);
      if (assetId && assetId !== id)
        throw new Error("corrupt: 素材引用与assetId不一致。");
      const stored = await get(id);
      if (!stored)
        throw new Error("corrupt: 项目引用的本地素材缺失，原项目已保留。");
      return encode ? value : stored.preview;
    }
    if (!encode || !assetId || !ID.test(assetId) || !value.startsWith("data:"))
      return value;
    const stored = await get(assetId);
    // Existing embedded media is not an implicit migration from a WebView archive.
    if (!stored) return value;
    if (stored.preview !== value)
      throw new Error("corrupt: 项目媒体与归档原件不一致，未改写项目。");
    return `${PREFIX}${assetId}`;
  }
  async function attachments(items: CreationAttachment[]): Promise<void> {
    for (const attachment of items)
      attachment.dataUrl = await media(attachment.dataUrl, attachment.assetId);
  }
  await attachments(copy.homeDraft.attachments);
  for (const project of copy.projects) {
    await attachments(project.attachments);
    await attachments(project.composerDraft.attachments);
    for (const task of project.tasks) await attachments(task.attachments);
    for (const item of project.items) {
      // An image preview is the archived image itself. Video/audio posters are separate assets.
      if (item.kind === "image")
        item.preview = await media(item.preview, item.assetId);
      if (item.result)
        item.result.src = await media(item.result.src, item.assetId);
    }
  }
  return copy;
}

export const encodeSnapshotAssets = (
  snapshot: CreationSnapshot,
  read: ReadAsset,
) => transformSnapshot(snapshot, read, true);
export const hydrateSnapshotAssets = (
  snapshot: CreationSnapshot,
  read: ReadAsset,
) => transformSnapshot(snapshot, read, false);
