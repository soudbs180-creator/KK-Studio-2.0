import { useContext } from "react";
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
}: {
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
  return (
    <div className="control-anchor model-anchor" data-control="model">
      <button
        type="button"
        className="model-button"
        title={value}
        aria-label="画布模型"
        aria-haspopup="menu"
        aria-expanded={open}
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
            },
            value,
          )}
        </span>
      </button>
      {open && (
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
          }}
          onSelect={(choice) => onChange(choice.model, choice)}
          onConfigure={onConfigure}
        />
      )}
    </div>
  );
}
