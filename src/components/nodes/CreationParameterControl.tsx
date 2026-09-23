import UiIcon from "../UiIcon";
import CreationParameters from "./CreationParameters";
import ImageModelParameters from "./ImageModelParameters";
import type { CanvasParameters } from "../../domain/canvasItems";
import type { ModelSelection } from "../../domain/modelSelection";
export default function CreationParameterControl({
  kind,
  model,
  parameters,
  open,
  onToggle,
  onChange,
  onModelChange,
}: {
  kind: "image" | "video";
  model: string;
  parameters: CanvasParameters;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CanvasParameters>) => void;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
}) {
  const video = kind === "video";
  const { ratio, quality, duration } = parameters;
  return (
    <div className="control-anchor" data-control="params">
      <button
        className={"param-button " + (video ? "video-params" : "image-params")}
        aria-label={video ? "视频参数" : undefined}
        title={video ? undefined : "使用当前模型声明支持的尺寸"}
        aria-expanded={open}
        onClick={onToggle}
      >
        {!video && <UiIcon name="image" size={11} />}
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
          <span>
            {parameters?.imageSize
              ? `${parameters.imageSize} · ${ratio}`
              : "自适应尺寸"}
          </span>
        )}
      </button>
      {open && !video && (
        <ImageModelParameters
          model={model}
          onModelChange={onModelChange}
          size={parameters?.imageSize}
          onSize={(imageSize, ratio) =>
            onChange({
              imageSize,
              ratio: ratio ?? "自适应",
              quality: "自适应",
            })
          }
        />
      )}
      {open && video && (
        <CreationParameters
          kind={kind}
          ratio={ratio}
          quality={quality}
          duration={duration}
          onRatio={(ratio) => onChange({ ratio })}
          onQuality={(quality) => onChange({ quality })}
          onDuration={(duration) => onChange({ duration })}
        />
      )}
    </div>
  );
}
