import type { ReactNode } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { useCanvasControls } from "./useCanvasControls";
import type { AddMenuRequest } from "./useCanvasAddMenu";
import NodeActions from "./NodeActions";

export default function CanvasNodeFrame({
  item,
  controls,
  children,
  onOpenMenu,
  menuOpen,
  onConnect,
  onConnectionTargetChange,
  connectionTarget,
}: {
  item: CanvasCollectionItem;
  controls: ReturnType<typeof useCanvasControls>;
  children: ReactNode;
  onOpenMenu: (request: AddMenuRequest) => void;
  menuOpen: boolean;
  onConnect?: (sourceId: string, targetId: string) => void;
  onConnectionTargetChange?: (
    sourceId: string,
    targetId: string | null,
  ) => void;
  connectionTarget?: boolean;
}) {
  const id = item.id;
  const hasResultComposer = Boolean(
    item.result &&
    !item.referenceOnly &&
    (item.kind === "image" || item.kind === "video"),
  );
  const variant = item.plugin
    ? "plugin"
    : item.result ||
        (item.generationStatus && item.generationIndex !== undefined) ||
        ["audio", "text"].includes(item.kind)
      ? "result"
      : item.kind === "image"
        ? "image"
        : ["video1", "video2"].includes(id)
          ? id
          : "video";
  return (
    <div
      className={`canvas-node canvas-node-${variant} ${item.referenceOnly ? "is-reference-only" : ""} ${hasResultComposer ? "has-reference-composer" : ""} ${controls.selectedNode === id ? "is-selected" : ""} ${controls.dragging === "node" && controls.dragRef.current?.nodeId === id ? "is-dragging" : ""} ${connectionTarget ? "is-connection-target" : ""}`}
      data-canvas-node
      data-node-id={id}
      data-selected={controls.selectedIds.has(id)}
      data-testid={`canvas-node-${id}`}
      role="group"
      tabIndex={0}
      aria-label={`${item.title}，点击或按回车选择，拖动可移动，方向键可微调${id.startsWith("added-") ? "，按删除键可移除" : ""}`}
      aria-expanded={
        item.kind === "image" && !item.referenceOnly
          ? controls.selectedNode === id
          : undefined
      }
      aria-describedby="canvas-drag-help"
      style={{
        left: controls.nodes[id]?.x ?? 0,
        top: controls.nodes[id]?.y ?? 0,
        ...(item.plugin
          ? {
              width: item.plugin.width ?? 380,
              height: item.plugin.height ?? 300,
            }
          : {}),
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => controls.startNodeDrag(event, id)}
      onKeyDown={(event) => controls.moveNodeWithKeyboard(event, id)}
    >
      {children}
      <NodeActions
        item={item}
        onOpenMenu={onOpenMenu}
        menuOpen={menuOpen}
        onConnect={onConnect}
        onConnectionTargetChange={onConnectionTargetChange}
      />
    </div>
  );
}
