import { useContext, useRef, useState } from "react";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand.tsx";
import {
  CANVAS_KIND_LABELS,
  type CanvasCollectionItem,
  type CanvasReference,
  type DemoResult,
  type NodeEditingProps,
} from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import DemoMediaPreview from "./DemoMediaPreview";
import CreationComposer from "./CreationComposer";
import { readReferenceImages } from "./referenceUpload";
import CanvasImageActions from "./CanvasImageActions";
import ResultPreview from "./ResultPreview";
import { useCanvasMediaContent } from "../canvas/useCanvasMediaContent";

export default function DemoResultNode({
  item,
  onChange,
  onDelete,
  editing,
}: {
  item: CanvasCollectionItem;
  onChange: (patch: Partial<CanvasCollectionItem>) => void;
  onDelete: () => void;
  onResult: (result: DemoResult) => void;
  editing?: NodeEditingProps;
}) {
  const [open, setOpen] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const command = useContext(CanvasImageCommandContext);
  const openPreview = () => {
    if (item.kind === "image" && item.assetId && command?.openPreview)
      command.openPreview(item.id);
    else setOpen(true);
  };
  const [referenceError, setReferenceError] = useState("");
  const result = item.result;
  const card = useRef<HTMLElement>(null);
  const hasResultContent = Boolean(
    result &&
    result.kind === item.kind &&
    (item.kind === "text" ? result.text?.trim() : result.src?.trim()),
  );
  const imageSource =
    item.kind === "image"
      ? result?.poster || result?.src || item.preview
      : undefined;
  const imageResult = item.kind === "image" && Boolean(imageSource);
  const restoredImage = useRef<HTMLImageElement>(null);
  const reportContentReady = useCanvasMediaContent(
    restoredImage,
    imageSource,
    !hasResultContent ? editing?.onContentReadyChange : undefined,
  );
  const activeTask =
    !hasResultContent && (item.kind === "image" || item.kind === "text")
      ? command?.tasks.find(
          (task) =>
            task.sourceItemId === item.id &&
            (task.status === "queued" || task.status === "running"),
        )
      : undefined;
  const activeGeneration = activeTask || editing?.generationActive;
  const unresolved = !hasResultContent && !activeGeneration;
  const hasReferenceComposer = Boolean(
    editing &&
    hasResultContent &&
    !previewError &&
    !item.referenceOnly &&
    (item.kind === "image" || item.kind === "video"),
  );
  const referenceFile = useRef<HTMLInputElement>(null);
  const referenceSlot = useRef<CanvasReference["slot"]>();
  return (
    <>
      <article
        ref={card}
        className="demo-result-node"
        data-kind={item.kind}
        data-source={result?.source}
        data-generation-state={item.generationStatus}
      >
        <header className={imageResult ? "image-card-caption" : undefined}>
          <span className="demo-type">
            <UiIcon name={item.kind} />
            {CANVAS_KIND_LABELS[item.kind]}
          </span>
          <span className="demo-badge">
            {previewError
              ? "预览不可用"
              : activeGeneration
                ? activeTask?.status === "queued"
                  ? "等待生成"
                  : "正在生成"
                : unresolved
                  ? "结果未恢复"
                  : result
                    ? result.source === "provider"
                      ? "已生成"
                      : "示范素材"
                    : "前端草稿"}
          </span>
        </header>
        <h3 className={imageResult ? "image-card-name" : undefined}>
          {item.title}
        </h3>
        {hasResultContent && result ? (
          <>
            <ResultPreview
              result={result}
              title={item.title}
              onPreview={openPreview}
              mediaWidth={item.mediaWidth}
              mediaHeight={item.mediaHeight}
              onContentReadyChange={editing?.onContentReadyChange}
              previewError={previewError}
              onPreviewError={setPreviewError}
              onDimensions={(mediaWidth, mediaHeight) =>
                onChange({ mediaWidth, mediaHeight })
              }
            />
            {!imageResult && (
              <p className="demo-description">{result.description}</p>
            )}
          </>
        ) : imageSource ? (
          <div className="demo-result-preview is-image">
            <img
              ref={restoredImage}
              src={imageSource}
              alt={item.title}
              draggable={false}
              onLoad={() => {
                if (reportContentReady()) setPreviewError(false);
              }}
              onError={() => {
                editing?.onContentReadyChange?.(false);
                setPreviewError(true);
              }}
            />
            <p role="status">
              {previewError
                ? "原件预览不可用，请到任务记录核对并恢复原件。"
                : activeGeneration
                  ? "图片任务处理中，当前原件预览已保留。"
                  : "图片结果尚未恢复，已保留当前原件预览。"}
            </p>
          </div>
        ) : activeGeneration ? (
          <div className="demo-result-pending" role="status">
            <span className="demo-pending-spinner" aria-hidden="true" />
            <strong>
              {activeTask?.status === "queued" ? "等待生成" : "正在生成"}
            </strong>
            <p>
              {editing?.generationActive
                ? "正在加载本地演示素材，可在来源卡片取消。"
                : `${CANVAS_KIND_LABELS[item.kind]}任务尚未结束，请在任务记录查看进度。`}
            </p>
          </div>
        ) : (
          <div className="demo-result-pending" role="status">
            <strong>{CANVAS_KIND_LABELS[item.kind]}结果尚未恢复</strong>
            <p>
              此卡片没有可用结果。请到任务记录核对状态，或返回来源卡片恢复。
            </p>
          </div>
        )}
        {open && result && (
          <DemoMediaPreview
            source={item}
            result={{ ...result, title: item.title }}
            onClose={() => setOpen(false)}
            onTextChange={(text) => onChange({ result: { ...result, text } })}
          />
        )}
      </article>
      {item.kind === "image" && (
        <CanvasImageActions
          item={item}
          anchor={card}
          selected={Boolean(editing?.selected)}
          hasContent={Boolean(editing?.hasContent)}
          onPreview={openPreview}
          liked={editing?.liked}
          onLike={editing?.onToggleLike}
          onDelete={onDelete}
          references={editing?.references}
        />
      )}
      {hasReferenceComposer && editing && (
        <>
          <input
            ref={referenceFile}
            hidden
            multiple
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              if (!files.length || !editing.onAddReferences) return;
              setReferenceError("");
              void readReferenceImages(files, referenceSlot.current)
                .then(editing.onAddReferences)
                .catch((error: unknown) =>
                  setReferenceError(
                    error instanceof Error
                      ? error.message
                      : "参考图归档失败，请重新导入原件。",
                  ),
                );
            }}
          />
          <CreationComposer
            error={referenceError}
            parameters={item.parameters}
            onParametersChange={(parameters) => onChange({ parameters })}
            kind={item.kind === "video" ? "video" : "image"}
            selected={editing.selected}
            onConfigure={editing.onConfigure}
            onReference={(slot) => {
              referenceSlot.current = slot;
              referenceFile.current?.click();
            }}
            prompt={item.prompt}
            model={editing.model}
            onModelChange={editing.onModelChange}
            references={editing.references}
            referenceLimit={editing.referenceLimit}
            onPromptChange={(prompt) => onChange({ prompt })}
            onExtraHeightChange={editing.onExtraHeightChange}
            onDemoResults={editing.onDemoResults}
            onGenerationStart={editing.onGenerationStart}
            onGenerationState={editing.onGenerationState}
            onRemoveReference={editing.onRemoveReference}
          />
        </>
      )}
    </>
  );
}
