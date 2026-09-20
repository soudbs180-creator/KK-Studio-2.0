import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { ReviewRegion } from "../domain/reviewWorkflow";
import { loadStoredAsset } from "../features/creation/assetRepository";

export default function CommentRegion({
  assetId,
  value,
  onChange,
}: {
  assetId?: string;
  value?: ReviewRegion;
  onChange: (region?: ReviewRegion) => void;
}) {
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<ReviewRegion>();
  const [aspectRatio, setAspectRatio] = useState(1);
  useEffect(() => {
    let live = true;
    setPreview("");
    setStatus(
      assetId ? "正在读取本地素材…" : "暂无已归档结果，可评论整个任务。",
    );
    if (assetId)
      void loadStoredAsset(assetId)
        .then((asset) => {
          if (!live) return;
          setPreview(asset?.preview ?? "");
          setStatus(
            asset
              ? "拖动框选区域，Escape 取消；不标记时评论整个结果。"
              : "本地素材不可用，可评论整个任务。",
          );
        })
        .catch(() => {
          if (live) setStatus("本地素材读取失败，可评论整个任务。");
        });
    return () => {
      live = false;
    };
  }, [assetId]);
  const clear = () => {
    drag.current = null;
    setDraft(undefined);
  };
  useEffect(() => {
    window.addEventListener("blur", clear);
    return () => window.removeEventListener("blur", clear);
  }, []);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.x) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.y) / rect.height)),
    };
  };
  const selection = draft ?? value;
  return (
    <div className="comment-region-editor">
      {preview && (
        <div
          className="comment-region-surface"
          style={{ aspectRatio }}
          aria-label="评论区域标记"
          role="img"
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            drag.current = point(event);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const end = point(event);
            setDraft({
              x: Math.min(drag.current.x, end.x),
              y: Math.min(drag.current.y, end.y),
              width: Math.abs(end.x - drag.current.x),
              height: Math.abs(end.y - drag.current.y),
            });
          }}
          onPointerUp={(event) => {
            if (
              drag.current &&
              draft &&
              draft.width > 0.005 &&
              draft.height > 0.005
            )
              onChange(draft);
            clear();
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={clear}
          onLostPointerCapture={clear}
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              !event.nativeEvent.isComposing &&
              drag.current
            ) {
              event.preventDefault();
              event.stopPropagation();
              clear();
            }
          }}
        >
          <img
            src={preview}
            alt="当前任务归档结果"
            draggable={false}
            onLoad={(event) =>
              setAspectRatio(
                event.currentTarget.naturalWidth /
                  event.currentTarget.naturalHeight || 1,
              )
            }
          />
          {selection && (
            <span
              className="comment-region-box"
              style={{
                left: `${selection.x * 100}%`,
                top: `${selection.y * 100}%`,
                width: `${selection.width * 100}%`,
                height: `${selection.height * 100}%`,
              }}
            />
          )}
        </div>
      )}
      <small role="status">{status}</small>
      {preview && (
        <div className="comment-region-presets">
          <button
            type="button"
            onClick={() => onChange({ x: 0, y: 0, width: 1, height: 1 })}
          >
            标记全图
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 })
            }
          >
            标记中心
          </button>
          <button
            type="button"
            disabled={!value}
            onClick={() => onChange(undefined)}
          >
            清除区域
          </button>
        </div>
      )}
    </div>
  );
}
