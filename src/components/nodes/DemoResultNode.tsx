import { useLayoutEffect, useRef, useState } from "react";
import {
  CANVAS_KIND_LABELS,
  type CanvasCollectionItem,
  type CanvasReference,
  type DemoResult,
  type NodeEditingProps,
} from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import DemoMediaPreview from "./DemoMediaPreview";
import DemoRunButton from "./DemoRunButton";
import CreationComposer from "./CreationComposer";
import { readReferenceImages } from "./referenceUpload";

export default function DemoResultNode({
  item,
  favorite,
  onFavorite,
  onChange,
  onDelete,
  onResult,
  editing,
}: {
  item: CanvasCollectionItem;
  favorite: boolean;
  onFavorite: () => void;
  onChange: (patch: Partial<CanvasCollectionItem>) => void;
  onDelete: () => void;
  onResult: (result: DemoResult) => void;
  editing?: NodeEditingProps;
}) {
  const [open, setOpen] = useState(false);
  const [referenceError, setReferenceError] = useState("");
  const result = item.result;
  const hasReferenceComposer = Boolean(
    editing &&
    result &&
    !item.referenceOnly &&
    (item.kind === "image" || item.kind === "video"),
  );
  const referenceFile = useRef<HTMLInputElement>(null);
  const referenceSlot = useRef<CanvasReference["slot"]>();
  useLayoutEffect(() => {
    if (editing?.selected && hasReferenceComposer)
      editing.onExtraHeightChange(60);
  }, [hasReferenceComposer, editing?.selected, editing?.onExtraHeightChange]);
  return (
    <>
      <article
        className="demo-result-node"
        data-kind={item.kind}
        data-source={result?.source}
        data-generation-state={item.generationStatus}
      >
        <header>
          <span className="demo-type">
            <UiIcon name={item.kind} />
            {CANVAS_KIND_LABELS[item.kind]}
          </span>
          <span className="demo-badge">
            {item.generationStatus === "pending"
              ? "等待生成"
              : result
                ? result.source === "provider"
                  ? "已生成"
                  : "示范素材"
                : "前端草稿"}
          </span>
        </header>
        <h3>{item.title}</h3>
        {item.generationStatus === "pending" && !result ? (
          <div className="demo-result-pending" role="status">
            <span className="demo-pending-spinner" aria-hidden="true" />
            <strong>等待生成</strong>
            <p>
              {item.kind === "image"
                ? "图片任务处理中"
                : "正在加载本地演示素材"}
            </p>
          </div>
        ) : result ? (
          <>
            <button
              className={`demo-result-preview is-${item.kind}`}
              aria-label={`预览${item.title}`}
              onClick={() => setOpen(true)}
            >
              {result.poster || item.kind === "image" ? (
                <img
                  src={result.poster ?? result.src}
                  alt={item.title}
                  draggable={false}
                />
              ) : item.kind === "audio" ? (
                <div className="demo-wave" aria-hidden="true">
                  {Array.from({ length: 27 }, (_, i) => (
                    <i
                      key={i}
                      style={{ height: `${18 + ((i * 19) % 51)}px` }}
                    />
                  ))}
                </div>
              ) : (
                <p>{result.text}</p>
              )}
              <span className="demo-preview-hint">
                <UiIcon name={item.kind === "audio" ? "audio" : "preview"} />
                {item.kind === "video" || item.kind === "audio"
                  ? "打开播放"
                  : "打开预览"}
              </span>
            </button>
            <p className="demo-description">{result.description}</p>
          </>
        ) : (
          <>
            <textarea
              className="demo-draft"
              aria-label={`${CANVAS_KIND_LABELS[item.kind]}提示词`}
              placeholder="描述想创作的内容，或先试用示范"
              value={item.prompt ?? ""}
              onChange={(event) => onChange({ prompt: event.target.value })}
            />
            <DemoRunButton kind={item.kind} onResult={onResult} />
          </>
        )}
        <footer>
          <button
            className="ui-button"
            aria-label={
              favorite ? `取消收藏${item.title}` : `收藏${item.title}`
            }
            aria-pressed={favorite}
            onClick={onFavorite}
          >
            <UiIcon name="favorite" />
            {favorite ? "已收藏" : "收藏"}
          </button>
          <button
            className="ui-button is-danger"
            aria-label={`删除${item.title}`}
            onClick={onDelete}
          >
            <UiIcon name="delete" />
            删除
          </button>
        </footer>
        {open && result && (
          <DemoMediaPreview
            result={{ ...result, title: item.title }}
            onClose={() => setOpen(false)}
            onTextChange={(text) => onChange({ result: { ...result, text } })}
          />
        )}
      </article>
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
            liked={editing.liked}
            onToggleLike={editing.onToggleLike}
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
