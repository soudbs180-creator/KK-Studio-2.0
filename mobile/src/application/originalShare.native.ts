import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Crypto from "expo-crypto";
import type { ShareableOriginal } from "./materialWorkflows.ts";
export async function shareVerifiedOriginal(
  original: ShareableOriginal,
  isCurrent: () => boolean,
): Promise<void> {
  if (!isCurrent()) throw new Error("会话已变化，分享已停止。");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("当前设备文件分享不可用。");
  if (!isCurrent()) throw new Error("会话已变化，分享已停止。");
  const suffix =
    original.asset.mime
      .split("/")[1]
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12) || "bin";
  const file = new File(
    Paths.cache,
    `kk-share-${Crypto.randomUUID()}.${suffix}`,
  );
  file.create();
  file.write(original.bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType: original.asset.mime,
    dialogTitle: original.asset.name,
  });
}
