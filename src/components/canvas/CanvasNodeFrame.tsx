import { useRef, useState, type ReactNode } from "react";
import CanvasCollectionToolbar from "./CanvasCollectionToolbar";
import CanvasCardMenu from "./CanvasCardMenu";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { cardLayout } from "../../domain/canvasGraph";
import type { useCanvasControls } from "./useCanvasControls";
import type { AddMenuRequest } from "./useCanvasAddMenu";
import NodeActions from "./NodeActions";

export default function CanvasNodeFrame({
  item,
  hasContent,
  controls,
  children,
  onOpenMenu,
  menuOpen,
  onConnect,
  onConnectionTargetChange,
  connectionTarget,
  liked,
  onLike,
  onDelete,
}: {
  item: CanvasCollectionItem;
  hasContent: boolean;
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
  liked: boolean;
  onLike: () => void;
  onDelete: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [cardMenu, setCardMenu] = useState<{ x: number; y: number } | null>(
    null,
  );
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
  const layout = cardLayout(item);
  const expanded = controls.selectedNode === id;
  return (
    <div
      ref={frame}
      className={`canvas-node canvas-node-${variant} ${item.referenceOnly ? "is-reference-only" : ""} ${hasResultComposer ? "has-reference-composer" : ""} ${controls.selectedNode === id ? "is-selected" : ""} ${controls.dragging === "node" && controls.dragRef.current?.nodeId === id ? "is-dragging" : ""} ${connectionTarget ? "is-connection-target" : ""}`}
      data-canvas-node
      data-node-id={id}
      data-kind={item.kind}
      data-selected={controls.selectedIds.has(id)}
      data-testid={`canvas-node-${id}`}
      role="group"
      tabIndex={0}
      aria-label={`${item.title}，点击或按回车选择，拖动可移动，方向键可微调，按删除键可移除，Shift+F10打开卡片菜单`}
      aria-expanded={
        item.kind === "image" && !item.referenceOnly
          ? controls.selectedNode === id
          : undefined
      }
      aria-describedby="canvas-drag-help"
      style={{
        left: controls.nodes[id]?.x ?? 0,
        top: controls.nodes[id]?.y ?? 0,
        width: layout.width,
        height: expanded ? layout.height : layout.collapsedHeight,
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => controls.startNodeDrag(event, id)}
      onContextMenu={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("input,textarea,[contenteditable='true']")
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const moved = controls.rightGesture.current?.moved;
        controls.rightGesture.current = null;
        if (moved) return;
        controls.setSelectedNode(id);
        setCardMenu({ x: event.clientX, y: event.clientY });
      }}
      onKeyDown={(event) => {
        if (
          event.currentTarget === event.target &&
          !event.nativeEvent.isComposing &&
          (event.key === "ContextMenu" ||
            (event.shiftKey && event.key === "F10"))
        ) {
          event.preventDefault();
          event.stopPropagation();
          controls.setSelectedNode(id);
          const box = event.currentTarget.getBoundingClientRect();
          setCardMenu({ x: box.left + box.width / 2, y: box.top + 32 });
          return;
        }
        controls.moveNodeWithKeyboard(event, id, onDelete);
      }}
    >
      {children}
      {!item.plugin && (
        <CanvasCollectionToolbar
          item={item}
          anchor={frame}
          selected={expanded}
          hasContent={hasContent}
          liked={liked}
          onLike={onLike}
          onDelete={onDelete}
        />
      )}
      {cardMenu && (
        <CanvasCardMenu
          title={item.title}
          point={cardMenu}
          trigger={frame}
          onClose={() => setCardMenu(null)}
          onDelete={onDelete}
        />
      )}
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
