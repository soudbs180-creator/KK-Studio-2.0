import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  INITIAL_CONNECTIONS,
  type CanvasConnection,
} from "../../domain/canvasGraph";
import {
  maxReferenceCount,
  type CanvasCollectionItem,
} from "../../domain/canvasItems";

export function useCanvasConnections(
  items: CanvasCollectionItem[],
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>,
  initialEdges: CanvasConnection[] = INITIAL_CONNECTIONS,
) {
  const [edges, setEdges] = useState(initialEdges);
  const [observedEdges, setObservedEdges] = useState(initialEdges);
  // Async provider results arrive through project state while this canvas stays
  // mounted. Merge only newly published result edges before children commit;
  // otherwise the persistence effect could write the old graph back to App.
  if (observedEdges !== initialEdges) {
    setObservedEdges(initialEdges);
    const additions = initialEdges.filter(
      (edge) =>
        edge.kind === "result" &&
        !observedEdges.some((previous) => previous.id === edge.id),
    );
    if (additions.length)
      setEdges((current) => [
        ...current,
        ...additions.filter(
          (edge) => !current.some((existing) => existing.id === edge.id),
        ),
      ]);
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
      ? maxReferenceCount(targetItem)
      : Number.POSITIVE_INFINITY;
    const invalidReference =
      limited && Boolean(sourceItem) && sourceItem?.kind !== "image";
    const incoming = currentEdges.filter(
      (edge) =>
        edge.target === target &&
        edge.kind !== "result" &&
        (items.find((item) => item.id === edge.source)?.kind === "image" ||
          !items.some((item) => item.id === edge.source)),
    ).length;
    if (
      existing ||
      uploadOnlyTarget ||
      invalidReference ||
      (limited && (max === 0 || incoming >= max))
    ) {
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
    if (sourceItem?.result && sourceItem.kind === "image") {
      onItemsChange((current) =>
        current.map((item) =>
          item.id === source ? { ...item, referenceMode: true } : item,
        ),
      );
    }
  }

  useEffect(() => {
    const ids = new Set(items.map((item) => item.id));
    setEdges((current) => {
      const next: CanvasConnection[] = [];
      for (const edge of current) {
        if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
        // Edges created in the same event as addNode are intentionally queued
        // before the new item appears. Revalidate them here once both cards
        // exist; otherwise a video could bypass the image-only reference rule
        // by creating a new image target from the add menu.
        if (edge.kind === "result") {
          next.push(edge);
          continue;
        }
        const target = items.find((item) => item.id === edge.target);
        const source = items.find((item) => item.id === edge.source);
        if (!target || target.referenceOnly) continue;
        const limited = target.kind === "image" || target.kind === "video";
        if (limited && source?.kind !== "image") continue;
        const incoming = next.filter(
          (candidate) =>
            candidate.target === edge.target && candidate.kind !== "result",
        ).length;
        if (!limited || incoming < maxReferenceCount(target)) next.push(edge);
      }
      edgesRef.current = next;
      return next.length === current.length ? current : next;
    });
  }, [items]);

  return {
    connect,
    edges,
    setEdges,
    removedEdge,
    setRemovedEdge,
    connectionNotice,
    setConnectionNotice,
  };
}
