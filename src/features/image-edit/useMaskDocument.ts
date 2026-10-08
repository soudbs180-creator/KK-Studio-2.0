import { useContext, useEffect, useRef, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { CanvasImageCommandContext } from "../creation/CanvasImageCommand.tsx";
import { loadStoredAsset } from "../creation/assetRepository.ts";
import { decodeImage } from "./imageProcessing.ts";
import { readMaskDocument, type MaskDocument } from "./mask.ts";
export function useMaskDocument(source: CanvasCollectionItem) {
  const command = useContext(CanvasImageCommandContext),
    original = useRef<HTMLCanvasElement>(),
    undo = useRef<MaskDocument[]>([]),
    redo = useRef<MaskDocument[]>([]);
  const [document, setDocument] = useState<MaskDocument>(
      source.imageEditDraft ?? { width: 1, height: 1, regions: [] },
    ),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    void (async () => {
      if (!source.assetId)
        throw new Error("请先导入归档原件，当前图片不能编辑。");
      const asset = await loadStoredAsset(source.assetId);
      if (!asset) throw new Error("原图归档缺失，请重新导入原件。");
      const image = await decodeImage(asset.preview, controller.signal);
      controller.signal.throwIfAborted();
      const saved = source.imageEditDraft;
      if (
        saved &&
        (saved.width !== image.width || saved.height !== image.height)
      )
        throw new Error("原图尺寸与选区不一致，请重新加载。");
      original.current = image;
      setDocument(
        saved ?? { width: image.width, height: image.height, regions: [] },
      );
      undo.current = [];
      redo.current = [];
      setReady(true);
    })().catch((reason: unknown) => {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : "原图读取失败，请重试。",
        );
    });
    return () => controller.abort();
  }, [source.assetId]);
  function save(value: MaskDocument) {
    setDocument(value);
    command?.updateItem?.(source.id, { imageEditDraft: value });
    setError("");
  }
  function commit(next: MaskDocument) {
    const value = readMaskDocument(next);
    undo.current = [...undo.current.slice(-39), document];
    redo.current = [];
    save(value);
  }
  function history(direction: "undo" | "redo") {
    const from = direction === "undo" ? undo : redo,
      to = direction === "undo" ? redo : undo,
      next = from.current.pop();
    if (!next) return;
    to.current.push(document);
    save({
      ...next,
      colorCounters: {
        ...document.colorCounters,
        ...next.colorCounters,
        ...Object.fromEntries(
          Object.keys({ ...document.colorCounters, ...next.colorCounters }).map(
            (key) => [
              key,
              Math.max(
                document.colorCounters?.[key] ?? 0,
                next.colorCounters?.[key] ?? 0,
              ),
            ],
          ),
        ),
      },
    });
  }
  return {
    original,
    document,
    ready,
    error,
    setError,
    commit,
    history,
    canUndo: undo.current.length > 0,
    canRedo: redo.current.length > 0,
  };
}
