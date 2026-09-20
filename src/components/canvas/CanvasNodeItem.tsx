import type { Dispatch, SetStateAction } from "react";
import type {
  CanvasCollectionItem,
  CanvasReference,
  DemoResult,
  NodeEditingProps,
} from "../../domain/canvasItems";
import { maxReferenceCount } from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasAddMenu } from "./useCanvasAddMenu";
import CanvasNodeFrame from "./CanvasNodeFrame";
import CanvasNodeContent from "./CanvasNodeContent";
import { CanvasImageNodeContext } from "../../features/creation/CanvasImageCommand";

type GenerationPhase = Parameters<
  NonNullable<NodeEditingProps["onGenerationState"]>
>[0];

export default function CanvasNodeItem({
  item,
  controls,
  addMenu,
  favorite,
  liked,
  connectionTarget,
  onConnect,
  onConnectionTargetChange,
  onToggleFavorite,
  onDelete,
  onToggleLike,
  onConfigure,
  onItemsChange,
  references,
  onDemoResults,
  onGenerationStart,
  onAddReferences,
  onRemoveReference,
  onGenerationState,
}: {
  item: CanvasCollectionItem;
  controls: ReturnType<typeof useCanvasControls>;
  addMenu: ReturnType<typeof useCanvasAddMenu>;
  favorite: boolean;
  liked: boolean;
  connectionTarget: boolean;
  onConnect: (
    source: string,
    target: string,
    kind?: CanvasConnection["kind"],
  ) => void;
  onConnectionTargetChange: (sourceId: string, targetId: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
  onConfigure: () => void;
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  references: CanvasReference[];
  onDemoResults: (id: string, results: DemoResult[]) => void;
  onGenerationStart: (id: string, count: number) => void;
  onAddReferences: (id: string, references: CanvasReference[]) => void;
  onRemoveReference: (id: string) => void;
  onGenerationState: (id: string, phase: GenerationPhase) => void;
}) {
  const editing: NodeEditingProps = {
    selected: controls.selectedNode === item.id,
    liked,
    onToggleLike: () => onToggleLike(item.id),
    onConfigure,
    onExtraHeightChange: controls.setComposerExtraHeight,
    onDemoResults: (results) => onDemoResults(item.id, results),
    onGenerationStart: (count) => onGenerationStart(item.id, count),
    model: item.model,
    onModelChange: (model) =>
      onItemsChange((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, model } : entry,
        ),
      ),
    references,
    referenceLimit: maxReferenceCount(item),
    onAddReferences: (entries) => onAddReferences(item.id, entries),
    onRemoveReference,
    onGenerationState: (phase) => onGenerationState(item.id, phase),
    onChange: (patch) =>
      onItemsChange((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, ...patch, updatedAt: Date.now() }
            : entry,
        ),
      ),
  };
  return (
    <CanvasImageNodeContext.Provider value={item}>
      <CanvasNodeFrame
        item={item}
        controls={controls}
        onOpenMenu={addMenu.open}
        menuOpen={addMenu.menu?.parentId === item.id}
        onConnect={onConnect}
        onConnectionTargetChange={onConnectionTargetChange}
        connectionTarget={connectionTarget}
      >
        <CanvasNodeContent
          item={item}
          favorite={favorite}
          onFavorite={() => onToggleFavorite(item.id)}
          onDelete={() => onDelete(item.id)}
          editing={editing}
        />
      </CanvasNodeFrame>
    </CanvasImageNodeContext.Provider>
  );
}
