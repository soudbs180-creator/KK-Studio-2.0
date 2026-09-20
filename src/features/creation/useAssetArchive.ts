import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Asset } from "../../domain/assets";
import { listStoredAssets } from "./assetRepository";

export interface AssetArchiveState {
  loading: boolean;
  error: string;
  retry: () => void;
}

export function useAssetArchive(
  setAssets: Dispatch<SetStateAction<Asset[]>>,
): AssetArchiveState {
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    void listStoredAssets()
      .then((stored) => {
        if (!mounted) return;
        setAssets((current) => {
          const existing = new Set(current.map((asset) => asset.id));
          return [
            ...current,
            ...stored
              .filter((asset) => !existing.has(asset.assetId))
              .map((asset, index) => ({
                id: asset.assetId,
                name:
                  asset.isAiGenerated === false
                    ? `本地参考 ${index + 1}`
                    : `AI 结果 ${index + 1}`,
                type: asset.mime.startsWith("video/")
                  ? ("video" as const)
                  : ("image" as const),
                tag: asset.tags[0] ?? "AI生成",
                createdAt: asset.provenance.generatedAt,
                src: asset.preview,
                isAiGenerated: asset.isAiGenerated ?? true,
                provider: asset.provenance.provider,
                model: asset.provenance.model,
                promptHash: asset.promptHash,
                parentId: asset.parentId,
                sourceTaskId: asset.sourceJobId,
                providerConnectionId: asset.provenance.connectionId,
                c2paPresent: asset.provenance.c2paPresent,
                synthIdSignal: asset.provenance.synthIdSignal,
                originCount: asset.origins?.length ?? 1,
                sha256: asset.sha256,
                source: asset.source ?? "provider",
              })),
          ];
        });
      })
      .catch(() => {
        if (mounted)
          setError(
            "本地素材库读取失败；请检查素材原件、存储权限和空间后重新读取。已有文件未修改。",
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [revision, setAssets]);
  return { loading, error, retry: () => setRevision((value) => value + 1) };
}
