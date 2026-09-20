import { useEffect, useRef, useState } from "react";
import { parseResourcePack, type Asset } from "../../domain/assets";
import { storeGeneratedAsset } from "../../features/creation/assetRepository";
export default function useAssetImport(onImported: (assets: Asset[]) => void) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    const field = input.current;
    const cancel = () => setMessage("已取消导入");
    field?.addEventListener("cancel", cancel);
    return () => {
      live.current = false;
      field?.removeEventListener("cancel", cancel);
    };
  }, []);
  async function importFiles(files: FileList | null): Promise<void> {
    if (!files?.length) {
      setMessage("已取消导入");
      return;
    }
    setBusy(true);
    setMessage("正在读取本地文件…");
    try {
      if (files.length > 20)
        throw new Error("每次最多导入 20 个文件，请分批选择。");
      const additions: Asset[] = [];
      for (const file of Array.from(files).slice(0, 20)) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error("单个文件不能超过 10 MB，请缩小后重新导入。");
        if (file.name.endsWith(".json")) {
          additions.push(
            ...parseResourcePack(await file.text()).map((a) => ({
              ...a,
              id: crypto.randomUUID(),
            })),
          );
        } else {
          if (
            !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
              file.type,
            )
          )
            throw new Error(
              "请选择 PNG、JPG、WebP、GIF 图片或 KK 资源包 JSON。",
            );
          const src = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () =>
              reject(new Error("文件读取失败，请重新选择。"));
            reader.readAsDataURL(file);
          });
          const archived = await storeGeneratedAsset({
            source: src,
            sourceKind: "upload",
            isAiGenerated: false,
            tags: ["导入"],
            sourceJobId: `upload-${crypto.randomUUID()}`,
          });
          additions.push({
            id: archived.assetId,
            name: file.name,
            type: "image",
            tag: "导入",
            createdAt: new Date().toISOString(),
            src,
            source: archived.source,
            isAiGenerated: archived.isAiGenerated,
            sha256: archived.sha256,
            provider: archived.provenance.provider,
            model: archived.provenance.model,
            promptHash: archived.promptHash,
            parentId: archived.parentId,
            sourceTaskId: archived.sourceJobId,
            providerConnectionId: archived.provenance.connectionId,
            c2paPresent: archived.provenance.c2paPresent,
            synthIdSignal: archived.provenance.synthIdSignal,
            originCount: archived.origins?.length ?? 1,
          });
        }
      }
      if (!live.current) return;
      onImported(additions);
      setMessage(`已导入 ${additions.length} 项 · 本次会话可用`);
    } catch (error) {
      if (live.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "导入失败，请检查文件格式后重试。",
        );
    } finally {
      if (live.current) setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return { message, setMessage, busy, input, importFiles };
}
