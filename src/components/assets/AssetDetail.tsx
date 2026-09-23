import { useEffect, useState, type ReactNode } from "react";
import type { Asset } from "../../domain/assets";
import AssetProvenanceDetail from "./AssetProvenanceDetail";

export default function AssetDetail({
  detail,
  assets,
  loading,
  error,
  onBack,
  onRetry,
  inCollection,
  onToggleCollection,
  backIcon,
}: {
  detail: Asset;
  assets: Asset[];
  loading: boolean;
  error: string;
  onBack: () => void;
  onRetry: () => void;
  inCollection: boolean;
  onToggleCollection: () => void;
  backIcon: ReactNode;
}) {
  const [decodeError, setDecodeError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setDecodeError(false), [detail.id, detail.src]);
  const mediaProps = { src: detail.src, onError: () => setDecodeError(true) };
  return (
    <div className="asset-detail">
      <button className="text-button" onClick={onBack}>
        {backIcon} 返回资产
      </button>
      <div className="asset-large-preview">
        {detail.src && !decodeError ? (
          detail.src.startsWith("data:audio/") ? (
            <audio
              key={attempt}
              {...mediaProps}
              aria-label={detail.name}
              controls
            />
          ) : detail.type === "video" ||
            detail.src.startsWith("data:video/") ? (
            <video
              key={attempt}
              {...mediaProps}
              aria-label={detail.name}
              controls
            />
          ) : (
            <img key={attempt} {...mediaProps} alt={detail.name} />
          )
        ) : (
          <img
            className="asset-icon"
            src="/design/figma/asset-image.svg"
            alt=""
          />
        )}
      </div>
      {loading && <p role="status">正在读取素材原件…</p>}
      {(error || decodeError) && (
        <p role="alert">
          {error || "素材无法解码，原件已保留。"}{" "}
          <button
            className="text-button"
            onClick={() => {
              setDecodeError(false);
              setAttempt((value) => value + 1);
              onRetry();
            }}
          >
            重新读取原件
          </button>
        </p>
      )}
      <h3>{detail.name}</h3>
      <AssetProvenanceDetail
        asset={detail}
        childIds={assets
          .filter((asset) => asset.parentId === detail.id)
          .map((asset) => asset.id)}
        inCollection={inCollection}
        onToggleCollection={onToggleCollection}
      />
    </div>
  );
}
