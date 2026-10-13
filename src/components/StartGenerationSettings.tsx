import type { CreationDraft } from "../features/creation/model";
import GenerationOptions from "./GenerationOptions";

export default function StartGenerationSettings({
  draft,
  open,
  onToggle,
  onChange,
}: {
  draft: CreationDraft;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CreationDraft>) => void;
}) {
  return (
    <div className="start-resource-picker">
      <button
        type="button"
        className="start-tool-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>生成参数</span>
      </button>
      {open && (
        <section
          className="start-add-popover"
          role="dialog"
          aria-label="生成参数"
        >
          <GenerationOptions draft={draft} onChange={onChange} />
        </section>
      )}
    </div>
  );
}
