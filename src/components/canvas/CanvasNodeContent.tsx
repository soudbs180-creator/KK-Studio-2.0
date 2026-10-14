import type { RefObject } from "react";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
  PluginItemPayload,
} from "../../domain/canvasItems";
import DemoResultNode from "../nodes/DemoResultNode";
import ImageCreationNode from "../nodes/ImageCreationNode";
import VideoNode from "../nodes/VideoNode";
import PromptCreationNode from "../nodes/PromptCreationNode";
import PluginNode from "../nodes/PluginNode";

export default function CanvasNodeContent({
  item,
  onDelete,
  editing,
  uploadInput,
  scale = 1,
}: {
  item: CanvasCollectionItem;
  onDelete: () => void;
  editing: NodeEditingProps;
  uploadInput: RefObject<HTMLInputElement>;
  scale?: number;
}) {
  if (item.plugin)
    return (
      <PluginNode
        item={item as CanvasCollectionItem & { plugin: PluginItemPayload }}
        editing={editing}
        scale={scale}
        onDelete={onDelete}
      />
    );
  if (
    item.result ||
    (item.generationStatus &&
      ((item.kind !== "image" && item.kind !== "text") ||
        item.generationIndex !== undefined))
  )
    return (
      <DemoResultNode
        item={item}
        onDelete={onDelete}
        onChange={editing.onChange}
        onResult={(result) => editing.onDemoResults?.([result])}
        editing={editing}
      />
    );
  if (item.kind === "text" || item.kind === "audio")
    return <PromptCreationNode item={item} {...editing} />;
  return item.kind === "image" ? (
    <ImageCreationNode
      item={item}
      {...editing}
      uploadInput={uploadInput}
      onDelete={onDelete}
    />
  ) : (
    <VideoNode item={item} {...editing} uploadInput={uploadInput} />
  );
}
