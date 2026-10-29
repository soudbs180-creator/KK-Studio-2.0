import { useContext, useEffect, useState, type KeyboardEvent } from "react";
import {
  CanvasImageCommandContext,
  useCanvasImageGeneration,
} from "../../runtime/canvasCommandRuntime.tsx";

import { GenerationStatus } from "../../components/nodes/GenerationAction.tsx";
import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems.ts";
import { useImageModelCapabilities } from "../models/index.ts";
import ImageCanvasLayers from "./ImageCanvasLayers.tsx";
import {
  maskBounds,
  type MaskDocument,
  type MaskRegion,
  type Point,
} from "./mask.ts";
import RegionRetryList from "./RegionRetryList.tsx";
import { validateEdit } from "./validateEdit.ts";

import EditComposer from "./EditComposer.tsx";
import EditToolbar, { EDIT_COLORS } from "./EditToolbar.tsx";
import RegionPromptOverlay from "./RegionPromptOverlay.tsx";
import { useImageViewport, type ImageTool } from "./useImageViewport.ts";
import { useMaskDocument } from "./useMaskDocument.ts";
import { useMaskDrawing } from "./useMaskDrawing.ts";

function useInitialEditReferences(
  source: CanvasCollectionItem,
  onError: (msg: string) => void,
) {
  const command = useContext(CanvasImageCommandContext);
  const [references, setReferences] = useState<CanvasReference[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(
      (source.imageEditReferenceIds ?? []).map(async (id) => {
        const asset = await command?.assets?.read(id);
        if (!asset) throw new Error("草稿参考图原件缺失，请重新导入。");
        return { assetId: id, title: "重绘参考图", preview: asset.preview };
      }),
    )
      .then((refs) => {
        if (!controller.signal.aborted) setReferences(refs);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          onError(error instanceof Error ? error.message : "参考图无法读取。");
      });
    return () => controller.abort();
  }, [source.assetId]);
  return [references, setReferences] as const;
}

function handleEditorKeyDown(
  e: KeyboardEvent<HTMLDivElement>,
  loading: boolean,
  onHistory: (action: "undo" | "redo") => void,
): void {
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    !(e.target instanceof HTMLInputElement) &&
    !(e.target instanceof HTMLTextAreaElement)
  ) {
    e.preventDefault();
    if (!loading) onHistory(e.shiftKey ? "redo" : "undo");
  }
}

function hasEditInstruction(document: MaskDocument, prompt: string): boolean {
  return (
    Boolean(prompt.trim()) ||
    document.regions.some((r) => Boolean(r.instruction?.trim()))
  );
}

export default function ImageEditor({
  source,
  references: incoming = [],
  onClose,
}: {
  source: CanvasCollectionItem;
  references?: CanvasReference[];
  onClose: () => void;
}) {
  const command = useContext(CanvasImageCommandContext),
    mask = useMaskDocument(source),
    document = mask.document;
  const [tool, setTool] = useState<ImageTool>("browse"),
    [brushWidth, setBrushWidth] = useState(32),
    [color, setColor] = useState(EDIT_COLORS[0].color),
    [selectionOnly, setSelectionOnly] = useState(true),
    [prompt, setPrompt] = useState(source.imageEditPrompt ?? ""),
    [references, setReferences] = useInitialEditReferences(
      source,
      mask.setError,
    ),
    [active, setActive] = useState<string>(),
    [hover, setHover] = useState<Point>();
  const capabilities = useImageModelCapabilities({
    source: source.generationSource === "codex" ? "codex" : "api",
    model: source.model ?? command?.model ?? "",
    connectionId: source.providerConnectionId ?? command?.providerConnectionId,
  });
  const inpaintSupported =
    selectionOnly &&
    Boolean(document.regions.length) &&
    capabilities.operations.inpaint === "supported";
  const generation = useCanvasImageGeneration({
      references: incoming,
      outputCount: 1,
      operation: inpaintSupported ? "inpaint" : undefined,
    }),
    loading = generation.phase === "loading";
  function selectRegion(region: MaskRegion) {
    setActive(region.id);
    const bounds = maskBounds(region.runs);
    viewport.centerOn({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
  }
  const drawing = useMaskDrawing({
    document,
    tool,
    brushWidth,
    color,
    original: mask.original,
    disabled: loading || !mask.ready,
    zoom: () => viewport.view.scale,
    commit: mask.commit,
    onRegion: selectRegion,
    onError: mask.setError,
  });
  const viewport = useImageViewport({
    width: document.width,
    height: document.height,
    tool,
    ...drawing,
  });
  const validation = validateEdit(
    source,
    document,
    prompt,
    [...incoming, ...references],
    capabilities,
    selectionOnly,
  );
  const canSend =
      mask.ready &&
      !loading &&
      generation.available &&
      !validation &&
      hasEditInstruction(document, prompt),
    region = document.regions.find((r) => r.id === active);
  function send() {
    if (canSend)
      void generation.run(prompt, 1, generation.model, {
        document,
        references,
        selectionOnly,
      });
  }
  return (
    <div
      className="image-editor"
      onKeyDown={(e) => handleEditorKeyDown(e, loading, mask.history)}
    >
      <header>
        <h2>重绘参考图片</h2>
        <span data-testid="edit-region-count">
          {document.regions.length} 个编辑区域
        </span>
        <button
          type="button"
          className="ui-button"
          onClick={() => {
            if (loading) generation.cancel();
            onClose();
          }}
        >
          取消
        </button>
      </header>
      <div
        ref={viewport.ref}
        className="image-edit-viewport"
        role="region"
        aria-label="图片编辑画布"
        tabIndex={0}
        {...viewport.handlers}
        onPointerMove={(e) => {
          viewport.handlers.onPointerMove(e);
          const rect = e.currentTarget.getBoundingClientRect();
          setHover({
            x: (e.clientX - rect.x - viewport.view.x) / viewport.view.scale,
            y: (e.clientY - rect.y - viewport.view.y) / viewport.view.scale,
          });
        }}
      >
        <ImageCanvasLayers
          document={document}
          original={mask.original}
          scratch={drawing.scratch}
          ready={mask.ready}
          title={source.title}
          view={viewport.view}
        />
        {!mask.ready && <p role="status">正在读取原图…</p>}
        {tool === "brush" && hover && (
          <span
            className="image-brush-preview"
            style={{
              left: viewport.view.x + hover.x * viewport.view.scale,
              top: viewport.view.y + hover.y * viewport.view.scale,
              width: brushWidth * viewport.view.scale,
              height: brushWidth * viewport.view.scale,
            }}
          />
        )}
        <EditToolbar
          tool={tool}
          onTool={(value) => {
            drawing.cancel();
            setTool(value);
          }}
          brushWidth={brushWidth}
          onBrushWidth={setBrushWidth}
          color={color}
          onColor={setColor}
          undo={() => {
            mask.history("undo");
            setActive(undefined);
          }}
          redo={() => {
            mask.history("redo");
            setActive(undefined);
          }}
          canUndo={mask.canUndo}
          canRedo={mask.canRedo}
          hasRegions={document.regions.length > 0}
          onClear={() => {
            drawing.cancel();
            mask.commit({ ...document, regions: [] });
            setActive(undefined);
          }}
          onReset={viewport.reset}
          disabled={loading || !mask.ready}
        />
        <RegionPromptOverlay
          region={region}
          document={document}
          viewport={viewport.ref}
          view={viewport.view}
          disabled={loading}
          commit={mask.commit}
          onClose={() => setActive(undefined)}
        />
      </div>
      <EditComposer
        source={source}
        document={document}
        prompt={prompt}
        onPrompt={(value) => {
          setPrompt(value);
          command?.updateItem?.(source.id, { imageEditPrompt: value });
        }}
        references={references}
        onReferences={(value) => {
          setReferences(value);
          command?.updateItem?.(source.id, {
            imageEditReferenceIds: value.flatMap((r) =>
              r.assetId ? [r.assetId] : [],
            ),
          });
        }}
        onRegion={selectRegion}
        selectionOnly={selectionOnly}
        onSelectionOnly={setSelectionOnly}
        onSend={send}
        disabled={!canSend}
        loading={loading}
        onCancel={generation.cancel}
        onError={mask.setError}
      />
      {(mask.error || (generation.available && validation)) && (
        <p className="image-edit-feedback" role="status">
          {mask.error || validation}
        </p>
      )}
      <GenerationStatus generation={generation} />
      <RegionRetryList
        tasks={command?.tasks ?? []}
        sourceId={source.id}
        loading={loading}
        onRetry={command?.retryTask}
      />
    </div>
  );
}
