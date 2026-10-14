import { useContext, type RefObject } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import { effectiveTags } from "../../domain/collectionTags";
import { CanvasImageCommandContext } from "../../features/creation/CanvasImageCommand";
import ImageSelectionToolbar from "./ImageSelectionToolbar";
import TagEditor from "../TagEditor";
import UiIcon from "../UiIcon";

export default function CanvasCollectionToolbar({
  item,
  anchor,
  selected,
  liked,
  onLike,
  uploadInput,
  onDelete,
}: {
  item: CanvasCollectionItem;
  anchor: RefObject<HTMLElement>;
  selected: boolean;
  liked: boolean;
  onLike: () => void;
  uploadInput: RefObject<HTMLInputElement>;
  onDelete: () => void;
}) {
  const command = useContext(CanvasImageCommandContext);
  if (item.kind === "image" && !item.plugin) return null;
  return (
    <ImageSelectionToolbar
      anchor={anchor}
      selected={selected}
      title={item.title}
      label={`卡片操作：${item.title}`}
    >
      {!item.plugin &&
        item.kind === "video" &&
        !item.result &&
        !item.generationStatus && (
          <button
            type="button"
            className="ui-icon-button"
            aria-label="上传视频"
            title="上传视频后仅用于本地预览；演示生成不会上传或消费视频原件"
            onClick={() => uploadInput.current?.click()}
          >
            <UiIcon name="upload" />
          </button>
        )}
      <button
        type="button"
        className="kk-button kk-button--tertiary"
        aria-pressed={liked}
        aria-label={liked ? `取消喜欢${item.title}` : `喜欢${item.title}`}
        onClick={onLike}
      >
        <UiIcon name="favorite" />
        {liked ? "已喜欢" : "喜欢"}
      </button>
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
      {(item.plugin || (!item.result && !item.generationStatus)) && (
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
  );
}
