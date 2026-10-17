import { useEffect, useRef, useState } from "react";
import type {
  CanvasReference,
  CanvasCollectionItem,
  DemoResult,
} from "../../domain/canvasItems";
import { cardLayout, type CanvasConnection } from "../../domain/canvasGraph";
import type { useCanvasControls } from "./useCanvasControls";
import { canConnectTarget } from "./connectionRules";
import { canvasOccupiedRects } from "./canvasReferences";
import type { ModelSelection } from "../../domain/modelSelection";
import { addCanvasReferences } from "./addCanvasReferences";

interface UseCanvasNodeLayerHandlersProps {
  items: CanvasCollectionItem[];
  edges: CanvasConnection[];
  controls: ReturnType<typeof useCanvasControls>;
  defaultSelection: ModelSelection | undefined;
  onConnect: (
    source: string,
    target: string,
    kind?: "reference" | "result",
  ) => void;
  onConnectionNotice: (message: string) => void;
  onLocalGenerationSettled: (terminal: CanvasCollectionItem[]) => void;
}

export function useCanvasNodeLayerHandlers({
  items,
  edges,
  controls,
  defaultSelection,
  onConnect,
  onConnectionNotice,
  onLocalGenerationSettled,
}: UseCanvasNodeLayerHandlersProps) {
  const { nodes, selectedNode, addNode } = controls;
  const [pendingResultIds, setPendingResultIds] = useState<string[]>([]);
  const [pendingReferenceFocus, setPendingReferenceFocus] = useState<{
    parentId: string;
    ids: string[];
    restoreSelection: string | null;
  } | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<string | null>(null);
  const pendingByParent = useRef<Record<string, string[]>>({});
  const currentItems = useRef(items);
  currentItems.current = items;

  useEffect(() => {
    for (const parentId of Object.keys(pendingByParent.current)) {
      if (items.some((item) => item.id === parentId)) continue;
      markPending(parentId, "cancelled");
      delete pendingByParent.current[parentId];
    }
  }, [items]);

  useEffect(() => {
    if (!pendingResultIds.length || !pendingResultIds.every((id) => nodes[id]))
      return;
    const preservedSelection = selectedNode;
    controls.focusNodes(pendingResultIds);
    if (preservedSelection) controls.setSelectedNode(preservedSelection);
    setPendingResultIds([]);
  }, [pendingResultIds, nodes, items, selectedNode]);

  useEffect(() => {
    if (
      !pendingReferenceFocus ||
      !pendingReferenceFocus.ids.every((id) => nodes[id])
    )
      return;
    controls.focusNodes([
      pendingReferenceFocus.parentId,
      ...pendingReferenceFocus.ids,
    ]);
    if (pendingReferenceFocus.restoreSelection)
      controls.setSelectedNode(pendingReferenceFocus.restoreSelection);
    setPendingReferenceFocus(null);
  }, [pendingReferenceFocus, nodes, items, selectedNode]);

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
    const source = currentItems.current.find((item) => item.id === parentId);
    if (!source) return;
    const pending = pendingByParent.current[parentId] ?? [];
    if (source && pending.length >= results.length) {
      const terminal: CanvasCollectionItem[] = results.map((result, index) => {
        const title =
          results.length === 1 || result.title.includes("（演示")
            ? result.title
            : result.title +
              "（演示 " +
              (index + 1) +
              "/" +
              results.length +
              "）";
        return {
          id: pending[index],
          kind: result.kind,
          generationIndex: index,
          result: { ...result, title },
          title,
          description: result.description,
          preview:
            result.poster ?? (result.kind === "image" ? result.src : undefined),
          generationStatus: "ready",
        };
      });
      onLocalGenerationSettled(terminal);
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
    phase: "loading" | "success" | "error" | "cancelled" | "offline",
  ): void {
    if (phase === "loading" || phase === "success") return;
    const pending = pendingByParent.current[parentId] ?? [];
    if (!pending.length) return;

    onLocalGenerationSettled(
      pending.map((id, generationIndex) => ({
        id,
        kind: "video",
        generationIndex,
        description: "",
        generationStatus: "error",
        title: phase === "cancelled" ? "已取消生成" : "生成失败，请重试",
      })),
    );
    pendingByParent.current[parentId] = [];
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const referenceEdgesByTarget = new Map<string, typeof edges>();
  for (const edge of edges) {
    if (edge.kind === "result") continue;
    const group = referenceEdgesByTarget.get(edge.target) ?? [];
    group.push(edge);
    referenceEdgesByTarget.set(edge.target, group);
  }

  function referencesFor(parentId: string): CanvasReference[] {
    const targetEdges = referenceEdgesByTarget.get(parentId) ?? [];
    return targetEdges
      .map((edge) => ({ edge, source: itemById.get(edge.source) }))
      .filter(
        (
          entry,
        ): entry is {
          edge: (typeof edges)[number];
          source: CanvasCollectionItem;
        } => entry.source?.kind === "image",
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
    const addedIds = addCanvasReferences({
      parentId,
      parent,
      source,
      references,
      existingReferences: referencesFor(parentId),
      defaultSelection,
      addNode,
      onConnect,
      onConnectionNotice,
      occupiedRects: canvasOccupiedRects(items, nodes),
      visibleWorldLeft: (16 - controls.transform.x) / controls.transform.scale,
      visibleWorldRight:
        (controls.viewport.width - 16 - controls.transform.x) /
        controls.transform.scale,
    });
    if (addedIds.length)
      setPendingReferenceFocus({
        parentId,
        ids: addedIds,
        restoreSelection: selectedNode,
      });
  }

  const handleConnectionTargetChange = (
    sourceId: string,
    targetId: string | null,
  ) => {
    setConnectionTarget(
      targetId &&
        canConnectTarget(items, edges, sourceId, targetId, defaultSelection)
        ? targetId
        : null,
    );
  };

  const handleGenerationState = (
    id: string,
    phase: "loading" | "success" | "error" | "cancelled" | "offline",
  ) => {
    if (phase === "error" || phase === "cancelled" || phase === "offline") {
      markPending(id, phase);
    }
  };

  return {
    connectionTarget,
    pendingByParent,
    referencesFor,
    addGeneratedResults,
    reserveGeneratedResults,
    addReferences,
    markPending,
    handleConnectionTargetChange,
    handleGenerationState,
  };
}
