import type { DemoResult } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";

export default function ResultPreview({
  result,
  title,
  onPreview,
}: {
  result: DemoResult;
  title: string;
  onPreview: () => void;
}) {
  const content = (
    <>
      {result.poster || result.kind === "image" ? (
        <img src={result.poster ?? result.src} alt={title} draggable={false} />
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
