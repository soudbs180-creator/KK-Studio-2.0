import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Heart, Square } from "lucide-react";
import CreationParameters from "./CreationParameters";
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
import { useCanvasImageGeneration } from "../../features/creation/CanvasImageCommand";

interface CreationComposerProps {
  parameters?: CanvasParameters;
  onParametersChange?: (parameters: CanvasParameters) => void;
  kind: "image" | "video";
  selected: boolean;
  onConfigure: () => void;
  onReference: (slot?: CanvasReference["slot"]) => void;
  error?: string;
  onPromptChange: (value: string) => void;
  liked: boolean;
  onToggleLike: () => void;
  onExtraHeightChange: (height: number) => void;
  onDemoResults?: (results: DemoResult[]) => void;
  onGenerationStart?: (count: number) => void;
  onGenerationState?: (
    phase: "loading" | "success" | "error" | "cancelled" | "offline",
  ) => void;
  prompt?: string;
  model?: string;
  onModelChange?: (model: string) => void;
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
  liked,
  onToggleLike,
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
  const { ratio, quality, duration, count, soundEnabled } =
    parameters ?? localParameters;
  function updateParameters(patch: Partial<CanvasParameters>): void {
    const next = { ...(parameters ?? localParameters), ...patch };
    setLocalParameters(next);
    onParametersChange?.(next);
  }
  const [expanded, setExpanded] = useState(false);
  const localGeneration = useLocalGeneration(kind, onDemoResults);
  const imageGeneration = useCanvasImageGeneration();
  const generation = video ? localGeneration : imageGeneration;
  const selectedModel = modelProp ?? (video ? model : imageGeneration.model);
  const ref = useRef<HTMLDivElement>(null);
  const selectedPrompt = promptProp ?? prompt;
  useLayoutEffect(() => {
    if (selected)
      onExtraHeightChange((expanded ? 93 : 0) + (error ? 80 : 0) + 60);
  }, [selected, expanded, error, onExtraHeightChange]);
  useEffect(() => {
    if (!selected) {
      setMenu("");
      setExpanded(false);
    }
  }, [selected]);
  useEffect(() => {
    if (video && localGeneration.phase !== "idle")
      onGenerationState?.(localGeneration.phase);
  }, [video, localGeneration.phase, onGenerationState]);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent): void => {
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
    <div
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
      <button
        className="expand-composer"
        aria-label={expanded ? "收起提示词" : "展开提示词"}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <img
          src={
            expanded ? "/design/figma/collapse.svg" : "/design/figma/expand.svg"
          }
          alt=""
        />
      </button>
      <ReferenceStrip
        references={references}
        limit={referenceLimit}
        onAdd={onReference}
        onRemove={onRemoveReference}
      />
      <textarea
        aria-label={`${label}提示词`}
        maxLength={video ? 7500 : 4000}
        value={selectedPrompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          onPromptChange(e.target.value);
        }}
        placeholder="描述你想要生成的内容"
      />
      <button
        className="like-node"
        aria-label={liked ? "取消喜欢当前卡片" : "喜欢当前卡片"}
        aria-pressed={liked}
        onClick={onToggleLike}
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
      </button>
      <div className="creation-controls">
        <CreationModelPicker
          kind={kind}
          referenceCount={references.length}
          value={selectedModel}
          actualModels={video ? undefined : imageGeneration.models}
          open={menu === "model"}
          onToggle={() => setMenu(menu === "model" ? "" : "model")}
          onChange={(value) => {
            setModel(value);
            onModelChange?.(value);
            setMenu("");
          }}
          onConfigure={onConfigure}
        />
        <div className="control-anchor" data-control="params">
          <button
            className={
              "param-button " + (video ? "video-params" : "image-params")
            }
            aria-label={video ? "视频参数" : undefined}
            title={
              video
                ? undefined
                : "比例和清晰度仅保存为草稿；当前图片请求使用供应商默认参数"
            }
            aria-expanded={menu === "params"}
            onClick={() => setMenu(menu === "params" ? "" : "params")}
          >
            {!video && (
              <Square size={11} strokeWidth={1.5} aria-hidden="true" />
            )}
            {video ? (
              <span className="video-param-summary">
                <span>全能参考</span>
                <i aria-hidden="true" />
                <span>{ratio}</span>
                <i aria-hidden="true" />
                <span>{quality}</span>
                <i aria-hidden="true" />
                <img src="/design/figma/timer-start.png" alt="" />
                <span>{duration}S</span>
              </span>
            ) : (
              <span>{`${ratio} · ${quality} · 中`}</span>
            )}
          </button>
          {menu === "params" && (
            <CreationParameters
              kind={kind}
              ratio={ratio}
              quality={quality}
              duration={duration}
              onRatio={(ratio) => updateParameters({ ratio })}
              onQuality={(quality) => updateParameters({ quality })}
              onDuration={(duration) => updateParameters({ duration })}
            />
          )}
        </div>
        <span className="control-spacer" />
        <button
          className="param-button voice-button"
          disabled={!video}
          title={
            video
              ? `视频声音：${soundEnabled ? "开启" : "关闭"}`
              : "语音输入将在服务接入后开放"
          }
          aria-label={video ? "视频声音" : "语音输入（服务未接入）"}
          aria-pressed={video ? soundEnabled : undefined}
          onClick={
            video
              ? () => updateParameters({ soundEnabled: !soundEnabled })
              : undefined
          }
        >
          <img
            src={
              video && !soundEnabled
                ? "/design/figma/mic-off.svg"
                : "/design/figma/mic.svg"
            }
            alt=""
          />
        </button>
        <GenerationCount
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
            if (video && selectedPrompt.trim()) onGenerationStart?.(copies);
            if (video) void localGeneration.run(selectedPrompt, copies);
            else
              void imageGeneration.run(selectedPrompt, copies, selectedModel);
          }}
        />
      </div>
      {error && (
        <div className="generation-feedback" role="status">
          {error}
        </div>
      )}
      <GenerationStatus generation={generation} />
    </div>
  );
}
