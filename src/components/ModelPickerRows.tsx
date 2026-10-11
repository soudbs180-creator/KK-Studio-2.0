import { useEffect, useRef, useState } from "react";
import type { ModelKind } from "../features/models/modelCatalog";
import {
  modelSelectionId,
  type ModelSelection,
} from "../features/models/modelSelection";
import type { Entry } from "../features/models/modelMenuEntries";

export default function ModelPickerRows({
  ordered,
  current,
  scene,
  pins,
  emptyMessage,
  onChoose,
  onTogglePin,
}: {
  ordered: Array<{ item: Entry; fuzzy: boolean }>;
  current?: ModelSelection;
  scene: ModelKind;
  pins: string[];
  emptyMessage: string;
  onChoose: (item: Entry) => void;
  onTogglePin: (id: string) => void;
}) {
  const modelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isDisabled = (item: Entry) =>
    Boolean(item.disabled) ||
    Boolean(item.selection?.kind && item.selection.kind !== scene);
  const enabledIndexes = ordered.flatMap(({ item }, index) =>
    isDisabled(item) ? [] : [index],
  );
  const firstEnabledIndex = enabledIndexes[0] ?? -1;
  const [activeIndex, setActiveIndex] = useState(
    firstEnabledIndex >= 0 ? firstEnabledIndex : 0,
  );
  const orderedKey = ordered.map(({ item }) => item.id).join("|");
  useEffect(() => {
    setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0);
  }, [firstEnabledIndex, orderedKey]);
  return (
    <div className="kk-model-menu-list">
      {ordered.map(({ item, fuzzy }, index) => (
        <div key={item.id} className="kk-model-menu-row">
          <button
            type="button"
            role={item.selection ? "menuitemradio" : "menuitem"}
            aria-checked={
              item.selection
                ? Boolean(
                    current &&
                    modelSelectionId(item.selection) ===
                      modelSelectionId(current),
                  )
                : undefined
            }
            aria-disabled={isDisabled(item) || undefined}
            title={item.disabled ?? item.detail}
            tabIndex={index === activeIndex ? 0 : -1}
            ref={(node) => {
              modelRefs.current[index] = node;
            }}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                return;
              event.preventDefault();
              if (!enabledIndexes.length) return;
              const currentPosition = Math.max(
                0,
                enabledIndexes.indexOf(index),
              );
              const next =
                event.key === "Home"
                  ? enabledIndexes[0]
                  : event.key === "End"
                    ? enabledIndexes[enabledIndexes.length - 1]
                    : enabledIndexes[
                        (currentPosition +
                          (event.key === "ArrowUp" ? -1 : 1) +
                          enabledIndexes.length) %
                          enabledIndexes.length
                      ];
              setActiveIndex(next);
              modelRefs.current[next]?.focus();
            }}
            onClick={() => {
              if (!isDisabled(item)) onChoose(item);
            }}
          >
            <span className="kk-model-choice-name">
              {item.label}
              {item.page ? " ›" : ""}
            </span>
            <small>
              {fuzzy ? "可能匹配 · " : ""}
              {item.disabled ?? item.detail}
            </small>
            {item.selection &&
              current &&
              modelSelectionId(item.selection) ===
                modelSelectionId(current) && (
                <span className="kk-model-check" aria-hidden="true">
                  ✓
                </span>
              )}
          </button>
          <button
            type="button"
            className="kk-model-pin"
            aria-label={`${pins.includes(item.id) ? "取消置顶" : "置顶"} ${item.label}${item.detail ? `（${item.detail}）` : ""}`}
            aria-pressed={pins.includes(item.id)}
            onClick={() => onTogglePin(item.id)}
          >
            ☆
          </button>
        </div>
      ))}
      {!ordered.length && <p>{emptyMessage}</p>}
    </div>
  );
}
