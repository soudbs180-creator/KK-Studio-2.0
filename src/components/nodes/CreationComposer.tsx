import { useMenuDismiss } from "./useCreationMenuDismiss.ts";
import type { ModelSelection } from "../../features/models/index.ts";
import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CreationParameterControl from "./CreationParameterControl";
import CreationSoundButton from "./CreationSoundButton";
import GenerationCount from "./GenerationCount";
import {
  modelCapabilities,
  type CanvasReference,
  type CanvasParameters,
  type DemoResult,
} from "../../domain/canvasItems";
import { GenerationAction, GenerationStatus } from "./GenerationAction";
import CreationModelPicker from "./CreationModelPicker";
import ReferenceStrip from "./ReferenceStrip";
import UiIcon from "../UiIcon";
import ComposerActions from "./ComposerActions";
import CanvasComposerShell from "../canvas/CanvasComposerShell";
import "../../styles/reference-composer.css";
import { useCanvasImageGeneration } from "../../features/creation/index.ts";
import { composerReportedHeight } from "../canvas/composerLayout";
import TokenizedComposerInput from "../composer/TokenizedComposerInput.tsx";
import { useCanvasOperations } from "../../runtime/canvasCommandRuntime.tsx";

function defaultCanvasParameters(video: boolean): CanvasParameters {
  return {
    ratio: video ? "16:9" : "1:1",
    quality: video ? "720p" : "1K",
    duration: video ? "4" : "7",
    count: video ? "1" : "8",
    soundEnabled: false,
  };
}

function resolveMaxGenerationCount(usesCodex: boolean, max?: number): number {
  return usesCodex ? 4 : Math.min(8, max ?? 8);
}

interface CreationComposerProps {
  footer?: ReactNode;
  parameters?: CanvasParameters;
  onParametersChange?: (parameters: CanvasParameters) => void;
  kind: "image" | "video";
  selected: boolean;
  onConfigure: () => void;
  onReference: (slot?: CanvasReference["slot"]) => void;
  error?: string;
  onPromptChange: (value: string) => void;
  onExtraHeightChange: (height: number) => void;
  onDemoResults?: (results: DemoResult[]) => void;
  onGenerationStart?: (count: number) => void;
  onGenerationState?: (
    phase: "loading" | "success" | "error" | "cancelled" | "offline",
  ) => void;
  prompt?: string;
  model?: string;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
  references?: CanvasReference[];
  referenceLimit?: number;
  onRemoveReference?: (connectionId: string) => void;
  onSwapReferenceFrames?: (firstId: string, lastId: string) => void;
}
export default function CreationComposer(props: CreationComposerProps) {
  const {
    kind,
    selected,
    onConfigure,
    onReference,
    error,
    onPromptChange,
    onExtraHeightChange,
    onModelChange,
    references = [],
    referenceLimit = 0,
    onRemoveReference,
    onSwapReferenceFrames,
    parameters,
    onParametersChange,
  } = props;
  const video = kind === "video";
  const canvasOperations = useCanvasOperations();
  const label = video ? "视频" : "图片";
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(modelCapabilities(kind)[0].id);
  const [menu, setMenu] = useState("");
  const [localParameters, setLocalParameters] = useState<CanvasParameters>(() =>
    defaultCanvasParameters(video),
  );
  const activeParams = parameters ?? localParameters;
  const { count, soundEnabled } = activeParams;
  function updateParameters(patch: Partial<CanvasParameters>): void {
    const next = { ...activeParams, ...patch };
    setLocalParameters(next);
    onParametersChange?.(next);
  }
  const [expanded, setExpanded] = useState(false);
  const imageGeneration = useCanvasImageGeneration({ references });
  const generation = imageGeneration;
  const busy = generation.phase === "loading";
  const incomingReferenceCount = new Set(
    references.filter((r) => r.id).map((r) => r.assetId ?? r.id),
  ).size;
  const selectedModel = props.model ?? (video ? model : imageGeneration.model);
  const ref = useRef<HTMLDivElement | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const attach = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    setElement(node);
  }, []);
  useLayoutEffect(() => {
    if (!selected || !element) return;
    const report = () =>
      onExtraHeightChange(composerReportedHeight(element.offsetHeight));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selected, element, onExtraHeightChange]);
  useEffect(() => {
    if (!selected || busy) setMenu("");
    if (!selected) setExpanded(false);
  }, [selected, busy]);
  useMenuDismiss(ref, menu, setMenu);
  if (!selected) return null;
  const currentPrompt = props.prompt ?? prompt;
  return (
    <CanvasComposerShell
      ref={attach}
      className={`creation-composer reference-composer ${video ? "video-composer" : ""} ${expanded ? "expanded" : ""}`}
      data-testid={`${kind}-composer`}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.nativeEvent.isComposing || !menu) return;
        e.preventDefault();
        e.stopPropagation();
        ref.current
          ?.querySelector<HTMLButtonElement>(
            `[data-control='${menu}'] > button`,
          )
          ?.focus({ preventScroll: true });
        setMenu("");
      }}
    >
      <ComposerActions
        expanded={expanded}
        onToggleExpanded={() => setExpanded(!expanded)}
      />
      <ReferenceStrip
        video={video}
        disabled={busy}
        references={references}
        referenceCount={incomingReferenceCount}
        limit={referenceLimit}
        onAdd={onReference}
        onRemove={onRemoveReference}
        onSwapVideoFrames={video ? onSwapReferenceFrames : undefined}
      />
      <TokenizedComposerInput
        disabled={busy}
        ariaLabel={`${label}提示词`}
        maxLength={video ? 7500 : 4000}
        value={currentPrompt}
        onChange={(value) => {
          setPrompt(value);
          onPromptChange(value);
        }}
        referenceEntries={references
          .filter((ref) => ref.assetId)
          .map((ref) => ({
            id: ref.assetId!,
            assetId: ref.assetId,
            name: ref.title,
            slot: ref.slot,
          }))}
        onReferenceSlotChange={(assetId, referenceSlot) => {
          const state = canvasOperations?.getState();
          const reference = references.find((ref) => ref.assetId === assetId);
          const edge = state?.canvas.edges.find(
            (edge) => edge.id === reference?.id,
          );
          if (edge)
            void canvasOperations?.executeOperation({
              op: "update_card",
              payload: { id: edge.source, patch: { referenceSlot } },
            });
        }}
        onRemoveReference={(assetId) => {
          const ref = references.find((ref) => ref.assetId === assetId);
          if (ref?.id) onRemoveReference?.(ref.id);
        }}
        placeholder="描述你想要生成的内容"
      />
      <div className="creation-controls">
        <button
          className="composer-ref-add"
          type="button"
          aria-label="添加参考图片"
          disabled={busy || incomingReferenceCount >= referenceLimit}
          title={
            referenceLimit === 0
              ? "当前模型没有可用的参考图位置"
              : `最多 ${referenceLimit} 张参考图，已添加 ${incomingReferenceCount} 张`
          }
          onClick={() => onReference()}
        >
          <UiIcon name="add" size={20} />
        </button>
        <CreationModelPicker
          disabled={busy}
          kind={kind}
          value={selectedModel}
          actualModels={video ? undefined : imageGeneration.models}
          open={menu === "model"}
          onToggle={() => setMenu(menu === "model" ? "" : "model")}
          onChange={(value, selection) => {
            setModel(value);
            onModelChange?.(value, selection);
            if (selection?.source === "codex")
              updateParameters({ count: "1", imageSize: undefined });
            setMenu("");
          }}
          onConfigure={onConfigure}
        />
        <CreationParameterControl
          disabled={busy}
          kind={kind}
          model={selectedModel}
          parameters={activeParams}
          open={menu === "params"}
          onToggle={() => setMenu(menu === "params" ? "" : "params")}
          onChange={updateParameters}
          onModelChange={onModelChange}
        />
        <span className="control-spacer" />
        <CreationSoundButton
          video={video}
          soundEnabled={soundEnabled}
          disabled={busy}
          onToggle={() => updateParameters({ soundEnabled: !soundEnabled })}
        />
        <GenerationCount
          disabled={busy}
          maxCount={resolveMaxGenerationCount(
            imageGeneration.usesCodex,
            imageGeneration.maxGenerationCount,
          )}
          value={count}
          open={menu === "count"}
          onToggle={() => setMenu(menu === "count" ? "" : "count")}
          onChange={(count) => updateParameters({ count })}
        />
        <GenerationAction
          generation={generation}
          label={label}
          onRun={() => {
            setMenu("");
            const copies = Number(count);
            void imageGeneration.run(currentPrompt, copies, selectedModel);
          }}
        />
      </div>
      {error && (
        <div className="generation-feedback" role="status">
          {error}
        </div>
      )}
      <GenerationStatus generation={generation} />
      {props.footer}
    </CanvasComposerShell>
  );
}
