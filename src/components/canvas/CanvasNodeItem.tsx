import {
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  CanvasCollectionItem,
  CanvasReference,
  DemoResult,
  NodeEditingProps,
} from "../../domain/canvasItems";
import { canvasImageReferenceLimit } from "../../features/models/imageModelCapabilities";
import { readProviderConnections } from "../../features/creation/providerRegistry";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasAddMenu } from "./useCanvasAddMenu";
import CanvasNodeFrame from "./CanvasNodeFrame";
import CanvasNodeContent from "./CanvasNodeContent";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { shadowEventBus } from "../../features/sync/shadowEventBus";
import {
  CanvasImageNodeContext,
  CanvasImageCommandContext,
} from "../../features/creation/CanvasImageCommand";

type GenerationPhase = Parameters<
  NonNullable<NodeEditingProps["onGenerationState"]>
>[0];

interface CanvasNodeItemProps {
  item: CanvasCollectionItem;
  controls: ReturnType<typeof useCanvasControls>;
  addMenu: ReturnType<typeof useCanvasAddMenu>;
  liked: boolean;
  connectionTarget: boolean;
  onConnect: (
    source: string,
    target: string,
    kind?: CanvasConnection["kind"],
  ) => void;
  onConnectionTargetChange: (sourceId: string, targetId: string | null) => void;
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
  activeLocalResultIds?: readonly string[];
}

function arePropsEqual(
  prev: CanvasNodeItemProps,
  next: CanvasNodeItemProps,
): boolean {
  if (prev.item !== next.item) return false;
  if (prev.liked !== next.liked) return false;
  if (prev.connectionTarget !== next.connectionTarget) return false;
  if (prev.references !== next.references) return false;

  const id = prev.item.id;

  const prevActive = prev.activeLocalResultIds?.includes(id) ?? false;
  const nextActive = next.activeLocalResultIds?.includes(id) ?? false;
  if (prevActive !== nextActive) return false;

  const prevMenuOpen = prev.addMenu.menu?.parentId === id;
  const nextMenuOpen = next.addMenu.menu?.parentId === id;
  if (prevMenuOpen !== nextMenuOpen) return false;

  const prevSelected = prev.controls.selectedNode === id;
  const nextSelected = next.controls.selectedNode === id;
  if (prevSelected !== nextSelected) return false;

  const prevMulti = prev.controls.selectedIds.has(id);
  const nextMulti = next.controls.selectedIds.has(id);
  if (prevMulti !== nextMulti) return false;

  const prevDragging =
    prev.controls.dragging === "node" &&
    prev.controls.dragRef.current?.nodeId === id;
  const nextDragging =
    next.controls.dragging === "node" &&
    next.controls.dragRef.current?.nodeId === id;
  if (prevDragging !== nextDragging) return false;

  const prevPos = prev.controls.nodes[id];
  const nextPos = next.controls.nodes[id];
  if (prevPos !== nextPos) {
    if (!prevPos || !nextPos) return false;
    if (prevPos.x !== nextPos.x || prevPos.y !== nextPos.y) return false;
  }

  if (
    prev.item.plugin &&
    prev.controls.transform.scale !== next.controls.transform.scale
  ) {
    return false;
  }

  if (
    prev.onConnect !== next.onConnect ||
    prev.onConnectionTargetChange !== next.onConnectionTargetChange ||
    prev.onDelete !== next.onDelete ||
    prev.onToggleLike !== next.onToggleLike ||
    prev.onConfigure !== next.onConfigure ||
    prev.onItemsChange !== next.onItemsChange ||
    prev.onDemoResults !== next.onDemoResults ||
    prev.onGenerationStart !== next.onGenerationStart ||
    prev.onAddReferences !== next.onAddReferences ||
    prev.onRemoveReference !== next.onRemoveReference ||
    prev.onGenerationState !== next.onGenerationState
  ) {
    return false;
  }

  return true;
}

function CanvasNodeItem({
  item,
  controls,
  addMenu,
  liked,
  connectionTarget,
  onConnect,
  onConnectionTargetChange,
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
  activeLocalResultIds = [],
}: CanvasNodeItemProps) {
  const command = useContext(CanvasImageCommandContext);
  const uploadInput = useRef<HTMLInputElement>(null);
  const mediaSource =
    item.kind === "audio"
      ? item.result?.kind === "audio"
        ? item.result.src || ""
        : ""
      : item.result?.poster ||
        item.result?.src ||
        item.preview ||
        item.assetId ||
        "";
  const [mediaContent, setMediaContent] = useState({
    source: "",
    ready: false,
  });
  const onContentReadyChange = useCallback(
    (ready: boolean) =>
      setMediaContent((current) =>
        current.source === mediaSource && current.ready === ready
          ? current
          : { source: mediaSource, ready },
      ),
    [mediaSource],
  );
  const hasContent = item.plugin
    ? Boolean(
        typeof item.plugin.metadata?.content === "string" &&
        item.plugin.metadata.content.trim(),
      )
    : item.kind === "text"
      ? Boolean(item.result?.kind === "text" && item.result.text?.trim())
      : Boolean(
          mediaSource &&
          mediaContent.source === mediaSource &&
          mediaContent.ready,
        );

  const isSelected = controls.selectedNode === item.id;
  const setComposerExtraHeight = controls.setComposerExtraHeight;
  const isGenerationActive = activeLocalResultIds.includes(item.id);
  const isGenerating = (item.generationStatus as unknown as string) === "generating";

  const handlePreempt = useCallback(
    (reason: string = "designer_override") => {
      const taskId =
        (item as unknown as { taskId?: string; activeTaskId?: string }).taskId ||
        (item as unknown as { taskId?: string; activeTaskId?: string }).activeTaskId ||
        "unknown";
      const baseRev = item.node_rev ?? shadowEventBus.getNodeRevision(item.id) ?? 1;

      // 1. Emit shadow events
      shadowEventBus.emit({
        eventType: "agent.task.cancelled",
        targetNodeId: item.id,
        actor: "system",
        baseRev,
        newRev: baseRev,
        payload: { taskId, targetNodeId: item.id, reason },
      });

      const newRev = baseRev + 1;
      shadowEventBus.setNodeRevision(item.id, newRev);
      shadowEventBus.emit({
        eventType: "canvas.node.override",
        targetNodeId: item.id,
        actor: "designer",
        baseRev,
        newRev,
        payload: {
          targetNodeId: item.id,
          actor: "designer",
          taskId,
          overriddenState: "generating",
          reason,
        },
      });

      // 2. Invoke preemption backend if in Tauri
      if (isTauri()) {
        invoke("concurrency_preempt_node", {
          nodeId: item.id,
          actor: "designer",
        }).catch(() => {});
        if (taskId !== "unknown") {
          invoke("task_host_cancel", { taskId }).catch(() => {});
        }
      }

      // 3. Clear generationStatus and restore designer interactive control
      onItemsChange((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                generationStatus: undefined,
                node_rev: newRev,
                updatedAt: Date.now(),
              }
            : entry,
        ),
      );
    },
    [item, onItemsChange],
  );

  const handleDelete = useCallback(() => {
    if (isGenerating) {
      handlePreempt("designer_delete");
    }
    onDelete(item.id);
  }, [isGenerating, handlePreempt, onDelete, item.id]);

  const wrappedControls = useMemo(() => {
    if (!isGenerating) return controls;
    return {
      ...controls,
      startNodeDrag: (event: React.PointerEvent<HTMLDivElement>, id: string) => {
        if (id === item.id) {
          handlePreempt("designer_drag");
        }
        controls.startNodeDrag(event, id);
      },
      moveNodeWithKeyboard: (
        event: React.KeyboardEvent<HTMLDivElement>,
        id: string,
        onDeleteNode: () => void,
      ) => {
        if (id === item.id) {
          handlePreempt("designer_keyboard_move");
        }
        controls.moveNodeWithKeyboard(event, id, onDeleteNode);
      },
    };
  }, [controls, isGenerating, handlePreempt, item.id]);

  const editing: NodeEditingProps = useMemo(
    () => ({
      selected: isSelected,
      hasContent,
      onContentReadyChange,
      generationActive: isGenerationActive,
      liked,
      onToggleLike: () => onToggleLike(item.id),
      onConfigure,
      onExtraHeightChange: setComposerExtraHeight,
      onDemoResults: (results) => onDemoResults(item.id, results),
      onGenerationStart: (count) => onGenerationStart(item.id, count),
      model: item.model,
      onModelChange: (model, selection) =>
        onItemsChange((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  model,
                  providerConnectionId: selection?.connectionId,
                  generationSource:
                    selection?.source === "codex" ? "codex" : undefined,
                  parameters: entry.parameters
                    ? {
                        ...entry.parameters,
                        imageSize: undefined,
                        count:
                          selection?.source === "codex"
                            ? "1"
                            : entry.parameters.count,
                      }
                    : undefined,
                }
              : entry,
          ),
        ),
      references,
      referenceLimit: canvasImageReferenceLimit(
        item,
        readProviderConnections(),
        command
          ? {
              source: "api",
              model: command.model,
              connectionId: command.providerConnectionId,
            }
          : undefined,
      ),
      onAddReferences: (entries) => onAddReferences(item.id, entries),
      onRemoveReference,
      onGenerationState: (phase) => onGenerationState(item.id, phase),
      onChange: (patch) => {
        if (isGenerating) {
          handlePreempt("designer_update");
        }
        const baseRev = item.node_rev ?? shadowEventBus.getNodeRevision(item.id) ?? 1;
        const newRev = baseRev + 1;
        shadowEventBus.setNodeRevision(item.id, newRev);
        shadowEventBus.emit({
          eventType: "canvas.node.updated",
          targetNodeId: item.id,
          actor: "designer",
          baseRev,
          newRev,
          payload: { id: item.id, patch },
        });
        onItemsChange((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  ...patch,
                  generationStatus: isGenerating ? undefined : entry.generationStatus,
                  node_rev: newRev,
                  updatedAt: Date.now(),
                }
              : entry,
          ),
        );
      },
    }),
    [
      isSelected,
      hasContent,
      onContentReadyChange,
      isGenerationActive,
      liked,
      onToggleLike,
      item,
      isGenerating,
      handlePreempt,
      onConfigure,
      setComposerExtraHeight,
      onDemoResults,
      onGenerationStart,
      onItemsChange,
      references,
      command,
      onAddReferences,
      onRemoveReference,
      onGenerationState,
    ],
  );

  return (
    <CanvasImageNodeContext.Provider value={item}>
      <CanvasNodeFrame
        item={item}
        hasContent={hasContent}
        controls={wrappedControls}
        onOpenMenu={addMenu.open}
        menuOpen={addMenu.menu?.parentId === item.id}
        onConnect={onConnect}
        onConnectionTargetChange={onConnectionTargetChange}
        connectionTarget={connectionTarget}
        liked={liked}
        onLike={() => onToggleLike(item.id)}
        onDelete={handleDelete}
      >
        {isGenerating && (
          <div
            className="pointer-events-none absolute inset-0 z-20 rounded-xl ring-2 ring-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
            aria-hidden="true"
          />
        )}
        {isGenerating && (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-full shadow-md backdrop-blur-sm pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-white animate-ping mr-0.5" />
            <span>正在生成</span>
            <button
              type="button"
              aria-label="中断"
              className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-700/80 hover:bg-amber-800 text-white rounded transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePreempt("designer_interrupt");
              }}
            >
              中断
            </button>
          </div>
        )}
        <CanvasNodeContent
          item={item}
          onDelete={handleDelete}
          editing={editing}
          uploadInput={uploadInput}
          scale={controls.transform.scale}
        />
      </CanvasNodeFrame>
    </CanvasImageNodeContext.Provider>
  );
}

export default memo(CanvasNodeItem, arePropsEqual);
