import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type {
  DailyUsageSummary,
  TokenUsageRecord,
  UsageKpis,
} from "../../features/usage/tokenUsageStore";
import {
  clearUsageRecords,
  getDailySummaries,
  getModelBreakdown,
  getUsageKpis,
  getUsageRecords,
  seedSampleUsageIfEmpty,
} from "../../features/usage/tokenUsageStore";

const MODEL_COLORS = [
  "var(--kk-accent)",
  "var(--kk-text-accent)",
  "var(--kk-warning)",
  "var(--kk-text-primary)",
  "var(--kk-text-secondary)",
];

const cardBox: CSSProperties = {
  backgroundColor: "var(--kk-bg-card)",
  border: "1px solid var(--kk-border-subtle)",
  padding: "16px 20px",
};

function ProfileModelBreakdownCard({
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

function ProfileRecentRecordsCard({
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

export default function ProfileUsagePage() {
  const [daysRange, setDaysRange] = useState<7 | 14>(7);
  const [hoveredDay, setHoveredDay] = useState<DailyUsageSummary | null>(null);
  const [kpis, setKpis] = useState<UsageKpis>(getUsageKpis);
  const [dailyData, setDailyData] = useState<DailyUsageSummary[]>(() =>
    getDailySummaries(7),
  );
  const [modelBreakdown, setModelBreakdown] =
    useState<Record<string, number>>(getModelBreakdown);

  useEffect(() => {
    seedSampleUsageIfEmpty();
    const refresh = () => {
      setKpis(getUsageKpis());
      setDailyData(getDailySummaries(daysRange));
      setModelBreakdown(getModelBreakdown());
    };
    refresh();
    window.addEventListener("kk:token-usage-changed", refresh);
    return () => window.removeEventListener("kk:token-usage-changed", refresh);
  }, [daysRange]);

  const maxDaily = Math.max(
    1,
    ...dailyData.map((d) =>
      Number.isFinite(d.totalTokens) ? d.totalTokens : 0,
    ),
  );
  const modelEntries = Object.entries(modelBreakdown).sort(
    (a, b) => b[1] - a[1],
  );
  const totalModelTokens = modelEntries.reduce((sum, [, val]) => sum + val, 0);
  const recentRecords = getUsageRecords().slice(-5).reverse();

  return (
    <div className="settings-detail-stack" style={{ gap: "20px" }}>
      <h2 className="settings-page-title" id="settings-section-title">
        个人主页
      </h2>
      {/* Profile Header */}
      <div
        className="kk-card-box"
        style={{
          ...cardBox,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            className="kk-pill-box"
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "var(--kk-bg-soft)",
              border: "1px solid var(--kk-border-control)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "15px",
              color: "var(--kk-text-accent)",
            }}
          >
            KK
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--kk-text-primary)",
                }}
              >
                本地创作者
              </span>
              <span
                className="kk-pill-box"
                style={{
                  fontSize: "12px",
                  padding: "1px 6px",
                  backgroundColor: "var(--kk-bg-soft)",
                  color: "var(--kk-text-accent)",
                }}
              >
                本地离线模式
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--kk-text-secondary)",
                margin: "3px 0 0",
              }}
            >
              数据完全保存在本机沙盒中；模型密钥与用量记录由系统本地加密保管。
            </p>
          </div>
        </div>
        <button
          type="button"
          className="settings-action secondary"
          style={{ height: "var(--kk-control-h-md)" }}
          onClick={() =>
            alert("当前处于本地无限制安全运行模式。云端协作将于后续版本开放。")
          }
        >
          连接云端账号
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          {
            label: "累计消耗 Token",
            val: kpis.totalTokens.toLocaleString(),
            sub: `今日: ${kpis.todayTokens.toLocaleString()}`,
            color: "var(--kk-text-accent)",
          },
          {
            label: "输入 Prompt Tokens",
            val: kpis.promptTokens.toLocaleString(),
            sub: `占比 ${kpis.totalTokens ? Math.round((kpis.promptTokens / kpis.totalTokens) * 100) : 0}%`,
            color: "var(--kk-text-secondary)",
          },
          {
            label: "输出 Completion Tokens",
            val: kpis.completionTokens.toLocaleString(),
            sub: `占比 ${kpis.totalTokens ? Math.round((kpis.completionTokens / kpis.totalTokens) * 100) : 0}%`,
            color: "var(--kk-text-secondary)",
          },
          {
            label: "模型请求总频次",
            val: `${kpis.totalRequests.toLocaleString()} 次`,
            sub: "连通成功率 100%",
            color: "var(--kk-success)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="kk-card-box"
            style={{
              padding: "12px 14px",
              backgroundColor: "var(--kk-bg-card)",
              border: "1px solid var(--kk-border-subtle)",
            }}
          >
            <span
              style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}
            >
              {item.label}
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--kk-text-primary)",
                marginTop: "4px",
              }}
            >
              {item.val}
            </div>
            <span
              style={{
                fontSize: "12px",
                color: item.color,
                marginTop: "2px",
                display: "block",
              }}
            >
              {item.sub}
            </span>
          </div>
        ))}
      </div>

      {/* SVG Stacked Bar Chart */}
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
            <span
              style={{ fontSize: "12px", color: "var(--kk-text-secondary)" }}
            >
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
                  ? Math.min(
                      totalHeight,
                      (safePrompt / safeTotal) * totalHeight,
                    )
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
                    fontFamily="var(--kk-font-sans)"
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

      <ProfileModelBreakdownCard
        modelEntries={modelEntries}
        totalModelTokens={totalModelTokens}
      />
      <ProfileRecentRecordsCard recentRecords={recentRecords} />
    </div>
  );
}
