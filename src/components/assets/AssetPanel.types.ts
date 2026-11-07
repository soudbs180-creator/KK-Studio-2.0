import type { Asset } from "../../domain/assets.ts";
import type { AssetArchiveState } from "../../features/creation/index.ts";

export interface AssetPanelProps {
  onOpenStoryboard?: () => void;
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
