import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as Crypto from "expo-crypto";
import { utf8ByteLength } from "../core/resultLimits.ts";
export async function pickPortableJson(): Promise<string | null> {
  const selected = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (selected.canceled) return null;
  const file = new File(selected.assets[0].uri);
  if (file.size <= 0 || file.size > 8 * 1024 * 1024)
    throw new Error("导入文件须为 8 MB 以内的 JSON。");
  return file.text();
}
export async function sharePortableText(
  payload: string,
  name: string,
  isCurrent: () => boolean,
  mime = "text/plain",
  maxBytes = 8 * 1024 * 1024,
): Promise<void> {
  if (utf8ByteLength(payload) > maxBytes)
    throw new Error(`导出内容超过 ${maxBytes / 1024 / 1024} MB，内容保留。`);
  if (!isCurrent()) throw new Error("会话已变化，导出分享已停止。");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("当前设备的文件分享不可用。");
  if (!isCurrent()) throw new Error("会话已变化，导出分享已停止。");
  const suffix = name.endsWith(".json") ? ".json" : ".txt";
  const file = new File(
    Paths.cache,
    `kk-export-${Crypto.randomUUID()}${suffix}`,
  );
  file.create();
  file.write(payload);
  if (!isCurrent()) throw new Error("会话已变化，导出分享已停止。");
  await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: name });
}
