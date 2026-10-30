import type { CanvasReference } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import ReferenceThumbnail from "./ReferenceThumbnail";
import { referenceLayout } from "./referenceLayout";

export default function ReferenceStrip({
  references,
  referenceCount = references.length,
  limit,
  onAdd,
  onRemove,
  onSwapVideoFrames,
  disabled = false,
  video = false,
}: {
  disabled?: boolean;
  video?: boolean;
  references: CanvasReference[];
  referenceCount?: number;
  limit: number;
  onAdd: (slot?: CanvasReference["slot"]) => void;
  onRemove?: (connectionId: string) => void;
  onSwapVideoFrames?: (firstId: string, lastId: string) => void;
}) {
  const { first, last, remaining } = referenceLayout(references, video);
  if (!references.length) return null;
  const unavailable =
    limit === 0
      ? "当前模型没有可用的参考图位置"
      : referenceCount >= limit
        ? `最多 ${limit} 张参考图`
        : undefined;
  const thumbnail = (reference: CanvasReference, index: number) => (
    <ReferenceThumbnail
      key={reference.id ?? index}
      reference={reference}
      disabled={disabled}
      onRemove={onRemove}
    />
  );
  return (
    <div className="reference-strip" data-testid="reference-slots">
      <div
        className="reference-scroll"
        tabIndex={0}
        aria-label="参考素材，可横向滚动"
      >
        {video ? (
          <div
            className="reference-frame-row"
            role="list"
            aria-label="视频首尾帧"
          >
            <ReferenceThumbnail
              reference={first}
              label="首帧"
              disabled={disabled}
              onAdd={() => onAdd()}
              addDisabledReason={unavailable}
              onRemove={onRemove}
            />
            <button
              className="reference-frame-swap"
              type="button"
              disabled={
                disabled || !first?.id || !last?.id || !onSwapVideoFrames
              }
              aria-label="交换视频首尾帧"
              title="交换首帧与尾帧"
              onClick={() =>
                first?.id && last?.id && onSwapVideoFrames?.(first.id, last.id)
              }
            >
              <UiIcon name="swapHorizontal" size={20} />
            </button>
            <ReferenceThumbnail
              reference={last}
              label="尾帧"
              disabled={disabled}
              onAdd={() => onAdd()}
              addDisabledReason={unavailable}
              onRemove={onRemove}
            />
            {remaining.map(thumbnail)}
          </div>
        ) : (
          <div className="reference-frame-row">{references.map(thumbnail)}</div>
        )}
      </div>
    </div>
  );
}
