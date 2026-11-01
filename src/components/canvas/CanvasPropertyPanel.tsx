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
        <span>[Workflow Source]</span>
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
    </aside>
  );
}
