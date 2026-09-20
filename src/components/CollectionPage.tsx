import { useState } from "react";
import {
  LayoutGrid,
  List,
  Search,
  Star,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import type { CanvasCollectionItem } from "../domain/canvasItems";

export default function CollectionPage({
  view,
  onOpen,
  items,
}: {
  view: "favorites" | "likes";
  onOpen: (id: string) => void;
  items: CanvasCollectionItem[];
}) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const isFav = view === "favorites";
  const title = isFav ? "收藏" : "喜欢";
  const Icon = isFav ? Star : Heart;

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="collection-page">
      <header className="collection-header">
        <div className="collection-title-row">
          <button
            className="view-toggle"
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            aria-label="切换视图"
          >
            {viewMode === "list" ? (
              <LayoutGrid size={16} />
            ) : (
              <List size={16} />
            )}
          </button>
          <h1>{title}</h1>
        </div>
        <label className="collection-search">
          <Search size={16} />
          <input
            aria-label={`搜索${title}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件"
          />
        </label>
      </header>
      <div
        className={
          "collection-list " + (viewMode === "grid" ? "grid-mode" : "")
        }
      >
        {filteredItems.length === 0 ? (
          <div className="collection-empty">
            <Icon size={40} />
            <h2>{query ? "没有找到匹配的内容" : `还没有${title}的内容`}</h2>
            <p>
              {query
                ? "换个关键词试试。"
                : "在画布中点击收藏或喜欢按钮来保存内容。"}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              className="collection-item"
              onClick={() => onOpen("workspace")}
            >
              <div className="collection-item-content">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <div className="collection-item-meta">
                <Icon
                  size={16}
                  className={isFav ? "star-icon" : "heart-icon"}
                />
                <ArrowUpRight size={14} className="arrow-icon" />
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
