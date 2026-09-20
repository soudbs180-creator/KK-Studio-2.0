import { useEffect, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  connectionGeometry,
  type CanvasConnection,
} from "../../domain/canvasGraph";
import type { Point } from "../../domain/canvasViewport";

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
      {edges.map((edge) => {
        const geometry = connectionGeometry(edge, nodes, items);
        if (!geometry) return null;
        const name = `${items.find((item) => item.id === edge.source)!.title} → ${items.find((item) => item.id === edge.target)!.title}`;
        const related = Boolean(
          selectedNode &&
          (edge.source === selectedNode || edge.target === selectedNode),
        );
        return (
          <div
            key={edge.id}
            className={`connection ${active === edge.id ? "is-active" : ""} ${related ? "is-related" : ""}`}
            onPointerEnter={() => setActive(edge.id)}
            onFocus={() => setActive(edge.id)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setActive(null);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <svg className="canvas-connectors">
              <path d={geometry.path} data-testid={edge.id} />
              {related && (
                <g className="connection-particles" aria-hidden="true">
                  {[0, 1, 2].map((index) => (
                    <circle
                      key={index}
                      className={`connection-particle connection-particle-${index}`}
                      r={index === 0 ? "3" : "2.25"}
                    >
                      <animateMotion
                        dur="3.2s"
                        begin={`${index * 0.2}s`}
                        repeatCount="indefinite"
                        path={geometry.path}
                      />
                    </circle>
                  ))}
                </g>
              )}
              <path
                className="connection-hit"
                d={geometry.path}
                role="button"
                tabIndex={visible ? 0 : -1}
                aria-label={`连接 ${name}`}
                onClick={() => setActive(edge.id)}
                onKeyDown={(event) => {
                  if (["Delete", "Backspace"].includes(event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete(edge.id);
                  }
                  if (["Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    setActive(edge.id);
                  }
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setActive(null);
                  }
                }}
              />
            </svg>
            <button
              className="connection-delete"
              data-testid={`connection-cut-${edge.id}`}
              style={{
                left: geometry.midpoint.x,
                top: geometry.midpoint.y,
              }}
              aria-label={`删除连线 ${name}`}
              title="剪开连线，保留两端卡片"
              tabIndex={visible && active === edge.id ? 0 : -1}
              onClick={() => onDelete(edge.id)}
            >
              <span className="connection-cut-icon" aria-hidden="true" />
              <span className="connection-delete-label">剪开连线</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
