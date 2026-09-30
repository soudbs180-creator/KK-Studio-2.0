import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { compareImage } from "./imageCompare";
import { useImageCompare } from "./ImageCompareProvider";

export default function CompareImageButton({
  item,
}: {
  item: CanvasCollectionItem;
}) {
  const comparison = useImageCompare();
  if (!comparison || !compareImage(item)) return null;
  const selected = comparison.images.some((image) => image.id === item.id);
  const full = !selected && comparison.images.length >= 4;
  return (
    <button
      type="button"
      className="compare-image-button ui-button"
      aria-label={`${selected ? "移出对比" : "加入对比"}：${item.title}`}
      aria-pressed={selected}
      aria-description={full ? "最多比较 4 张图片" : undefined}
      title={full ? "最多比较 4 张图片" : undefined}
      disabled={full}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => comparison.toggle(item.id)}
    >
      {selected ? "移出对比" : "加入对比"}
    </button>
  );
}
