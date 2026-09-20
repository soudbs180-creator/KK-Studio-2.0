import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  CanvasReference,
  CanvasCollectionItem,
  DemoResult,
} from "../../domain/canvasItems";
import { maxReferenceCount } from "../../domain/canvasItems";
import { cardLayout, type CanvasConnection } from "../../domain/canvasGraph";
import type { useCanvasControls } from "./useCanvasControls";
import type { useCanvasAddMenu } from "./useCanvasAddMenu";
import CanvasNodeItem from "./CanvasNodeItem";
import CanvasConnections from "./CanvasConnections";
import { canConnectTarget } from "./connectionRules";

interface CanvasNodeLayerProps {
  controls: ReturnType<typeof useCanvasControls>;
  items: CanvasCollectionItem[];
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
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
  favoriteIds,
  onToggleFavorite,
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
  const { nodes, transform, selectedNode, addNode } = controls;
  const [pendingResultIds, setPendingResultIds] = useState<string[]>([]);
  const [connectionTarget, setConnectionTarget] = useState<string | null>(null);
  const pendingByParent = useRef<Record<string, string[]>>({});
  useEffect(() => {
    if (!pendingResultIds.length || !pendingResultIds.every((id) => nodes[id]))
      return;
    const preservedSelection = selectedNode;
    controls.focusNodes(pendingResultIds);
    if (preservedSelection) controls.setSelectedNode(preservedSelection);
    setPendingResultIds([]);
  }, [pendingResultIds, nodes, items, selectedNode]);
  function reserveGeneratedResults(parentId: string, count: number): void {
    const parent = nodes[parentId];
    const source = items.find((item) => item.id === parentId);
    if (!parent || !source || count < 1) return;
    const right = parent.x + cardLayout(source).anchor.x + 160;
    const ids = Array.from({ length: count }, (_, index) => {
      const id = addNode(source.kind, {
        parentId,
        title: `${source.kind === "video" ? "视频" : "图片"}生成中（${index + 1}/${count}）`,
        prompt: source.prompt,
        model: source.model,
        generationStatus: "pending",
        generationIndex: index,
        select: false,
        position: {
          x: right + (index % 2) * 440,
          y: parent.y + Math.floor(index / 2) * 430,
        },
      });
      onConnect(parentId, id, "result");
      return id;
    });
    pendingByParent.current[parentId] = ids;
    setPendingResultIds(ids);
  }
  function addGeneratedResults(parentId: string, results: DemoResult[]): void {
    const source = items.find((item) => item.id === parentId);
    const pending = pendingByParent.current[parentId] ?? [];
    if (source && pending.length >= results.length) {
      onItemsChange((current) =>
        current.map((item) => {
          const index = pending.indexOf(item.id);
          const result = index >= 0 ? results[index] : undefined;
          if (!result) return item;
          const title =
            results.length === 1
              ? result.title
              : result.title.includes("（演示")
                ? result.title
                : `${result.title}（演示 ${index + 1}/${results.length}）`;
          return {
            ...item,
            result: { ...result, title },
            title,
            description: result.description,
            preview:
              result.poster ??
              (result.kind === "image" ? result.src : undefined),
            prompt: source.prompt,
            generationStatus: "ready",
          };
        }),
      );
      pendingByParent.current[parentId] = [];
      return;
    }
    if (!source || !nodes[parentId]) return;
    const right = nodes[parentId].x + cardLayout(source).anchor.x + 160;
    const ids = results.map((result, index) => {
      const id = addNode(result.kind, {
        parentId,
        result,
        title: result.title,
        prompt: source.prompt,
        model: source.model,
        select: false,
        position: {
          x: right + (index % 2) * 440,
          y: nodes[parentId].y + Math.floor(index / 2) * 430,
        },
      });
      onConnect(parentId, id, "result");
      return id;
    });
    setPendingResultIds(ids);
  }
  function markPending(
    parentId: string,
    phase: "error" | "cancelled" | "offline",
  ): void {
    const pending = pendingByParent.current[parentId] ?? [];
    if (!pending.length) return;
    onItemsChange((current) =>
      current.map((item) =>
        pending.includes(item.id)
          ? {
              ...item,
              generationStatus: "error",
              title: phase === "cancelled" ? "已取消生成" : "生成失败，请重试",
            }
          : item,
      ),
    );
    pendingByParent.current[parentId] = [];
  }
  function referencesFor(parentId: string): CanvasReference[] {
    return edges
      .filter((edge) => edge.target === parentId && edge.kind !== "result")
      .map((edge) => ({
        edge,
        source: items.find((item) => item.id === edge.source),
      }))
      .filter(
        (
          entry,
        ): entry is { edge: CanvasConnection; source: CanvasCollectionItem } =>
          entry.source?.kind === "image",
      )
      .map(({ edge, source }) => ({
        id: edge.id,
        assetId: source.assetId,
        title: source.title,
        preview: source.preview ?? source.result?.poster ?? source.result?.src,
        slot: source.referenceSlot,
      }));
  }
  function addReferences(
    parentId: string,
    references: CanvasReference[],
  ): void {
    const parent = nodes[parentId];
    const source = items.find((item) => item.id === parentId);
    if (!parent || !source) return;
    const incoming = edges.filter(
      (edge) =>
        edge.target === parentId &&
        edge.kind !== "result" &&
        items.find((item) => item.id === edge.source)?.kind === "image",
    ).length;
    const available = Math.max(0, maxReferenceCount(source) - incoming);
    if (references.length > available) {
      onConnectionNotice(
        available > 0
          ? `当前模型还可接收 ${available} 张参考图，已添加前 ${available} 张。`
          : `当前模型最多接收 ${maxReferenceCount(source)} 张参考图，请先移除已有连接。`,
      );
    }
    const startX = parent.x - 520;
    const slots = ["主体", "风格", "材质", "构图", "Mask"] as const;
    const occupied = new Set(
      referencesFor(parentId).map((reference) => reference.slot),
    );
    references.slice(0, available).forEach((reference, index) => {
      const slot =
        reference.slot ?? slots.find((value) => !occupied.has(value));
      if (slot) occupied.add(slot);
      const id = addNode("image", {
        title: reference.title,
        description: "上传的参考图片",
        preview: reference.preview,
        assetId: reference.assetId,
        referenceSlot: slot,
        referenceOnly: true,
        select: false,
        position: {
          x: startX - (index % 2) * 24,
          y: parent.y + Math.floor(index / 2) * 430,
        },
      });
      onConnect(id, parentId, "reference");
    });
  }

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
          favorite={favoriteIds.has(item.id)}
          liked={likedIds.has(item.id)}
          connectionTarget={connectionTarget === item.id}
          onConnect={onConnect}
          onConnectionTargetChange={(sourceId, targetId) =>
            setConnectionTarget(
              targetId && canConnectTarget(items, edges, sourceId, targetId)
                ? targetId
                : null,
            )
          }
          onToggleFavorite={onToggleFavorite}
          onDelete={controls.removeNode}
          onToggleLike={onToggleLike}
          onConfigure={onConfigure}
          onItemsChange={onItemsChange}
          references={referencesFor(item.id)}
          onDemoResults={addGeneratedResults}
          onGenerationStart={reserveGeneratedResults}
          onAddReferences={addReferences}
          onRemoveReference={onDeleteConnection}
          onGenerationState={(id, phase) => {
            if (
              phase === "error" ||
              phase === "cancelled" ||
              phase === "offline"
            )
              markPending(id, phase);
          }}
        />
      ))}
      <CanvasConnections
        edges={edges}
        nodes={nodes}
        items={items}
        visible={showConnections}
        selectedNode={selectedNode}
        onDelete={onDeleteConnection}
      />
    </div>
  );
}
