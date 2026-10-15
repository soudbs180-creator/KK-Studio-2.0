import { modelChannels, type PickerChannel } from "../domain/modelChannels";
import type { ModelKind } from "../domain/modelSelection";
import { useId } from "react";

const filters = [
  ["all", "全部"],
  ["text", "文本"],
  ["image", "图片"],
  ["video", "视频"],
  ["audio", "音频"],
] as const;

export default function ModelPickerFilters({
  channel,
  apiOnly,
  kind,
  filter,
  query,
  onChannel,
  onFilter,
  onQuery,
}: {
  channel: PickerChannel;
  apiOnly: boolean;
  kind?: ModelKind;
  filter: ModelKind | "all";
  query: string;
  onChannel: (channel: PickerChannel) => void;
  onFilter: (filter: ModelKind | "all") => void;
  onQuery: (query: string) => void;
}) {
  const accountReasonId = useId();
  const accountReason = "当前图片编辑仅支持 API 执行，登录账号暂不支持此操作。";
  return (
    <>
      <div className="kk-model-channels" role="tablist" aria-label="模型渠道">
        {modelChannels.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={channel === item.id}
            disabled={apiOnly && item.id === "account"}
            title={apiOnly && item.id === "account" ? accountReason : undefined}
            aria-describedby={
              apiOnly && item.id === "account" ? accountReasonId : undefined
            }
            tabIndex={channel === item.id ? 0 : -1}
            onClick={() => onChannel(item.id)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const enabled = modelChannels.filter(
                (item) => !apiOnly || item.id !== "account",
              );
              const index = enabled.findIndex(
                (candidate) => candidate.id === item.id,
              );
              const next =
                event.key === "Home"
                  ? enabled[0]
                  : event.key === "End"
                    ? enabled[enabled.length - 1]
                    : enabled[
                        (index +
                          (event.key === "ArrowLeft" ? -1 : 1) +
                          enabled.length) %
                          enabled.length
                      ];
              onChannel(next.id);
              event.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>(
                  `[data-channel="${next.id}"]`,
                )
                ?.focus();
            }}
            data-channel={item.id}
          >
            {item.label}
          </button>
        ))}
      </div>
      {apiOnly && (
        <p id={accountReasonId} className="kk-model-channel-help">
          {accountReason}
        </p>
      )}
      <div className="kk-model-menu-top">
        <input
          type="search"
          className="kk-model-search ui-input"
          aria-label="搜索模型、厂商或参数"
          placeholder="搜索模型…"
          maxLength={120}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key !== "Escape") event.stopPropagation();
          }}
        />
        {kind ? (
          <span className="kk-model-scope">
            {filters.find(([id]) => id === kind)?.[1] ?? "用途待确认"}
          </span>
        ) : (
          <select
            className="ui-input kk-model-filter"
            aria-label="模型类型"
            value={filter}
            onChange={(event) =>
              onFilter(event.target.value as ModelKind | "all")
            }
          >
            {filters.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}
