import { useLayoutEffect, useState } from "react";
import UiIcon from "../UiIcon";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems";
import { CANVAS_KIND_LABELS } from "../../domain/canvasItems";
import { useLocalGeneration } from "./useLocalGeneration";
import { GenerationAction, GenerationStatus } from "./GenerationAction";

export default function PromptCreationNode({
  item,
  selected,
  onChange,
  onExtraHeightChange,
  onDemoResults,
}: NodeEditingProps & { item: CanvasCollectionItem }) {
  const label = CANVAS_KIND_LABELS[item.kind];
  const [mode, setMode] = useState<"prompt" | "script" | "plan" | "custom">(
    "prompt",
  );
  const [status, setStatus] = useState("");
  const generation = useLocalGeneration(item.kind, onDemoResults);
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
          <span className="demo-badge">前端草稿</span>
        </header>
        <h3>{item.title}</h3>
        <div className="prompt-creation-placeholder">
          <UiIcon name={item.kind} size={48} />
          <p>在下方输入内容，开始创作</p>
        </div>
        <div className="prompt-presets" role="group" aria-label="文案创作方式">
          {[
            ["prompt", "提示词生成"],
            ["script", "剧本生成"],
            ["plan", "策划案生成"],
            ["custom", "自己编写内容"],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "is-active" : ""}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value as typeof mode);
                setStatus(`${text}：请在下方输入区继续编辑。`);
              }}
            >
              {text}
            </button>
          ))}
        </div>
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
            maxLength={7500}
            value={item.prompt ?? ""}
            onChange={(e) => onChange({ prompt: e.target.value })}
          />
          <GenerationAction
            generation={generation}
            label={label}
            onRun={() => void generation.run(item.prompt ?? "")}
          />
          <GenerationStatus generation={generation} />
          <span className="prompt-composer-label">提示词优化</span>
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
