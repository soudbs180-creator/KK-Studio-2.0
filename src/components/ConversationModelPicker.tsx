import ModelPickerMenu from "./ModelPickerMenu";
import { selectedModelLabel } from "../features/models/modelPresentation";
import type { ModelSelection } from "../features/models/modelSelection";
export default function ConversationModelPicker({
  currentModel,
  open,
  onToggle,
  onSelect,
  onConfigure,
  selection,
}: {
  currentModel?: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onSelect: (model: string, selection?: ModelSelection) => void;
  onConfigure: () => void;
  selection?: ModelSelection;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="模型"
        className="chat-model-picker"
        aria-haspopup="menu"
        aria-expanded={open}
        title={currentModel || "模型"}
        onClick={onToggle}
      >
        <img
          src="/design/figma/composer-package.svg"
          width="12.5"
          height="13.85"
          alt=""
        />
        <span className="chat-model-name">
          {selectedModelLabel(selection, currentModel)}
        </span>
      </button>
      {open && (
        <ModelPickerMenu
          scope="conversation"
          current={selection}
          onSelect={(choice) => onSelect(choice.model, choice)}
          onConfigure={onConfigure}
        />
      )}
    </>
  );
}
