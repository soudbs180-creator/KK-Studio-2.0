import { useState } from "react";
import type { CanvasCollectionItem } from "../domain/canvasItems";
import { DEFAULT_ASSET_TAGS } from "../domain/assets";
import FloatingCollectionPanel from "./FloatingCollectionPanel";
import CatalogTagResults from "./CatalogTagResults";
import SavedPane from "./SavedPane";
import "../styles/collection-panels.css";

export default function CanvasCollectionsPanels({
  items,
  likedIds,
  likesOpen,
  tagsOpen,
  customTags,
  activation,
  activePanel,
  onActivate,
  onCloseLikes,
  onCloseTags,
  onLocate,
  onLike,
  onRename,
  onUpdateTags,
  onCreateTag,
}: {
  items: CanvasCollectionItem[];
  likedIds: Set<string>;
  likesOpen: boolean;
  tagsOpen: boolean;
  customTags: string[];
  activation: { likes: number; tags: number };
  activePanel: "likes" | "tags";
  onActivate: (id: "likes" | "tags") => void;
  onCloseLikes: () => void;
  onCloseTags: () => void;
  onLocate: (id: string) => void;
  onLike: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onUpdateTags: (id: string, tags: string[]) => string | undefined;
  onCreateTag: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [likesQuery, setLikesQuery] = useState("");
  const [tag, setTag] = useState("all");
  const tags = Array.from(
    new Set([
      ...DEFAULT_ASSET_TAGS,
      "收藏",
      ...customTags,
      ...items.flatMap((item) => item.tags ?? []),
    ]),
  );
  const matches = items.filter(
    (item) =>
      (tag === "all" || item.tags?.includes(tag)) &&
      `${item.title} ${item.prompt ?? ""} ${(item.tags ?? []).join(" ")}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <FloatingCollectionPanel
        id="likes"
        title="喜欢"
        open={likesOpen}
        activation={activation.likes}
        active={activePanel === "likes"}
        onActivate={() => onActivate("likes")}
        onClose={onCloseLikes}
      >
        <p className="collection-purpose">
          喜欢用于保留你的偏好，点击内容可定位到画布。
        </p>
        <label className="settings-field">
          <span>搜索喜欢</span>
          <input
            value={likesQuery}
            onChange={(event) => setLikesQuery(event.target.value)}
          />
        </label>
        <SavedPane
          kind="like"
          items={items.filter(
            (item) =>
              likedIds.has(item.id) &&
              `${item.title} ${item.prompt ?? ""} ${item.description}`
                .toLocaleLowerCase()
                .includes(likesQuery.trim().toLocaleLowerCase()),
          )}
          query={likesQuery}
          onRemove={onLike}
          onRename={onRename}
          onLocate={onLocate}
        />
      </FloatingCollectionPanel>
      <FloatingCollectionPanel
        id="tags"
        title="标签"
        open={tagsOpen}
        activation={activation.tags}
        active={activePanel === "tags"}
        onActivate={() => onActivate("tags")}
        onClose={onCloseTags}
      >
        <p className="collection-purpose">
          标签用于分类；旧收藏保留在“收藏”标签中。
        </p>
        <label className="settings-field">
          <span>搜索标签素材</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="settings-field">
          <span>标签分类</span>
          <select
            aria-label="标签分类"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          >
            <option value="all">全部卡片</option>
            {tags.map((name) => (
              <option key={name} value={name}>
                {name} ·{" "}
                {items.filter((item) => item.tags?.includes(name)).length}
              </option>
            ))}
          </select>
        </label>
        <CatalogTagResults
          items={matches}
          customTags={customTags}
          onUpdateTags={onUpdateTags}
          onCreateTag={onCreateTag}
          onLocate={onLocate}
        />
      </FloatingCollectionPanel>
    </>
  );
}
