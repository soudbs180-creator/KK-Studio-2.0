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
  selection,
  disabled = false,
}: {
  disabled?: boolean;
  kind: "image" | "video";
  model: string;
  selection?: ModelSelection;
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
        type="button"
        className={"param-button " + (video ? "video-params" : "image-params")}
        disabled={disabled}
        aria-description={
          disabled ? "生成中暂不能修改参数，取消或结束后可继续" : undefined
        }
        aria-label={video ? "视频参数" : undefined}
        title={video ? undefined : "使用当前模型声明支持的尺寸"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onToggle}
      >
        {!video && <UiIcon name="image" size={12} />}
        {video ? (
          <span className="video-param-summary">
            <span>全能参考</span>
            <i aria-hidden="true" />
            <span>{ratio}</span>
            <i aria-hidden="true" />
            <span>{quality}</span>
            <i aria-hidden="true" />
            <UiIcon name="timer" size={12} />
            <span>{duration}S</span>
          </span>
        ) : (
          <span>
            {`${ratio || "自适应"} · ${
              parameters.imageSize ||
              (parameters.quality && parameters.quality !== "自适应"
                ? parameters.quality
                : "1K")
            } · 最小`}
          </span>
        )}
      </button>
      {open && !disabled && !video && (
        <div
          className="node-popover parameter-menu"
          role="dialog"
          aria-label="图片参数"
        >
          <ImageModelParameters
            embedded
            model={model}
            selection={selection}
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
        </div>
      )}
      {open && !disabled && video && (
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
