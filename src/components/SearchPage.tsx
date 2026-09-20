import { useState, useMemo } from "react";
import {
  Search,
  X,
  Folder,
  Star,
  Heart,
  Puzzle,
  ArrowUpRight,
} from "lucide-react";
import type { CanvasCollectionItem } from "../domain/canvasItems";

interface SearchResult {
  id: string;
  type: "project" | "favorite" | "like" | "skill";
  title: string;
  description: string;
}

const BASE_ITEMS: SearchResult[] = [
  {
    id: "p1",
    type: "project",
    title: "KK工作流",
    description: "当前会话 · 创作画布",
  },
  {
    id: "s1",
    type: "skill",
    title: "图片生成",
    description: "kk Image 2 模型，支持多比例",
  },
  {
    id: "s2",
    type: "skill",
    title: "视频生成",
    description: "视频节点，支持图片转视频",
  },
];

const TYPE_META = {
  project: { label: "项目", icon: Folder, color: "#8b9dc3" },
  favorite: { label: "收藏", icon: Star, color: "#f5a623" },
  like: { label: "喜欢", icon: Heart, color: "#e85d75" },
  skill: { label: "Skill", icon: Puzzle, color: "#9b8cff" },
};

export default function SearchPage({
  onOpen,
  canvasItems,
  favoriteIds,
}: {
  onOpen: (id: string) => void;
  canvasItems: CanvasCollectionItem[];
  favoriteIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("all");

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const allItems: SearchResult[] = [
      ...BASE_ITEMS,
      ...canvasItems
        .filter((item) => favoriteIds.has(item.id))
        .map((item) => ({
          id: `favorite-${item.id}`,
          type: "favorite" as const,
          title: item.title,
          description: item.description,
        })),
    ];
    return allItems.filter((item) => {
      const matchType = activeType === "all" || item.type === activeType;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [activeType, canvasItems, favoriteIds, query]);

  const tabs = [
    { id: "all", label: "全部" },
    { id: "project", label: "项目" },
    { id: "favorite", label: "收藏" },
    { id: "like", label: "喜欢" },
    { id: "skill", label: "Skill" },
  ];

  return (
    <section className="search-page">
      <div className="search-page-header">
        <div className="search-page-input">
          <Search size={18} />
          <input
            autoFocus
            aria-label="搜索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索项目、收藏、喜欢、Skill..."
          />
          {query && (
            <button
              className="search-clear"
              onClick={() => setQuery("")}
              aria-label="清除"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="search-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={"search-tab " + (activeType === tab.id ? "active" : "")}
            onClick={() => setActiveType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="search-results">
        {results.length === 0 ? (
          <div className="search-empty">
            <Search size={40} />
            <h2>{query ? "没有找到匹配的内容" : "输入关键词开始搜索"}</h2>
            <p>
              {query
                ? "换个关键词试试。"
                : "支持搜索项目、收藏、喜欢和 Skill。"}
            </p>
          </div>
        ) : (
          results.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <button
                key={item.id}
                className="search-result-item"
                onClick={() =>
                  onOpen(item.type === "skill" ? "skills" : "workspace")
                }
              >
                <div
                  className="search-result-icon"
                  style={{ color: meta.color }}
                >
                  <Icon size={20} />
                </div>
                <div className="search-result-content">
                  <div className="search-result-title">
                    <strong>{item.title}</strong>
                    <span className="search-result-type">{meta.label}</span>
                  </div>
                  <p>{item.description}</p>
                </div>
                <ArrowUpRight size={16} className="search-result-arrow" />
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
