import { useLayoutEffect, useRef } from "react";
import type { DemoResult } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import { aspectRatioForDimensions } from "../../domain/mediaDimensions";
import { useCanvasMediaContent } from "../canvas/useCanvasMediaContent";

export default function ResultPreview({
  result,
  title,
  onPreview,
  mediaWidth,
  mediaHeight,
  onDimensions,
  onContentReadyChange,
  previewError = false,
  onPreviewError,
}: {
  result: DemoResult;
  title: string;
  onPreview: () => void;
  mediaWidth?: number;
  mediaHeight?: number;
  onDimensions?: (width: number, height: number) => void;
  onContentReadyChange?: (ready: boolean) => void;
  previewError?: boolean;
  onPreviewError?: (failed: boolean) => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reportContentReady = useCanvasMediaContent<
    HTMLImageElement | HTMLVideoElement
  >(
    result.kind === "video" ? video : image,
    result.kind === "video" ? result.src : result.poster || result.src,
    onContentReadyChange,
  );
  useLayoutEffect(() => {
    const media = result.kind === "video" ? video.current : image.current;
    onPreviewError?.(
      Boolean(
        media &&
        media.currentSrc === media.src &&
        (media instanceof HTMLVideoElement
          ? media.error
          : media.complete && media.naturalWidth === 0),
      ),
    );
  }, [result.kind, result.src, result.poster, onPreviewError]);
  const loaded = () => {
    if (reportContentReady()) onPreviewError?.(false);
  };
  const failed = () => {
    onContentReadyChange?.(false);
    onPreviewError?.(true);
  };
  const content = (
    <>
      {result.kind === "video" ? (
        <video
          ref={video}
          src={result.src}
          poster={result.poster}
          preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onLoadedMetadata={loaded}
          onError={failed}
        />
      ) : result.poster || result.kind === "image" ? (
        <img
          ref={image}
          src={result.poster ?? result.src}
          alt={title}
          draggable={false}
          onLoad={(event) => {
            loaded();
            if (result.kind === "image") {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (
                naturalWidth > 1 &&
                naturalHeight > 1 &&
                (naturalWidth !== mediaWidth || naturalHeight !== mediaHeight)
              )
                onDimensions?.(naturalWidth, naturalHeight);
            }
          }}
          onError={failed}
        />
      ) : result.kind === "audio" ? (
        <div className="demo-wave" aria-hidden="true">
          {Array.from({ length: 27 }, (_, i) => (
            <i key={i} style={{ height: `${18 + ((i * 19) % 51)}px` }} />
          ))}
        </div>
      ) : (
        <p>{result.text}</p>
      )}
      {result.kind !== "image" && (
        <span className="demo-preview-hint">
          <UiIcon name={result.kind === "audio" ? "audio" : "preview"} />
          {result.kind === "video" || result.kind === "audio"
            ? "打开播放"
            : "打开预览"}
        </span>
      )}
    </>
  );
  const preview =
    result.kind === "image" ? (
      <div
        className="demo-result-preview is-image"
        style={{
          aspectRatio: aspectRatioForDimensions(
            mediaWidth ?? 1,
            mediaHeight ?? 1,
          ),
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!previewError) onPreview();
        }}
      >
        {content}
      </div>
    ) : (
      <button
        className={`demo-result-preview is-${result.kind}`}
        aria-label={`预览${title}`}
        disabled={previewError}
        title={
          previewError ? "预览不可用，请到任务记录核对并恢复原件。" : undefined
        }
        onClick={onPreview}
      >
        {content}
      </button>
    );
  return (
    <>
      {preview}
      {previewError && (
        <p className="demo-description" role="status">
          预览不可用。请到任务记录核对并恢复原件；当前结果记录和归档引用已保留。
        </p>
      )}
    </>
  );
}
