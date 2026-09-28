import { useEffect, useRef, useState, type CSSProperties } from "react";
import Modal from "../../components/Modal";
import type { CompareImage } from "./imageCompare";

const SOURCE_LABEL: Record<CompareImage["source"], string> = {
  local: "本地图片",
  demo: "示范素材",
  provider: "已生成",
};

export default function ImageCompareDialog({
  images,
  onClose,
}: {
  images: CompareImage[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState(50);
  const [failed, setFailed] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const stages = useRef<Array<HTMLDivElement | null>>([]);
  const syncing = useRef(false);
  const sliderFailures = images.filter((image) => failed.includes(image.id));

  useEffect(() => {
    if (images.length !== 2 && mode === "slider") setMode("side");
  }, [images.length, mode]);

  function syncScroll(index: number): void {
    if (syncing.current) return;
    const from = stages.current[index];
    if (!from) return;
    const x =
      from.scrollWidth > from.clientWidth
        ? from.scrollLeft / (from.scrollWidth - from.clientWidth)
        : 0;
    const y =
      from.scrollHeight > from.clientHeight
        ? from.scrollTop / (from.scrollHeight - from.clientHeight)
        : 0;
    syncing.current = true;
    stages.current.forEach((stage, otherIndex) => {
      if (!stage || otherIndex === index) return;
      stage.scrollLeft = x * (stage.scrollWidth - stage.clientWidth);
      stage.scrollTop = y * (stage.scrollHeight - stage.clientHeight);
    });
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }

  function retry(id: string): void {
    setFailed((current) => current.filter((entry) => entry !== id));
    setAttempts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }

  function media(image: CompareImage) {
    if (failed.includes(image.id))
      return (
        <div className="compare-media-error" role="alert">
          <p>{image.title}：图片无法加载</p>
          <button
            className="ui-button"
            type="button"
            onClick={() => retry(image.id)}
          >
            重新加载
          </button>
        </div>
      );
    return (
      <img
        key={`${image.id}-${attempts[image.id] ?? 0}`}
        src={image.src}
        alt={image.title}
        draggable={false}
        onError={() =>
          setFailed((current) => [...new Set([...current, image.id])])
        }
      />
    );
  }

  return (
    <Modal title="图片对比" onClose={onClose} className="image-compare-dialog">
      <header className="image-compare-header">
        <div>
          <h2>图片对比</h2>
          <p>检查同一创意的版本差异；图片保持原始比例。</p>
        </div>
        <button
          type="button"
          className="ui-button"
          aria-label="关闭图片对比"
          onClick={onClose}
        >
          关闭
        </button>
      </header>
      <div className="image-compare-tools" role="toolbar" aria-label="对比视图">
        <div className="image-compare-modes">
          <button
            type="button"
            className="ui-button"
            aria-pressed={mode === "side"}
            onClick={() => setMode("side")}
          >
            并排
          </button>
          {images.length === 2 ? (
            <button
              type="button"
              className="ui-button"
              aria-pressed={mode === "slider"}
              onClick={() => setMode("slider")}
            >
              滑块
            </button>
          ) : null}
        </div>
        {mode === "side" ? (
          <div className="image-compare-zoom">
            <button
              type="button"
              className="ui-button"
              aria-label="缩小"
              disabled={zoom <= 100}
              onClick={() => setZoom((current) => Math.max(100, current - 25))}
            >
              −
            </button>
            <span aria-live="polite">{zoom}%</span>
            <button
              type="button"
              className="ui-button"
              aria-label="放大"
              disabled={zoom >= 300}
              onClick={() => setZoom((current) => Math.min(300, current + 25))}
            >
              +
            </button>
          </div>
        ) : null}
      </div>
      {mode === "side" ? (
        <div
          className="image-compare-grid"
          style={{ "--compare-count": images.length } as CSSProperties}
        >
          {images.map((image, index) => (
            <section
              key={image.id}
              className="compare-pane"
              aria-label={image.title}
            >
              <header className="compare-pane-heading">
                <strong title={image.title}>
                  版本 {index + 1} · {image.title}
                </strong>
                <span>{SOURCE_LABEL[image.source]}</span>
                {image.model ? (
                  <small title={image.model}>{image.model}</small>
                ) : null}
              </header>
              <div
                className="compare-stage"
                ref={(node) => {
                  stages.current[index] = node;
                }}
                onScroll={() => syncScroll(index)}
              >
                {failed.includes(image.id) ? (
                  media(image)
                ) : (
                  <div className="compare-media" style={{ width: `${zoom}%` }}>
                    {media(image)}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="image-compare-slider-view">
          <div className="compare-slider-labels">
            <span>版本 1 · {images[0].title}</span>
            <span>版本 2 · {images[1].title}</span>
          </div>
          <div
            className="compare-slider-stage"
            style={{ "--compare-position": `${position}%` } as CSSProperties}
          >
            {sliderFailures.length ? (
              <div className="compare-slider-failures">
                {sliderFailures.map((image) => (
                  <div key={image.id}>{media(image)}</div>
                ))}
              </div>
            ) : (
              <>
                <div className="compare-slider-image">{media(images[1])}</div>
                <div className="compare-slider-image is-overlay">
                  {media(images[0])}
                </div>
                <span className="compare-divider" aria-hidden="true">
                  <span className="compare-handle">↔</span>
                </span>
                <input
                  className="compare-range"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={position}
                  aria-label="对比位置"
                  aria-valuetext={`${position}%`}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  onKeyDown={(event) => {
                    if (
                      !event.shiftKey ||
                      !["ArrowLeft", "ArrowRight"].includes(event.key)
                    )
                      return;
                    event.preventDefault();
                    setPosition((current) =>
                      Math.max(
                        0,
                        Math.min(
                          100,
                          current + (event.key === "ArrowRight" ? 10 : -10),
                        ),
                      ),
                    );
                  }}
                />
              </>
            )}
          </div>
          <p className="compare-position-label">分界位置：{position}%</p>
        </div>
      )}
    </Modal>
  );
}
