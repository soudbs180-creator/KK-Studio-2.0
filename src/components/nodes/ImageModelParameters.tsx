import { useContext } from "react";
import {
  CanvasImageNodeContext,
  CanvasImageCommandContext,
} from "../../features/creation/CanvasImageCommand";
import ModelVariantControl from "../ModelVariantControl";
import type { ModelSelection } from "../../domain/modelSelection";
import { useImageModelCapabilities } from "../../features/models/useImageModelCapabilities";
import { imageSizeOptions } from "../../features/models/modelCatalog";
export default function ImageModelParameters({
  model,
  size,
  onSize,
  onModelChange,
}: {
  model: string;
  size?: string;
  onSize: (size?: string, ratio?: string) => void;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
}) {
  const item = useContext(CanvasImageNodeContext);
  const command = useContext(CanvasImageCommandContext);
  const declaredConnectionId =
    item?.providerConnectionId ?? command?.providerConnectionId;
  const capabilities = useImageModelCapabilities({
    source: item?.generationSource === "codex" ? "codex" : "api",
    model,
    connectionId: declaredConnectionId,
  });
  const connectionId = capabilities.connectionId;
  const options = imageSizeOptions(capabilities.declaration);
  const support = {
    unknown: "未声明",
    supported: "支持",
    unsupported: "不支持",
  };
  return (
    <div className="node-popover parameter-menu" aria-label="图片参数选项">
      <ModelVariantControl
        selection={{
          source: item?.generationSource === "codex" ? "codex" : "api",
          model,
          connectionId,
        }}
        onSelect={(selection) => onModelChange?.(selection.model, selection)}
      />
      <small>尺寸与比例</small>
      <div className="quality-row" role="group" aria-label="图片尺寸">
        <button
          type="button"
          className="quality-btn"
          aria-pressed={
            !size || !options.some((option) => option.size === size)
          }
          onClick={() => onSize()}
        >
          自适应
        </button>
        {options.map((option) => (
          <button
            type="button"
            key={option.size}
            className="quality-btn"
            aria-pressed={size === option.size}
            onClick={() => onSize(option.size, option.ratio)}
          >
            {option.size} · {option.ratio}
          </button>
        ))}
      </div>
      <small>
        {options.length
          ? "只发送当前模型声明支持的尺寸；自适应使用供应商默认值。"
          : "当前模型未声明尺寸，只发送默认参数。可在设置中刷新目录或补充供应商规格。"}
      </small>
      <small>
        图片生成：{support[capabilities.operations.generate]} · 参考图编辑：
        {support[capabilities.operations.edit]}
      </small>
      {capabilities.maxReferences !== undefined && (
        <small>
          最多 {capabilities.maxReferences} 张参考图（包含编辑原图）。
        </small>
      )}
      {capabilities.maxGenerationCount !== undefined && (
        <small>
          一次任务最多生成 {capabilities.maxGenerationCount} 张图片。
        </small>
      )}
      <small>
        局部重绘需要已声明的编辑能力；扩图暂不可用。能力声明不代表实际生成验证。
      </small>
    </div>
  );
}
