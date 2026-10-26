import type { ModelSelection } from "../../features/models/modelSelection";
import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
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
import { useLocalGeneration } from "./useLocalGeneration";
import { GenerationAction, GenerationStatus } from "./GenerationAction";
import CreationModelPicker from "./CreationModelPicker";
import ReferenceStrip from "./ReferenceStrip";
import UiIcon from "../UiIcon";
import ComposerActions from "./ComposerActions";
import CanvasComposerShell from "../canvas/CanvasComposerShell";
import "../../styles/reference-composer.css";
import { useCanvasImageGeneration } from "../../features/creation/CanvasImageCommand";
import { composerReportedHeight } from "../canvas/composerLayout";

function defaultCanvasParameters(video: boolean): CanvasParameters {
  return {
    ratio: video ? "自适应" : "1:1",
    quality: video ? "2K" : "1K",
    duration: "7",
    count: "8",
    soundEnabled: false,
  };
}

function resolveMaxGenerationCount(usesCodex: boolean, max?: number): number {
  return usesCodex ? 4 : Math.min(8, max ?? 8);
}

function useMenuDismiss(
  ref: RefObject<HTMLDivElement | null>,
  menu: string,
  setMenu: (next: string) => void,
) {
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent): void => {
      // Let a button click finish before a compact menu moves its target.
      if (!(event.target instanceof Element)) return;
      if (ref.current?.contains(event.target) && event.target.closest("button"))
        return;
      if (
        !ref.current
          ?.querySelector(`[data-control='${menu}']`)
          ?.contains(event.target)
      )
        setMenu("");
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [menu, ref, setMenu]);
}

interface CreationComposerProps {
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
    onDemoResults,
    onGenerationStart,
    onGenerationState,
    onModelChange,
    references = [],
    referenceLimit = 0,
    onRemoveReference,
    onSwapReferenceFrames,
    parameters,
    onParametersChange,
  } = props;
  const video = kind === "video";
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
  const localGeneration = useLocalGeneration(kind, onDemoResults);
  const imageGeneration = useCanvasImageGeneration({ references });
  const generation = video ? localGeneration : imageGeneration;
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
  useEffect(() => {
    if (video && localGeneration.phase !== "idle")
      onGenerationState?.(localGeneration.phase);
  }, [video, localGeneration.phase, onGenerationState]);
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
      <textarea
        disabled={busy}
        title={busy ? "生成中暂不能编辑，取消或结束后可继续" : undefined}
        aria-label={`${label}提示词`}
        maxLength={video ? 7500 : 4000}
        value={currentPrompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          onPromptChange(e.target.value);
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
            if (video && currentPrompt.trim()) onGenerationStart?.(copies);
            if (video) void localGeneration.run(currentPrompt, copies);
            else void imageGeneration.run(currentPrompt, copies, selectedModel);
          }}
        />
      </div>
      {error && (
        <div className="generation-feedback" role="status">
          {error}
        </div>
      )}
      <GenerationStatus generation={generation} />
    </CanvasComposerShell>
  );
}
