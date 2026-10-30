import UiIcon from "../UiIcon";
import {
  getAssetTags,
  type Asset,
  type AssetFilter,
} from "../../domain/assets";
import AssetFilterControls from "./AssetFilterControls";

export type AssetPanelTab = "canvas" | "assets" | "trash";

interface AssetPanelNavigationProps {
  tab: AssetPanelTab;
  view: "grid" | "list";
  filter: AssetFilter;
  sourceFilter: string;
  source: Asset[];
  resourcePacks?: string[];
  onTab: (tab: AssetPanelTab) => void;
  onView: (view: "grid" | "list") => void;
  onFilter: (patch: Partial<AssetFilter>) => void;
  onSource: (source: string) => void;
}

const Icon = ({ name }: { name: "asset-grid" | "asset-list" | "search" }) => (
  <span
    className="asset-icon"
    style={{ maskImage: `url("/design/figma/${name}.svg")` }}
    aria-hidden="true"
  />
);

export default function AssetPanelNavigation({
  tab,
  view,
  filter,
  sourceFilter,
  source,
  resourcePacks,
  onTab,
  onView,
  onFilter,
  onSource,
}: AssetPanelNavigationProps) {
  return (
    <>
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
          <UiIcon name="delete" size={28} />
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
        resourcePacks={resourcePacks}
        sourceFilter={sourceFilter}
        onFilter={onFilter}
        onSource={onSource}
      />
    </>
  );
}
