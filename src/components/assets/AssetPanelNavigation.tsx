import UiIcon from "../UiIcon";
import {
  getAssetTags,
  type Asset,
  type AssetFilter,
} from "../../domain/assets";
import AssetFilterControls from "./AssetFilterControls";

export type AssetPanelTab = "canvas" | "assets" | "trash";

interface AssetPanelNavigationProps {
  compact: boolean;
  tab: AssetPanelTab;
  view: "grid" | "list";
  filter: AssetFilter;
  sourceFilter: string;
  source: Asset[];
  selected: string;
  onClose: () => void;
  onToggleCompact: () => void;
  onTab: (tab: AssetPanelTab) => void;
  onView: (view: "grid" | "list") => void;
  onFilter: (patch: Partial<AssetFilter>) => void;
  onSource: (source: string) => void;
  onOpen: (asset: Asset) => void;
}

const Icon = ({ name }: { name: string }) => (
  <img
    className="asset-icon"
    src={`/design/figma/${name === "asset-grid" ? "asset-list" : name === "asset-list" ? "asset-grid" : name}.svg`}
    alt=""
  />
);

export default function AssetPanelNavigation({
  compact,
  tab,
  view,
  filter,
  sourceFilter,
  source,
  selected,
  onClose,
  onToggleCompact,
  onTab,
  onView,
  onFilter,
  onSource,
  onOpen,
}: AssetPanelNavigationProps) {
  return (
    <>
      <header className="asset-header">
        <span>资产管理</span>
        <div className="asset-window-actions">
          <button
            aria-label={compact ? "展开资产管理" : "收起资产管理"}
            onClick={onToggleCompact}
          >
            <Icon name={compact ? "expand" : "collapse"} />
          </button>
          <button aria-label="关闭资产管理" onClick={onClose}>
            <UiIcon name="close" size={20} />
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
            onClick={() => onTab(value)}
          >
            {value === "canvas" ? "画布" : "资产"}
          </button>
        ))}
        <button
          role="tab"
          className="asset-tab-trash"
          aria-label="垃圾箱"
          title="垃圾箱"
          aria-selected={tab === "trash"}
          onClick={() => onTab("trash")}
        >
          <UiIcon name="delete" size={16} />
        </button>
      </div>
      <div className="asset-search-row">
        <label className="asset-search">
          <Icon name="search" />
          <input
            aria-label="搜索文件"
            placeholder="搜索文件"
            value={filter.query}
            onChange={(e) => onFilter({ query: e.target.value })}
          />
        </label>
        <div className="asset-view">
          <button
            aria-label="列表视图"
            aria-pressed={view === "list"}
            onClick={() => onView("list")}
          >
            <Icon name="asset-list" />
          </button>
          <button
            aria-label="网格视图"
            aria-pressed={view === "grid"}
            onClick={() => onView("grid")}
          >
            <Icon name="asset-grid" />
          </button>
        </div>
      </div>
      <AssetFilterControls
        filter={filter}
        tags={Array.from(new Set(source.flatMap(getAssetTags)))}
        sourceFilter={sourceFilter}
        onFilter={onFilter}
        onSource={onSource}
      />
      <nav className="asset-file-nav" aria-label="文件列表">
        {source.slice(0, 4).map((asset) => (
          <button
            key={asset.id}
            aria-pressed={selected === asset.id}
            onClick={() => onOpen(asset)}
          >
            <span className="file-square" />
            {asset.name}
          </button>
        ))}
      </nav>
    </>
  );
}
