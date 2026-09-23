import { useContext } from "react";
import {
  CanvasImageNodeContext,
  CanvasImageCommandContext,
} from "../../features/creation/CanvasImageCommand";
import ModelVariantControl from "../ModelVariantControl";
import type { ModelSelection } from "../../domain/modelSelection";
import { readProviderConnections } from "../../features/creation/providerRegistry";
import {
  catalogForConnection,
  imageSizeOptions,
} from "../../features/models/modelCatalog";
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
  const connections = readProviderConnections();
  const candidates = connections.filter((connection) =>
    catalogForConnection(connection).some((entry) => entry.id === model),
  );
  const connectionId =
    declaredConnectionId ??
    (candidates.length === 1 ? candidates[0].id : undefined);
  const connection =
    item?.generationSource === "codex"
      ? undefined
      : connections.find((connection) => connection.id === connectionId);
  const options = imageSizeOptions(
    connection &&
      catalogForConnection(connection).find((entry) => entry.id === model),
  );
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
    </div>
  );
}
