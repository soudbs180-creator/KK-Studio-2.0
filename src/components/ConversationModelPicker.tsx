import ModelPickerMenu from "./ModelPickerMenu";
import type { ModelSelection } from "../features/models/index.ts";
export default function ConversationModelPicker({
  currentModel,
  disabled = false,
  open,
  onToggle,
  onSelect,
  onConfigure,
  selection,
}: {
  currentModel?: string;
  disabled?: boolean;
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
        disabled={disabled}
        aria-label="模型"
        className="chat-model-picker"
        aria-haspopup="menu"
        aria-expanded={open && !disabled}
        title={currentModel || "模型"}
        onClick={onToggle}
      >
        <img
          src="/design/figma/composer-package.svg"
          width="16"
          height="16"
          alt=""
        />
        <span className="chat-model-name">{currentModel || "主 Agent"}</span>
      </button>
      {open && !disabled && (
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
