import {
  codexSelectionLabel,
  type ModelSelection,
} from "../domain/modelSelection";
import { selectedModelLabel } from "../features/models/index.ts";
import ModelPickerMenu from "./ModelPickerMenu";

export default function StartModelPicker({
  selection,
  open,
  onToggle,
  onSelect,
  onConfigure,
}: {
  selection: ModelSelection;
  open: boolean;
  onToggle: () => void;
  onSelect: (choice: ModelSelection) => void;
  onConfigure: () => void;
}) {
  const label =
    selection.source === "api"
      ? selectedModelLabel(selection, selection.model)
      : codexSelectionLabel(selection);
  return (
    <div className="start-model-picker">
      <button
        type="button"
        className="start-tool-button"
        aria-label="模型"
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={onToggle}
      >
        <img src="/design/figma/composer-package.svg" alt="" />
        <span>{label || "选模型"}</span>
      </button>
      {open && (
        <ModelPickerMenu
          scope="home"
          kind="image"
          current={selection}
          onSelect={onSelect}
          onConfigure={onConfigure}
        />
      )}
    </div>
  );
}
