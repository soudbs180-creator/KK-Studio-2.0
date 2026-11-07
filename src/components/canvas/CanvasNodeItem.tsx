import { memo, useContext, useMemo, useRef } from "react";
import { shadowEventBus } from "../../features/sync/index.ts";
import type { NodeEditingProps } from "../../domain/canvasItems";
import { canvasImageReferenceLimit } from "../../features/models/index.ts";
import { readProviderConnections } from "../../features/creation/index.ts";
import CanvasNodeFrame from "./CanvasNodeFrame";
import CanvasNodeContent from "./CanvasNodeContent";
import useCanvasNodeMedia from "./useCanvasNodeMedia";
import useCanvasNodePreemption from "./useCanvasNodePreemption";
import {
  CanvasImageNodeContext,
  CanvasImageCommandContext,
} from "../../features/creation/index.ts";

import {
  arePropsEqual,
  areNodeDataEqual,
  areReferencesEqual,
  areSingleReferencesEqual,
  areGenerationStatesEqual,
  areSelectionAndMenuEqual,
  areDragStatesEqual,
  areGeometryAndPositionEqual,
  areHandlersEqual,
  type CanvasNodeItemProps,
  type GenerationPhase,
} from "./canvasNodeItemComparator.ts";

export {
  arePropsEqual,
  areNodeDataEqual,
  areReferencesEqual,
  areSingleReferencesEqual,
  areGenerationStatesEqual,
  areSelectionAndMenuEqual,
  areDragStatesEqual,
  areGeometryAndPositionEqual,
  areHandlersEqual,
  type CanvasNodeItemProps,
  type GenerationPhase,
};

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
  onSwapReferenceFrames,
  onGenerationState,
  activeLocalResultIds = [],
}: CanvasNodeItemProps) {
  const command = useContext(CanvasImageCommandContext);
  const uploadInput = useRef<HTMLInputElement>(null);
  const { hasContent, onContentReadyChange } = useCanvasNodeMedia(item);

  const isSelected = controls.selectedNode === item.id;
  const setComposerExtraHeight = controls.setComposerExtraHeight;
  const isGenerationActive = activeLocalResultIds.includes(item.id);
  const { isGenerating, handlePreempt, handleDelete, wrappedControls } =
    useCanvasNodePreemption({ item, controls, onDelete, onItemsChange });

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
      onSwapReferenceFrames,
      onGenerationState: (phase) => onGenerationState(item.id, phase),
      onChange: (patch) => {
        if (item.canvasPresentation?.locked) return;
        if (isGenerating) {
          handlePreempt("designer_update");
        }
        const baseRev =
          item.node_rev ?? shadowEventBus.getNodeRevision(item.id) ?? 1;
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
                  generationStatus: isGenerating
                    ? undefined
                    : entry.generationStatus,
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
      onSwapReferenceFrames,
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
