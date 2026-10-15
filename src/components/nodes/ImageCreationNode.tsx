import {
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand.tsx";
import { Upload } from "lucide-react";
import CreationComposer from "./CreationComposer";
import type {
  CanvasCollectionItem,
  CanvasReference,
  NodeEditingProps,
} from "../../domain/canvasItems";
import DemoMediaPreview from "./DemoMediaPreview";
import { readReferenceImages } from "./referenceUpload";
import CanvasImageActions from "./CanvasImageActions";
import { useCanvasMediaContent } from "../canvas/useCanvasMediaContent";
import { readImageDimensions } from "../../features/creation/mediaDimensions";
import { aspectRatioForDimensions } from "../../domain/mediaDimensions";

export default function ImageCreationNode({
  item,
  onConfigure,
  selected,
  hasContent,
  onContentReadyChange,
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
  uploadInput,
  onDelete,
}: NodeEditingProps & {
  item: CanvasCollectionItem;
  uploadInput: RefObject<HTMLInputElement>;
  onDelete: () => void;
}) {
  const [image, setImage] = useState(item.preview ?? "");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const command = useContext(CanvasImageCommandContext);
  const openPreview = () =>
    command?.openPreview && item.assetId
      ? command.openPreview(item.id, "参考图片")
      : setPreviewOpen(true);
  const preview = useRef<HTMLDivElement>(null);
  const imageElement = useRef<HTMLImageElement>(null);
  const referenceFile = useRef<HTMLInputElement>(null);
  const referenceSlot = useRef<CanvasReference["slot"]>();
  const uploadVersion = useRef(0);
  useEffect(
    () => () => {
      uploadVersion.current += 1;
    },
    [],
  );
  useEffect(() => setImage(item.preview ?? ""), [item.preview]);
  const reportContentReady = useCanvasMediaContent(
    imageElement,
    image,
    onContentReadyChange,
  );
  useEffect(() => {
    if (item.referenceOnly) onExtraHeightChange(0);
  }, [item.referenceOnly, onExtraHeightChange]);
  const incomingReferences = references ?? [];
  const composerReferences: CanvasReference[] =
    item.referenceSlot === "主体" && item.assetId
      ? [
          {
            assetId: item.assetId,
            title: item.title,
            preview: image || item.preview,
            slot: "主体",
          },
          ...incomingReferences.filter(
            (reference) => reference.assetId !== item.assetId,
          ),
        ]
      : incomingReferences;
  function upload(value?: File): void {
    if (!value) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        value.type,
      ) ||
      value.size === 0 ||
      value.size > 10 * 1024 * 1024
    ) {
      setError("请选择 10 MB 以内且不为空的 PNG、JPG、WebP 或 GIF 图片。");
      return;
    }
    const version = ++uploadVersion.current;
    setError("正在读取并归档本地图片…");
    void readReferenceImages([value])
      .then(async ([asset]) => {
        if (version !== uploadVersion.current) return;
        const dimensions = await readImageDimensions(asset.preview ?? "");
        if (version !== uploadVersion.current) return;
        onChange({
          preview: asset.preview,
          assetId: asset.assetId,
          mediaWidth: dimensions.width,
          mediaHeight: dimensions.height,
          title: value.name,
          referenceSlot: "主体",
          // A top-level upload is the generation source (主体), so keep the
          // composer mounted for prompt/edit actions. Reference-only cards
          // are created exclusively by the composer slot upload flow.
          referenceOnly: false,
        });
        setImage(asset.preview ?? "");
        setError("");
      })
      .catch((reason: unknown) => {
        if (version === uploadVersion.current)
          setError(
            reason instanceof Error
              ? reason.message
              : "本地归档失败，请重新选择图片。",
          );
      });
  }
  return (
    <div
      className="image-creation"
      style={
        {
          "--media-height": `${400 / aspectRatioForDimensions(item.mediaWidth ?? 1, item.mediaHeight ?? 1)}px`,
        } as CSSProperties
      }
    >
      <div className="image-node-header">
        <span className="image-caption">{item.title}</span>
        <div className="image-node-header-actions">
          {!image && !hasContent && (
            <button
              type="button"
              className="upload-image"
              aria-label="上传图片"
              onClick={() => uploadInput.current?.click()}
            >
              <Upload size={16} />
              上传图片
            </button>
          )}
        </div>
      </div>
      <input
        ref={uploadInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
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
      <div
        ref={preview}
        className="image-preview"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files[0]);
        }}
      >
        {image ? (
          <>
            <img
              ref={imageElement}
              className="uploaded-image"
              src={image}
              alt="参考图片"
              draggable={false}
              onLoad={(event) => {
                reportContentReady();
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (
                  naturalWidth > 1 &&
                  naturalHeight > 1 &&
                  (item.mediaWidth !== naturalWidth ||
                    item.mediaHeight !== naturalHeight)
                )
                  onChange({
                    mediaWidth: naturalWidth,
                    mediaHeight: naturalHeight,
                  });
              }}
              onError={() => {
                onContentReadyChange?.(false);
                setImage("");
                setError("本地图片无法预览，请重新导入原件。");
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                openPreview();
              }}
            />
          </>
        ) : (
          <img
            className="image-symbol"
            src="/design/figma/asset-image.svg"
            alt=""
          />
        )}
      </div>
      <CanvasImageActions
        item={item}
        anchor={preview}
        selected={selected}
        hasContent={Boolean(hasContent)}
        onPreview={openPreview}
        references={incomingReferences}
        liked={liked}
        onLike={onToggleLike}
        onDelete={onDelete}
      />
      {!selected && error && (
        <p className="upload-feedback" role="status">
          {error}
        </p>
      )}
      <CreationComposer
        parameters={item.parameters}
        onParametersChange={(parameters) => onChange({ parameters })}
        onDemoResults={onDemoResults}
        onGenerationStart={onGenerationStart}
        onGenerationState={onGenerationState}
        kind="image"
        selected={selected && !item.referenceOnly}
        onConfigure={onConfigure}
        onReference={(slot) => {
          referenceSlot.current = slot;
          referenceFile.current?.click();
        }}
        references={composerReferences}
        referenceLimit={referenceLimit}
        prompt={item.prompt}
        model={model}
        onModelChange={onModelChange}
        error={error}
        onPromptChange={(prompt) => onChange({ prompt })}
        onExtraHeightChange={onExtraHeightChange}
        onRemoveReference={onRemoveReference}
      />
      {previewOpen && image && (
        <DemoMediaPreview
          source={item}
          result={{
            id: "reference-preview",
            kind: "image",
            title: "参考图片",
            src: image,
            description: "当前项目中的本地参考图。",
            source: "demo",
          }}
          onClose={() => setPreviewOpen(false)}
          onTextChange={() => undefined}
        />
      )}
    </div>
  );
}
