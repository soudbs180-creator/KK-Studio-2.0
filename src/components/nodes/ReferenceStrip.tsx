import {
  CANVAS_REFERENCE_SLOTS,
  type CanvasReference,
} from "../../domain/canvasItems";
import UiIcon from "../UiIcon";

/** Five semantic slots while keeping the node-owned file picker contract. */
export default function ReferenceStrip({
  references,
  referenceCount = references.length,
  limit,
  onAdd,
  onRemove,
  onSwapVideoFrames,
  disabled = false,
}: {
  disabled?: boolean;
  references: CanvasReference[];
  referenceCount?: number;
  limit: number;
  onAdd: (slot?: CanvasReference["slot"]) => void;
  onRemove?: (connectionId: string) => void;
  onSwapVideoFrames?: (firstId: string, lastId: string) => void;
}) {
  const used = new Set<CanvasReference>();
  const bySlot = CANVAS_REFERENCE_SLOTS.map((slot) => {
    const entry = references.find(
      (reference) => reference.slot === slot && !used.has(reference),
    );
    if (entry) used.add(entry);
    return { slot, entry };
  });
  for (const binding of bySlot) {
    if (binding.entry) continue;
    binding.entry = references.find((reference) => !used.has(reference));
    if (binding.entry) used.add(binding.entry);
  }
  const overflow = references.filter((reference) => !used.has(reference));
  const videoFrames = references.filter(
    (reference) =>
      reference.kind !== "audio" &&
      (reference.frame === "first" || reference.frame === "last"),
  );
  const firstFrame = videoFrames.find(
    (reference) => reference.frame === "first",
  );
  const lastFrame = videoFrames.find((reference) => reference.frame === "last");
  return (
    <div className="reference-slots" data-testid="reference-slots">
      <div className="reference-slot-grid" role="list" aria-label="参考图槽位">
        {bySlot.map(({ slot, entry }) => (
          <div
            className={`reference-slot ${entry ? "is-filled" : ""}`}
            key={slot}
            role="listitem"
            data-slot={slot}
          >
            <span className="reference-slot-label">{slot}</span>
            {entry ? (
              <span className="reference-slot-media">
                {entry.preview && entry.kind !== "audio" ? (
                  <img
                    className="reference-thumbnail"
                    src={entry.preview}
                    alt={entry.title}
                  />
                ) : (
                  <span
                    className="reference-thumbnail is-pending"
                    aria-label={`${entry.title}等待预览`}
                  >
                    <UiIcon
                      name={
                        entry.kind === "audio"
                          ? "audio"
                          : entry.kind === "video"
                            ? "video"
                            : "image"
                      }
                      size={12}
                    />
                  </span>
                )}
                {entry.kind === "video" && entry.frame && (
                  <span className="reference-frame-label">
                    {entry.frame === "first" ? "首帧" : "尾帧"}
                  </span>
                )}
                {entry.id && onRemove && (
                  <button
                    disabled={disabled}
                    className="reference-remove"
                    type="button"
                    aria-label={`移除${slot}参考图${entry.title}`}
                    onClick={() => onRemove(entry.id!)}
                  >
                    <UiIcon name="close" size={12} />
                  </button>
                )}
              </span>
            ) : (
              <button
                className={`reference-slot-add ${slot === "Mask" ? "is-unavailable" : ""}`}
                type="button"
                aria-label={
                  slot === "Mask"
                    ? "Mask 需要在图像编辑器中绘制"
                    : `添加${slot}参考图`
                }
                disabled={
                  disabled || slot === "Mask" || referenceCount >= limit
                }
                title={
                  slot === "Mask"
                    ? "Mask 需要通过图像编辑器绘制，不能上传普通参考图"
                    : limit === 0
                      ? "当前模型没有可用的参考图位置"
                      : `最多 ${limit} 张参考图`
                }
                onClick={() => {
                  if (slot !== "Mask") onAdd(slot);
                }}
              >
                <UiIcon name="add" size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {firstFrame?.id && lastFrame?.id && onSwapVideoFrames && (
        <button
          className="reference-frame-swap"
          type="button"
          disabled={disabled}
          aria-label="交换视频首尾帧"
          title="交换首帧与尾帧"
          onClick={() => onSwapVideoFrames(firstFrame.id!, lastFrame.id!)}
        >
          <UiIcon name="swapVertical" size={14} />
          <span>交换首尾帧</span>
        </button>
      )}
      {overflow.length > 0 && (
        <div className="reference-overflow">
          {overflow.map((reference, index) => (
            <button
              disabled={disabled}
              key={reference.id ?? index}
              type="button"
              onClick={() => reference.id && onRemove?.(reference.id)}
              title="移除额外参考图"
            >
              {reference.title} ×
            </button>
          ))}
        </div>
      )}
      <div className="reference-slots-footer">
        <button
          className="reference-add"
          type="button"
          aria-label="添加参考素材"
          disabled={disabled || referenceCount >= limit}
          title={
            limit > 0
              ? `最多 ${limit} 张参考图`
              : "当前模型没有可用的参考图位置"
          }
          onClick={() => onAdd()}
        >
          <UiIcon name="add" size={16} />
          <span>添加参考素材</span>
        </button>
        {limit > 0 && (
          <span className="reference-limit">
            {referenceCount}/{limit}
          </span>
        )}
        {limit === 0 && (
          <span className="reference-limit">当前模型没有可用的参考图位置</span>
        )}
      </div>
    </div>
  );
}
