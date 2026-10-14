import {
  useCallback,
  useContext,
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
import {
  CanvasImageNodeContext,
  CanvasImageCommandContext,
} from "../../features/creation/CanvasImageCommand";

type GenerationPhase = Parameters<
  NonNullable<NodeEditingProps["onGenerationState"]>
>[0];

export default function CanvasNodeItem({
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
}: {
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
}) {
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
  const editing: NodeEditingProps = {
    selected: controls.selectedNode === item.id,
    hasContent,
    onContentReadyChange,
    generationActive: activeLocalResultIds.includes(item.id),
    liked,
    onToggleLike: () => onToggleLike(item.id),
    onConfigure,
    onExtraHeightChange: controls.setComposerExtraHeight,
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
    onChange: (patch) =>
      onItemsChange((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, ...patch, updatedAt: Date.now() }
            : entry,
        ),
      ),
  };
  return (
    <CanvasImageNodeContext.Provider value={item}>
      <CanvasNodeFrame
        item={item}
        hasContent={hasContent}
        controls={controls}
        onOpenMenu={addMenu.open}
        menuOpen={addMenu.menu?.parentId === item.id}
        onConnect={onConnect}
        onConnectionTargetChange={onConnectionTargetChange}
        connectionTarget={connectionTarget}
        liked={liked}
        onLike={() => onToggleLike(item.id)}
        onDelete={() => onDelete(item.id)}
      >
        <CanvasNodeContent
          item={item}
          onDelete={() => onDelete(item.id)}
          editing={editing}
          uploadInput={uploadInput}
          scale={controls.transform.scale}
        />
      </CanvasNodeFrame>
    </CanvasImageNodeContext.Provider>
  );
}
