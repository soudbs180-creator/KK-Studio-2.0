import CanvasHud from "./canvas/CanvasHud";
import { useEffect, type CSSProperties } from "react";
import CanvasNavigation from "./canvas/CanvasNavigation";
import { deleteConnection, restoreConnection } from "../domain/canvasGraph";
import CanvasNodeLayer from "./canvas/CanvasNodeLayer";
import { useCanvasAddMenu } from "./canvas/useCanvasAddMenu";
import "../styles/demo-results.css";
import "../styles/canvas-actions.css";
import CanvasToolbar from "./canvas/CanvasToolbar";
import { useCanvasControls } from "./canvas/useCanvasControls";
import { surfaceScale } from "./canvas/canvasSurface";
import CanvasOverlays from "./canvas/CanvasOverlays";
import CanvasLayersPanel from "./canvas/CanvasLayersPanel";
import { useCanvasConnections } from "./canvas/useCanvasConnections";
import { useCanvasPersistence } from "./canvas/useCanvasPersistence";
import { useCanvasWorkbenchState } from "./canvas/useCanvasWorkbenchState";
import { useCanvasContextMenu } from "./canvas/useCanvasContextMenu";
import {
  canvasPatternDotSize,
  canvasPatternGridLine,
  canvasPatternOpacity,
  canvasPatternPitch,
} from "../domain/canvasViewport";
import { useAgentCanvasView } from "./canvas/useAgentCanvasView";
import type { CanvasProps } from "./canvas/CanvasProps";
import { projectCanvasFingerprint } from "../domain/projectCanvas";
import "../styles/canvas-layers.css";
import ImageCompareProvider from "../features/compare/ImageCompareProvider";
import ImageCompareControls from "../features/compare/ImageCompareControls";

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
  likedIds,
  onToggleLike,
  initialCanvas,
  onCanvasChange,
}: CanvasProps) {
  const { contextMenu, setContextMenu, rightGesture, handleContextMenu } =
    useCanvasContextMenu();
  const controls = useCanvasControls({
    items,
    onItemsChange,
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
    preferences,
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
  } = useCanvasConnections(
    items,
    onItemsChange,
    initialCanvas?.edges,
    controls.isCanvasEcho,
  );
  const { history, layersOpen, setLayersOpen, handleKeyDown } =
    useCanvasWorkbenchState({
      controls,
      items,
      onItemsChange,
      edges,
      setEdges,
    });
  useCanvasPersistence(
    initialCanvas,
    nodes,
    edges,
    transform,
    items,
    onCanvasChange
      ? (canvas) => {
          // A delayed save ACK must not overwrite a newer local undo or edit.
          controls.publishedCanvas.current = projectCanvasFingerprint(canvas);
          onCanvasChange(canvas);
        }
      : undefined,
  );
  const addMenu = useCanvasAddMenu(containerRef, transform, addNode, connect);
  useEffect(() => {
    const locate = (event: Event): void =>
      locateNode((event as CustomEvent<string>).detail);
    window.addEventListener("kk:focus-node", locate);
    return () => window.removeEventListener("kk:focus-node", locate);
  }, [locateNode]);

  return (
    <ImageCompareProvider key={projectId} items={items} active={!covered}>
      <div
        ref={containerRef}
        {...(covered ? { inert: "" } : {})}
        className={`canvas infinite-canvas ${chatOpen ? "has-chat" : ""} ${dragging === "pan" ? "is-panning" : ""} canvas-pattern-${preferences.backgroundPattern}`}
        data-testid="infinite-canvas"
        data-tool={controls.tool}
        data-space-pan={controls.spaceHeld}
        onContextMenu={handleContextMenu}
        role="region"
        aria-label="无限画布"
        tabIndex={0}
        onKeyDownCapture={handleKeyDown}
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
            backgroundColor: preferences.backgroundColor,
            backgroundSize: `${canvasPatternPitch(transform.scale)}px ${canvasPatternPitch(transform.scale)}px`,
            "--canvas-pan-x": `${transform.x}px`,
            "--canvas-pan-y": `${transform.y}px`,
            "--canvas-dot-cell": `${canvasPatternPitch(transform.scale)}px`,
            "--canvas-pattern-opacity": canvasPatternOpacity(transform.scale),
            "--canvas-dot-size": `${canvasPatternDotSize(transform.scale)}px`,
            "--canvas-grid-line": `${canvasPatternGridLine(transform.scale)}px`,
          } as CSSProperties
        }
      >
        <CanvasNodeLayer
          controls={controls}
          items={items}
          onItemsChange={onItemsChange}
          onLocalGenerationSettled={history.settleLocalGeneration}
          likedIds={likedIds}
          onToggleLike={onToggleLike}
          onConfigure={() => onOpen?.("settings/providers")}
          addMenu={addMenu}
          edges={edges}
          showConnections={preferences.showConnections}
          onConnect={connect}
          onConnectionNotice={setConnectionNotice}
          onDeleteConnection={(id) => {
            setRemovedEdge(edges.find((edge) => edge.id === id) ?? null);
            setEdges((current) => deleteConnection(current, id));
            containerRef.current?.focus({ preventScroll: true });
          }}
        />
        <ImageCompareControls />

        {layersOpen && (
          <CanvasLayersPanel
            items={items}
            selectedNode={controls.selectedNode}
            onSelect={controls.setSelectedNode}
            onLocate={locateNode}
            onClose={() => setLayersOpen(false)}
          />
        )}

        <CanvasOverlays
          marquee={controls.marquee}
          addMenu={addMenu}
          contextMenu={contextMenu}
          onDismissContextMenu={(restoreFocus = true) => {
            if (restoreFocus)
              contextMenu?.trigger.focus({ preventScroll: true });
            setContextMenu(null);
          }}
          onAddContextNode={(point, trigger) => {
            setContextMenu(null);
            addMenu.open({ client: point, trigger, atPoint: true });
          }}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
          onToggleLayers={() => setLayersOpen(true)}
          snapEnabled={preferences.snapEnabled}
          onToggleSnap={() => controls.setSnapEnabled(!preferences.snapEnabled)}
          removedEdge={removedEdge}
          onUndoConnection={() => {
            if (!removedEdge) return;
            setEdges((current) =>
              restoreConnection(current, removedEdge, items),
            );
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
            showConnections={preferences.showConnections}
            onToggleConnections={() =>
              controls.setShowConnections(!preferences.showConnections)
            }
            backgroundColor={preferences.backgroundColor}
            onBackgroundColor={controls.setBackgroundColor}
            backgroundPattern={preferences.backgroundPattern}
            onToggleBackgroundPattern={() =>
              controls.setBackgroundPattern(
                preferences.backgroundPattern === "dots" ? "grid" : "dots",
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
    </ImageCompareProvider>
  );
}
