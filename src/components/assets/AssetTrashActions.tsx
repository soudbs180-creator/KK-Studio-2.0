import type { Asset } from "../../domain/assets";

export interface AssetTrashActionsProps {
  asset: Asset;
  onRestore: (assetId: string) => void;
  onPermanentlyDelete: (assetId: string) => void;
  disabledReason?: string;
}

type TrashOperation = (assetId: string) => void | Promise<void>;

export function useAssetTrash({
  trashedAssets = [],
  onRestoreAsset,
  onPermanentlyDeleteAsset,
  onDeleteAsset,
  setMessage,
}: {
  trashedAssets?: Asset[];
  onRestoreAsset?: TrashOperation;
  onPermanentlyDeleteAsset?: TrashOperation;
  onDeleteAsset?: TrashOperation;
  setMessage: (message: string) => void;
}) {
  const disabledReason =
    onDeleteAsset && onRestoreAsset && onPermanentlyDeleteAsset
      ? undefined
      : "素材垃圾箱尚未接入持久存储，暂不可操作。";
  async function perform(
    assetId: string,
    operation: TrashOperation | undefined,
    success: string,
  ): Promise<void> {
    if (disabledReason || !operation) {
      setMessage(disabledReason ?? "素材操作暂不可用。");
      return;
    }
    try {
      await operation(assetId);
      setMessage(success);
    } catch {
      setMessage("素材操作失败，未确认持久化，请重试。");
    }
  }
  return {
    activeTrash: trashedAssets,
    trashedIds: new Set(trashedAssets.map((asset) => asset.id)),
    disabledReason,
    handleSoftDelete: (asset: Asset) =>
      perform(asset.id, onDeleteAsset, "素材已移入垃圾箱"),
    handleRestore: (assetId: string) =>
      perform(assetId, onRestoreAsset, "素材已还原"),
    handlePermanentDelete: (assetId: string) =>
      perform(assetId, onPermanentlyDeleteAsset, "素材已彻底删除"),
  };
}

export default function AssetTrashActions({
  asset,
  onRestore,
  onPermanentlyDelete,
  disabledReason,
}: AssetTrashActionsProps) {
  return (
    <div className="asset-trash-actions">
      <button
        type="button"
        className="kk-button kk-button--secondary asset-trash-btn"
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onClick={(e) => {
          e.stopPropagation();
          onRestore(asset.id);
        }}
      >
        还原
      </button>
      <button
        type="button"
        className="kk-button kk-button--danger asset-trash-btn"
        disabled={Boolean(disabledReason)}
        title={disabledReason}
        onClick={(e) => {
          e.stopPropagation();
          onPermanentlyDelete(asset.id);
        }}
      >
        彻底删除
      </button>
    </div>
  );
}

export function AssetSoftDeleteAction({
  asset,
  onDelete,
  disabledReason,
}: {
  asset: Asset;
  onDelete: (asset: Asset) => void;
  disabledReason?: string;
}) {
  return (
    <div className="asset-soft-delete-actions">
      <button
        type="button"
        className="kk-button kk-button--tertiary asset-soft-delete-btn"
        title={disabledReason ?? "移入垃圾箱"}
        disabled={Boolean(disabledReason)}
        aria-label={`移入垃圾箱 ${asset.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(asset);
        }}
      >
        移入垃圾箱
      </button>
    </div>
  );
}
