import { useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  CANVAS_KIND_LABELS,
  type CanvasCollectionItem,
} from "../domain/canvasItems";
import UiIcon from "./UiIcon";
import type { Asset } from "../domain/assets";
import SavedPane from "./SavedPane";

interface CatalogPanelProps {
  initialTab: string;
  items: CanvasCollectionItem[];
  assets: Asset[];
  favoriteIds: Set<string>;
  likedIds: Set<string>;
  onClose: () => void;
  onOpen: (view: string) => void;
  onLocate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleLike: (id: string) => void;
  onRename: (id: string, title: string) => void;
}
const TABS = ["全部", "喜欢收藏", "创作页", "项目", "类型", "文件资产"];

export default function CatalogPanel({
  initialTab,
  items,
  assets,
  favoriteIds,
  likedIds,
  onOpen,
  onLocate,
  onToggleFavorite,
  onToggleLike,
  onRename,
}: CatalogPanelProps) {
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const list = tabs.current;
    const active = list?.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (!list || !active) return;
    const place = () =>
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    place();
    active.scrollIntoView({ block: "nearest", inline: "nearest" });
    const observer = new ResizeObserver(place);
    observer.observe(list);
    for (const button of list.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ))
      observer.observe(button);
    return () => observer.disconnect();
  }, [tab]);
  const needle = query.trim().toLocaleLowerCase();
  const filtered = items.filter(
    (item) =>
      `${item.title} ${item.description} ${item.prompt ?? ""}`
        .toLocaleLowerCase()
        .includes(needle) &&
      (type === "all" || item.kind === type),
  );
  const assetResults = assets.filter((item) =>
    item.name.toLocaleLowerCase().includes(needle),
  );
  return (
    <section
      className="catalog-panel"
      aria-label="搜索与收藏面板"
      data-testid="catalog-panel"
    >
      <span className="catalog-handle" aria-hidden="true" />
      <label className="catalog-search">
        <img src="/design/figma/search.svg" alt="" />
        <input
          ref={input}
          data-initial-focus
          aria-label="搜索内容"
          placeholder="搜索收藏图片或提示词等操作..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              results.current
                ?.querySelector<HTMLButtonElement>("button")
                ?.focus();
            }
            if (e.key === "Enter") {
              e.preventDefault();
              results.current
                ?.querySelector<HTMLButtonElement>(
                  ".saved-preview,.saved-text,.catalog-result",
                )
                ?.click();
            }
          }}
        />
        {query && (
          <button
            aria-label="清除搜索"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        )}
      </label>
      <div
        ref={tabs}
        className="catalog-tabs"
        role="tablist"
        aria-label="搜索分类"
      >
        {TABS.map((name, index) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => {
              setTab(name);
              setType("all");
            }}
            onKeyDown={(e) => {
              let next: number | undefined;
              if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
              if (e.key === "ArrowLeft")
                next = (index + TABS.length - 1) % TABS.length;
              if (e.key === "Home") next = 0;
              if (e.key === "End") next = TABS.length - 1;
              if (next !== undefined) {
                e.preventDefault();
                setTab(TABS[next]);
                setType("all");
                (
                  e.currentTarget.parentElement?.children[next] as HTMLElement
                )?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
        <span
          className="catalog-tab-indicator"
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden="true"
        />
      </div>
      <div
        ref={results}
        className="catalog-body"
        role="tabpanel"
        aria-label={tab}
      >
        {tab === "喜欢收藏" ? (
          <div className="saved-columns">
            <SavedPane
              kind="like"
              items={filtered.filter((item) => likedIds.has(item.id))}
              query={query}
              onRemove={onToggleLike}
              onRename={onRename}
              onLocate={onLocate}
            />
            <SavedPane
              kind="favorite"
              items={filtered.filter((item) => favoriteIds.has(item.id))}
              query={query}
              onRemove={onToggleFavorite}
              onRename={onRename}
              onLocate={onLocate}
            />
          </div>
        ) : (
          <div className="catalog-results">
            {tab === "类型" && (
              <label className="catalog-type">
                卡片类型
                <select
                  aria-label="卡片类型"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="all">全部</option>
                  <option value="image">图片</option>
                  <option value="video">视频</option>
                  <option value="audio">音频</option>
                  <option value="text">文案</option>
                </select>
              </label>
            )}
            {["全部", "创作页", "类型"].includes(tab) &&
              filtered.map((item) => (
                <button
                  key={item.id}
                  className="catalog-result"
                  onClick={() => onLocate(item.id)}
                >
                  {item.kind === "audio" || item.kind === "text" ? (
                    <UiIcon name={item.kind} size={32} />
                  ) : (
                    <img
                      src={
                        item.preview ||
                        (item.kind === "image"
                          ? "/design/figma/asset-image.svg"
                          : "/design/figma/video-placeholder.svg")
                      }
                      alt=""
                    />
                  )}
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.prompt || item.description}</small>
                  </span>
                  <small>{CANVAS_KIND_LABELS[item.kind]}</small>
                </button>
              ))}
            {["全部", "项目"].includes(tab) && "kk工作流".includes(needle) && (
              <button
                className="catalog-result"
                onClick={() => onOpen("workspace")}
              >
                <span>
                  <strong>KK工作流</strong>
                  <small>当前会话 · 创作画布</small>
                </span>
                <small>项目</small>
              </button>
            )}
            {["全部", "文件资产"].includes(tab) &&
              assetResults.map((item) => (
                <button
                  key={item.id}
                  className="catalog-result"
                  onClick={() => onOpen("assets")}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>在资产管理中查看</small>
                  </span>
                  <small>文件资产</small>
                </button>
              ))}
            <p className="catalog-no-results">
              没有找到匹配的内容，试试其它关键词或分类。
            </p>
          </div>
        )}
      </div>
      <footer className="catalog-footer">
        <kbd>Enter</kbd>打开<span>/</span>
        <kbd>Esc</kbd>退出
      </footer>
    </section>
  );
}
