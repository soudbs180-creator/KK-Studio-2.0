import { useState } from "react";
import type { Asset } from "../../domain/assets";

export interface AssetTrashActionsProps {
  asset: Asset;
  onRestore: (assetId: string) => void;
  onPermanentlyDelete: (assetId: string) => void;
}

export function useAssetTrash({
  trashedAssets = [],
  onRestoreAsset,
  onPermanentlyDeleteAsset,
  onDeleteAsset,
  onAdd,
  setMessage,
}: {
  trashedAssets?: Asset[];
  onRestoreAsset?: (assetId: string) => void;
  onPermanentlyDeleteAsset?: (assetId: string) => void;
  onDeleteAsset?: (assetId: string) => void;
  onAdd: (assets: Asset[], subject: boolean) => void;
  setMessage: (msg: string) => void;
}) {
  const [localTrash, setLocalTrash] = useState<Asset[]>([]);

  function handleSoftDelete(asset: Asset): void {
    setLocalTrash((prev) => [...prev.filter((a) => a.id !== asset.id), asset]);
    onDeleteAsset?.(asset.id);
    setMessage("素材已移入垃圾箱");
  }

  function handleRestore(assetId: string): void {
    const inLocal = localTrash.find((a) => a.id === assetId);
    setLocalTrash((prev) => prev.filter((a) => a.id !== assetId));
    onRestoreAsset?.(assetId);
    if (inLocal && !trashedAssets.some((a) => a.id === assetId)) {
      onAdd([inLocal], inLocal.type === "subject");
    }
    setMessage("素材已还原");
  }

  function handlePermanentDelete(assetId: string): void {
    setLocalTrash((prev) => prev.filter((a) => a.id !== assetId));
    onPermanentlyDeleteAsset?.(assetId);
    setMessage("素材已彻底删除");
  }

  const trashedIds = new Set([
    ...trashedAssets.map((a) => a.id),
    ...localTrash.map((a) => a.id),
  ]);
  const activeTrash = [
    ...trashedAssets,
    ...localTrash.filter((l) => !trashedAssets.some((t) => t.id === l.id)),
  ];

  return {
    activeTrash,
    trashedIds,
    handleSoftDelete,
    handleRestore,
    handlePermanentDelete,
  };
}

export default function AssetTrashActions({
  asset,
  onRestore,
  onPermanentlyDelete,
}: AssetTrashActionsProps) {
  return (
    <div className="asset-trash-actions">
      <button
        type="button"
        className="kk-button kk-button--secondary asset-trash-btn"
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
}: {
  asset: Asset;
  onDelete: (asset: Asset) => void;
}) {
  return (
    <div className="asset-soft-delete-actions">
      <button
        type="button"
        className="kk-button kk-button--tertiary asset-soft-delete-btn"
        title="移入垃圾箱"
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
