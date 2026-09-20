import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Asset } from "../../domain/assets";
import { listStoredAssets } from "./assetRepository";
import { clearAssetPreviews, loadAssetPreview } from "./assetPreview";

const PAGE_SIZE = 40;

export interface AssetArchiveState {
  loading: boolean;
  error: string;
  retry: () => void;
  hasMore: boolean;
  loadMore: () => void;
  loadPreview: (
    assetId: string,
    signal?: AbortSignal,
  ) => Promise<string | null>;
}

export function useAssetArchive(
  setAssets: Dispatch<SetStateAction<Asset[]>>,
): AssetArchiveState {
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const loadingRef = useRef(true);
  const mimeById = useRef(new Map<string, string>());
  useEffect(() => {
    let mounted = true;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    void listStoredAssets({ offset: page * PAGE_SIZE, limit: PAGE_SIZE })
      .then((stored) => {
        if (!mounted) return;
        for (const asset of stored)
          mimeById.current.set(asset.assetId, asset.mime);
        setHasMore(stored.length === PAGE_SIZE);
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
                    ? `本地参考 ${page * PAGE_SIZE + index + 1}`
                    : `AI 结果 ${page * PAGE_SIZE + index + 1}`,
                type: asset.mime.startsWith("video/")
                  ? ("video" as const)
                  : ("image" as const),
                tag: asset.tags[0] ?? "AI生成",
                createdAt: asset.provenance.generatedAt,
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
        if (mounted) {
          loadingRef.current = false;
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [page, revision, setAssets]);

  const retry = useCallback(() => {
    loadingRef.current = true;
    clearAssetPreviews();
    setPage(0);
    setRevision((value) => value + 1);
  }, []);
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) {
      loadingRef.current = true;
      setPage((value) => value + 1);
    }
  }, [hasMore]);
  const loadPreview = useCallback(
    (assetId: string, signal?: AbortSignal) =>
      loadAssetPreview(assetId, mimeById.current.get(assetId) ?? "", signal),
    [],
  );
  return {
    loading,
    error,
    retry,
    hasMore,
    loadMore,
    loadPreview,
  };
}
