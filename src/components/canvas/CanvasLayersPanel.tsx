import { useMemo, useState } from "react";
import {
  CANVAS_KIND_LABELS,
  type CanvasCollectionItem,
} from "../../domain/canvasItems";
import "../../styles/canvas-layers.css";

interface CanvasLayersPanelProps {
  items: CanvasCollectionItem[];
  selectedNode: string | null;
  onLocate: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function CanvasLayersPanel({
  items,
  selectedNode,
  onLocate,
  onSelect,
  onClose,
}: CanvasLayersPanelProps) {
  const [query, setQuery] = useState("");
  const visibleItems = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return items;
    return items.filter((item) =>
      `${item.title} ${item.description} ${CANVAS_KIND_LABELS[item.kind]}`
        .toLocaleLowerCase()
        .includes(value),
    );
  }, [items, query]);

  return (
    <section
      className="canvas-layers-panel"
      role="region"
      aria-label="画布图层"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <header className="canvas-layers-header">
        <div>
          <strong>图层</strong>
          <span>{items.length}</span>
        </div>
        <button type="button" aria-label="关闭图层管理" onClick={onClose}>
          ×
        </button>
      </header>
      <label className="canvas-layers-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          role="searchbox"
          aria-label="搜索图层"
          placeholder="搜索图层"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            aria-label="清除图层搜索"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        ) : null}
      </label>
      <div className="canvas-layers-list" role="list">
        {visibleItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`canvas-layer-row ${selectedNode === item.id ? "is-selected" : ""}`}
            aria-label={`定位 ${item.title}`}
            aria-pressed={selectedNode === item.id}
            data-layer-id={item.id}
            onClick={() => {
              onSelect(item.id);
              onLocate(item.id);
            }}
          >
            <span
              className={`canvas-layer-kind canvas-layer-kind-${item.kind}`}
            >
              {CANVAS_KIND_LABELS[item.kind].slice(0, 1)}
            </span>
            <span className="canvas-layer-copy">
              <strong>{item.title}</strong>
              <small>{CANVAS_KIND_LABELS[item.kind]}</small>
            </span>
            <span className="canvas-layer-locate" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
        {!visibleItems.length ? (
          <p className="canvas-layers-empty">没有匹配的图层</p>
        ) : null}
      </div>
    </section>
  );
}
