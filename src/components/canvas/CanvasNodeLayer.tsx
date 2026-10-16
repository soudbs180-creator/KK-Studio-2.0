import { useContext, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import {
  type CanvasCollectionItem,
} from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasAddMenu } from "./useCanvasAddMenu";
import CanvasNodeItem from "./CanvasNodeItem";
import CanvasConnections from "./CanvasConnections";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand";
import type { ModelSelection } from "../../domain/modelSelection";
import { useCanvasNodeLayerHandlers } from "./useCanvasNodeLayerHandlers";

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
}

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
}: CanvasNodeLayerProps) {
  const command = useContext(CanvasImageCommandContext);
  const defaultSelection: ModelSelection | undefined = command
    ? {
        source: "api",
        model: command.model,
        connectionId: command.providerConnectionId,
      }
    : undefined;
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
      {items.map((item) => (
        <CanvasNodeItem
          key={item.id}
          item={item}
          controls={controls}
          addMenu={addMenu}
          liked={likedIds.has(item.id)}
          connectionTarget={connectionTarget === item.id}
          onConnect={onConnect}
          onConnectionTargetChange={handleConnectionTargetChange}
          onDelete={(id) => {
            markPending(id, "cancelled");
            controls.removeNode(id);
          }}
          activeLocalResultIds={Object.values(pendingByParent.current).flat()}
          onToggleLike={onToggleLike}
          onConfigure={onConfigure}
          onItemsChange={onItemsChange}
          references={referencesFor(item.id)}
          onDemoResults={addGeneratedResults}
          onGenerationStart={reserveGeneratedResults}
          onAddReferences={addReferences}
          onRemoveReference={onDeleteConnection}
          onGenerationState={handleGenerationState}
        />
      ))}
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
