import type { CreationDraft } from "../features/creation/model";
import ModelPickerMenu from "./ModelPickerMenu";

export default function StartModelPicker({
  draft,
  defaultModel,
  model,
  open,
  onToggle,
  onSelect,
  onConfigure,
}: {
  draft: CreationDraft;
  defaultModel: string;
  model: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (choice: { model: string; connectionId?: string }) => void;
  onConfigure: () => void;
}) {
  return (
    <div className="start-model-picker">
      <button
        type="button"
        className="start-tool-button"
        aria-label="模型"
        aria-haspopup="menu"
        aria-expanded={open}
        title={model}
        onClick={onToggle}
      >
        <img src="/design/figma/composer-package.svg" alt="" />
        <span>{draft.model || defaultModel ? model : "选模型"}</span>
      </button>
      {open && (
        <ModelPickerMenu
          scope="canvas-image"
          kind="image"
          apiOnly
          current={{
            source: "api",
            model,
            connectionId: draft.providerConnectionId,
            kind: "image",
          }}
          onSelect={onSelect}
          onConfigure={onConfigure}
        />
      )}
    </div>
  );
}
