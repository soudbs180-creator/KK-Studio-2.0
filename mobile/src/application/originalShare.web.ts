import type { ShareableOriginal } from "./materialWorkflows.ts";
export async function shareVerifiedOriginal(
  original: ShareableOriginal,
  isCurrent: () => boolean,
): Promise<void> {
  if (!isCurrent()) throw new Error("会话已变化，保存已停止。");
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(original.bytes).buffer], {
      type: original.asset.mime,
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = original.asset.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
