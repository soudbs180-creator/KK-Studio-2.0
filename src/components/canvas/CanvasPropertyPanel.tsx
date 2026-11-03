import {
  comfyOutputSourceId,
  type CanvasCollectionItem,
} from "../../domain/canvasItems.ts";
import type { Dispatch, SetStateAction } from "react";
import { resolveWorkflowSource } from "./canvasWorkflowSource.ts";
import {
  ComfyWorkflowParameters,
  readLocalWorkflows,
} from "../../features/comfyui/index.ts";

export default function CanvasPropertyPanel({
  item,
  items,
  onSelect,
  onLocate,
  onItemsChange,
}: {
  item?: CanvasCollectionItem;
  items: readonly CanvasCollectionItem[];
  onSelect: (id: string) => void;
  onLocate: (id: string) => void;
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
}) {
  if (
    !item ||
    !(
      item.comfyWorkflow ||
      (item.kind === "image" &&
        (item.comfyWorkflowSourceId ?? comfyOutputSourceId(item)))
    )
  )
    return null;
  const source = resolveWorkflowSource(item, items);
  const record =
    item.comfyWorkflow?.snapshot ??
    readLocalWorkflows().find((r) => r.id === item.comfyWorkflow?.workflowId);
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
      {item.comfyWorkflow ? (
        record && (
          <ComfyWorkflowParameters
            record={record}
            disabled={Boolean(item.comfyWorkflow.submission)}
            onChange={(snapshot) =>
              onItemsChange((current) =>
                current.map((entry) =>
                  entry.id === item.id
                    ? {
                        ...entry,
                        comfyWorkflow: {
                          ...entry.comfyWorkflow,
                          workflowId: snapshot.id,
                          snapshot,
                        },
                        updatedAt: Date.now(),
                        node_rev: (entry.node_rev ?? 1) + 1,
                      }
                    : entry,
                ),
              )
            }
          />
        )
      ) : (
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
      )}
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
