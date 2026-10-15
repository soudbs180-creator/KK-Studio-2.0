import type { CanvasCollectionItem } from "../domain/canvasItems";
import type { Asset } from "../domain/assets";
import TagEditor from "./TagEditor";
import UiIcon from "./UiIcon";

export default function CatalogTagResults({
  items,
  assets = [],
  customTags,
  onUpdateTags,
  onCreateTag,
  onLocate,
  onOpenAsset,
}: {
  items: CanvasCollectionItem[];
  assets?: Asset[];
  customTags: string[];
  onUpdateTags?: (id: string, tags: string[]) => void | string;
  onCreateTag?: (name: string) => void;
  onLocate: (id: string) => void;
  onOpenAsset?: (asset: Asset) => void;
}) {
  return (
    <div className="catalog-tag-results">
      {items.map((item) => (
        <article className="catalog-tag-card" key={item.id}>
          <button
            className="catalog-tag-preview"
            aria-label={`打开 ${item.title}`}
            onClick={() => onLocate(item.id)}
          >
            {item.preview ? (
              <img src={item.preview} alt="" />
            ) : (
              <UiIcon name="image" size={24} />
            )}
          </button>
          <div>
            <strong>{item.title}</strong>
            <div className="catalog-tag-chips">
              {(item.tags ?? []).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          {onUpdateTags && (
            <TagEditor
              compact
              floating
              tags={item.tags}
              customTags={customTags}
              onCreateTag={onCreateTag}
              onChange={(tags) => onUpdateTags(item.id, tags)}
            />
          )}
        </article>
      ))}
      {assets?.map((asset) => (
        <article className="catalog-tag-card" key={asset.id}>
          <button
            className="catalog-tag-preview"
            aria-label={`打开 ${asset.name}`}
            onClick={() => onOpenAsset?.(asset)}
          >
            <UiIcon name="image" size={24} />
          </button>
          <div>
            <strong>{asset.name}</strong>
            <div className="catalog-tag-chips">
              {(asset.tags ?? [asset.tag]).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </article>
      ))}
      {!items.length && !assets?.length && (
        <p className="catalog-no-results">还没有打标签的画布图片。</p>
      )}
    </div>
  );
}
