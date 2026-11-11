import type { DailyUsageSummary } from "../../features/usage/index.ts";
import { cardBox } from "./ProfileUsageCards";

export default function ProfileUsageChart({
  dailyData,
  hoveredDay,
  setHoveredDay,
  daysRange,
  setDaysRange,
}: {
  dailyData: DailyUsageSummary[];
  hoveredDay: DailyUsageSummary | null;
  setHoveredDay: (day: DailyUsageSummary | null) => void;
  daysRange: 7 | 14;
  setDaysRange: (range: 7 | 14) => void;
}) {
  const maxDaily = Math.max(
    1,
    ...dailyData.map((d) =>
      Number.isFinite(d.totalTokens) ? d.totalTokens : 0,
    ),
  );
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
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--kk-text-primary)",
              margin: 0,
            }}
          >
            Token 消耗走势 (Prompt / Completion)
          </h3>
          <span style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}>
            {hoveredDay
              ? `${hoveredDay.date}: 总计 ${hoveredDay.totalTokens.toLocaleString()} (入 ${hoveredDay.promptTokens.toLocaleString()} / 出 ${hoveredDay.completionTokens.toLocaleString()})`
              : "悬浮柱状图查看单日详情"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {([7, 14] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`settings-chip${daysRange === r ? " is-selected" : ""}`}
              aria-pressed={daysRange === r}
              onClick={() => setDaysRange(r)}
            >
              {r} 天
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: "130px" }}>
        <svg
          viewBox={`0 0 ${dailyData.length * 40} 110`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          {dailyData.map((d, i) => {
            const barWidth = dailyData.length === 7 ? 22 : 14;
            const x = i * 40 + (40 - barWidth) / 2;
            const safeTotal = Number.isFinite(d.totalTokens)
              ? Math.max(0, d.totalTokens)
              : 0;
            const safePrompt = Number.isFinite(d.promptTokens)
              ? Math.max(0, d.promptTokens)
              : 0;
            const totalHeight = (safeTotal / maxDaily) * 80;
            const promptHeight =
              safeTotal > 0
                ? Math.min(totalHeight, (safePrompt / safeTotal) * totalHeight)
                : 0;
            const completionHeight = Math.max(0, totalHeight - promptHeight);
            const yBase = 92;
            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x}
                  y={yBase - totalHeight}
                  width={barWidth}
                  height={completionHeight}
                  fill="var(--kk-text-accent)"
                  opacity={hoveredDay?.date === d.date ? 1 : 0.85}
                />
                <rect
                  x={x}
                  y={yBase - promptHeight}
                  width={barWidth}
                  height={promptHeight}
                  fill="var(--kk-accent)"
                  opacity={hoveredDay?.date === d.date ? 1 : 0.85}
                />
                <text
                  x={x + barWidth / 2}
                  y={106}
                  textAnchor="middle"
                  fill="var(--kk-text-secondary)"
                  fontSize="12"
                >
                  {d.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          fontSize: "12px",
          color: "var(--kk-text-secondary)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="kk-kbd-box"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "var(--kk-accent)",
            }}
          />
          Prompt 输入 Tokens
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            className="kk-kbd-box"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "var(--kk-text-accent)",
            }}
          />
          Completion 输出 Tokens
        </span>
      </div>
    </div>
  );
}
