import { useState } from "react";
import { X, Plus, Upload, ArrowLeft } from "lucide-react";
import {
  filterAssets,
  type Asset,
  type AssetFilter,
} from "../../domain/assets";
import "./assets.css";
import CreateSubject from "./CreateSubject";
import useAssetImport from "./useAssetImport";
import AssetProvenanceDetail from "./AssetProvenanceDetail";
import AssetFilterControls from "./AssetFilterControls";
import useAssetCollections from "./useAssetCollections";
import type { AssetArchiveState } from "../../features/creation/useAssetArchive";

export interface AssetPanelProps {
  onClose: () => void;
  assets: Asset[];
  subjects: Asset[];
  onAdd: (assets: Asset[], subject: boolean) => void;
  archive?: AssetArchiveState;
}
const EMPTY_FILTER: AssetFilter = {
  query: "",
  type: "all",
  tag: "all",
  days: 0,
};
const Icon = ({ name }: { name: string }) => (
  <img
    className="asset-icon"
    src={`/design/figma/${name === "asset-grid" ? "asset-list" : name === "asset-list" ? "asset-grid" : name}.svg`}
    alt=""
  />
);
export default function AssetPanel({
  onClose,
  assets,
  subjects,
  onAdd,
  archive,
}: AssetPanelProps) {
  const [tab, setTab] = useState<"canvas" | "assets">("canvas");
  const [compact, setCompact] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [selected, setSelected] = useState("canvas-0");
  const [detail, setDetail] = useState<Asset | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const { message, setMessage, busy, input, importFiles } = useAssetImport(
    (additions) => {
      onAdd(additions, tab === "assets");
      setFilter(EMPTY_FILTER);
    },
  );
  const { collectionIds, toggleCollection } = useAssetCollections(setMessage);
  const source = tab === "canvas" ? assets : subjects;
  const items = filterAssets(source, filter).filter(
    (asset) =>
      sourceFilter === "all" ||
      (sourceFilter === "collection"
        ? collectionIds.has(asset.id)
        : sourceFilter === "provider"
          ? asset.source === "provider"
          : sourceFilter === "upload"
            ? Boolean(asset.src) && asset.source !== "provider"
            : !asset.src),
  );
  function switchTab(value: "canvas" | "assets"): void {
    setTab(value);
    setFilter(EMPTY_FILTER);
    setDetail(null);
    setSelected(
      value === "canvas" ? (assets[0]?.id ?? "") : (subjects[0]?.id ?? ""),
    );
    setMessage("");
  }
  function createSubject(event: React.FormEvent): void {
    event.preventDefault();
    const title = name.trim();
    if (!title) return;
    const subject: Asset = {
      id: crypto.randomUUID(),
      name: title,
      type: "subject",
      tag: "人物",
      createdAt: new Date().toISOString(),
    };
    onAdd([subject], true);
    setCreating(false);
    setName("");
    setSelected(subject.id);
    setMessage("主体已创建 · 本次会话可用");
  }
  return (
    <section
      className={`asset-panel ${compact ? "compact" : ""}`}
      data-testid="asset-panel"
    >
      <header className="asset-header">
        <span>资产管理</span>
        <div className="asset-window-actions">
          <button
            aria-label={compact ? "展开资产管理" : "收起资产管理"}
            onClick={() => setCompact(!compact)}
          >
            <Icon name={compact ? "expand" : "collapse"} />
          </button>
          <button aria-label="关闭资产管理" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </header>
      <h2 className="asset-title">KK工作流画布</h2>
      <div className="asset-tabs" role="tablist" aria-label="资源范围">
        {(["canvas", "assets"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => switchTab(value)}
          >
            {value === "canvas" ? "画布" : "资产"}
          </button>
        ))}
      </div>
      <div className="asset-search-row">
        <label className="asset-search">
          <Icon name="search" />
          <input
            aria-label="搜索文件"
            placeholder="搜索文件"
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
        </label>
        <div className="asset-view">
          <button
            aria-label="列表视图"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <Icon name="asset-list" />
          </button>
          <button
            aria-label="网格视图"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <Icon name="asset-grid" />
          </button>
        </div>
      </div>
      <AssetFilterControls
        filter={filter}
        tags={Array.from(new Set(source.map((asset) => asset.tag)))}
        sourceFilter={sourceFilter}
        onFilter={(patch) => setFilter({ ...filter, ...patch })}
        onSource={setSourceFilter}
      />
      <nav className="asset-file-nav" aria-label="文件列表">
        {source.slice(0, 4).map((asset) => (
          <button
            key={asset.id}
            aria-pressed={selected === asset.id}
            onClick={() => {
              setSelected(asset.id);
              setDetail(asset);
            }}
          >
            <span className="file-square" />
            {asset.name}
          </button>
        ))}
      </nav>
      <div className={`asset-content ${view}`}>
        {detail ? (
          <div className="asset-detail">
            <button className="text-button" onClick={() => setDetail(null)}>
              <ArrowLeft size={14} /> 返回资产
            </button>
            <div className="asset-large-preview">
              {detail.src ? (
                <img src={detail.src} alt={detail.name} />
              ) : (
                <Icon name="asset-image" />
              )}
            </div>
            <h3>{detail.name}</h3>
            <AssetProvenanceDetail
              asset={detail}
              childIds={assets
                .filter((asset) => asset.parentId === detail.id)
                .map((asset) => asset.id)}
              inCollection={collectionIds.has(detail.id)}
              onToggleCollection={() => toggleCollection(detail.id)}
            />
          </div>
        ) : items.length ? (
          items.map((asset) => (
            <button
              className="asset-card"
              key={asset.id}
              aria-label={`选择 ${asset.name}`}
              aria-pressed={selected === asset.id}
              onClick={() => setSelected(asset.id)}
              onDoubleClick={() => setDetail(asset)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setDetail(asset);
                }
              }}
            >
              <span className="asset-thumbnail">
                {asset.isAiGenerated && (
                  <span className="asset-ai-label">AI</span>
                )}
                {asset.src ? (
                  <img src={asset.src} alt="" />
                ) : (
                  asset.type !== "subject" && <Icon name="asset-image" />
                )}
              </span>
              <span className="asset-name">{asset.name}</span>
            </button>
          ))
        ) : (
          <div className="asset-empty">
            <Icon name="search" />
            <h3>没有找到匹配的资产</h3>
            <p>试试其他关键词，或清除筛选条件。</p>
            <button
              className="primary-button"
              onClick={() => setFilter(EMPTY_FILTER)}
            >
              清除筛选
            </button>
          </div>
        )}
      </div>
      {tab === "assets" && (
        <div className="asset-bottom-actions">
          <button
            className="primary-button"
            onClick={() => {
              setCreating(true);
              setMessage("");
            }}
          >
            <Plus size={11} />
            创建主体
          </button>
          <button disabled={busy} onClick={() => input.current?.click()}>
            <Upload size={11} />
            {busy ? "正在导入" : "导入资源包"}
          </button>
        </div>
      )}
      <input
        className="visually-hidden"
        tabIndex={-1}
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,.json"
        onChange={(e) => void importFiles(e.target.files)}
      />
      {(message || archive?.loading || archive?.error) && (
        <p
          className="asset-feedback"
          role={archive?.error ? "alert" : "status"}
        >
          {archive?.loading ? "正在读取本地素材库… " : archive?.error}
          {archive?.error && (
            <button className="ui-button" type="button" onClick={archive.retry}>
              重新读取素材库
            </button>
          )}
          {message}
        </p>
      )}
      {creating && (
        <CreateSubject
          name={name}
          setName={setName}
          onClose={() => setCreating(false)}
          onSubmit={createSubject}
        />
      )}
    </section>
  );
}
