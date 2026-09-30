import type { CreationDraft } from "../features/creation/model";
import GenerationOptions from "./GenerationOptions";

export default function StartAddPicker({
  open,
  onToggle,
  onClose,
  onAddFile,
  onOpenPlugins,
  onOpenPartners,
  draft,
  onChange,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddFile: () => void;
  onOpenPlugins: () => void;
  onOpenPartners: () => void;
  draft: CreationDraft;
  onChange: (patch: Partial<CreationDraft>) => void;
}) {
  return (
    <div className="start-add-picker">
      <button
        type="button"
        className="start-add-button"
        aria-label="添加素材与生成设置"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        <img src="/design/figma/composer-home-plus.svg" alt="" />
      </button>
      {open && (
        <div
          className="start-add-popover"
          role="dialog"
          aria-label="添加素材与生成设置"
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddFile();
            }}
          >
            添加参考素材
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPlugins();
            }}
          >
            插件（MCP）
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPartners();
            }}
          >
            伙伴（智能体）
          </button>
          <div className="start-add-options" aria-label="生成设置">
            <strong>生成设置</strong>
            <GenerationOptions draft={draft} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  );
}
