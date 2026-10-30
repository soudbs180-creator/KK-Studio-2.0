import ComfyWorkflowCanvasHost from "./canvas/ComfyWorkflowCanvasHost.tsx";
import CanvasSurface from "./canvas/CanvasSurfaceFrame.tsx";
import CanvasHud from "./canvas/CanvasHud";
import { useCallback, useEffect } from "react";
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
import { useAgentCanvasView } from "./canvas/useAgentCanvasView";
import type { CanvasProps } from "./canvas/CanvasProps";
import { projectCanvasFingerprint } from "../domain/projectCanvas";
import "../styles/canvas-layers.css";
import { ImageCompareProvider as ImageCompareProvider } from "../features/compare/index.ts";
import { ImageCompareControls as ImageCompareControls } from "../features/compare/index.ts";
import { useCanvasGestures } from "./canvas/useCanvasGestures";
import { useCanvasGroups } from "./canvas/useCanvasGroups";
import CanvasGroupHud from "./canvas/CanvasGroupHud";
import { useCanvasReferenceFrames } from "./canvas/useCanvasReferenceFrames";

export default function Canvas({
  projectId,
  comfyRuntime,
  onFlush,
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
    rightGesture,
    items,
    onItemsChange,
    initialCanvas,
  });
  const groups = useCanvasGroups(initialCanvas);
  useAgentCanvasView(controls, projectId, agentViewRef, onAgentViewChange);
  const {
    addNode,
    arrangeNodes,
    locateNode,
    containerRef,
    finishPointer,
    movePointer,
    nodes,
    preferences,
    startCanvasPan,
    transform,
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
    groups.groups,
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
  const handleDeleteConnection = useCallback(
    (id: string) => {
      setEdges((current) => {
        const edge = current.find((edge) => edge.id === id);
        if (edge) setRemovedEdge(edge);
        return deleteConnection(current, id);
      });
      containerRef.current?.focus({ preventScroll: true });
    },
    [setEdges, setRemovedEdge, containerRef],
  );
  const handleConfigure = useCallback(
    () => onOpen?.("settings/providers"),
    [onOpen],
  );
  const handleSwapReferenceFrames = useCanvasReferenceFrames(
    edges,
    onItemsChange,
  );
  const gestures = useCanvasGestures({
    rightGesture,
    controls: {
      tool: controls.tool,
      spaceHeld: controls.spaceHeld,
      startCanvasPan,
    },
    addMenu,
    movePointer,
    finishPointer,
  });
  return (
    <ComfyWorkflowCanvasHost
      projectId={projectId}
      items={items}
      controls={controls}
      connect={connect}
      runtime={comfyRuntime}
      canvas={{
        version: 1,
        positions: nodes,
        edges,
        viewport: transform,
        groups: groups.groups,
      }}
      onCanvasChange={onCanvasChange}
      flush={onFlush}
    >
      <ImageCompareProvider key={projectId} items={items} active={!covered}>
        <CanvasSurface
          controls={controls}
          covered={covered}
          chatOpen={chatOpen}
          onContextMenu={handleContextMenu}
          onKeyDownCapture={handleKeyDown}
          {...gestures}
        >
          <CanvasNodeLayer
            controls={controls}
            items={items}
            onItemsChange={onItemsChange}
            onLocalGenerationSettled={history.settleLocalGeneration}
            likedIds={likedIds}
            onToggleLike={onToggleLike}
            onConfigure={handleConfigure}
            addMenu={addMenu}
            edges={edges}
            showConnections={preferences.showConnections}
            onConnect={connect}
            onConnectionNotice={setConnectionNotice}
            onDeleteConnection={handleDeleteConnection}
            onSwapReferenceFrames={handleSwapReferenceFrames}
            groups={groups.groups}
            collapsedIds={groups.collapsedIds}
            onToggleGroup={groups.toggleCollapsed}
            onUpdateGroup={groups.updateGroup}
            onUngroup={groups.ungroup}
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
            onToggleSnap={() =>
              controls.setSnapEnabled(!preferences.snapEnabled)
            }
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
            onConfigure={handleConfigure}
            onOpenTasks={onOpenTasks}
            tasks={tasks}
            onCancelTask={onCancelTask}
            onRetryTask={onRetryTask}
          >
            <CanvasGroupHud controls={controls} groups={groups} items={items} />
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
        </CanvasSurface>
      </ImageCompareProvider>
    </ComfyWorkflowCanvasHost>
  );
}
