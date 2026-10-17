import * as DocumentPicker from "expo-document-picker";
import { utf8ByteLength } from "../core/resultLimits.ts";
export async function pickPortableJson(): Promise<string | null> {
  const selected = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    multiple: false,
    base64: false,
  });
  if (selected.canceled) return null;
  const file = selected.assets[0].file;
  if (!file || file.size <= 0 || file.size > 8 * 1024 * 1024)
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
  if (!isCurrent()) throw new Error("会话已变化，导出保存已停止。");
  const url = URL.createObjectURL(new Blob([payload], { type: mime }));
  let handedOff = false;
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    if (!isCurrent()) throw new Error("会话已变化，导出保存已停止。");
    anchor.click();
    handedOff = true;
  } finally {
    if (handedOff) setTimeout(() => URL.revokeObjectURL(url), 1000);
    else URL.revokeObjectURL(url);
  }
}
