import { useEffect, useRef, useState } from "react";
import CreationComposer from "./CreationComposer";
import type {
  CanvasCollectionItem,
  CanvasReference,
  NodeEditingProps,
} from "../../domain/canvasItems";
import { readReferenceImages } from "./referenceUpload";

export default function VideoNode({
  item,
  selected,
  onConfigure,
  onChange,
  liked,
  onToggleLike,
  onExtraHeightChange,
  onDemoResults,
  onGenerationStart,
  onGenerationState,
  model,
  onModelChange,
  references,
  referenceLimit,
  onAddReferences,
  onRemoveReference,
}: NodeEditingProps & { item: CanvasCollectionItem }) {
  const [video, setVideo] = useState("");
  const [error, setError] = useState("");
  const referenceFile = useRef<HTMLInputElement>(null);
  const referenceSlot = useRef<CanvasReference["slot"]>();
  const previewInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video);
    },
    [video],
  );
  return (
    <div className="video-node">
      <span>
        <img
          className="video-label-icon"
          src="/design/figma/video-label.svg"
          alt=""
        />
        视频
      </span>
      <div className="video-placeholder">
        {video ? (
          <video
            src={video}
            controls
            preload="metadata"
            onPointerDown={(e) => e.stopPropagation()}
            onError={() =>
              setError("无法预览此视频，请使用浏览器支持的 MP4 或 WebM。")
            }
          />
        ) : (
          <img
            className="video-symbol"
            src="/design/figma/video-placeholder.svg"
            alt=""
          />
        )}
        {selected && (
          <button
            className="video-upload"
            onClick={() => previewInput.current?.click()}
          >
            上传视频
          </button>
        )}
      </div>
      <input
        ref={referenceFile}
        hidden
        multiple
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (!files.length || !onAddReferences) return;
          void readReferenceImages(files, referenceSlot.current)
            .then(onAddReferences)
            .catch((reason: unknown) =>
              setError(
                reason instanceof Error
                  ? reason.message
                  : "读取失败，请重新选择图片。",
              ),
            );
        }}
      />
      <input
        ref={previewInput}
        hidden
        type="file"
        accept="video/mp4,video/webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (
            !["video/mp4", "video/webm"].includes(file.type) ||
            file.size > 100 * 1024 * 1024
          ) {
            setError("请选择 100 MB 以内的 MP4 或 WebM 视频。");
            return;
          }
          setVideo(URL.createObjectURL(file));
          setError("");
        }}
      />
      <CreationComposer
        parameters={item.parameters}
        onParametersChange={(parameters) => onChange({ parameters })}
        onDemoResults={onDemoResults}
        onGenerationStart={onGenerationStart}
        onGenerationState={onGenerationState}
        kind="video"
        selected={selected}
        onConfigure={onConfigure}
        onReference={(slot) => {
          referenceSlot.current = slot;
          referenceFile.current?.click();
        }}
        references={references}
        referenceLimit={referenceLimit}
        prompt={item.prompt}
        model={model}
        onModelChange={onModelChange}
        error={error}
        onPromptChange={(prompt) => onChange({ prompt })}
        liked={liked}
        onToggleLike={onToggleLike}
        onExtraHeightChange={onExtraHeightChange}
        onRemoveReference={onRemoveReference}
      />
    </div>
  );
}
