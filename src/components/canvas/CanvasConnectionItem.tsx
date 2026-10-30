import { memo, useMemo } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import {
  connectionGeometry,
  type CanvasConnection,
} from "../../domain/canvasGraph";
import type { Point } from "../../domain/canvasViewport";

interface CanvasConnectionItemProps {
  edge: CanvasConnection;
  source: CanvasCollectionItem | undefined;
  target: CanvasCollectionItem | undefined;
  sourcePoint: Point | undefined;
  targetPoint: Point | undefined;
  visible: boolean;
  active: boolean;
  related: boolean;
  onActiveChange: (id: string | null) => void;
  onDelete: (id: string) => void;
}

function CanvasConnectionItem({
  edge,
  source,
  target,
  sourcePoint,
  targetPoint,
  visible,
  active,
  related,
  onActiveChange,
  onDelete,
}: CanvasConnectionItemProps) {
  const geometry = useMemo(() => {
    if (!source || !target || !sourcePoint || !targetPoint) return null;
    return connectionGeometry(
      edge,
      { [edge.source]: sourcePoint, [edge.target]: targetPoint },
      new Map([
        [edge.source, source],
        [edge.target, target],
      ]),
    );
  }, [edge, source, sourcePoint, target, targetPoint]);
  if (!geometry) return null;
  const name = `${source?.title ?? ""} → ${target?.title ?? ""}`;
  return (
    <div
      className={`connection ${active ? "is-active" : ""} ${related ? "is-related" : ""}`}
      onPointerEnter={() => onActiveChange(edge.id)}
      onFocus={() => onActiveChange(edge.id)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          onActiveChange(null);
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
          onClick={() => onActiveChange(edge.id)}
          onKeyDown={(event) => {
            if (["Delete", "Backspace"].includes(event.key)) {
              event.preventDefault();
              event.stopPropagation();
              onDelete(edge.id);
            }
            if (["Enter", " "].includes(event.key)) {
              event.preventDefault();
              onActiveChange(edge.id);
            }
            if (event.key === "Escape") {
              event.stopPropagation();
              onActiveChange(null);
            }
          }}
        />
      </svg>
      <button
        className="connection-delete"
        data-testid={`connection-cut-${edge.id}`}
        style={{ left: geometry.midpoint.x, top: geometry.midpoint.y }}
        aria-label={`删除连线 ${name}`}
        title="剪开连线，保留两端卡片"
        tabIndex={visible && active ? 0 : -1}
        onClick={() => onDelete(edge.id)}
      >
        <span className="connection-cut-icon" aria-hidden="true" />
        <span className="connection-delete-label">剪开连线</span>
      </button>
    </div>
  );
}

export default memo(CanvasConnectionItem);
