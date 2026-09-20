import { useState } from "react";
import { Heart, Star } from "lucide-react";
import type { CanvasCollectionItem } from "../domain/canvasItems";
import UiIcon from "./UiIcon";

interface SavedPaneProps {
  kind: "like" | "favorite";
  items: CanvasCollectionItem[];
  query: string;
  onRemove: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onLocate: (id: string) => void;
}

export default function SavedPane({
  kind,
  items,
  query,
  onRemove,
  onRename,
  onLocate,
}: SavedPaneProps) {
  const [order, setOrder] = useState("recent");
  const [editing, setEditing] = useState("");
  const [name, setName] = useState("");
  const like = kind === "like";
  const label = like ? "喜欢" : "收藏";
  const visible = [...items].sort((a, b) =>
    order === "name"
      ? a.title.localeCompare(b.title, "zh-CN")
      : (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  );
  const Icon = like ? Heart : Star;
  return (
    <section
      className={"saved-pane " + (like ? "saved-likes" : "saved-favorites")}
    >
      <header>
        <h2>{label}</h2>
        <select
          aria-label={`${label}排序`}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="recent">最近更新</option>
          <option value="name">名称排序</option>
        </select>
      </header>
      <div className={like ? "saved-like-grid" : "saved-prompt-list"}>
        {visible.length === 0 ? (
          <div className="saved-empty">
            <Icon size={24} />
            <h3>{query ? "没有找到匹配的内容" : `还没有${label}的内容`}</h3>
            <p>
              {query
                ? "清除搜索或换个关键词。"
                : like
                  ? "选中卡片，点击编辑器中的心形按钮。"
                  : "在生成结果卡片上点击收藏按钮。"}
            </p>
          </div>
        ) : (
          visible.map((item) => (
            <article
              key={item.id}
              className={like ? "saved-like-card" : "saved-prompt-card"}
            >
              {like && (
                <button
                  className="saved-preview"
                  aria-label={`打开 ${item.title}`}
                  onClick={() => onLocate(item.id)}
                >
                  {item.kind === "audio" || item.kind === "text" ? (
                    <UiIcon name={item.kind} size={24} />
                  ) : (
                    <img
                      className={item.preview ? "" : "placeholder"}
                      src={item.preview || "/design/figma/asset-image.svg"}
                      alt={item.preview ? item.title : ""}
                    />
                  )}
                  <Heart size={12} fill="currentColor" />
                </button>
              )}
              <div className="saved-copy">
                <small>{like ? "提示词" : item.title}</small>
                <button
                  className="saved-text"
                  aria-label={`打开 ${item.title}的提示词`}
                  onClick={() => onLocate(item.id)}
                >
                  {item.prompt || item.description}
                </button>
              </div>
              {editing === item.id ? (
                <form
                  className="saved-edit"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing("");
                    }
                  }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!name.trim()) return;
                    onRename(item.id, name.trim());
                    setEditing("");
                  }}
                >
                  <input
                    autoFocus
                    aria-label={`${label}名称`}
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button
                    type="submit"
                    aria-label="保存名称"
                    disabled={!name.trim()}
                  >
                    保存
                  </button>
                  <button type="button" onClick={() => setEditing("")}>
                    取消
                  </button>
                </form>
              ) : (
                <footer>
                  {!like && (
                    <Icon className="star-icon" size={12} fill="currentColor" />
                  )}
                  <span>{like ? item.title : ""}</span>
                  <button
                    onClick={() => {
                      setEditing(item.id);
                      setName(item.title);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    aria-label={`移除${label}`}
                    onClick={() => onRemove(item.id)}
                  >
                    删除
                  </button>
                </footer>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
