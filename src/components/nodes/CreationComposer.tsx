import type { ModelSelection } from "../../features/models/modelSelection";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import ComposerActions from "./ComposerActions";
import CanvasComposerShell from "../canvas/CanvasComposerShell";
import UiIcon from "../UiIcon";
import { useCanvasImageGeneration } from "../../features/creation/CanvasImageCommand";
import { composerReportedHeight } from "../canvas/composerLayout";
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
}
export default function CreationComposer({
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
  prompt: promptProp,
  model: modelProp,
  onModelChange,
  references = [],
  referenceLimit = 0,
  onRemoveReference,
  parameters,
  onParametersChange,
}: CreationComposerProps) {
  const video = kind === "video";
  const label = video ? "视频" : "图片";
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(modelCapabilities(kind)[0].id);
  const [menu, setMenu] = useState("");
  const [localParameters, setLocalParameters] = useState<CanvasParameters>(
    () => ({
      ratio: video ? "自适应" : "1:1",
      quality: video ? "2K" : "1K",
      duration: "7",
      count: "8",
      soundEnabled: false,
    }),
  );
  const { count, soundEnabled } = parameters ?? localParameters;
  function updateParameters(patch: Partial<CanvasParameters>): void {
    const next = { ...(parameters ?? localParameters), ...patch };
    setLocalParameters(next);
    onParametersChange?.(next);
  }
  const [expanded, setExpanded] = useState(false);
  const localGeneration = useLocalGeneration(kind, onDemoResults);
  const imageGeneration = useCanvasImageGeneration({
    references,
  });
  const generation = video ? localGeneration : imageGeneration;
  const busy = generation.phase === "loading";
  const incomingReferenceCount = new Set(
    references
      .filter((reference) => reference.id)
      .map((reference) => reference.assetId ?? reference.id),
  ).size;
  const selectedModel = modelProp ?? (video ? model : imageGeneration.model);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (selected) onExtraHeightChange(composerReportedHeight(expanded, error));
  }, [selected, expanded, error, onExtraHeightChange]);
  useEffect(() => {
    if (!selected || busy) setMenu("");
    if (!selected) setExpanded(false);
  }, [selected, busy]);
  useEffect(() => {
    if (video && localGeneration.phase !== "idle")
      onGenerationState?.(localGeneration.phase);
  }, [video, localGeneration.phase, onGenerationState]);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent): void => {
      // Let a button click finish before a compact menu moves its target.
      if (
        event.target instanceof Element &&
        ref.current?.contains(event.target) &&
        event.target.closest("button")
      )
        return;
      if (
        event.target instanceof Element &&
        !ref.current
          ?.querySelector(`[data-control='${menu}']`)
          ?.contains(event.target)
      )
        setMenu("");
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [menu]);
  if (!selected) return null;
  return (
    <CanvasComposerShell
      ref={ref}
      className={`creation-composer ${video ? "video-composer" : ""} ${expanded ? "expanded" : ""}`}
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
      {expanded ? (
        <ReferenceStrip
          disabled={busy}
          references={references}
          referenceCount={incomingReferenceCount}
          limit={referenceLimit}
          onAdd={onReference}
          onRemove={onRemoveReference}
        />
      ) : (
        <div className="composer-refs">
          {references.map((ref, i) => (
            <span className="composer-ref-thumb" key={ref.id ?? i}>
              {ref.preview ? <img src={ref.preview} alt="" /> : null}
              {ref.id && onRemoveReference && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label="移除参考图"
                  onClick={() => onRemoveReference(ref.id!)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          <button
            className="composer-ref-add"
            type="button"
            aria-label="添加参考图片"
            disabled={busy || incomingReferenceCount >= referenceLimit}
            title={
              referenceLimit === 0
                ? "当前模型没有可用的参考图位置"
                : `最多 ${referenceLimit} 张参考图`
            }
            onClick={() => onReference()}
          >
            <UiIcon name="add" size={16} />
          </button>
        </div>
      )}
      <textarea
        disabled={busy}
        title={busy ? "生成中暂不能编辑，取消或结束后可继续" : undefined}
        aria-label={`${label}提示词`}
        maxLength={video ? 7500 : 4000}
        value={promptProp ?? prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          onPromptChange(e.target.value);
        }}
        placeholder="描述你想要生成的内容"
      />
      <div className="creation-controls">
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
          parameters={parameters ?? localParameters}
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
          maxCount={
            imageGeneration.usesCodex
              ? 4
              : Math.min(8, imageGeneration.maxGenerationCount ?? 8)
          }
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
            if (video && (promptProp ?? prompt).trim())
              onGenerationStart?.(copies);
            if (video) void localGeneration.run(promptProp ?? prompt, copies);
            else
              void imageGeneration.run(
                promptProp ?? prompt,
                copies,
                selectedModel,
              );
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
