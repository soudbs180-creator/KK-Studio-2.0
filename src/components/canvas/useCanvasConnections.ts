import {
  useEffect,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  INITIAL_CONNECTIONS,
  type CanvasConnection,
} from "../../domain/canvasGraph";
import { type CanvasCollectionItem } from "../../domain/canvasItems";
import { reconcileCanvasConnections } from "../../domain/canvasConnections";
import { mergeCanvasEdges } from "../../domain/projectCanvas";
import { canvasImageReferenceLimit } from "../../features/models/imageModelCapabilities";
import { readProviderConnections } from "../../features/creation/providerRegistry";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand";
import { canConnectTarget } from "./connectionRules";
import { shadowEventBus } from "../../features/sync/shadowEventBus";

export function useCanvasConnections(
  items: CanvasCollectionItem[],
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>,
  initialEdges: CanvasConnection[] = INITIAL_CONNECTIONS,
  isCanvasEcho = false,
) {
  const command = useContext(CanvasImageCommandContext);
  const [edges, setEdges] = useState(initialEdges);
  const [observedEdges, setObservedEdges] = useState(initialEdges);
  // Apply external graph edits before persistence, preserving local undo/connect.
  if (observedEdges !== initialEdges) {
    setObservedEdges(initialEdges);
    setEdges((current) =>
      reconcileCanvasConnections(
        items,
        isCanvasEcho
          ? current
          : mergeCanvasEdges(current, observedEdges, initialEdges),
      ),
    );
  }
  const [removedEdge, setRemovedEdge] = useState<CanvasConnection | null>(null);
  const [connectionNotice, setConnectionNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);
  const edgesRef = useRef(edges);
  function nextConnectionId(
    current: CanvasConnection[],
    source: string,
    target: string,
  ): string {
    const targetId = `connector-${target}`;
    return current.some((edge) => edge.id === targetId)
      ? `connector-${source}-${target}`
      : targetId;
  }
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  function connect(
    source: string,
    target: string,
    kind: "reference" | "result" = "reference",
  ): void {
    if (source === target) return;
    const targetItem = items.find((item) => item.id === target);
    /* addNode updates items through React state. A menu choice or a reserved
       generation card can therefore call connect in the same event before the
       new item is visible in this render. Keep that edge and let the next
       render apply capability checks once the target exists. */
    if (!targetItem) {
      const nextEdge = {
        // Keep the original target-only hook for the first incoming edge;
        // additional references use a source/target pair so every edge stays
        // addressable even when a card has several inputs.
        id: nextConnectionId(edgesRef.current, source, target),
        source,
        target,
        kind,
      };
      if (
        !edgesRef.current.some(
          (edge) => edge.source === source && edge.target === target,
        )
      )
        edgesRef.current = [...edgesRef.current, nextEdge];
      setEdges((current) =>
        current.some((edge) => edge.source === source && edge.target === target)
          ? current
          : [...current, nextEdge],
      );
      shadowEventBus.emit({
        eventType: "canvas.edge.created",
        targetNodeId: target,
        actor: "designer",
        baseRev: 0,
        newRev: 0,
        payload: { edge: nextEdge, connection: nextEdge },
      });
      return;
    }
    const sourceItem = items.find((item) => item.id === source);
    const currentEdges = edgesRef.current;
    const existing = currentEdges.some(
      (edge) => edge.source === source && edge.target === target,
    );
    const referenceEdge = kind !== "result";
    const uploadOnlyTarget = referenceEdge && Boolean(targetItem.referenceOnly);
    const limited =
      referenceEdge &&
      !uploadOnlyTarget &&
      (targetItem.kind === "image" || targetItem.kind === "video");
    const max = limited
      ? canvasImageReferenceLimit(
          targetItem,
          readProviderConnections(),
          command
            ? {
                source: "api",
                model: command.model,
                connectionId: command.providerConnectionId,
              }
            : undefined,
        )
      : Number.POSITIVE_INFINITY;
    const invalidReference =
      limited && Boolean(sourceItem) && sourceItem?.kind !== "image";
    const acceptsReference =
      !limited ||
      canConnectTarget(
        items,
        currentEdges,
        source,
        target,
        command
          ? {
              source: "api",
              model: command.model,
              connectionId: command.providerConnectionId,
            }
          : undefined,
      );
    if (existing || uploadOnlyTarget || invalidReference || !acceptsReference) {
      const message = existing
        ? "这条连接已经存在。"
        : uploadOnlyTarget
          ? `${targetItem.title}是上传参考图，只能作为连接来源。`
          : invalidReference
            ? `${targetItem.title}只接受图片参考图。`
            : limited && max
              ? `${targetItem.title}最多接收 ${max} 张参考图，已达到当前模型上限。`
              : `${targetItem.title}不接收图片参考图。`;
      setConnectionNotice(message);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(
        () => setConnectionNotice(""),
        4200,
      );
      return;
    }
    const nextEdge = {
      id: nextConnectionId(currentEdges, source, target),
      source,
      target,
      kind,
    } as const;
    edgesRef.current = currentEdges.some(
      (edge) => edge.source === source && edge.target === target,
    )
      ? currentEdges
      : [...currentEdges, nextEdge];
    setEdges((current) => {
      if (
        current.some((edge) => edge.source === source && edge.target === target)
      )
        return current;
      return [...current, nextEdge];
    });
    shadowEventBus.emit({
      eventType: "canvas.edge.created",
      targetNodeId: target,
      actor: "designer",
      baseRev: 0,
      newRev: 0,
      payload: { edge: nextEdge, connection: nextEdge },
    });
    if (sourceItem?.result && sourceItem.kind === "image") {
      onItemsChange((current) =>
        current.map((item) =>
          item.id === source ? { ...item, referenceMode: true } : item,
        ),
      );
    }
  }

  function deleteConnection(connectionId: string): void {
    const edge = edgesRef.current.find((e) => e.id === connectionId);
    if (!edge) return;
    setRemovedEdge(edge);
    setEdges((current) => current.filter((e) => e.id !== connectionId));
    edgesRef.current = edgesRef.current.filter((e) => e.id !== connectionId);
    shadowEventBus.emit({
      eventType: "canvas.edge.deleted",
      targetNodeId: edge.target,
      actor: "designer",
      baseRev: 0,
      newRev: 0,
      payload: { id: connectionId, connectionId, edge },
    });
  }

  useEffect(() => {
    setEdges((current) => {
      // addNode/connect may be batched before the next items render. Use the
      // same normalization as history so the cleanup is not a second edit.
      const next = reconcileCanvasConnections(items, current);
      edgesRef.current = next;
      return next;
    });
  }, [items]);

  return {
    connect,
    deleteConnection,
    edges,
    setEdges,
    removedEdge,
    setRemovedEdge,
    connectionNotice,
    setConnectionNotice,
  };
}
