import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { compareImage } from "./imageCompare";
import { useImageCompare } from "./ImageCompareProvider";
import UiIcon from "../../components/UiIcon";

export default function CompareImageButton({
  item,
  className = "ui-button",
}: {
  item: CanvasCollectionItem;
  className?: string;
}) {
  const comparison = useImageCompare();
  if (!comparison || !compareImage(item)) return null;
  const selected = comparison.images.some((image) => image.id === item.id);
  const full = !selected && comparison.images.length >= 4;
  return (
    <button
      type="button"
      className={`compare-image-button ${className}`}
      aria-label={`${selected ? "移出对比" : "加入对比"}：${item.title}`}
      aria-pressed={selected}
      aria-description={full ? "最多比较 4 张图片" : undefined}
      title={full ? "最多比较 4 张图片" : undefined}
      disabled={full}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => comparison.toggle(item.id)}
    >
      <UiIcon name="image" />
      {selected ? "移出对比" : "加入对比"}
    </button>
  );
}
