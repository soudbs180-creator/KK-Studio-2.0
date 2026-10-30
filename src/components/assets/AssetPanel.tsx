import { useEffect, useState } from "react";
import UiIcon from "../UiIcon";
import {
  filterAssets,
  type Asset,
  type AssetFilter,
} from "../../domain/assets";
import "./assets.css";
import CreateSubject from "./CreateSubject";
import AssetCard from "./AssetCard";
import useAssetImport from "./useAssetImport";
import AssetDetail from "./AssetDetail";
import AssetPanelNavigation, {
  type AssetPanelTab,
} from "./AssetPanelNavigation";
import useAssetCollections from "./useAssetCollections";
import type { AssetArchiveState } from "../../features/creation/index.ts";
import useAssetDetail from "./useAssetDetail";
import AssetActions from "./AssetActions";
import AssetPanelHeader from "./AssetPanelHeader";
import AssetTrashActions, {
  AssetSoftDeleteAction,
  useAssetTrash,
} from "./AssetTrashActions";

export interface AssetPanelProps {
  onClose: () => void;
  assets: Asset[];
  subjects: Asset[];
  trashedAssets?: Asset[];
  onAdd: (assets: Asset[], subject: boolean) => void;
  onRestoreAsset?: (assetId: string) => void;
  onPermanentlyDeleteAsset?: (assetId: string) => void;
  onDeleteAsset?: (assetId: string) => void;
  archive?: AssetArchiveState;
}

const EMPTY_FILTER: AssetFilter = {
  query: "",
  type: "all",
  tag: "all",
  days: 0,
  resourcePackId: "all",
  sort: "newest",
};
export default function AssetPanel({
  onClose,
  assets,
  subjects,
  trashedAssets = [],
  onAdd,
  onRestoreAsset,
  onPermanentlyDeleteAsset,
  onDeleteAsset,
  archive,
}: AssetPanelProps) {
  const [tab, setTab] = useState<AssetPanelTab>("canvas");
  const [compact, setCompact] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [selected, setSelected] = useState("canvas-0");
  const { detail, detailLoading, detailError, openDetail, closeDetail } =
    useAssetDetail();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { message, setMessage, busy, input, importFiles } = useAssetImport(
    (additions) => {
      onAdd(additions, tab === "assets");
      clearFilters();
    },
  );
  const { collectionIds, toggleCollection } = useAssetCollections(setMessage);

  const {
    activeTrash,
    trashedIds,
    handleSoftDelete,
    handleRestore,
    handlePermanentDelete,
    disabledReason,
  } = useAssetTrash({
    trashedAssets,
    onRestoreAsset,
    onPermanentlyDeleteAsset,
    onDeleteAsset,
    setMessage,
  });

  const source =
    tab === "canvas"
      ? assets.filter((a) => !trashedIds.has(a.id))
      : tab === "assets"
        ? subjects.filter((a) => !trashedIds.has(a.id))
        : activeTrash;

  const items = filterAssets(source, filter).filter(
    (asset) =>
      sourceFilter === "all" ||
      (sourceFilter === "collection"
        ? collectionIds.has(asset.id)
        : sourceFilter === "provider"
          ? asset.source === "provider"
          : sourceFilter === "upload"
            ? asset.source === "upload"
            : !asset.src && !asset.sha256),
  );
  const resourcePacks = Array.from(
    new Set(source.map((asset) => asset.resourcePackId).filter(Boolean)),
  ) as string[];

  const searchingArchive =
    tab === "canvas" &&
    Boolean(
      filter.query.trim() ||
      filter.type !== "all" ||
      filter.tag !== "all" ||
      filter.days ||
      sourceFilter !== "all",
    ) &&
    Boolean(archive?.hasMore);

  useEffect(() => {
    if (searchingArchive && !archive?.loading && !archive?.error)
      archive?.loadMore();
  }, [searchingArchive, archive?.loading, archive?.error, archive?.loadMore]);

  function clearFilters(): void {
    setFilter(EMPTY_FILTER);
    setSourceFilter("all");
  }

  function switchTab(value: AssetPanelTab): void {
    setTab(value);
    clearFilters();
    closeDetail(false);
    setSelected(
      value === "canvas"
        ? (assets[0]?.id ?? "")
        : value === "assets"
          ? (subjects[0]?.id ?? "")
          : (activeTrash[0]?.id ?? ""),
    );
    setMessage("");
  }

  function createSubject(event: React.FormEvent): void {
    event.preventDefault();
    const title = name.trim();
    if (!title) return;
    onAdd(
      [
        {
          id: crypto.randomUUID(),
          name: title,
          type: "subject",
          tag: "人物",
          createdAt: new Date().toISOString(),
        },
      ],
      true,
    );
    setCreating(false);
    setName("");
    setSelected(title);
    setMessage("主体已创建 · 本次会话可用");
  }

  return (
    <section
      className={`asset-panel ${compact ? "compact" : ""}`}
      data-testid="asset-panel"
    >
      <AssetPanelHeader
        compact={compact}
        onClose={onClose}
        onToggleCompact={() => setCompact(!compact)}
      />
      <div className="asset-panel-body">
        <AssetPanelNavigation
          tab={tab}
          view={view}
          filter={filter}
          sourceFilter={sourceFilter}
          source={source}
          resourcePacks={resourcePacks}
          onTab={switchTab}
          onView={setView}
          onFilter={(patch) => setFilter({ ...filter, ...patch })}
          onSource={setSourceFilter}
        />
        <div className={`asset-content ${view}`}>
          {detail ? (
            <AssetDetail
              backIcon={<UiIcon name="undo" size={16} />}
              detail={detail}
              assets={assets}
              loading={detailLoading}
              error={detailError}
              onBack={() => closeDetail()}
              onRetry={() => void openDetail(detail)}
              inCollection={collectionIds.has(detail.id)}
              onToggleCollection={() => toggleCollection(detail.id)}
            />
          ) : items.length ? (
            items.map((asset) => (
              <div
                key={asset.id}
                className="asset-card-wrapper"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <AssetCard
                  asset={asset}
                  selected={selected === asset.id}
                  onSelect={() => setSelected(asset.id)}
                  onOpen={() => void openDetail(asset)}
                  loadPreview={archive?.loadPreview}
                />
                {tab === "trash" ? (
                  <AssetTrashActions
                    asset={asset}
                    onRestore={handleRestore}
                    onPermanentlyDelete={handlePermanentDelete}
                    disabledReason={disabledReason}
                  />
                ) : (
                  <AssetSoftDeleteAction
                    asset={asset}
                    onDelete={handleSoftDelete}
                    disabledReason={disabledReason}
                  />
                )}
              </div>
            ))
          ) : (
            <div className="asset-empty">
              <img
                className="asset-icon"
                src="/design/figma/search.svg"
                alt=""
              />
              <h3>
                {tab === "trash"
                  ? "垃圾箱为空"
                  : searchingArchive
                    ? "正在搜索本地素材库…"
                    : "没有找到匹配的资产"}
              </h3>
              <p>
                {tab === "trash"
                  ? (disabledReason ?? "已删除的素材会显示在这里，可随时还原。")
                  : searchingArchive
                    ? "正在读取其余素材信息。"
                    : "试试其他关键词，或清除筛选条件。"}
              </p>
              {tab !== "trash" && (
                <button className="primary-button" onClick={clearFilters}>
                  清除筛选
                </button>
              )}
            </div>
          )}
        </div>
        {!detail && tab === "canvas" && archive?.hasMore && (
          <button
            className="kk-button kk-button--secondary asset-load-more"
            type="button"
            disabled={archive.loading}
            onClick={archive.loadMore}
          >
            {archive.loading ? "正在读取…" : "加载更多素材"}
          </button>
        )}
      </div>
      <AssetActions
        showSubjectActions={tab === "assets"}
        busy={busy}
        onCreate={() => {
          setCreating(true);
          setMessage("");
        }}
        input={input}
        onImportFiles={importFiles}
        message={message}
        archive={archive}
      />
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
