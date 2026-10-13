import { useRef, useState } from "react";
import {
  CANVAS_KIND_LABELS,
  type CanvasCollectionItem,
} from "../domain/canvasItems";
import { getAssetTags, type Asset } from "../domain/assets";
import type { CreationProject } from "../features/creation/model";
import UiIcon from "./UiIcon";

const TABS = ["全部", "画布卡片", "项目", "已加载资源"];
export default function CatalogPanel({
  items,
  assets,
  onOpen,
  projects,
  onOpenProject,
  onLocate,
}: {
  items: CanvasCollectionItem[];
  assets: Asset[];
  onOpen: (view: string) => void;
  projects: CreationProject[];
  onOpenProject: (id: string) => void;
  onLocate: (id: string) => void;
}) {
  const [tab, setTab] = useState("全部");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [tag, setTag] = useState("all");
  const results = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLocaleLowerCase();
  const contains = (value: string) =>
    value.toLocaleLowerCase().includes(needle);
  const nodes = items.filter(
    (item) =>
      contains(
        `${item.title} ${item.description} ${item.prompt ?? ""} ${(item.tags ?? []).join(" ")}`,
      ) &&
      (kind === "all" || item.kind === kind) &&
      (tag === "all" || item.tags?.includes(tag)),
  );
  const resources = assets.filter(
    (asset) =>
      contains(`${asset.name} ${asset.tag} ${(asset.tags ?? []).join(" ")}`) &&
      (kind === "all" || asset.type === kind) &&
      (tag === "all" || asset.tag === tag || asset.tags?.includes(tag)),
  );
  const projectMatches =
    kind === "all" && tag === "all"
      ? projects.filter((project) =>
          contains(`${project.name} ${project.prompt}`),
        )
      : [];
  const showNodes = tab === "全部" || tab === "画布卡片";
  const showProjects = tab === "全部" || tab === "项目";
  const showResources = tab === "全部" || tab === "已加载资源";
  const count =
    (showNodes ? nodes.length : 0) +
    (showProjects ? projectMatches.length : 0) +
    (showResources ? resources.length : 0);
  const tags = Array.from(
    new Set([
      ...items.flatMap((item) => item.tags ?? []),
      ...assets.flatMap(getAssetTags),
    ]),
  ).filter(Boolean);
  return (
    <section
      className="catalog-panel"
      aria-label="全局搜索结果"
      data-testid="catalog-panel"
    >
      <label className="catalog-search">
        <UiIcon name="preview" />
        <input
          data-initial-focus
          aria-label="搜索内容"
          placeholder="搜索项目、卡片、提示词或标签"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            const first =
              results.current?.querySelector<HTMLButtonElement>(
                ".catalog-result",
              );
            if (event.key === "ArrowDown") {
              event.preventDefault();
              first?.focus();
            }
            if (event.key === "Enter") {
              event.preventDefault();
              first?.click();
            }
          }}
        />
      </label>
      <div className="catalog-tabs" role="tablist" aria-label="搜索分类">
        {TABS.map((name, index) => (
          <button
            type="button"
            key={name}
            role="tab"
            aria-selected={tab === name}
            tabIndex={tab === name ? 0 : -1}
            onClick={() => setTab(name)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % TABS.length
                  : event.key === "ArrowLeft"
                    ? (index + TABS.length - 1) % TABS.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? TABS.length - 1
                        : undefined;
              if (next !== undefined) {
                event.preventDefault();
                setTab(TABS[next]);
                (
                  event.currentTarget.parentElement?.children[
                    next
                  ] as HTMLElement
                )?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="catalog-filters">
        <label>
          类型
          <select
            aria-label="搜索类型"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="all">全部类型</option>
            <option value="subject">主体素材</option>
            {Object.entries(CANVAS_KIND_LABELS).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          标签
          <select
            aria-label="搜索标签"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          >
            <option value="all">全部标签</option>
            {tags.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        ref={results}
        className="catalog-body"
        role="tabpanel"
        aria-label={tab}
      >
        <div className="catalog-results">
          {showNodes &&
            nodes.map((item) => (
              <button
                type="button"
                key={`node:${item.id}`}
                className="catalog-result"
                onClick={() => onLocate(item.id)}
              >
                <UiIcon name={item.kind} size={24} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.prompt || item.description}</small>
                </span>
                <small>画布 · {CANVAS_KIND_LABELS[item.kind]}</small>
              </button>
            ))}
          {showProjects &&
            projectMatches.map((project) => (
              <button
                type="button"
                key={`project:${project.id}`}
                className="catalog-result"
                onClick={() => onOpenProject(project.id)}
              >
                <UiIcon name="folder" size={24} />
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.items.length} 个画布节点</small>
                </span>
                <small>本地项目</small>
              </button>
            ))}
          {showResources &&
            resources.map((asset) => (
              <button
                type="button"
                key={`asset:${asset.id}`}
                className="catalog-result"
                onClick={() => onOpen("assets")}
              >
                <UiIcon name="image" size={24} />
                <span>
                  <strong>{asset.name}</strong>
                  <small>{asset.tag}</small>
                </span>
                <small>已加载资源</small>
              </button>
            ))}
          {!count && (
            <p className="catalog-no-results">
              没有匹配的内容，试试其他关键词、类型或标签。
            </p>
          )}
        </div>
      </div>
      <footer className="catalog-footer">
        <span>{count} 项匹配 · 完整归档请到资源库查看</span>
        <button
          type="button"
          className="kk-button kk-button--tertiary"
          onClick={() => onOpen("assets")}
        >
          打开资源库
        </button>
      </footer>
    </section>
  );
}
