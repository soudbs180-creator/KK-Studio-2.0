import { useState, type RefObject } from "react";
import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems";
import CompareImageButton from "../../features/compare/CompareImageButton";
import UiIcon from "../UiIcon";
import ImageSelectionToolbar from "../canvas/ImageSelectionToolbar";
import ImageRedrawDialog from "./ImageRedrawDialog";

export default function CanvasImageActions({
  item,
  anchor,
  selected,
  onPreview,
  favorite,
  onFavorite,
  onDelete,
  references,
}: {
  item: CanvasCollectionItem;
  anchor: RefObject<HTMLElement>;
  selected: boolean;
  onPreview: () => void;
  favorite?: boolean;
  onFavorite?: () => void;
  onDelete?: () => void;
  references?: CanvasReference[];
}) {
  const [redrawOpen, setRedrawOpen] = useState(false);
  const reference = !item.result;
  const redrawReason = item.assetId
    ? undefined
    : "请先导入归档原件，再使用重绘。";
  return (
    <>
      <ImageSelectionToolbar
        anchor={anchor}
        selected={selected}
        title={item.title}
      >
        <button
          type="button"
          className="kk-button kk-button--tertiary"
          aria-label={reference ? "放大查看参考图片" : `预览${item.title}`}
          onClick={onPreview}
        >
          <UiIcon name="preview" />
          预览
        </button>
        <button
          type="button"
          className="kk-button kk-button--tertiary"
          aria-label={reference ? "重绘参考图片" : `重绘${item.title}`}
          disabled={Boolean(redrawReason)}
          title={redrawReason}
          aria-description={redrawReason}
          onClick={() => setRedrawOpen(true)}
        >
          <UiIcon name="undo" />
          重绘
        </button>
        <CompareImageButton
          item={item}
          className="kk-button kk-button--tertiary"
        />
        {onFavorite && (
          <button
            type="button"
            className="kk-button kk-button--tertiary"
            aria-label={
              favorite ? `取消收藏${item.title}` : `收藏${item.title}`
            }
            aria-pressed={favorite}
            onClick={onFavorite}
          >
            <UiIcon name="favorite" />
            {favorite ? "已收藏" : "收藏"}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="kk-button kk-button--danger"
            aria-label={`删除${item.title}`}
            title="移除画布卡片，归档原件保留"
            onClick={onDelete}
          >
            <UiIcon name="delete" />
            删除
          </button>
        )}
      </ImageSelectionToolbar>
      {redrawOpen && (
        <ImageRedrawDialog
          references={references}
          onClose={() => setRedrawOpen(false)}
        />
      )}
    </>
  );
}
