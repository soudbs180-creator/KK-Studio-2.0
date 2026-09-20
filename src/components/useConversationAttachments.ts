import { useEffect, useRef, useState } from "react";
import type { CreationAttachment } from "../features/creation/model";
import { storeGeneratedAsset } from "../features/creation/assetRepository";

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export default function useConversationAttachments({
  draftKey,
  attachments,
  onChange,
  onStatus,
}: {
  /** Prevent a FileReader callback from committing into a different project. */
  draftKey?: string;
  attachments: CreationAttachment[];
  onChange: (attachments: CreationAttachment[]) => void;
  onStatus: (status: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef(attachments);
  const draftKeyRef = useRef(draftKey);
  const readersRef = useRef<Set<FileReader>>(new Set());
  const liveRef = useRef(true);
  const readGeneration = useRef(0);
  const pendingRef = useRef(0);
  const [readingFiles, setReadingFiles] = useState(0);
  attachmentRef.current = attachments;
  // Update during render as well as in the effect: a FileReader event can be
  // delivered between the new render and the effect flush.
  draftKeyRef.current = draftKey;
  useEffect(() => {
    readGeneration.current += 1;
    draftKeyRef.current = draftKey;
    attachmentRef.current = attachments;
    // A project switch invalidates all callbacks still reading files for the
    // previous project. FileReader.abort() is safe after load/error too.
    readersRef.current.forEach((reader) => reader.abort());
    readersRef.current.clear();
    pendingRef.current = 0;
    setReadingFiles(0);
  }, [draftKey]);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      readGeneration.current += 1;
      readersRef.current.forEach((reader) => reader.abort());
      readersRef.current.clear();
    };
  }, []);

  function addFiles(files: FileList | null): void {
    if (!files?.length) return;
    const remaining = Math.max(
      0,
      4 - attachmentRef.current.length - pendingRef.current,
    );
    const accepted = Array.from(files).filter((file) => {
      const valid = ACCEPTED_IMAGE_TYPES.includes(file.type);
      if (!valid) onStatus(`${file.name} 格式不受支持。`);
      if (file.size > 8 * 1024 * 1024)
        onStatus(`${file.name} 超过 8MB，未添加。`);
      return valid && file.size <= 8 * 1024 * 1024;
    });
    if (accepted.length > remaining) onStatus("最多添加 4 张参考图片。");
    const selected = accepted.slice(0, remaining);
    pendingRef.current += selected.length;
    if (selected.length) {
      setReadingFiles(pendingRef.current);
      onStatus("正在读取参考素材…");
    }
    selected.forEach((file) => {
      const reader = new FileReader();
      const sourceDraftKey = draftKey;
      const sourceGeneration = readGeneration.current;
      const isCurrent = () =>
        liveRef.current &&
        draftKeyRef.current === sourceDraftKey &&
        readGeneration.current === sourceGeneration;
      readersRef.current.add(reader);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        readersRef.current.delete(reader);
        if (!isCurrent()) return;
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        setReadingFiles(pendingRef.current);
      };
      reader.onload = async () => {
        if (!isCurrent()) {
          finish();
          return;
        }
        try {
          const archived = await storeGeneratedAsset({
            source: String(reader.result),
            sourceKind: "upload",
            isAiGenerated: false,
            tags: ["参考素材"],
            sourceJobId: `upload-${crypto.randomUUID()}`,
          });
          if (!isCurrent()) return;
          const attachment: CreationAttachment = {
            id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            mime: file.type,
            size: file.size,
            assetId: archived.assetId,
            dataUrl:
              typeof reader.result === "string" ? reader.result : undefined,
          };
          const next = [...attachmentRef.current, attachment];
          attachmentRef.current = next;
          onChange(next);
          if (pendingRef.current <= 1) onStatus("");
        } catch {
          if (isCurrent()) onStatus(`${file.name} 本地归档失败，请重试。`);
        } finally {
          finish();
        }
      };
      reader.onerror = () => {
        finish();
        if (isCurrent()) onStatus(`${file.name} 读取失败，请重试。`);
      };
      reader.onabort = finish;
      reader.readAsDataURL(file);
    });
  }

  return { fileInput, addFiles, readingFiles };
}
