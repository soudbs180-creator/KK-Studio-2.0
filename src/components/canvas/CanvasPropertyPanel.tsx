import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { resolveWorkflowSource } from "./canvasWorkflowSource.ts";

export default function CanvasPropertyPanel({
  item,
  items,
  onSelect,
  onLocate,
}: {
  item: CanvasCollectionItem;
  items: readonly CanvasCollectionItem[];
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const source = resolveWorkflowSource(item, items);
  return (
    <aside
      className="canvas-property-panel"
      role="region"
      aria-label="节点属性"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <header>
        <strong>属性</strong>
        <span>{item.title}</span>
      </header>
      <div className="canvas-property-row">
        <span>工作流来源 [Workflow Source]</span>
        {source ? (
          <button
            type="button"
            aria-label={`定位工作流来源 ${source.title}`}
            onClick={() => {
              onSelect(source.id);
              onLocate(source.id);
            }}
          >
            {source.title}
          </button>
        ) : (
          <p>来源工作流不可用</p>
        )}
      </div>
      {item.prompt && (
        <div className="canvas-property-row">
          <span>提示词</span>
          <p className="canvas-property-prompt">{item.prompt}</p>
        </div>
      )}
      {item.model && (
        <div className="canvas-property-row">
          <span>模型</span>
          <span>{item.model}</span>
        </div>
      )}
    </aside>
  );
}
