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
}: {
  references: CanvasReference[];
  referenceCount?: number;
  limit: number;
  onAdd: (slot?: CanvasReference["slot"]) => void;
  onRemove?: (connectionId: string) => void;
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
                {entry.preview ? (
                  <img
                    className="reference-thumbnail"
                    src={entry.preview}
                    alt={entry.title}
                  />
                ) : (
                  <span
                    className="reference-thumbnail is-pending"
                    aria-label={`${entry.title}等待图片`}
                  >
                    <UiIcon name="image" size={13} />
                  </span>
                )}
                {entry.id && onRemove && (
                  <button
                    className="reference-remove"
                    type="button"
                    aria-label={`移除${slot}参考图${entry.title}`}
                    onClick={() => onRemove(entry.id!)}
                  >
                    <UiIcon name="close" size={10} />
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
                disabled={slot === "Mask" || referenceCount >= limit}
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
                <UiIcon name="add" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {overflow.length > 0 && (
        <div className="reference-overflow">
          {overflow.map((reference, index) => (
            <button
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
          aria-label="添加参考图片"
          disabled={referenceCount >= limit}
          title={
            limit > 0
              ? `最多 ${limit} 张参考图`
              : "当前模型没有可用的参考图位置"
          }
          onClick={() => onAdd()}
        >
          <UiIcon name="add" size={15} />
          <span>添加参考图</span>
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
