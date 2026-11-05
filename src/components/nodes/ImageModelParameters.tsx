import { useContext } from "react";
import {
  CanvasImageNodeContext,
  CanvasImageCommandContext,
} from "../../features/creation/index.ts";
import ModelVariantControl from "../ModelVariantControl";
import type { ModelSelection } from "../../domain/modelSelection";
import { useImageModelCapabilities } from "../../features/models/index.ts";
import { imageSizeOptions } from "../../features/models/index.ts";
export default function ImageModelParameters({
  model,
  size,
  onSize,
  onModelChange,
  selection,
  embedded = false,
}: {
  model: string;
  selection?: ModelSelection;
  size?: string;
  onSize: (size?: string, ratio?: string) => void;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
  embedded?: boolean;
}) {
  const item = useContext(CanvasImageNodeContext);
  const command = useContext(CanvasImageCommandContext);
  const declaredConnectionId =
    item?.providerConnectionId ?? command?.providerConnectionId;
  const selected = selection ? {
    ...selection,
    source: selection.source === "api" ? "api" as const : "codex" as const,
  } : {
    source: item?.generationSource === "codex" ? "codex" : "api",
    model,
    connectionId: declaredConnectionId,
  } satisfies ModelSelection;
  const capabilities = useImageModelCapabilities(selected);
  const connectionId = capabilities.connectionId;
  const options = imageSizeOptions(capabilities.declaration);
  const support = {
    unknown: "未声明",
    supported: "支持",
    unsupported: "不支持",
  };
  return (
    <div
      className={
        embedded ? "image-model-parameters" : "node-popover parameter-menu"
      }
      aria-label="图片参数选项"
    >
      <ModelVariantControl
        selection={{
          ...selected,
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
          aria-pressed={!size}
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
      {size && !options.some((option) => option.size === size) && (
        <small role="status">原尺寸 {size} 未由当前模型声明支持，请重新选择或使用自适应。</small>
      )}
      <div className="parameter-capability-grid" aria-label="模型能力参数">
        <span>思考强度</span>
        <strong>由模型决定，此处未提供可发送参数</strong>
        <span>图像搜索</span>
        <strong>当前入口未提供可发送参数</strong>
        <span>参考图</span>
        <strong>
          {capabilities.operations.edit === "supported" ? "支持编辑" : "未声明"}
        </strong>
      </div>
      <small>
        {selected.source !== "api"
          ? "Codex 内置生图由模型自适应尺寸，当前入口不发送尺寸参数。"
          : options.length
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
