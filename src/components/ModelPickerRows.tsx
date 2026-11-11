import { useLayoutEffect, useRef, useState } from "react";
import type { ModelKind } from "../features/models/index.ts";
import { GOOGLE_CONNECTION_ID } from "../features/agent/index.ts";
import {
  modelSelectionId,
  type ModelSelection,
} from "../features/models/index.ts";
import type { Entry } from "../features/models/index.ts";
import {
  getProbeMetric,
  getLatencyTierClass,
} from "../features/models/index.ts";

function renderModelProbeBadge(item: Entry) {
  const providerId =
    item.selection?.connectionId ?? item.selection?.source ?? "";
  const modelId = item.selection?.model ?? item.id;
  const probe = getProbeMetric(providerId, modelId) ?? getProbeMetric(item.id);
  if (!probe) return null;

  return (
    <span
      className={`kk-model-probe-badge ${getLatencyTierClass(probe.tier)}`}
      title={`延迟 ${probe.latencyMs}ms${probe.ttftMs ? ` · 首字 ${probe.ttftMs}ms` : ""}`}
      aria-label={`延迟: ${probe.latencyMs}ms`}
    >
      <span className="kk-probe-dot" aria-hidden="true" />
      <span className="kk-probe-val">
        {probe.tier === "error" ? "异常" : `${probe.latencyMs}ms`}
      </span>
    </span>
  );
}

export default function ModelPickerRows({
  ordered,
  current,
  kind,
  pins,
  emptyMessage,
  onChoose,
  onTogglePin,
}: {
  ordered: Array<{ item: Entry; fuzzy: boolean }>;
  current?: ModelSelection;
  kind?: ModelKind;
  pins: string[];
  emptyMessage: string;
  onChoose: (item: Entry) => void;
  onTogglePin?: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const modelRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusAfterNavigation = useRef(false);
  const disabledReason = (item: Entry) =>
    item.selection?.source === "api" &&
    item.selection.connectionId === GOOGLE_CONNECTION_ID
      ? "请从对话的执行方式选择 Google Gemini"
      : item.disabled;
  const isDisabled = (item: Entry) =>
    Boolean(disabledReason(item)) ||
    Boolean(kind && item.selection?.kind && item.selection.kind !== kind);
  const isSelected = (item: Entry) =>
    item.checked ??
    Boolean(
      item.selection &&
      current &&
      modelSelectionId(item.selection) === modelSelectionId(current),
    );
  const enabledIndexes = ordered.flatMap(({ item }, index) =>
    isDisabled(item) ? [] : [index],
  );
  const firstEnabledIndex = enabledIndexes[0] ?? -1;
  const [activeIndex, setActiveIndex] = useState(
    firstEnabledIndex >= 0 ? firstEnabledIndex : 0,
  );
  const orderedKey = ordered.map(({ item }) => item.id).join("|");
  useLayoutEffect(() => {
    const next = firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
    setActiveIndex(next);
    if (!focusAfterNavigation.current) return;
    focusAfterNavigation.current = false;
    const target =
      modelRefs.current[next] ??
      listRef.current
        ?.closest('[role="menu"]')
        ?.querySelector<HTMLButtonElement>(
          ".kk-model-menu-head button:not(:disabled)",
        );
    target?.focus();
  }, [firstEnabledIndex, orderedKey]);
  return (
    <div ref={listRef} className="kk-model-menu-list">
      {ordered.map(({ item, fuzzy }, index) => (
        <div key={item.id} className="kk-model-menu-row">
          <button
            type="button"
            role={
              item.selection || item.checked !== undefined
                ? "menuitemradio"
                : "menuitem"
            }
            aria-checked={
              item.selection || item.checked !== undefined
                ? isSelected(item)
                : undefined
            }
            aria-disabled={isDisabled(item) || undefined}
            title={disabledReason(item) ?? item.detail}
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
              if (isDisabled(item)) return;
              focusAfterNavigation.current = Boolean(item.page);
              onChoose(item);
            }}
          >
            <span className="kk-model-choice-name">
              {item.label}
              {item.page ? " ›" : ""}
            </span>
            {renderModelProbeBadge(item)}
            <small>
              {fuzzy ? "可能匹配 · " : ""}
              {disabledReason(item) ?? item.detail}
            </small>
            {isSelected(item) && (
              <span className="kk-model-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
          {onTogglePin && (
            <button
              type="button"
              className="kk-model-pin"
              aria-label={`${pins.includes(item.id) ? "取消置顶" : "置顶"} ${item.label}${item.detail ? `（${item.detail}）` : ""}`}
              aria-pressed={pins.includes(item.id)}
              onClick={() => onTogglePin(item.id)}
            >
              ☆
            </button>
          )}
        </div>
      ))}
      {!ordered.length && <p>{emptyMessage}</p>}
    </div>
  );
}
