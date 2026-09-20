import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems";
import DemoResultNode from "../nodes/DemoResultNode";
import ImageCreationNode from "../nodes/ImageCreationNode";
import VideoNode from "../nodes/VideoNode";
import PromptCreationNode from "../nodes/PromptCreationNode";

export default function CanvasNodeContent({
  item,
  favorite,
  onFavorite,
  onDelete,
  editing,
}: {
  item: CanvasCollectionItem;
  favorite: boolean;
  onFavorite: () => void;
  onDelete: () => void;
  editing: NodeEditingProps;
}) {
  if (
    item.result ||
    (item.generationStatus &&
      (item.kind !== "image" || item.generationIndex !== undefined))
  )
    return (
      <DemoResultNode
        item={item}
        favorite={favorite}
        onFavorite={onFavorite}
        onDelete={onDelete}
        onChange={editing.onChange}
        onResult={(result) => editing.onDemoResults?.([result])}
        editing={editing}
      />
    );
  if (item.kind === "text" || item.kind === "audio")
    return <PromptCreationNode item={item} {...editing} />;
  return item.kind === "image" ? (
    <ImageCreationNode item={item} {...editing} />
  ) : (
    <VideoNode item={item} {...editing} />
  );
}
