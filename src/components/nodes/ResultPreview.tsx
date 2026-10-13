import type { DemoResult } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import { aspectRatioForDimensions } from "../../domain/mediaDimensions";

export default function ResultPreview({
  result,
  title,
  onPreview,
  mediaWidth,
  mediaHeight,
  onDimensions,
}: {
  result: DemoResult;
  title: string;
  onPreview: () => void;
  mediaWidth?: number;
  mediaHeight?: number;
  onDimensions?: (width: number, height: number) => void;
}) {
  const content = (
    <>
      {result.poster || result.kind === "image" ? (
        <img
          src={result.poster ?? result.src}
          alt={title}
          draggable={false}
          onLoad={
            result.kind === "image"
              ? (event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (
                    naturalWidth > 1 &&
                    naturalHeight > 1 &&
                    (naturalWidth !== mediaWidth ||
                      naturalHeight !== mediaHeight)
                  )
                    onDimensions?.(naturalWidth, naturalHeight);
                }
              : undefined
          }
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
  return result.kind === "image" ? (
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
        onPreview();
      }}
    >
      {content}
    </div>
  ) : (
    <button
      className={`demo-result-preview is-${result.kind}`}
      aria-label={`预览${title}`}
      onClick={onPreview}
    >
      {content}
    </button>
  );
}
