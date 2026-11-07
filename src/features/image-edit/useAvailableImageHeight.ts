import {
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems.ts";
import { CanvasImageCommandContext } from "../../runtime/canvasCommandRuntime.tsx";
import type { MaskDocument } from "./mask.ts";

/** Keep mobile software keyboards from covering the composer. */
export function useAvailableImageHeight(): CSSProperties {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => setHeight(viewport?.height ?? window.innerHeight);
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return { "--image-edit-available-height": `${height}px` } as CSSProperties;
}

export function useInitialEditReferences(
  source: CanvasCollectionItem,
  onError: (msg: string) => void,
) {
  const command = useContext(CanvasImageCommandContext);
  const [references, setReferences] = useState<CanvasReference[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(
      (source.imageEditReferenceIds ?? []).map(async (id) => {
        const asset = await command?.assets?.read(id);
        if (!asset) throw new Error("草稿参考图原件缺失，请重新导入。");
        return { assetId: id, title: "重绘参考图", preview: asset.preview };
      }),
    )
      .then((refs) => {
        if (!controller.signal.aborted) setReferences(refs);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          onError(error instanceof Error ? error.message : "参考图无法读取。");
      });
    return () => controller.abort();
  }, [source.assetId]);
  return [references, setReferences] as const;
}

export function handleEditorKeyDown(
  e: KeyboardEvent<HTMLDivElement>,
  loading: boolean,
  onHistory: (action: "undo" | "redo") => void,
): void {
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    !(e.target instanceof HTMLInputElement) &&
    !(e.target instanceof HTMLTextAreaElement)
  ) {
    e.preventDefault();
    if (!loading) onHistory(e.shiftKey ? "redo" : "undo");
  }
}

export function hasEditInstruction(
  document: MaskDocument,
  prompt: string,
): boolean {
  return (
    Boolean(prompt.trim()) ||
    document.regions.some((r) => Boolean(r.instruction?.trim()))
  );
}

export function tagColor(color: string): string {
  return (
    "#" +
    color
      .slice(1)
      .match(/../g)!
      .map((c) =>
        Math.round(parseInt(c, 16) * 0.65)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
