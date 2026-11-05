import { useState, useContext } from "react";
import { flushSync } from "react-dom";
import { useCanvasOperationsRuntime } from "../../runtime/canvasCommandRuntime.tsx";
import type { CanvasProps } from "./CanvasProps.ts";
import type { useCanvasControls } from "./useCanvasControls.ts";
import type { useCanvasConnections } from "./useCanvasConnections.ts";
import type { useCanvasGroups } from "./useCanvasGroups.ts";
import type { useCanvasHistory } from "./useCanvasHistory.ts";
import { projectCanvasFingerprint } from "../../domain/projectCanvas.ts";
import { CanvasImageCommandContext } from "../../runtime/canvasCommandRuntime.tsx";
import { canConnectTarget } from "./connectionRules.ts";

export function useCanvasOperationRuntime(
  props: Pick<
    CanvasProps,
    | "projectId"
    | "items"
    | "onItemsChange"
    | "onCanvasChange"
    | "onFlush"
    | "covered"
    | "operationDisabledReason"
    | "onAtomicChange"
  >,
  controls: ReturnType<typeof useCanvasControls>,
  connections: Pick<
    ReturnType<typeof useCanvasConnections>,
    "edges" | "setEdges"
  >,
  groups: ReturnType<typeof useCanvasGroups>,
  history: ReturnType<typeof useCanvasHistory>,
) {
  const [minimapVisible, setMinimapVisible] = useState(false);
  const command = useContext(CanvasImageCommandContext);
  const operations = useCanvasOperationsRuntime(
    {
      getState: () => ({
        items: props.items,
        canvas: {
          version: 1,
          positions: controls.nodes,
          edges: connections.edges,
          viewport: controls.transform,
          groups: groups.groups,
        },
        selectedNodeIds: [...controls.selectedIds],
        snapEnabled: controls.preferences.snapEnabled,
        gridMode: controls.preferences.backgroundPattern,
        minimapVisible,
        screen: {
          width: controls.containerRef.current?.clientWidth ?? 1000,
          height: controls.containerRef.current?.clientHeight ?? 700,
        },
      }),
      commit: (state) => {
        for (const edge of state.canvas.edges) {
          if (
            edge.kind === "result" ||
            connections.edges.some(
              (old) =>
                old.id === edge.id &&
                old.source === edge.source &&
                old.target === edge.target,
            )
          )
            continue;
          if (
            !canConnectTarget(
              state.items,
              state.canvas.edges.filter((e) => e.id !== edge.id),
              edge.source,
              edge.target,
              command
                ? {
                    source: "api",
                    model: command.model,
                    connectionId: command.providerConnectionId,
                  }
                : undefined,
            )
          )
            throw new Error("参考连线超过当前模型能力或目标已锁定");
        }
        flushSync(() => {
          controls.cancelGesture();
          controls.setNodes(state.canvas.positions);
          connections.setEdges(state.canvas.edges);
          groups.setGroups(state.canvas.groups ?? []);
          controls.setTransform(state.canvas.viewport);
          controls.selectNodes(new Set(state.selectedNodeIds));
          controls.setSnapEnabled(state.snapEnabled);
          if (state.gridMode) controls.setBackgroundPattern(state.gridMode);
          setMinimapVisible(state.minimapVisible);
          controls.publishedCanvas.current = projectCanvasFingerprint(
            state.canvas,
          );
          if (props.onAtomicChange)
            props.onAtomicChange(state.items, state.canvas);
          else {
            props.onItemsChange(state.items);
            props.onCanvasChange?.(state.canvas);
          }
        });
      },
      undo: () => {
        if (!history.canUndo) throw new Error("当前没有可撤销操作");
        flushSync(history.undo);
      },
      redo: () => {
        if (!history.canRedo) throw new Error("当前没有可重做操作");
        flushSync(history.redo);
      },
    },
    {
      scope: props.projectId ?? "",
      disabledReason:
        props.operationDisabledReason ??
        (props.covered ? "请关闭当前面板后操作画布" : undefined),
      flush: props.onFlush,
    },
  );
  return { operations, minimapVisible, setMinimapVisible };
}
