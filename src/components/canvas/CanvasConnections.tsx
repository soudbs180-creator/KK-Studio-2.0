import { useEffect, useMemo, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { CanvasConnection } from "../../domain/canvasGraph";
import type { Point } from "../../domain/canvasViewport";
import CanvasConnectionItem from "./CanvasConnectionItem";

export default function CanvasConnections({
  edges,
  nodes,
  items,
  visible,
  onDelete,
  selectedNode,
}: {
  edges: CanvasConnection[];
  nodes: Record<string, Point>;
  items: CanvasCollectionItem[];
  visible: boolean;
  onDelete: (id: string) => void;
  selectedNode?: string | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  useEffect(() => {
    const dismiss = (event: PointerEvent): void => {
      if (
        event.target instanceof Element &&
        !event.target.closest(".connection")
      )
        setActive(null);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, []);
  return (
    <div style={{ visibility: visible ? "visible" : "hidden" }}>
      {edges.map((edge) => (
        <CanvasConnectionItem
          key={edge.id}
          edge={edge}
          source={itemById.get(edge.source)}
          target={itemById.get(edge.target)}
          sourcePoint={nodes[edge.source]}
          targetPoint={nodes[edge.target]}
          visible={visible}
          active={active === edge.id}
          related={Boolean(
            selectedNode &&
            (edge.source === selectedNode || edge.target === selectedNode),
          )}
          onActiveChange={setActive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
