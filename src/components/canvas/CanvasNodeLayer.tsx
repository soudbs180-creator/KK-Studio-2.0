import {
  useCallback,
  useContext,
  useMemo,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type CanvasCollectionItem } from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { CanvasGroup } from "../../domain/projectCanvas";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasAddMenu } from "./useCanvasAddMenu";
import CanvasNodeItem from "./CanvasNodeItem";
import CanvasConnections from "./CanvasConnections";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand";
import type { ModelSelection } from "../../domain/modelSelection";
import { useCanvasNodeLayerHandlers } from "./useCanvasNodeLayerHandlers";
import CanvasGroupLayer from "./CanvasGroupLayer";

interface CanvasNodeLayerProps {
  controls: ReturnType<typeof useCanvasControls>;
  items: CanvasCollectionItem[];
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  onLocalGenerationSettled: (terminal: CanvasCollectionItem[]) => void;
  likedIds: Set<string>;
  onToggleLike: (id: string) => void;
  onConfigure: () => void;
  addMenu: ReturnType<typeof useCanvasAddMenu>;
  edges: CanvasConnection[];
  showConnections: boolean;
  onConnect: (
    source: string,
    target: string,
    kind?: "reference" | "result",
  ) => void;
  onConnectionNotice: (message: string) => void;
  onDeleteConnection: (id: string) => void;
  onSwapReferenceFrames?: (firstId: string, lastId: string) => void;
  groups?: CanvasGroup[];
  collapsedIds?: Set<string>;
  onToggleGroup?: (id: string) => void;
  onUpdateGroup?: (id: string, patch: Partial<CanvasGroup>) => void;
  onUngroup?: (id: string) => void;
}

const EMPTY_GROUPS: CanvasGroup[] = [];
const EMPTY_COLLAPSED_IDS = new Set<string>();

/** The existing world-space node and connection layer, shared by every canvas state. */
export default function CanvasNodeLayer({
  controls,
  items,
  onItemsChange,
  onLocalGenerationSettled,
  likedIds,
  onToggleLike,
  onConfigure,
  addMenu,
  edges,
  showConnections,
  onConnect,
  onConnectionNotice,
  onDeleteConnection,
  onSwapReferenceFrames,
  groups = EMPTY_GROUPS,
  collapsedIds = EMPTY_COLLAPSED_IDS,
  onToggleGroup,
  onUpdateGroup,
  onUngroup,
}: CanvasNodeLayerProps) {
  const command = useContext(CanvasImageCommandContext);
  const defaultSelection: ModelSelection | undefined = useMemo(
    () =>
      command
        ? {
            source: "api",
            model: command.model,
            connectionId: command.providerConnectionId,
          }
        : undefined,
    [command?.model, command?.providerConnectionId],
  );
  const { transform, selectedNode } = controls;

  const {
    connectionTarget,
    pendingByParent,
    referencesFor,
    addGeneratedResults,
    reserveGeneratedResults,
    addReferences,
    markPending,
    handleConnectionTargetChange,
    handleGenerationState,
  } = useCanvasNodeLayerHandlers({
    items,
    edges,
    controls,
    defaultSelection,
    onConnect,
    onConnectionNotice,
    onLocalGenerationSettled,
  });

  const handleDeleteNode = useCallback(
    (id: string) => {
      markPending(id, "cancelled");
      controls.removeNode(id);
    },
    [markPending, controls.removeNode],
  );
  const activeLocalResultIds = Object.values(pendingByParent.current).flat();

  const collapsedItemIds = useMemo(() => {
    if (!groups.length || !collapsedIds.size) return EMPTY_COLLAPSED_IDS;
    const hidden = new Set<string>();
    for (const group of groups) {
      if (!collapsedIds.has(group.id)) continue;
      for (const itemId of group.itemIds) hidden.add(itemId);
    }
    return hidden;
  }, [groups, collapsedIds]);

  return (
    <div
      className="canvas-stage"
      data-testid="canvas-stage"
      style={
        {
          "--canvas-scale": transform.scale,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        } as CSSProperties
      }
    >
      {items.map(
        (item) =>
          !collapsedItemIds.has(item.id) && (
            <CanvasNodeItem
              key={item.id}
              item={item}
              controls={controls}
              addMenu={addMenu}
              liked={likedIds.has(item.id)}
              connectionTarget={connectionTarget === item.id}
              onConnect={onConnect}
              onConnectionTargetChange={handleConnectionTargetChange}
              onDelete={handleDeleteNode}
              activeLocalResultIds={activeLocalResultIds}
              onToggleLike={onToggleLike}
              onConfigure={onConfigure}
              onItemsChange={onItemsChange}
              references={referencesFor(item.id)}
              onDemoResults={addGeneratedResults}
              onGenerationStart={reserveGeneratedResults}
              onAddReferences={addReferences}
              onRemoveReference={onDeleteConnection}
              onSwapReferenceFrames={onSwapReferenceFrames}
              onGenerationState={handleGenerationState}
            />
          ),
      )}
      {groups.length > 0 && onToggleGroup && onUpdateGroup && onUngroup && (
        <CanvasGroupLayer
          groups={groups}
          items={items}
          nodes={controls.nodes}
          collapsedIds={collapsedIds}
          onToggle={onToggleGroup}
          onUpdate={onUpdateGroup}
          onUngroup={onUngroup}
        />
      )}
      <CanvasConnections
        edges={edges}
        nodes={controls.nodes}
        items={items}
        visible={showConnections}
        selectedNode={selectedNode}
        onDelete={onDeleteConnection}
      />
    </div>
  );
}
