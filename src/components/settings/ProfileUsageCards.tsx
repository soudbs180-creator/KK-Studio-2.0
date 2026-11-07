import type { CSSProperties } from "react";
import {
  clearUsageRecords,
  type TokenUsageRecord,
} from "../../features/usage/index.ts";

const MODEL_COLORS = [
  "var(--kk-accent)",
  "var(--kk-text-accent)",
  "var(--kk-warning)",
  "var(--kk-text-primary)",
  "var(--kk-text-secondary)",
];

export const cardBox: CSSProperties = {
  backgroundColor: "var(--kk-bg-card)",
  border: "1px solid var(--kk-border-subtle)",
  padding: "16px 20px",
};

export function ProfileModelBreakdownCard({
  modelEntries,
  totalModelTokens,
}: {
  modelEntries: [string, number][];
  totalModelTokens: number;
}) {
  return (
    <div
      className="kk-card-box"
      style={{
        ...cardBox,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--kk-text-primary)",
            margin: 0,
          }}
        >
          模型调用分布占比
        </h3>
        <button
          type="button"
          className="settings-action secondary"
          style={{
            height: "var(--kk-control-h-sm)",
            padding: "0 10px",
            fontSize: "12px",
          }}
          onClick={() => {
            if (confirm("确定要清空全部本地用量流水吗？")) clearUsageRecords();
          }}
        >
          清空历史
        </button>
      </div>
      <div
        className="kk-pill-box"
        style={{
          height: "10px",
          backgroundColor: "var(--kk-bg-soft)",
          display: "flex",
          overflow: "hidden",
          width: "100%",
        }}
      >
        {modelEntries.map(([model, tokens], idx) => (
          <div
            key={model}
            style={{
              width: `${totalModelTokens ? (tokens / totalModelTokens) * 100 : 0}%`,
              backgroundColor: MODEL_COLORS[idx % MODEL_COLORS.length],
              transition: "width 0.25s ease",
            }}
            title={`${model}: ${tokens.toLocaleString()}`}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {modelEntries.map(([model, tokens], idx) => (
          <div
            key={model}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--kk-text-primary)",
            }}
          >
            <span
              className="kk-pill-box"
              style={{
                width: "8px",
                height: "8px",
                backgroundColor: MODEL_COLORS[idx % MODEL_COLORS.length],
              }}
            />
            <span style={{ fontWeight: 500 }}>{model}</span>
            <span style={{ color: "var(--kk-text-secondary)" }}>
              {tokens.toLocaleString()} (
              {totalModelTokens
                ? Math.round((tokens / totalModelTokens) * 100)
                : 0}
              %)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileRecentRecordsCard({
  recentRecords,
}: {
  recentRecords: TokenUsageRecord[];
}) {
  if (recentRecords.length === 0) return null;
  return (
    <div
      className="kk-card-box"
      style={{
        backgroundColor: "var(--kk-bg-card)",
        border: "1px solid var(--kk-border-subtle)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--kk-border-subtle)",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--kk-text-primary)",
            margin: 0,
          }}
        >
          最近调用记录
        </h3>
      </div>
      <div>
        {recentRecords.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              fontSize: "12px",
              borderTop: i > 0 ? "1px solid var(--kk-border-subtle)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="kk-pill-box"
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "var(--kk-success)",
                }}
              />
              <span
                style={{ fontWeight: 500, color: "var(--kk-text-primary)" }}
              >
                {r.model}
              </span>
              <span style={{ color: "var(--kk-text-secondary)" }}>
                ({r.provider})
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                color: "var(--kk-text-secondary)",
              }}
            >
              <span>{r.totalTokens.toLocaleString()} tokens</span>
              <span>
                {new Date(r.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
