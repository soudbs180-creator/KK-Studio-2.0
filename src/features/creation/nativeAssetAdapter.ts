import { invoke } from "@tauri-apps/api/core";
import type { StoredGeneratedAsset } from "./assetRepository.ts";

export function usesNativeAssets(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__,
    )
  );
}

type AssetMetadata = Omit<StoredGeneratedAsset, "preview">;

export async function storeNativeAsset(
  asset: StoredGeneratedAsset,
): Promise<StoredGeneratedAsset> {
  const { preview, ...metadata } = asset;
  const dataBase64 = preview.split(",", 2)[1];
  if (!dataBase64) throw new Error("素材缺少原件，无法归档。");
  const stored = await invoke<AssetMetadata>("asset_store", {
    dataBase64,
    metadata,
  });
  return { ...stored, preview: `data:${stored.mime};base64,${dataBase64}` };
}

export async function readNativeAsset(
  assetId: string,
): Promise<StoredGeneratedAsset | null> {
  const record = await invoke<{
    metadata: AssetMetadata;
    dataBase64: string;
  } | null>("asset_read", { assetId });
  return record
    ? {
        ...record.metadata,
        preview: `data:${record.metadata.mime};base64,${record.dataBase64}`,
      }
    : null;
}

export async function listNativeAssets(): Promise<StoredGeneratedAsset[]> {
  const records = await invoke<AssetMetadata[]>("asset_list");
  const assets: StoredGeneratedAsset[] = [];
  // Avoid loading every original concurrently; the current UI expects in-memory data URLs.
  for (const record of records) {
    const asset = await readNativeAsset(record.assetId);
    if (!asset) throw new Error("素材索引存在但原件缺失，请检查本地素材目录。");
    assets.push(asset);
  }
  return assets;
}
