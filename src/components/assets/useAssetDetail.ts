import { useEffect, useRef, useState } from "react";
import type { Asset } from "../../domain/assets";
import { loadStoredAsset } from "../../features/creation/assetRepository";

export default function useAssetDetail() {
  const [detail, setDetail] = useState<Asset | null>(null);
  const detailRequest = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const openerKey = useRef<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  useEffect(
    () => () => {
      detailRequest.current++;
    },
    [],
  );
  function closeDetail(restoreFocus = true): void {
    const request = ++detailRequest.current;
    setDetail(null);
    setDetailLoading(false);
    setDetailError("");
    if (restoreFocus)
      requestAnimationFrame(() => {
        if (detailRequest.current !== request) return;
        const active = document.activeElement;
        if (active && active !== document.body && active.tagName !== "DIALOG")
          return;
        if (opener.current?.isConnected) opener.current.focus();
        else if (openerKey.current)
          document
            .querySelector<HTMLElement>(
              `.asset-card[data-asset-key="${CSS.escape(openerKey.current)}"]`,
            )
            ?.focus();
      });
  }
  async function openDetail(asset: Asset): Promise<void> {
    if (!detail) {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      openerKey.current =
        opener.current?.getAttribute("data-asset-key") ?? null;
    }
    const request = ++detailRequest.current;
    setDetail(asset.sha256 ? { ...asset, src: undefined } : asset);
    setDetailError("");
    setDetailLoading(false);
    if (asset.sha256) {
      setDetailLoading(true);
      try {
        const original = await loadStoredAsset(asset.id);
        if (!original) throw new Error("missing");
        if (detailRequest.current === request)
          setDetail({ ...asset, src: original.preview });
      } catch {
        if (detailRequest.current === request)
          setDetailError(
            "素材原件读取失败，请恢复原件后重试。已有文件未修改。",
          );
      } finally {
        if (detailRequest.current === request) setDetailLoading(false);
      }
    }
  }
  return { detail, detailLoading, detailError, openDetail, closeDetail };
}
