import CanvasHud from "./canvas/CanvasHud";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import CanvasNavigation from "./canvas/CanvasNavigation";
import { deleteConnection, restoreConnection } from "../domain/canvasGraph";
import CanvasNodeLayer from "./canvas/CanvasNodeLayer";
import { type CanvasContextMenuState } from "./canvas/CanvasContextMenu";
import { useCanvasAddMenu } from "./canvas/useCanvasAddMenu";
import "../styles/demo-results.css";
import "../styles/canvas-actions.css";
import CanvasToolbar from "./canvas/CanvasToolbar";
import { useCanvasControls } from "./canvas/useCanvasControls";
import { surfaceScale } from "./canvas/canvasSurface";
import CanvasOverlays from "./canvas/CanvasOverlays";
import { useCanvasConnections } from "./canvas/useCanvasConnections";
import { useCanvasPersistence } from "./canvas/useCanvasPersistence";
import { canvasPatternPitch } from "../domain/canvasViewport";
import { useAgentCanvasView } from "./canvas/useAgentCanvasView";
import type { CanvasProps } from "./canvas/CanvasProps";

export default function Canvas({
  projectId,
  agentViewRef,
  onAgentViewChange,
  projectStatus,
  covered = false,
  onOpen,
  chatOpen = true,
  onOpenChat,
  onOpenTasks,
  tasks,
  onCancelTask,
  onRetryTask,
  items,
  onItemsChange,
  favoriteIds,
  onToggleFavorite,
  likedIds,
  onToggleLike,
  initialCanvas,
  onCanvasChange,
}: CanvasProps) {
  const [showConnections, setShowConnections] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>();
  const [backgroundPattern, setBackgroundPattern] = useState<"dots" | "grid">(
    "dots",
  );
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(
    null,
  );
  const rightGesture = useRef<{ x: number; y: number; moved: boolean } | null>(
    null,
  );
  const controls = useCanvasControls({
    items,
    onItemsChange,
    favoriteIds,
    onToggleFavorite,
    initialCanvas,
  });
  useAgentCanvasView(controls, projectId, agentViewRef, onAgentViewChange);
  const {
    addNode,
    arrangeNodes,
    locateNode,
    containerRef,
    dragging,
    finishPointer,
    movePointer,
    nodes,
    startCanvasPan,
    transform,
    zoomCanvas,
  } = controls;
  const {
    connect,
    edges,
    setEdges,
    removedEdge,
    setRemovedEdge,
    connectionNotice,
    setConnectionNotice,
  } = useCanvasConnections(items, onItemsChange, initialCanvas?.edges);
  useCanvasPersistence(
    initialCanvas,
    nodes,
    edges,
    transform,
    items,
    onCanvasChange,
  );
  const addMenu = useCanvasAddMenu(containerRef, transform, addNode, connect);
  useEffect(() => {
    const locate = (event: Event): void =>
      locateNode((event as CustomEvent<string>).detail);
    window.addEventListener("kk:focus-node", locate);
    return () => window.removeEventListener("kk:focus-node", locate);
  }, [locateNode]);

  return (
    <div
      ref={containerRef}
      {...(covered ? { inert: "" } : {})}
      className={`canvas infinite-canvas ${chatOpen ? "has-chat" : ""} ${dragging === "pan" ? "is-panning" : ""} canvas-pattern-${backgroundPattern}`}
      data-testid="infinite-canvas"
      data-tool={controls.tool}
      data-space-pan={controls.spaceHeld}
      onContextMenu={(event) => {
        const editable =
          event.target instanceof Element &&
          event.target.closest("input,textarea,[contenteditable=true]");
        if (editable) return;
        event.preventDefault();
        if (
          event.target instanceof Element &&
          event.target.closest(
            "[data-canvas-node],button,.canvas-hud,.canvas-toolbar,.connection",
          )
        ) {
          rightGesture.current = null;
          return;
        }
        if (rightGesture.current?.moved) {
          rightGesture.current = null;
          return;
        }
        rightGesture.current = null;
        setContextMenu({
          client: { x: event.clientX, y: event.clientY },
          trigger: event.currentTarget,
        });
      }}
      role="region"
      aria-label="无限画布"
      tabIndex={0}
      onKeyDownCapture={controls.handleViewKeyDown}
      onPointerDown={(event) => {
        if (event.button === 2)
          rightGesture.current = {
            x: event.clientX,
            y: event.clientY,
            moved: false,
          };
        else if (rightGesture.current) rightGesture.current = null;
        startCanvasPan(event);
      }}
      onDoubleClick={(event) => {
        addMenu.openAtPoint(
          event,
          controls.tool === "select" && !controls.spaceHeld,
        );
      }}
      onPointerMove={(event) => {
        const right = rightGesture.current;
        if (
          right &&
          (event.buttons & 2) !== 0 &&
          Math.hypot(event.clientX - right.x, event.clientY - right.y) > 4
        )
          right.moved = true;
        movePointer(event);
      }}
      onPointerUp={(event) => {
        finishPointer(event);
      }}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
      onWheel={zoomCanvas}
      style={
        {
          "--canvas-usable-width": `${controls.viewport.width}px`,
          backgroundColor,
          backgroundSize: `${canvasPatternPitch(transform.scale)}px ${canvasPatternPitch(transform.scale)}px`,
          "--canvas-pan-x": `${transform.x}px`,
          "--canvas-pan-y": `${transform.y}px`,
          "--canvas-dot-cell": `${canvasPatternPitch(transform.scale)}px`,
          "--canvas-pattern-opacity": Math.min(
            1,
            Math.max(0.2, (transform.scale - 0.45) / 0.55),
          ),
        } as CSSProperties
      }
    >
      <CanvasNodeLayer
        controls={controls}
        items={items}
        onItemsChange={onItemsChange}
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
        likedIds={likedIds}
        onToggleLike={onToggleLike}
        onConfigure={() => onOpen?.("settings/providers")}
        addMenu={addMenu}
        edges={edges}
        showConnections={showConnections}
        onConnect={connect}
        onConnectionNotice={setConnectionNotice}
        onDeleteConnection={(id) => {
          setRemovedEdge(edges.find((edge) => edge.id === id) ?? null);
          setEdges((current) => deleteConnection(current, id));
          containerRef.current?.focus({ preventScroll: true });
        }}
      />

      <CanvasOverlays
        marquee={controls.marquee}
        addMenu={addMenu}
        contextMenu={contextMenu}
        onDismissContextMenu={(restoreFocus = true) => {
          if (restoreFocus) contextMenu?.trigger.focus({ preventScroll: true });
          setContextMenu(null);
        }}
        onAddContextNode={(point, trigger) => {
          setContextMenu(null);
          addMenu.open({ client: point, trigger, atPoint: true });
        }}
        removedEdge={removedEdge}
        onUndoConnection={() => {
          if (!removedEdge) return;
          setEdges((current) => restoreConnection(current, removedEdge, items));
          setRemovedEdge(null);
        }}
        onDismissConnection={() => setRemovedEdge(null)}
        connectionNotice={connectionNotice}
        onDismissConnectionNotice={() => setConnectionNotice("")}
      />
      <CanvasHud
        projectStatus={projectStatus}
        chatOpen={chatOpen}
        onChat={onOpenChat}
        onConfigure={() => onOpen?.("settings/providers")}
        onOpenTasks={onOpenTasks}
        tasks={tasks}
        onCancelTask={onCancelTask}
        onRetryTask={onRetryTask}
      >
        <CanvasNavigation
          transform={transform}
          nodes={nodes}
          items={items}
          onZoom={controls.setZoom}
          onChangeZoom={controls.changeZoom}
          onFit={controls.fitView}
          showConnections={showConnections}
          onToggleConnections={() => setShowConnections((visible) => !visible)}
          backgroundColor={backgroundColor ?? "#0a0a0a"}
          onBackgroundColor={setBackgroundColor}
          backgroundPattern={backgroundPattern}
          onToggleBackgroundPattern={() =>
            setBackgroundPattern((pattern) =>
              pattern === "dots" ? "grid" : "dots",
            )
          }
          onArrange={arrangeNodes}
          onLocate={locateNode}
        />
      </CanvasHud>
      <CanvasToolbar
        tool={controls.tool}
        onToolChange={controls.setTool}
        onOpen={(view) => onOpen?.(view)}
        addOpen={Boolean(addMenu.menu && !addMenu.menu.parentId)}
        onAdd={(trigger) => {
          const box = trigger.getBoundingClientRect();
          const scale = surfaceScale(
            trigger.closest<HTMLElement>(".canvas") ?? trigger,
          );
          addMenu.open({
            client: { x: box.x, y: box.y - 592 * scale },
            trigger,
          });
        }}
      />
    </div>
  );
}
