import { useState } from "react";
import type { CanvasReference } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";

/** Posters and playable video sources share the same thumbnail geometry. */
export default function ReferenceMedia({
  reference,
  controls = false,
  onDimensions,
}: {
  reference: CanvasReference;
  controls?: boolean;
  onDimensions?: (width: number, height: number) => void;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const src = reference.preview;
  if (!src || failedSource === src || reference.kind === "audio")
    return (
      <span
        className="reference-media-placeholder"
        role="img"
        aria-label={
          failedSource === src && src ? "参考素材加载失败" : reference.title
        }
      >
        <UiIcon
          name={
            reference.kind === "audio"
              ? "audio"
              : reference.kind === "video"
                ? "video"
                : "image"
          }
          size={24}
        />
        {failedSource === src && src && <span>预览不可用</span>}
      </span>
    );
  const video =
    reference.kind === "video" &&
    !/^data:image\/|\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.test(src);
  return video ? (
    <video
      key={src}
      className="reference-thumbnail"
      src={src}
      muted
      playsInline
      controls={controls}
      preload="metadata"
      onLoadedMetadata={(event) =>
        onDimensions?.(
          event.currentTarget.videoWidth,
          event.currentTarget.videoHeight,
        )
      }
      onError={() => setFailedSource(src)}
    />
  ) : (
    <img
      key={src}
      className="reference-thumbnail"
      src={src}
      alt={reference.title}
      onLoad={(event) =>
        onDimensions?.(
          event.currentTarget.naturalWidth,
          event.currentTarget.naturalHeight,
        )
      }
      onError={() => setFailedSource(src)}
    />
  );
}
