import { useEffect, useRef, useState } from "react";
import type { Asset } from "../../domain/assets";
import type { AssetArchiveState } from "../../features/creation/useAssetArchive";

export default function AssetCard({
  asset,
  selected,
  onSelect,
  onOpen,
  loadPreview,
}: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  loadPreview?: AssetArchiveState["loadPreview"];
}) {
  const host = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (asset.src || !asset.sha256 || !loadPreview) return;
    let request: AbortController | undefined;
    let visible = false;
    const update = (nextVisible: boolean) => {
      if (visible === nextVisible) return;
      visible = nextVisible;
      request?.abort();
      if (!visible) {
        setPreview("");
        return;
      }
      const current = new AbortController();
      request = current;
      setFailed(false);
      void loadPreview(asset.id, current.signal)
        .then((src) => {
          if (!current.signal.aborted) setPreview(src ?? "");
        })
        .catch(() => {
          if (!current.signal.aborted) setFailed(true);
        });
    };
    if (typeof IntersectionObserver === "undefined") update(true);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => update(entries.some((entry) => entry.isIntersecting)),
            { rootMargin: "160px" },
          );
    if (host.current) observer?.observe(host.current);
    return () => {
      request?.abort();
      observer?.disconnect();
    };
  }, [asset.id, asset.src, asset.sha256, attempt, loadPreview]);
  const retry = () => {
    setFailed(false);
    setAttempt((value) => value + 1);
  };
  const src = asset.src || preview;
  return (
    <button
      ref={host}
      className="asset-card"
      data-asset-key={asset.id}
      aria-label={`选择 ${asset.name}`}
      aria-pressed={selected}
      title={failed ? "预览读取失败；点击或按 Enter 重试" : undefined}
      onClick={() => {
        onSelect();
        if (failed) retry();
      }}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (failed) retry();
          else onOpen();
        }
      }}
    >
      <span className="asset-thumbnail">
        {asset.isAiGenerated && <span className="asset-ai-label">AI</span>}
        {failed ? (
          <span role="status">预览读取失败，点击重试</span>
        ) : src ? (
          <img
            key={attempt}
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          asset.type !== "subject" && (
            <img
              className="asset-icon"
              src="/design/figma/asset-image.svg"
              alt=""
            />
          )
        )}
      </span>
      <span className="asset-name">{asset.name}</span>
    </button>
  );
}
