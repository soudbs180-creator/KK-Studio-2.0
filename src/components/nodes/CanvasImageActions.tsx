import { useContext, useState, type RefObject } from "react";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand";
import { effectiveTags } from "../../domain/collectionTags";
import TagEditor from "../TagEditor";
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
  liked,
  onLike,
  onDelete,
  references,
}: {
  item: CanvasCollectionItem;
  anchor: RefObject<HTMLElement>;
  selected: boolean;
  onPreview: () => void;
  liked?: boolean;
  onLike?: () => void;
  onDelete?: () => void;
  references?: CanvasReference[];
}) {
  const [redrawOpen, setRedrawOpen] = useState(false);
  const command = useContext(CanvasImageCommandContext);
  const previewReason =
    item.preview || item.assetId || item.result
      ? undefined
      : "请先上传图片或生成结果再预览。";
  // An uploaded generation source is still an original/reference for the
  // preview and redraw actions. `referenceOnly` controls whether the prompt
  // composer is mounted; it must not make those actions disappear.
  const reference =
    !item.result && (item.referenceOnly || item.referenceSlot === "主体");
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
          disabled={Boolean(previewReason)}
          title={previewReason}
          aria-description={previewReason}
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
        {onLike && (
          <button
            type="button"
            className="kk-button kk-button--tertiary"
            aria-label={liked ? `取消喜欢${item.title}` : `喜欢${item.title}`}
            aria-pressed={liked}
            onClick={onLike}
          >
            <UiIcon name="favorite" />
            {liked ? "已喜欢" : "喜欢"}
          </button>
        )}
        {command?.updateItemTags && (
          <TagEditor
            floating
            tags={effectiveTags(
              item.tags,
              command.favoriteIds?.has(item.id) ?? false,
            )}
            customTags={command.customTags}
            onCreateTag={command.createTag}
            onChange={(tags) => command.updateItemTags?.(item.id, tags)}
          />
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
