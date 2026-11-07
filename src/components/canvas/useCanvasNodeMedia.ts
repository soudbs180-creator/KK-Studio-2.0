import { useCallback, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";

export default function useCanvasNodeMedia(item: CanvasCollectionItem) {
  const mediaSource =
    item.kind === "audio"
      ? item.result?.kind === "audio"
        ? item.result.src || ""
        : ""
      : item.result?.poster ||
        item.result?.src ||
        item.preview ||
        item.assetId ||
        "";
  const [mediaContent, setMediaContent] = useState({
    source: "",
    ready: false,
  });
  const onContentReadyChange = useCallback(
    (ready: boolean) =>
      setMediaContent((current) =>
        current.source === mediaSource && current.ready === ready
          ? current
          : { source: mediaSource, ready },
      ),
    [mediaSource],
  );
  const hasContent = item.plugin
    ? Boolean(
        typeof item.plugin.metadata?.content === "string" &&
        item.plugin.metadata.content.trim(),
      )
    : item.kind === "text"
      ? Boolean(item.result?.kind === "text" && item.result.text?.trim())
      : Boolean(
          mediaSource &&
          mediaContent.source === mediaSource &&
          mediaContent.ready,
        );

  return { hasContent, onContentReadyChange };
}
