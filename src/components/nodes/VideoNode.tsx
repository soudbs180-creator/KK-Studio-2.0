import { useEffect, useRef, useState, type RefObject } from "react";
import UiIcon from "../UiIcon";
import CreationComposer from "./CreationComposer";
import VideoShotBreakdownControl from "./VideoShotBreakdownControl.tsx";
import { useCanvasMediaContent } from "../canvas/useCanvasMediaContent";
import type {
  CanvasCollectionItem,
  CanvasReference,
  NodeEditingProps,
} from "../../domain/canvasItems";
import {
  assignVideoReferenceFrames,
  readReferenceImages,
} from "./referenceUpload";
import {
  loadStoredAsset,
  storeGeneratedAsset,
} from "../../features/creation/index.ts";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"];
const LOCAL_VIDEO_NOTICE =
  "已保存本地视频原件；生成仅按已配置模型支持的参考类型提交。";

export default function VideoNode({
  item,
  selected,
  hasContent,
  onContentReadyChange,
  onConfigure,
  onChange,
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
  onSwapReferenceFrames,
  uploadInput,
}: NodeEditingProps & {
  item: CanvasCollectionItem;
  uploadInput: RefObject<HTMLInputElement>;
}) {
  const [video, setVideo] = useState("");
  const [loading, setLoading] = useState(Boolean(item.preview || item.assetId));
  const videoElement = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const uploadVersion = useRef(0);
  const reader = useRef<FileReader | null>(null);
  const referenceFile = useRef<HTMLInputElement>(null);
  const referenceSlot = useRef<CanvasReference["slot"]>();
  const reportContentReady = useCanvasMediaContent(
    videoElement,
    video,
    onContentReadyChange,
  );
  useEffect(() => {
    const version = ++uploadVersion.current;
    setVideo("");
    onContentReadyChange?.(false);
    setLoading(Boolean(item.preview || item.assetId));
    setError("");
    const persisted = item.preview;
    const assetId = persisted?.startsWith("kk-asset:")
      ? persisted.slice("kk-asset:".length)
      : item.assetId;
    if (!persisted && !assetId) {
      return;
    }
    if (persisted && !persisted.startsWith("kk-asset:")) {
      setVideo(persisted);
      setLoading(false);
      setError(LOCAL_VIDEO_NOTICE);
      return;
    }
    if (!assetId) return;
    void loadStoredAsset(assetId)
      .then((asset) => {
        if (version !== uploadVersion.current) return;
        if (!asset || !VIDEO_MIME_TYPES.includes(asset.mime))
          throw new Error("本地视频原件无法恢复，请重新上传。");
        setVideo(asset.preview);
        setLoading(false);
        setError(LOCAL_VIDEO_NOTICE);
      })
      .catch((reason: unknown) => {
        if (version !== uploadVersion.current) return;
        setLoading(false);
        setError(
          reason instanceof Error
            ? reason.message
            : "本地视频原件无法恢复，请重新上传。",
        );
      });
    return () => {
      uploadVersion.current += 1;
    };
  }, [item.id, item.assetId, item.preview, onContentReadyChange]);
  useEffect(
    () => () => {
      uploadVersion.current += 1;
      reader.current?.abort();
    },
    [],
  );
  function uploadVideo(file?: File): void {
    if (!file) return;
    if (
      !VIDEO_MIME_TYPES.includes(file.type) ||
      !file.size ||
      file.size > MAX_VIDEO_BYTES
    ) {
      setError(
        !file.size
          ? "视频文件不能为空，请选择有效的 MP4 或 WebM。"
          : "请选择 100 MB 以内的 MP4 或 WebM 视频。",
      );
      return;
    }
    reader.current?.abort();
    const version = ++uploadVersion.current;
    const nextReader = new FileReader();
    reader.current = nextReader;
    setError("正在读取并归档本地视频…");
    setLoading(true);
    nextReader.onload = () => {
      if (version !== uploadVersion.current) return;
      const source = String(nextReader.result ?? "");
      void storeGeneratedAsset({
        source,
        sourceKind: "upload",
        isAiGenerated: false,
        sourceJobId: `upload-video-${crypto.randomUUID()}`,
        tags: ["本地视频"],
      })
        .then((asset) => {
          if (version !== uploadVersion.current) return;
          setVideo(asset.preview);
          onChange({
            assetId: asset.assetId,
            preview: `kk-asset:${asset.assetId}`,
            title: file.name,
          });
          setLoading(false);
          setError(LOCAL_VIDEO_NOTICE);
        })
        .catch((reason: unknown) => {
          if (version !== uploadVersion.current) return;
          setLoading(false);
          setError(
            reason instanceof Error
              ? reason.message
              : "本地视频归档失败，请重新选择视频。",
          );
        });
    };
    nextReader.onerror = () => {
      if (version === uploadVersion.current) {
        setLoading(false);
        setError("视频读取失败，请重新选择视频。");
      }
    };
    nextReader.onabort = () => {
      if (version === uploadVersion.current) {
        setLoading(false);
        setError("视频读取已取消，请重新选择视频。");
      }
    };
    nextReader.readAsDataURL(file);
  }
  return (
    <div className="video-node">
      <span>
        <span className="video-label-icon">
          <UiIcon name="video" size={16} />
        </span>
        视频
      </span>
      <div className="video-placeholder">
        {video ? (
          <video
            ref={videoElement}
            src={video}
            controls
            preload="metadata"
            onLoadedMetadata={reportContentReady}
            onPointerDown={(e) => e.stopPropagation()}
            onError={() => {
              onContentReadyChange?.(false);
              setVideo("");
              setLoading(false);
              setError("无法预览此视频，请使用浏览器支持的 MP4 或 WebM。");
            }}
          />
        ) : (
          <span className="video-symbol">
            <UiIcon name="video" size={24} />
          </span>
        )}
        {selected && !video && !loading && !hasContent && (
          <button
            className="video-upload"
            onClick={() => uploadInput.current?.click()}
            title="已保存本地视频原件；生成仅按已配置模型支持的参考类型提交。"
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
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (!files.length || !onAddReferences) return;
          void readReferenceImages(files, referenceSlot.current)
            .then((entries) =>
              onAddReferences(
                assignVideoReferenceFrames(entries, references ?? []),
              ),
            )
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
        ref={uploadInput}
        hidden
        type="file"
        accept="video/mp4,video/webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          uploadVideo(file);
        }}
      />
      <CreationComposer
        nodeId={item.id}
        footer={
          video && (
            <VideoShotBreakdownControl source={video} sourceId={item.id} />
          )
        }
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
        onExtraHeightChange={onExtraHeightChange}
        onRemoveReference={onRemoveReference}
        onSwapReferenceFrames={onSwapReferenceFrames}
      />
    </div>
  );
}
