import { useContext, useRef } from "react";
import { useDismissible } from "../useDismissible";
import BrandLogo from "../BrandLogo";
import ModelPickerMenu from "../ModelPickerMenu";
import { selectedModelLabel } from "../../features/models/modelPresentation";
import { CanvasImageNodeContext } from "../../features/creation/CanvasImageCommand";
import type { ModelSelection } from "../../features/models/modelSelection";
export default function CreationModelPicker({
  kind,
  value,
  open,
  onToggle,
  onChange,
  onConfigure,
  disabled = false,
}: {
  disabled?: boolean;
  kind: "image" | "video" | "text";
  value: string;
  open: boolean;
  onToggle: () => void;
  onChange: (model: string, selection?: ModelSelection) => void;
  onConfigure: () => void;
  referenceCount?: number;
  actualModels?: string[];
}) {
  const item = useContext(CanvasImageNodeContext);
  const boundary = useRef<HTMLDivElement>(null);
  useDismissible(open && !disabled, boundary, onToggle);
  return (
    <div
      ref={boundary}
      className="control-anchor model-anchor"
      data-control="model"
    >
      <button
        type="button"
        className="model-button"
        disabled={disabled}
        title={disabled ? "生成中暂不能修改模型，取消或结束后可继续" : value}
        aria-label="画布模型"
        aria-haspopup="menu"
        aria-expanded={open && !disabled}
        onClick={onToggle}
      >
        <span className="logo">
          <BrandLogo variant="model" />
        </span>
        <span className="model-name">
          {selectedModelLabel(
            {
              source: item?.generationSource === "codex" ? "codex" : "api",
              model: value,
              connectionId: item?.providerConnectionId,
              kind,
            },
            value,
          )}
        </span>
      </button>
      {open && !disabled && (
        <ModelPickerMenu
          scope={
            kind === "text"
              ? "canvas-text"
              : kind === "image"
                ? "canvas-image"
                : "canvas-video"
          }
          kind={kind}
          current={{
            source: item?.generationSource === "codex" ? "codex" : "api",
            model: value,
            connectionId: item?.providerConnectionId,
            kind,
          }}
          onSelect={(choice) => onChange(choice.model, choice)}
          onConfigure={onConfigure}
        />
      )}
    </div>
  );
}
