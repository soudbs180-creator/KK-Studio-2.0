import { useLayoutEffect, useState } from "react";
import CreationModelPicker from "./CreationModelPicker";
import ModelVariantControl from "../ModelVariantControl";
import UiIcon from "../UiIcon";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems";
import { CANVAS_KIND_LABELS } from "../../domain/canvasItems";
import { useLocalGeneration } from "./useLocalGeneration";
import { GenerationAction, GenerationStatus } from "./GenerationAction";
import { useCanvasImageGeneration } from "../../features/creation/CanvasImageCommand";

const TEXT_MODES = [
  {
    value: "prompt",
    label: "提示词生成",
    instruction: "请根据以下主题编写可直接使用的生成提示词：",
  },
  {
    value: "script",
    label: "剧本生成",
    instruction: "请根据以下主题编写包含场景、动作和对白的剧本：",
  },
  {
    value: "plan",
    label: "策划案生成",
    instruction: "请根据以下主题编写包含目标、方案和执行步骤的策划案：",
  },
  { value: "custom", label: "自己编写内容", instruction: "" },
] as const;

export default function PromptCreationNode({
  item,
  selected,
  onChange,
  onExtraHeightChange,
  onDemoResults,
  onConfigure,
}: NodeEditingProps & { item: CanvasCollectionItem }) {
  const label = CANVAS_KIND_LABELS[item.kind];
  const mode =
    TEXT_MODES.find(
      (entry) =>
        entry.instruction &&
        (item.prompt ?? "").startsWith(entry.instruction + "\n\n"),
    )?.value ?? "custom";
  const [modelOpen, setModelOpen] = useState(false);
  const [status, setStatus] = useState("");
  const demoGeneration = useLocalGeneration(item.kind, onDemoResults);
  const textGeneration = useCanvasImageGeneration();
  const generation = item.kind === "text" ? textGeneration : demoGeneration;
  useLayoutEffect(() => {
    if (selected) onExtraHeightChange(60);
  }, [selected, onExtraHeightChange]);
  return (
    <div className="prompt-creation">
      <article className="demo-result-node" data-kind={item.kind}>
        <header>
          <span className="demo-type">
            <UiIcon name={item.kind} />
            {label}
          </span>
          <span className="demo-badge">
            {item.kind === "audio" ? "本地演示" : "本地草稿"}
          </span>
        </header>
        <h3>{item.title}</h3>
        <div className="prompt-creation-placeholder">
          <UiIcon name={item.kind} size={48} />
          <p>
            {item.kind === "text" && textGeneration.draftText
              ? `正在生成：${textGeneration.draftText.slice(-240)}`
              : item.kind === "audio"
                ? "当前播放固定演示音频，语音生成尚未接入。"
                : "在下方输入内容，开始创作"}
          </p>
        </div>
        {item.kind === "text" && (
          <div
            className="prompt-presets"
            role="group"
            aria-label="文案创作方式"
          >
            {TEXT_MODES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className="ui-button"
                aria-pressed={mode === entry.value}
                onClick={() => {
                  let content = item.prompt ?? "";
                  const previous = TEXT_MODES.find(
                    (mode) =>
                      mode.instruction &&
                      content.startsWith(mode.instruction + "\n\n"),
                  );
                  if (previous)
                    content = content.slice(previous.instruction.length + 2);
                  const prompt = entry.instruction
                    ? `${entry.instruction}\n\n${content}`
                    : content;
                  if (prompt.length > 4000) {
                    setStatus("加入指令后超过 4,000 字符，请先精简输入。");
                    return;
                  }
                  onChange({ prompt });
                  setStatus(
                    entry.instruction
                      ? "写作指令已加入输入，编辑后点击生成。"
                      : "已切换为自由写作，保留你的内容。",
                  );
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}
      </article>
      {selected && (
        <div
          className="creation-composer prompt-composer"
          data-testid={`${item.kind}-composer`}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <textarea
            aria-label={`${label}提示词`}
            placeholder="描述你想要生成的内容"
            maxLength={item.kind === "text" ? 4000 : 7500}
            value={item.prompt ?? ""}
            onChange={(e) => onChange({ prompt: e.target.value })}
          />
          {item.kind === "text" && (
            <CreationModelPicker
              kind="text"
              value={item.model ?? textGeneration.model}
              open={modelOpen}
              onToggle={() => setModelOpen(!modelOpen)}
              onChange={(model, selection) => {
                onChange({
                  model,
                  providerConnectionId: selection?.connectionId,
                  generationSource:
                    selection?.source === "codex" ? "codex" : undefined,
                });
                setModelOpen(false);
              }}
              onConfigure={onConfigure}
            />
          )}
          {item.kind === "text" && (
            <ModelVariantControl
              selection={{
                source: item.generationSource === "codex" ? "codex" : "api",
                model: item.model ?? textGeneration.model,
                connectionId: item.providerConnectionId,
              }}
              onSelect={(selection) =>
                onChange({
                  model: selection.model,
                  providerConnectionId: selection.connectionId,
                })
              }
            />
          )}
          <GenerationAction
            generation={generation}
            label={label}
            onRun={() => {
              if (item.kind === "text")
                void textGeneration.run(
                  item.prompt ?? "",
                  1,
                  textGeneration.model,
                );
              else void demoGeneration.run(item.prompt ?? "");
            }}
          />
          <GenerationStatus generation={generation} />
          <span className="prompt-composer-label">
            {item.kind === "text"
              ? "写作指令可直接编辑"
              : "音频演示 · 参数不改变固定素材"}
          </span>
          {status && (
            <p className="prompt-tool-status" role="status">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
