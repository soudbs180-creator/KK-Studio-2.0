import { useImageCompare } from "./ImageCompareProvider";
import ImageCompareDialog from "./ImageCompareDialog";

export default function ImageCompareControls() {
  const comparison = useImageCompare();
  if (!comparison || comparison.images.length === 0) return null;
  return (
    <>
      <div
        className="image-compare-selection"
        role="region"
        aria-label="图片对比选择"
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="image-compare-selection-heading">
          <strong>图片对比</strong>
          <span>{comparison.images.length}/4</span>
        </div>
        <div className="image-compare-chips">
          {comparison.images.map((image) => (
            <button
              key={image.id}
              type="button"
              className="image-compare-chip"
              aria-label={`从对比中移除 ${image.title}`}
              title={image.title}
              onClick={() => comparison.remove(image.id)}
            >
              <span>{image.title}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <div className="image-compare-selection-actions">
          <button
            type="button"
            className="ui-button"
            onClick={comparison.clear}
          >
            清空
          </button>
          <button
            type="button"
            className="ui-button is-primary"
            disabled={comparison.images.length < 2}
            aria-description={
              comparison.images.length < 2 ? "请再选择一张图片" : undefined
            }
            onClick={comparison.open}
          >
            打开对比
          </button>
        </div>
      </div>
      {comparison.isOpen && comparison.images.length >= 2 ? (
        <ImageCompareDialog
          images={comparison.images}
          onClose={comparison.close}
        />
      ) : null}
    </>
  );
}
