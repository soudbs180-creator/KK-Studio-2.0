import { useEffect, useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import CreationComposer from "./CreationComposer";
import type {
  CanvasCollectionItem,
  CanvasReference,
  NodeEditingProps,
} from "../../domain/canvasItems";
import DemoMediaPreview from "./DemoMediaPreview";
import ImageRedrawDialog from "./ImageRedrawDialog";
import { readReferenceImages } from "./referenceUpload";

export default function ImageCreationNode({
  item,
  onConfigure,
  selected,
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
  const [image, setImage] = useState(item.preview ?? "");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [redrawOpen, setRedrawOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);
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
  useEffect(() => {
    if (item.referenceOnly) onExtraHeightChange(0);
  }, [item.referenceOnly, onExtraHeightChange]);
  function upload(value?: File): void {
    if (!value) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        value.type,
      ) ||
      value.size > 10 * 1024 * 1024
    ) {
      setError("请选择 10 MB 以内的 PNG、JPG、WebP 或 GIF 图片。");
      return;
    }
    const version = ++uploadVersion.current;
    setError("正在读取并归档本地图片…");
    void readReferenceImages([value])
      .then(([asset]) => {
        if (version !== uploadVersion.current) return;
        setImage(asset.preview ?? "");
        onChange({
          preview: asset.preview,
          assetId: asset.assetId,
          title: value.name,
          referenceOnly: true,
        });
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
    <div className="image-creation">
      <button className="upload-image" onClick={() => file.current?.click()}>
        <Upload size={23} />
        上传图片
      </button>
      <input
        ref={file}
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
      <span className="image-caption">
        <ImageIcon size={13} />
        {item.referenceOnly ? item.title : "图片"}
      </span>
      <div
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
              className="uploaded-image"
              src={image}
              alt="参考图片"
              onClick={() => setPreviewOpen(true)}
            />
            <div className="image-preview-actions">
              <button
                type="button"
                aria-label="放大查看参考图片"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setPreviewOpen(true)}
              >
                放大
              </button>
              <button
                type="button"
                aria-label="重绘参考图片"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  setRedrawOpen(true);
                }}
              >
                重绘
              </button>
            </div>
          </>
        ) : (
          <img
            className="image-symbol"
            src="/design/figma/asset-image.svg"
            alt=""
          />
        )}
      </div>
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
      {previewOpen && image && (
        <DemoMediaPreview
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
      {redrawOpen && <ImageRedrawDialog onClose={() => setRedrawOpen(false)} />}
    </div>
  );
}
